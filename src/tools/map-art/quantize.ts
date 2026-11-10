/**
 * 128×128 网格 → 16384 个地图色号。
 *
 * 纯函数，不碰 DOM、不用全局状态，可以直接单测。用到的都是公开算法：
 *   - 最近色：core/color.ts 的两段式 CIEDE2000（Lab 粗筛 + 精算）
 *   - Floyd–Steinberg / Atkinson 误差扩散：蛇形扫描；误差在**线性光**里传播，
 *     不是在 gamma 编码的 sRGB 数值上。前者暗部渐变干净、亮部不过冲
 *   - Bayer 4×4 / 8×8 有序抖动：确定性、不积累误差
 *   - 去孤立噪点：只在四邻全不同色、且邻色与原色感知差很小时归并
 *
 * 输出始终是合法色号或 0（透明）。
 */
import {
  ciede2000,
  findNearest,
  linearToSrgb,
  rgbToLab,
  srgbToLinear,
  type Lab,
} from '@/core/color'
import { ATKINSON, BAYER4, BAYER8, BAYER_AMPLITUDE } from '@/core/dither'
import { COLOR_TRANSPARENT, MAP_PIXELS, MAP_SIZE, type ColorOptions } from './model'
import type { MapColor } from './map-colors'

export interface Quantized {
  /** 长度固定 16384，可直接写进 NBT 的 colors */
  colors: Uint8Array
  /** 各色号用了多少格，长度 256 */
  histogram: Uint16Array
  /** 用到的颜色种数（不含透明） */
  used: number
  transparent: number
  /** 平均 CIEDE2000 色差，用来比较参数好坏 */
  meanError: number
}

/** 去杂点时允许的最大感知色差 */
const DESPECKLE_DELTA_E = 11

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function delta(a: Lab, b: Lab): number {
  return ciede2000(a[0], a[1], a[2], b[0], b[1], b[2])
}

/**
 * 用完整的 8bit RGB 做缓存键。
 * 按 6bit 粗量化会让两个不同颜色撞键，谁先算进去就决定后来者的结果，
 * 扫描顺序一换（蛇形抖动）连「扩散强度 0 应等于无抖动」都保证不了。
 */
function cacheKey(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b
}

/**
 * 去孤立噪点。
 * 条件刻意保守：四邻没有同色、周围至少三格同属另一色、且那颜色与原图
 * 的 CIEDE2000 差小于阈值，才替换——眼睛高光、边缘过渡不会被抹掉。
 */
function despeckle(
  colors: Uint8Array,
  grid: Uint8ClampedArray,
  byId: ReadonlyMap<number, MapColor>,
): void {
  const copy = Uint8Array.from(colors)
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const i = y * MAP_SIZE + x
      const id = copy[i]!
      if (id === COLOR_TRANSPARENT) continue

      let same = 0
      let count = 0
      const tally = new Map<number, number>()
      for (const [dx, dy] of dirs) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue
        const nid = copy[ny * MAP_SIZE + nx]!
        if (nid === COLOR_TRANSPARENT) continue
        count++
        if (nid === id) same++
        tally.set(nid, (tally.get(nid) ?? 0) + 1)
      }
      if (same > 0 || count < 3) continue

      let bestId = -1
      let bestCount = 0
      tally.forEach((n, key) => {
        if (n > bestCount) {
          bestCount = n
          bestId = key
        }
      })
      if (bestId < 0 || bestCount < 3) continue

      const target = byId.get(bestId)
      if (!target) continue
      const p = i * 4
      const source = rgbToLab(grid[p]!, grid[p + 1]!, grid[p + 2]!)
      if (delta(source, target.lab) < DESPECKLE_DELTA_E) colors[i] = bestId
    }
  }
}

