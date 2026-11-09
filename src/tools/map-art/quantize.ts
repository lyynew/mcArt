/**
 * 128×128 网格 → 16384 个地图色号。
 *
 * 纯函数，不碰 DOM、不用全局状态，可以直接单测。三个公开算法：
 *   - 最近色：core/color.ts 的两段式 CIEDE2000（Lab 粗筛 + 精算），
 *     比在 RGB 上量欧氏距离更贴合人眼，也是 SlopeCraft 一类开源工具的选法
 *   - Floyd–Steinberg 误差扩散：蛇形扫描，减少单向纹理
 *   - Bayer 4×4 有序抖动：确定性、无误差累积，适合像素画
 * 三者都只在「色板下标」上做选择，输出始终是合法色号或 0（透明）。
 */
import { ciede2000, findNearest, rgbToLab, type Lab } from '@/core/color'
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

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const
/** 有序抖动的扰动幅度，约等于半个色阶 */
const BAYER_AMPLITUDE = 26

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function delta(a: Lab, b: Lab): number {
  return ciede2000(a[0], a[1], a[2], b[0], b[1], b[2])
}

/**
 * 用完整的 8bit RGB 做缓存键。
 *
 * 不能像方块画那边按 6bit 粗量化：那会让两个不同颜色撞到同一个键，
 * 谁先被算进去就决定了后来者的结果——扫描顺序一换（蛇形抖动）就对不上，
 * 连「扩散强度为 0 时应等于无抖动」都保证不了。16k 个格子里重复色很多，
 * 精确的 8bit 键照样能省掉绝大多数重复计算。
 */
function cacheKey(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b
}

export function quantize(
  grid: Uint8ClampedArray,
  palette: readonly MapColor[],
  options: ColorOptions,
): Quantized {
  if (grid.length !== MAP_PIXELS * 4) throw new Error('网格尺寸不是 128×128')
  if (palette.length === 0) throw new Error('地图色板是空的')

  const colors = new Uint8Array(MAP_PIXELS)
  const picked = new Uint8Array(MAP_PIXELS)
  const cache = new Map<number, number>()

  const pick = (r: number, g: number, b: number): number => {
    const cr = clamp(r) | 0
    const cg = clamp(g) | 0
    const cb = clamp(b) | 0
    const key = cacheKey(cr, cg, cb)
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    const k = findNearest(rgbToLab(cr, cg, cb), palette)
    cache.set(key, k)
    return k
  }

  if (options.dither === 'floyd') {
    const buf = new Float32Array(MAP_PIXELS * 3)
    for (let i = 0; i < MAP_PIXELS; i++) {
      const p = i * 4
      buf[i * 3] = grid[p]!
      buf[i * 3 + 1] = grid[p + 1]!
      buf[i * 3 + 2] = grid[p + 2]!
    }

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

        const b = i * 3
        const k = pick(buf[b]!, buf[b + 1]!, buf[b + 2]!)
        picked[i] = k
        colors[i] = palette[k]!.id

        const c = palette[k]!.rgb
        const er = (clamp(buf[b]!) - c[0]) * strength
        const eg = (clamp(buf[b + 1]!) - c[1]) * strength
        const eb = (clamp(buf[b + 2]!) - c[2]) * strength
        add(x + dir, y, er * 0.4375, eg * 0.4375, eb * 0.4375)
        add(x - dir, y + 1, er * 0.1875, eg * 0.1875, eb * 0.1875)
        add(x, y + 1, er * 0.3125, eg * 0.3125, eb * 0.3125)
        add(x + dir, y + 1, er * 0.0625, eg * 0.0625, eb * 0.0625)
      }
    }
  } else {
    const ordered = options.dither === 'bayer'
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const i = y * MAP_SIZE + x
        const p = i * 4
        if (grid[p + 3]! < 128) {
          colors[i] = COLOR_TRANSPARENT
          continue
        }
        const shift = ordered
          ? (BAYER4[(y % 4) * 4 + (x % 4)]! / 16 - 0.5) * 2 * BAYER_AMPLITUDE
          : 0
        const k = pick(grid[p]! + shift, grid[p + 1]! + shift, grid[p + 2]! + shift)
        picked[i] = k
        colors[i] = palette[k]!.id
      }
    }
  }

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
    errorSum += delta(source, palette[picked[i]!]!.lab)
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
