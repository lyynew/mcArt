/**
 * 图片 → 方块索引的核心转换。
 *
 * 分三步，每步都是纯函数：
 *   1. sampleGrid  把方形原图按 n×n 网格加权平均成每格一个颜色
 *   2. quantize    每格颜色匹配到色板里最接近的方块（可选抖动、去杂点）
 *   3. applyManual 把手画过的格子盖回去
 *
 * 这里刻意不碰 canvas：读图、裁切、缩放属于浏览器侧（见 core/image.ts），
 * 算法只接受已经取好的像素，方便直接单测。
 */
import { findNearest, labDist, rgbToLab } from './color'
import type { PaletteBlock } from './palettes'

/** 空格用 -1 表示，其余是色板内下标 */
export const EMPTY = -1

/**
 * 按 n×n 网格聚合像素。
 *
 * 颜色用 alpha 加权平均（半透明边缘不会把颜色拉黑），
 * 透明度本身取算术平均，<128 的格子后面会被判成空格。
 *
 * @param px   size × size 的 RGBA 数据
 * @param size 原图边长（已裁成正方形）
 * @param n    目标格数
 * @param contrast 对比度，-60 ~ 60
 * @param sat      饱和度，-60 ~ 60
 */
export function sampleGrid(
  px: ArrayLike<number>,
  size: number,
  n: number,
  contrast = 0,
  sat = 0,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(n * n * 4)
  const step = size / n

  for (let cy = 0; cy < n; cy++) {
    const y0 = Math.floor(cy * step)
    const y1 = Math.max(y0 + 1, Math.ceil((cy + 1) * step))
    for (let cx = 0; cx < n; cx++) {
      const x0 = Math.floor(cx * step)
      const x1 = Math.max(x0 + 1, Math.ceil((cx + 1) * step))

      let r = 0
      let g = 0
      let b = 0
      let aSum = 0
      let count = 0
      let alphaWeight = 0

      for (let y = y0; y < y1 && y < size; y++) {
        for (let x = x0; x < x1 && x < size; x++) {
          const p = (y * size + x) * 4
          const al = px[p + 3]!
          r += px[p]! * al
          g += px[p + 1]! * al
          b += px[p + 2]! * al
          aSum += al
          alphaWeight += al
          count++
        }
      }

      const o = (cy * n + cx) * 4
      if (!count || alphaWeight === 0) {
        out[o] = 0
        out[o + 1] = 0
        out[o + 2] = 0
        out[o + 3] = 0
        continue
      }

      out[o] = r / alphaWeight
      out[o + 1] = g / alphaWeight
      out[o + 2] = b / alphaWeight
      out[o + 3] = aSum / count
    }
  }

  // 调色：先按亮度调整饱和度，再以 128 为中心拉对比度
  const k = 1 + contrast / 100
  const s = 1 + sat / 100

  if (k !== 1 || s !== 1) {
    for (let i = 0; i < n * n; i++) {
      const o = i * 4
      if (out[o + 3] === 0) continue
      const r0 = out[o]!
      const g0 = out[o + 1]!
      const b0 = out[o + 2]!
      const lum = 0.299 * r0 + 0.587 * g0 + 0.114 * b0
      out[o] = (lum + (r0 - lum) * s - 128) * k + 128
      out[o + 1] = (lum + (g0 - lum) * s - 128) * k + 128
      out[o + 2] = (lum + (b0 - lum) * s - 128) * k + 128
    }
  }

  return out
}

export interface QuantizeOptions {
  /** 颜色抖动（Floyd–Steinberg，弱强度），色彩过渡更自然但会有噪点 */
  dither?: boolean
  /** 去杂点：孤立且颜色接近的格子并到周围，不伤眼睛与高光 */
  despeckle?: boolean
}

/**
 * 把每格颜色匹配到色板。
 * 结果写进新数组，不改输入。
 */
