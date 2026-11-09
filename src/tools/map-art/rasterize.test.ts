import { describe, expect, it } from 'vitest'
import type { SquareImage } from '@/core/image'
import { DEFAULT_IMAGE_OPTIONS, MAP_PIXELS, MAP_SIZE } from './model'
import { rasterize } from './rasterize'

function image(size: number, fill: (x: number, y: number) => [number, number, number, number]): SquareImage {
  const pixels = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = fill(x, y)
      const p = (y * size + x) * 4
      pixels[p] = r
      pixels[p + 1] = g
      pixels[p + 2] = b
      pixels[p + 3] = a
    }
  }
  return { pixels, size, name: 'test' }
}

describe('rasterize', () => {
  it('平滑采样把原图压到 128×128，纯色不变', () => {
    const grid = rasterize(image(256, () => [100, 150, 200, 255]), DEFAULT_IMAGE_OPTIONS)
    expect(grid.length).toBe(MAP_PIXELS * 4)
    expect(Array.from(grid.slice(0, 4))).toEqual([100, 150, 200, 255])
    expect(Array.from(grid.slice((MAP_PIXELS - 1) * 4))).toEqual([100, 150, 200, 255])
  })

  it('像素模式按最近邻取点，不把硬边抹圆', () => {
    const src = image(2, (x, y) => (x === 0 && y === 0 ? [10, 20, 30, 255] : [200, 100, 50, 255]))
    const grid = rasterize(src, { ...DEFAULT_IMAGE_OPTIONS, sampling: 'pixel' })
    // 每格取中心像素：2×2 原图映射到 128×128 时，左上角半区仍是 (0,0)
    expect(Array.from(grid.slice(0, 4))).toEqual([10, 20, 30, 255])
    const last = (MAP_SIZE - 1) * MAP_SIZE + (MAP_SIZE - 1)
    expect(Array.from(grid.slice(last * 4, last * 4 + 4))).toEqual([200, 100, 50, 255])
  })

  it('透明像素可填实色，调色参数生效', () => {
    const src = image(128, () => [200, 100, 100, 0])
    const transparent = rasterize(src, DEFAULT_IMAGE_OPTIONS)
    expect(transparent[3]).toBe(0)

    const white = rasterize(src, { ...DEFAULT_IMAGE_OPTIONS, background: 'white' })
    expect(Array.from(white.slice(0, 4))).toEqual([255, 255, 255, 255])

    const saturated = rasterize(image(128, () => [200, 100, 100, 255]), {
      ...DEFAULT_IMAGE_OPTIONS,
      saturation: 60,
    })
    expect(saturated[0]).toBeGreaterThan(200)
  })
})
