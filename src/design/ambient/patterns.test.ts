import { describe, expect, it } from 'vitest'
import { PATTERNS, parsePattern, scatterPattern } from './patterns'

describe('parsePattern', () => {
  it('解析出格子与尺寸', () => {
    const pattern = parsePattern('t', ['.##.', '#..#'])
    expect(pattern.cols).toBe(4)
    expect(pattern.rows).toBe(2)
    expect(pattern.cells).toHaveLength(4)
  })

  it('强调色按图例映射到 1/2/3/4', () => {
    const pattern = parsePattern('t', ['#gyrb'])
    expect(pattern.cells.map((cell) => cell.tone)).toEqual([0, 1, 2, 3, 4])
  })

  it('行宽不一致直接报错，别让错图案悄悄上线', () => {
    expect(() => parsePattern('t', ['##', '#'])).toThrow(/宽度/)
  })
})

describe('严格图案校验', () => {
  it('未知字符、空画面和空名称直接报错', () => {
    expect(() => parsePattern('t', ['?'])).toThrow(/未知/)
    expect(() => parsePattern('t', ['...'])).toThrow(/实体/)
    expect(() => parsePattern('', ['g'])).toThrow(/名称/)
    expect(() => parsePattern('t', [])).toThrow(/不能为空/)
  })
  it('泥土、高光和暗部遵循统一图例', () => {
    expect(parsePattern('t', ['ow lctd'.replace(' ', '')]).cells.map((cell) => cell.tone)).toEqual([6, 7, 8, 9, 10, 11])
  })
})

describe('内置图案', () => {
  it('尺寸都在 5–8 格，随机撒到整屏才均匀', () => {
    for (const pattern of PATTERNS) {
      expect(pattern.cols).toBeGreaterThanOrEqual(5)
      expect(pattern.cols).toBeLessThanOrEqual(8)
      expect(pattern.rows).toBeGreaterThanOrEqual(5)
      expect(pattern.rows).toBeLessThanOrEqual(8)
    }
  })

  it('格子都在图案范围内', () => {
    for (const pattern of PATTERNS) {
      for (const cell of pattern.cells) {
        expect(cell.x).toBeGreaterThanOrEqual(0)
        expect(cell.y).toBeGreaterThanOrEqual(0)
        expect(cell.x).toBeLessThan(pattern.cols)
        expect(cell.y).toBeLessThan(pattern.rows)
      }
    }
  })

  it('每个图案都有强调色，画面才有彩点', () => {
    for (const pattern of PATTERNS) {
      expect(pattern.cells.some((cell) => cell.tone > 0)).toBe(true)
    }
  })

  it('图案有足够的实体格子，不是几个散点的占位', () => {
    for (const pattern of PATTERNS) {
      expect(pattern.cells.length).toBeGreaterThan(pattern.cols * pattern.rows * 0.25)
    }
  })

  it('名字不重复，便于排查是哪张图', () => {
    const names = PATTERNS.map((pattern) => pattern.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('scatterPattern', () => {
  it('同种子结果一致，方便复现', () => {
    const a = scatterPattern(20, 12, 42)
    const b = scatterPattern(20, 12, 42)
    expect(a.cells).toEqual(b.cells)
  })

  it('格子不重复、不越界、数量与面积成正比', () => {
    const pattern = scatterPattern(20, 12, 3)
    const keys = new Set(pattern.cells.map((cell) => `${cell.x},${cell.y}`))
    expect(keys.size).toBe(pattern.cells.length)
    expect(pattern.cells.length).toBeGreaterThan(10)
    for (const cell of pattern.cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.x).toBeLessThan(20)
      expect(cell.y).toBeLessThan(12)
    }
  })
})
