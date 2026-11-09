/**
 * 原图 → 128×128 的 RGBA 网格。
 *
 * 调色的对比度 / 饱和度直接复用 core/convert.ts 的 sampleGrid，
 * 不在地图画里再写一遍公式。两种采样的差别只在「缩到 128 之前」：
 *   smooth —— 区域加权平均，照片的渐变更顺
 *   pixel  —— 先按最近邻取点，再走一遍 sampleGrid（此时 1×1，只负责调色），
 *             像素画的硬边不会被抹圆
 */
import { sampleGrid } from '@/core/convert'
import type { SquareImage } from '@/core/image'
import { MAP_SIZE, type ImageOptions } from './model'

/** 最近邻缩到 n×n：每格只取中心那一个像素 */
function nearestGrid(px: Uint8ClampedArray, size: number, n: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(n * n * 4)
  for (let y = 0; y < n; y++) {
    const sy = Math.min(size - 1, Math.floor(((y + 0.5) * size) / n))
    for (let x = 0; x < n; x++) {
      const sx = Math.min(size - 1, Math.floor(((x + 0.5) * size) / n))
      const from = (sy * size + sx) * 4
      const to = (y * n + x) * 4
      out[to] = px[from]!
      out[to + 1] = px[from + 1]!
      out[to + 2] = px[from + 2]!
      out[to + 3] = px[from + 3]!
    }
  }
  return out
}

/** 透明像素填成实色；保留透明时它会被写成色号 0，游戏里就是未探索 */
function fillBackground(grid: Uint8ClampedArray, mode: ImageOptions['background']): void {
  if (mode === 'transparent') return
  const v = mode === 'white' ? 255 : 0
  for (let i = 0; i < grid.length; i += 4) {
    if (grid[i + 3]! >= 128) continue
    grid[i] = v
    grid[i + 1] = v
    grid[i + 2] = v
    grid[i + 3] = 255
  }
}

export function rasterize(source: SquareImage, options: ImageOptions): Uint8ClampedArray {
  const base =
    options.sampling === 'pixel'
      ? nearestGrid(source.pixels, source.size, MAP_SIZE)
      : source.pixels
  const size = options.sampling === 'pixel' ? MAP_SIZE : source.size

  const grid = sampleGrid(base, size, MAP_SIZE, options.contrast, options.saturation)
  fillBackground(grid, options.background)
  return grid
}
