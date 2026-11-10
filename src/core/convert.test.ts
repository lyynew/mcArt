import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EMPTY, quantize, sampleGrid } from './convert'
import { ALL_BLOCKS, type PaletteBlock } from './palettes'

interface ConvertFixture {
  n: number
  paletteIds: string[]
  src: number[]
  cases: Record<'plain' | 'dither' | 'despeckle' | 'ditherDespeckle', number[]>
}

const fixture: ConvertFixture = JSON.parse(
  readFileSync(new URL('../../tests/fixtures/convert.json', import.meta.url), 'utf8'),
)

const palette: PaletteBlock[] = fixture.paletteIds.map((id, i) => {
  const found = ALL_BLOCKS.find((b) => b.id === id)
  if (!found) throw new Error(`fixture 引用了不存在的方块：${id}`)
  return { ...found, i }
})

const src = Uint8ClampedArray.from(fixture.src)

/**
 * 这组用例是旧版实现的真实输出。
 * 四种组合必须逐格一致，否则用户之前存的图纸重新打开就会变样。
 */
describe('quantize 与旧版一致', () => {
  it('纯匹配', () => {
    expect(Array.from(quantize(src, fixture.n, palette))).toEqual(fixture.cases.plain)
  })

  it('抖动', () => {
    // 旧版的固定强度 0.5 == 现在的 floyd + 默认强度 50
    expect(Array.from(quantize(src, fixture.n, palette, { dither: 'floyd' }))).toEqual(
      fixture.cases.dither,
    )
  })

  it('去杂点', () => {
    expect(Array.from(quantize(src, fixture.n, palette, { despeckle: true }))).toEqual(
      fixture.cases.despeckle,
    )
  })

  it('抖动 + 去杂点', () => {
    expect(
      Array.from(quantize(src, fixture.n, palette, { dither: 'floyd', despeckle: true })),
    ).toEqual(fixture.cases.ditherDespeckle)
  })
})

describe('quantize 的抖动算法与强度', () => {
  it('强度 0 与不抖动逐格一致（误差扩散与有序抖动都成立）', () => {
    for (const mode of ['floyd', 'atkinson', 'bayer', 'bayer8'] as const) {
      expect(Array.from(quantize(src, fixture.n, palette, { dither: mode, strength: 0 }))).toEqual(
        fixture.cases.plain,
      )
    }
  })

  it('Bayer 是确定性的，同参数两次结果相同', () => {
    const a = Array.from(quantize(src, fixture.n, palette, { dither: 'bayer', strength: 80 }))
    const b = Array.from(quantize(src, fixture.n, palette, { dither: 'bayer', strength: 80 }))
    expect(a).toEqual(b)
  })

  it('四种算法满强度都只产出合法下标', () => {
    for (const mode of ['floyd', 'atkinson', 'bayer', 'bayer8'] as const) {
      const out = quantize(src, fixture.n, palette, { dither: mode, strength: 100 })
      expect(out.every((k) => k === EMPTY || (k >= 0 && k < palette.length))).toBe(true)
    }
  })
})

describe('quantize 的空格规则', () => {
  it('透明度低于 128 的格子留空', () => {
    const n = 2
    const s = new Uint8ClampedArray(n * n * 4)
    // 左上透明，其余为白色
    for (let i = 1; i < n * n; i++) {
      s[i * 4] = 255
      s[i * 4 + 1] = 255
      s[i * 4 + 2] = 255
      s[i * 4 + 3] = 255
    }
    const out = quantize(s, n, palette)
    expect(out[0]).toBe(EMPTY)
    expect(out[1]).not.toBe(EMPTY)
  })
})

describe('sampleGrid', () => {
  const solid = (n: number, r: number, g: number, b: number, a = 255) => {
    const px = new Uint8ClampedArray(n * n * 4)
    for (let i = 0; i < n * n; i++) {
      px[i * 4] = r
      px[i * 4 + 1] = g
      px[i * 4 + 2] = b
      px[i * 4 + 3] = a
    }
    return px
  }

  it('纯色图聚合后仍是同一个颜色', () => {
    const out = sampleGrid(solid(8, 10, 20, 30), 8, 2)
    expect(out.length).toBe(2 * 2 * 4)
    for (let i = 0; i < 4; i++) {
      expect(out[i * 4]).toBe(10)
      expect(out[i * 4 + 1]).toBe(20)
      expect(out[i * 4 + 2]).toBe(30)
      expect(out[i * 4 + 3]).toBe(255)
    }
  })

  it('全透明的图聚合后 alpha 为 0，颜色归零', () => {
    const out = sampleGrid(solid(4, 200, 100, 50, 0), 4, 2)
    for (let i = 0; i < 4; i++) {
      expect(out[i * 4 + 3]).toBe(0)
      expect(out[i * 4]).toBe(0)
    }
  })

  it('透明像素不参与颜色平均，不会把边缘拉黑', () => {
    const n = 4
    const px = new Uint8ClampedArray(n * n * 4)
    for (let i = 0; i < n * n; i++) {
      // 一半亮黄不透明，一半全透明（RGB 仍是 0）
      const opaque = i % 2 === 0
      px[i * 4] = opaque ? 255 : 0
      px[i * 4 + 1] = opaque ? 255 : 0
      px[i * 4 + 2] = opaque ? 0 : 0
      px[i * 4 + 3] = opaque ? 255 : 0
    }
    const out = sampleGrid(px, n, 1)
    expect(out[0]).toBe(255)
    expect(out[1]).toBe(255)
    // 半透明占比 50%，写进 Uint8ClampedArray 时 127.5 会被舍入到 128
    expect(out[3]).toBe(128)
  })

  it('调色参数为 0 时不改变颜色', () => {
    const a = sampleGrid(solid(8, 123, 45, 200), 8, 4, 0, 0)
    const b = sampleGrid(solid(8, 123, 45, 200), 8, 4)
    expect(Array.from(a)).toEqual(Array.from(b))
  })

  it('提高对比度会把颜色推离中灰', () => {
    const px = solid(4, 100, 100, 100)
    const out = sampleGrid(px, 4, 1, 60, 0)
    expect(out[0]).toBeLessThan(100)
  })
})