export function quantize(
  grid: Uint8ClampedArray,
  palette: readonly MapColor[],
  options: ColorOptions,
): Quantized {
  if (grid.length !== MAP_PIXELS * 4) throw new Error('网格尺寸不是 128×128')
  if (palette.length === 0) throw new Error('地图色板是空的')

  const colors = new Uint8Array(MAP_PIXELS)
  const cache = new Map<number, number>()

  /** 线性光 → sRGB → Lab → 最近色；返回色板下标 */
  const pick = (lr: number, lg: number, lb: number, shift = 0): number => {
    const cr = clamp(linearToSrgb(lr) + shift) | 0
    const cg = clamp(linearToSrgb(lg) + shift) | 0
    const cb = clamp(linearToSrgb(lb) + shift) | 0
    const key = cacheKey(cr, cg, cb)
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    const k = findNearest(rgbToLab(cr, cg, cb), palette)
    cache.set(key, k)
    return k
  }

  // 误差扩散统一在线性光里做；ordered / none 只读取、不改这个缓冲
  const buf = new Float32Array(MAP_PIXELS * 3)
  for (let i = 0; i < MAP_PIXELS; i++) {
    const p = i * 4
    buf[i * 3] = srgbToLinear(grid[p]!)
    buf[i * 3 + 1] = srgbToLinear(grid[p + 1]!)
    buf[i * 3 + 2] = srgbToLinear(grid[p + 2]!)
  }

  const diffuse = options.dither === 'floyd' || options.dither === 'atkinson'
  const ordered = options.dither === 'bayer' || options.dither === 'bayer8'
  const strength = Math.max(0, Math.min(1, options.strength / 100))

  const add = (x: number, y: number, er: number, eg: number, eb: number): void => {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return
    const j = (y * MAP_SIZE + x) * 3
    buf[j] = buf[j]! + er
    buf[j + 1] = buf[j + 1]! + eg
    buf[j + 2] = buf[j + 2]! + eb
  }

  for (let y = 0; y < MAP_SIZE; y++) {
    const forward = y % 2 === 0
    const dir = forward ? 1 : -1
    for (let step = 0; step < MAP_SIZE; step++) {
      const x = forward ? step : MAP_SIZE - 1 - step
      const i = y * MAP_SIZE + x
      const p = i * 4
      if (grid[p + 3]! < 128) {
        colors[i] = COLOR_TRANSPARENT
        continue
      }

      let shift = 0
      if (ordered) {
        const v = options.dither === 'bayer8'
          ? BAYER8[(y % 8) * 8 + (x % 8)]!
          : BAYER4[(y % 4) * 4 + (x % 4)]!
        const levels = options.dither === 'bayer8' ? 64 : 16
        shift = (v / levels - 0.5) * 2 * BAYER_AMPLITUDE
      }

      const b = i * 3
      const k = pick(buf[b]!, buf[b + 1]!, buf[b + 2]!, shift)
      colors[i] = palette[k]!.id
      if (!diffuse) continue

      const c = palette[k]!.rgb
      const er = (buf[b]! - srgbToLinear(c[0])) * strength
      const eg = (buf[b + 1]! - srgbToLinear(c[1])) * strength
      const eb = (buf[b + 2]! - srgbToLinear(c[2])) * strength

      if (options.dither === 'floyd') {
        add(x + dir, y, er * 0.4375, eg * 0.4375, eb * 0.4375)
        add(x - dir, y + 1, er * 0.1875, eg * 0.1875, eb * 0.1875)
        add(x, y + 1, er * 0.3125, eg * 0.3125, eb * 0.3125)
        add(x + dir, y + 1, er * 0.0625, eg * 0.0625, eb * 0.0625)
      } else {
        for (const [dx, dy] of ATKINSON) {
          add(x + dx * dir, y + dy, er / 8, eg / 8, eb / 8)
        }
      }
    }
  }

  const byId = new Map(palette.map((c, index) => [c.id, index]))
  if (options.despeckle) despeckle(colors, grid, new Map(palette.map((c) => [c.id, c])))

  const histogram = new Uint16Array(256)
  let transparent = 0
  let errorSum = 0
  let counted = 0

  for (let i = 0; i < MAP_PIXELS; i++) {
    const id = colors[i]!
    histogram[id] = histogram[id]! + 1
    if (id === COLOR_TRANSPARENT) {
      transparent++
      continue
    }
    counted++
    const p = i * 4
    const source = rgbToLab(grid[p]!, grid[p + 1]!, grid[p + 2]!)
    const index = byId.get(id)
    if (index !== undefined) errorSum += delta(source, palette[index]!.lab)
  }

  let used = 0
  for (let id = 1; id < histogram.length; id++) if (histogram[id]! > 0) used++

  return {
    colors,
    histogram,
    used,
    transparent,
    meanError: counted ? errorSum / counted : 0,
  }
}
