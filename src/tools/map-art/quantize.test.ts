import { describe, expect, it } from 'vitest'
import {
  ciede2000,
  linearToSrgb,
  rgbToLab,
  srgbToLinear,
  type Lab,
} from '@/core/color'
import { COLOR_BY_ID, DATA_COLORS, FLAT_COLORS, MAP_COLORS, STAIRCASE_COLORS } from './map-colors'
import { MAP_PIXELS, MAP_SIZE, type ColorOptions, type DitherMode } from './model'
import { quantize } from './quantize'

function solid(r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  const grid = new Uint8ClampedArray(MAP_PIXELS * 4)
  for (let i = 0; i < MAP_PIXELS; i++) {
    const p = i * 4
    grid[p] = r
    grid[p + 1] = g
    grid[p + 2] = b
    grid[p + 3] = a
  }
  return grid
}

function gradient(): Uint8ClampedArray {
  const grid = new Uint8ClampedArray(MAP_PIXELS * 4)
  for (let i = 0; i < MAP_PIXELS; i++) {
    const p = i * 4
    grid[p] = i % 256
    grid[p + 1] = Math.floor(i / 256) % 256
    grid[p + 2] = (i * 3) % 256
    grid[p + 3] = 255
  }
  return grid
}

function opts(o: Partial<ColorOptions> = {}): ColorOptions {
  return { dither: 'none', strength: 100, despeckle: false, ...o }
}

/**
 * 抖动要保住的是「局部平均色」而不是单格色差：按 4×4 块在线性光里求均值，
 * 再比原图与结果的 CIEDE2000。这个指标能挡住「看着还行、渐变其实断层」的回归。
 */
function blockError(grid: Uint8ClampedArray, colors: Uint8Array): number {
  const B = 4
  const N = MAP_SIZE / B
  let sum = 0
  for (let by = 0; by < N; by++) {
    for (let bx = 0; bx < N; bx++) {
      let sr = 0, sg = 0, sb = 0, dr = 0, dg = 0, db = 0
      for (let dy = 0; dy < B; dy++) {
        for (let dx = 0; dx < B; dx++) {
          const i = (by * B + dy) * MAP_SIZE + bx * B + dx
          const p = i * 4
          sr += srgbToLinear(grid[p]!)
          sg += srgbToLinear(grid[p + 1]!)
          sb += srgbToLinear(grid[p + 2]!)
          const c = COLOR_BY_ID.get(colors[i]!)
          if (c) {
            dr += srgbToLinear(c.rgb[0])
            dg += srgbToLinear(c.rgb[1])
            db += srgbToLinear(c.rgb[2])
          }
        }
      }
      const n = B * B
      const a = rgbToLab(linearToSrgb(sr / n), linearToSrgb(sg / n), linearToSrgb(sb / n))
      const b: Lab = rgbToLab(linearToSrgb(dr / n), linearToSrgb(dg / n), linearToSrgb(db / n))
      sum += ciede2000(a[0], a[1], a[2], b[0], b[1], b[2])
    }
  }
  return sum / (N * N)
}

describe('线性光转换', () => {
  it('sRGB → 线性光 → sRGB 可逆，且 0 / 255 落在端点', () => {
    expect(srgbToLinear(0)).toBe(0)
    expect(srgbToLinear(255)).toBeCloseTo(1, 6)
    for (const v of [12, 64, 128, 200, 250]) {
      expect(linearToSrgb(srgbToLinear(v))).toBeCloseTo(v, 4)
    }
  })
})

describe('quantize', () => {
  it('纯白匹配到雪的亮档，色差为 0', () => {
    const r = quantize(solid(255, 255, 255), MAP_COLORS, opts())
    expect(r.colors).toHaveLength(MAP_PIXELS)
    expect(r.colors.every((id) => id === 34)).toBe(true)
    expect(r.used).toBe(1)
    expect(r.transparent).toBe(0)
    expect(r.meanError).toBeCloseTo(0, 5)
  })

  it('全透明写色号 0，不参与色差统计', () => {
    const r = quantize(solid(0, 0, 0, 0), MAP_COLORS, opts())
    expect(r.colors.every((id) => id === 0)).toBe(true)
    expect(r.transparent).toBe(MAP_PIXELS)
    expect(r.used).toBe(0)
    expect(r.meanError).toBe(0)
  })

  it('误差扩散强度为 0 时与「无抖动」逐格一致', () => {
    const g = gradient()
    const a = quantize(g, MAP_COLORS, opts())
    const b = quantize(g, MAP_COLORS, opts({ dither: 'floyd', strength: 0 }))
    expect(Array.from(b.colors)).toEqual(Array.from(a.colors))
  })

  it('五种抖动都只产出合法色号，有序抖动是确定性的', () => {
    const g = gradient()
    const valid = (bytes: Uint8Array) =>
      Array.from(bytes).every((id) => id === 0 || COLOR_BY_ID.has(id))

    const modes: DitherMode[] = ['none', 'floyd', 'atkinson', 'bayer', 'bayer8']
    for (const dither of modes) {
      const r = quantize(g, MAP_COLORS, opts({ dither }))
      expect(valid(r.colors)).toBe(true)
      expect(r.histogram.reduce((n, v) => n + v, 0)).toBe(MAP_PIXELS)
      expect(Number.isFinite(r.meanError)).toBe(true)
    }

    const a = quantize(g, MAP_COLORS, opts({ dither: 'bayer8', strength: 100 }))
    const b = quantize(g, MAP_COLORS, opts({ dither: 'bayer8', strength: 7 }))
    expect(Array.from(b.colors)).toEqual(Array.from(a.colors))
  })

  it('平铺色板只产出 220 档', () => {
    const r = quantize(gradient(), FLAT_COLORS, opts())
    expect(r.colors.every((id) => id === 0 || id % 4 === 1)).toBe(true)
  })

  it('阶梯色板只用前三档', () => {
    const r = quantize(gradient(), STAIRCASE_COLORS, opts({ dither: 'floyd' }))
    expect(r.colors.every((id) => id === 0 || id % 4 !== 3)).toBe(true)
  })

  it('去孤立噪点不会把整片纯色抹花，输出仍是合法色号', () => {
    const g = solid(128, 100, 80)
    const a = quantize(g, MAP_COLORS, opts({ dither: 'none' }))
    const b = quantize(g, MAP_COLORS, opts({ dither: 'none', despeckle: true }))
    expect(Array.from(b.colors)).toEqual(Array.from(a.colors))
    expect(Array.from(b.colors).every((id) => id === 0 || COLOR_BY_ID.has(id))).toBe(true)
  })

  it('线性光误差扩散比不抖动更能保住渐变（4×4 平均色）', () => {
    const g = new Uint8ClampedArray(MAP_PIXELS * 4)
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const p = (y * MAP_SIZE + x) * 4
        g[p] = 10 + y * 1.6
        g[p + 1] = 10 + y * 1.2
        g[p + 2] = 30 + y * 0.6
        g[p + 3] = 255
      }
    }
    const dithered = quantize(g, DATA_COLORS, opts({ dither: 'floyd', strength: 70 }))
    const plain = quantize(g, DATA_COLORS, opts({ dither: 'none' }))
    expect(blockError(g, dithered.colors)).toBeLessThan(blockError(g, plain.colors))
    expect(blockError(g, dithered.colors)).toBeLessThan(2)
  })

  it('网格尺寸不对时直接报错，不写出半截文件', () => {
    expect(() => quantize(new Uint8ClampedArray(16), MAP_COLORS, opts())).toThrow('128×128')
  })
})
