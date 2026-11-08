import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ciede2000, findNearest, hexToRgb, rgbToLab, type Lab } from './color'
import { ALL_BLOCKS, type PaletteBlock } from './palettes'

interface ColorFixture {
  paletteIds: string[]
  colorCases: { p: Lab; q: Lab; d: number }[]
  rgbCases: { r: number; g: number; b: number; lab: Lab; nearest: number }[]
}

const fixture: ColorFixture = JSON.parse(
  readFileSync(new URL('../../tests/fixtures/color.json', import.meta.url), 'utf8'),
)

/** 按 fixture 里的顺序取方块，findNearest 的下标才有可比性 */
const palette: PaletteBlock[] = fixture.paletteIds.map((id, i) => {
  const found = ALL_BLOCKS.find((b) => b.id === id)
  if (!found) throw new Error(`fixture 引用了不存在的方块：${id}`)
  return { ...found, i }
})

describe('hexToRgb', () => {
  it('解析标准色值', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255])
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
    expect(hexToRgb('#cfd5d6')).toEqual([207, 213, 214])
  })
})

describe('rgbToLab', () => {
  it('白色落在 L=100、a/b 近似为 0', () => {
    const [L, a, b] = rgbToLab(255, 255, 255)
    expect(L).toBeCloseTo(100, 6)
    // sRGB→XYZ 的矩阵系数是四舍五入过的常量，纯白也算不出精确的 a=b=0，
    // 实测偏差约 0.005 / 0.010，属于实现本身的固有偏差，不是 bug
    expect(Math.abs(a)).toBeLessThan(0.05)
    expect(Math.abs(b)).toBeLessThan(0.05)
  })

  it('黑色是 L=0', () => {
    const [L, a, b] = rgbToLab(0, 0, 0)
    expect(L).toBeCloseTo(0, 6)
    expect(a).toBeCloseTo(0, 6)
    expect(b).toBeCloseTo(0, 6)
  })

  it('与旧版实现逐组一致（60 组随机色）', () => {
    for (const c of fixture.rgbCases) {
      const got = rgbToLab(c.r, c.g, c.b)
      expect(got[0]).toBeCloseTo(c.lab[0], 10)
      expect(got[1]).toBeCloseTo(c.lab[1], 10)
      expect(got[2]).toBeCloseTo(c.lab[2], 10)
    }
  })
})

describe('ciede2000', () => {
  /**
   * Sharma 等人的标准测试数据，用来确认公式本身是对的。
   * 只靠「和旧版一致」不够——两边一起写错就查不出来了。
   */
  it('对得上公开参考值', () => {
    expect(ciede2000(50, 2.6772, -79.7751, 50, 0, -82.7485)).toBeCloseTo(2.0425, 3)
    expect(ciede2000(50, 0, 0, 50, -1, 2)).toBeCloseTo(2.3669, 3)
  })

  it('自身距离为 0', () => {
    expect(ciede2000(50, 20, -30, 50, 20, -30)).toBeCloseTo(0, 12)
  })

  it('与旧版实现逐组一致（240 组随机 Lab）', () => {
    for (const c of fixture.colorCases) {
      const got = ciede2000(c.p[0], c.p[1], c.p[2], c.q[0], c.q[1], c.q[2])
      expect(got).toBeCloseTo(c.d, 10)
    }
  })
})

describe('findNearest', () => {
  it('与旧版实现选出同一个方块（60 组随机色）', () => {
    for (const c of fixture.rgbCases) {
      expect(findNearest(c.lab, palette)).toBe(c.nearest)
    }
  })

  it('色板为空时返回 -1，而不是崩掉', () => {
    expect(findNearest([50, 0, 0], [])).toBe(-1)
  })

  it('能找回到方块自身的颜色', () => {
    for (const b of palette) {
      expect(findNearest(b.lab, palette)).toBe(b.i)
    }
  })
})
