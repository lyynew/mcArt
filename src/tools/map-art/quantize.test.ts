import { describe, expect, it } from 'vitest'
import { COLOR_BY_ID, FLAT_COLORS, MAP_COLORS } from './map-colors'
import { MAP_PIXELS, type ColorOptions } from './model'
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

const none: ColorOptions = { shades: 'all', dither: 'none', strength: 100 }

describe('quantize', () => {
  it('纯白匹配到雪的原色档，色差为 0', () => {
    const r = quantize(solid(255, 255, 255), MAP_COLORS, none)
    expect(r.colors).toHaveLength(MAP_PIXELS)
    expect(r.colors.every((id) => id === 34)).toBe(true)
    expect(r.used).toBe(1)
    expect(r.transparent).toBe(0)
    expect(r.meanError).toBeCloseTo(0, 5)
  })

  it('全透明写色号 0，不参与色差统计', () => {
    const r = quantize(solid(0, 0, 0, 0), MAP_COLORS, none)
    expect(r.colors.every((id) => id === 0)).toBe(true)
    expect(r.transparent).toBe(MAP_PIXELS)
    expect(r.used).toBe(0)
    expect(r.meanError).toBe(0)
  })

  it('误差扩散强度为 0 时与「无抖动」逐格一致', () => {
    const g = gradient()
    const a = quantize(g, MAP_COLORS, none)
    const b = quantize(g, MAP_COLORS, { shades: 'all', dither: 'floyd', strength: 0 })
    expect(Array.from(b.colors)).toEqual(Array.from(a.colors))
  })

  it('三种抖动都只产出合法色号，且有序抖动是确定性的', () => {
    const g = gradient()
    const valid = (bytes: Uint8Array) =>
      Array.from(bytes).every((id) => id === 0 || COLOR_BY_ID.has(id))

    for (const dither of ['none', 'floyd', 'bayer'] as const) {
      const r = quantize(g, MAP_COLORS, { shades: 'all', dither, strength: 100 })
      expect(valid(r.colors)).toBe(true)
      expect(r.histogram.reduce((n, v) => n + v, 0)).toBe(MAP_PIXELS)
      expect(Number.isFinite(r.meanError)).toBe(true)
    }

    const a = quantize(g, MAP_COLORS, { shades: 'all', dither: 'bayer', strength: 100 })
    const b = quantize(g, MAP_COLORS, { shades: 'all', dither: 'bayer', strength: 7 })
    expect(Array.from(b.colors)).toEqual(Array.from(a.colors))
  })

  it('平面色板只产出原色档', () => {
    const r = quantize(gradient(), FLAT_COLORS, none)
    expect(r.colors.every((id) => id === 0 || id % 4 === 2)).toBe(true)
  })

  it('网格尺寸不对时直接报错，不写出半截文件', () => {
    expect(() => quantize(new Uint8ClampedArray(16), MAP_COLORS, none)).toThrow('128×128')
  })
})