export function quantize(
  src: Uint8ClampedArray,
  n: number,
  blocks: readonly PaletteBlock[],
  options: QuantizeOptions = {},
): Int16Array {
  const total = n * n
  const out = new Int16Array(total)

  // 同一个颜色在相邻格子里反复出现，按 6bit 量化后缓存，能省掉绝大多数重复计算
  const cache = new Map<number, number>()
  const pick = (r: number, g: number, b: number): number => {
    const key = (r >> 2) * 65536 + (g >> 2) * 256 + (b >> 2)
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    const lab = rgbToLab(r, g, b)
    const v = findNearest(lab, blocks)
    cache.set(key, v)
    return v
  }

  if (!options.dither) {
    for (let i = 0; i < total; i++) {
      const p = i * 4
      if (src[p + 3]! < 128) {
        out[i] = EMPTY
        continue
      }
      out[i] = pick(src[p]!, src[p + 1]!, src[p + 2]!)
    }
  } else {
    const buf = new Float32Array(total * 3)
    for (let i = 0; i < total; i++) {
      const p = i * 4
      buf[i * 3] = src[p]!
      buf[i * 3 + 1] = src[p + 1]!
      buf[i * 3 + 2] = src[p + 2]!
    }

    const add = (x: number, y: number, er: number, eg: number, eb: number) => {
      if (x < 0 || x >= n || y < 0 || y >= n) return
      const j = (y * n + x) * 3
      buf[j] += er
      buf[j + 1] += eg
      buf[j + 2] += eb
    }

    const STRENGTH = 0.5

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x
        const p = i * 4
        if (src[p + 3]! < 128) {
          out[i] = EMPTY
          continue
        }
        const bi = i * 3
        const r = Math.max(0, Math.min(255, buf[bi]!))
        const g = Math.max(0, Math.min(255, buf[bi + 1]!))
        const b = Math.max(0, Math.min(255, buf[bi + 2]!))

        const k = pick(r, g, b)
        out[i] = k

        const c = blocks[k]!.rgb
        const er = (r - c[0]) * STRENGTH
        const eg = (g - c[1]) * STRENGTH
        const eb = (b - c[2]) * STRENGTH
        add(x + 1, y, er * 0.4375, eg * 0.4375, eb * 0.4375)
        add(x - 1, y + 1, er * 0.1875, eg * 0.1875, eb * 0.1875)
        add(x, y + 1, er * 0.3125, eg * 0.3125, eb * 0.3125)
        add(x + 1, y + 1, er * 0.0625, eg * 0.0625, eb * 0.0625)
      }
    }
  }

  if (options.despeckle) despeckle(out, n, src, blocks)
  return out
}

/**
 * 去杂点。
 *
 * 只在满足三个条件时才替换：四邻没有同色、周围至少有三种颜色、
 * 且该格原色与要替换成的方块确实接近（Lab 距离 < 11）。
 * 这个保守策略是为了不把眼睛高光、边缘过渡给抹掉。
 */
export function despeckle(
  out: Int16Array,
  n: number,
  src: Uint8ClampedArray,
  blocks: readonly PaletteBlock[],
): void {
  const copy = Int16Array.from(out)
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x
      const k = copy[i]!
      // 空格（-1）跳过；负值一律视为空
      if (k < 0) continue

      let same = 0
      let count = 0
      const tally = new Map<number, number>()

      for (let d = 0; d < 4; d++) {
        const nx = x + dirs[d]![0]
        const ny = y + dirs[d]![1]
        if (nx < 0 || nx >= n || ny < 0 || ny >= n) continue
        const nk = copy[ny * n + nx]!
        if (nk < 0) continue
        count++
        if (nk === k) same++
        tally.set(nk, (tally.get(nk) ?? 0) + 1)
      }

      if (same > 0 || count < 3) continue

      let bestK = -1
      let bestC = 0
      tally.forEach((v, key) => {
        if (v > bestC) {
          bestC = v
          bestK = key
        }
      })

      if (bestK < 0 || bestC < 3) continue

      const p = i * 4
      const lab = rgbToLab(src[p]!, src[p + 1]!, src[p + 2]!)
      if (labDist(lab, blocks[bestK]!.lab) < 11) out[i] = bestK
    }
  }
}

/**
 * 把人工编辑过的格子盖回算法结果。
 *
 * manual[i] = 1 表示这格是人画的；manualBlock[i] 记全表下标，
 * -1 表示手动擦成空格，-2 表示没动过。
 * 全表下标的好处是换色板后依然能找到同一个方块，找不到就按颜色重新匹配。
 */
export function applyManual(
  out: Int16Array,
  manual: Uint8Array | null,
  manualBlock: Int16Array | null,
  blocks: readonly PaletteBlock[],
  allBlocks: readonly PaletteBlock[],
): void {
  if (!manual || !manualBlock) return

  const lookup = new Map<string, number>()
  blocks.forEach((b, j) => lookup.set(b.id, j))

  for (let i = 0; i < out.length; i++) {
    if (!manual[i]) continue
    const all = manualBlock[i]!
    if (all === -1) {
      out[i] = EMPTY
      continue
    }
    if (all < 0) continue

    const src = allBlocks[all]
    if (!src) continue

    let j = lookup.get(src.id)
    if (j === undefined) j = findNearest(src.lab, blocks)
    out[i] = j
  }
}
