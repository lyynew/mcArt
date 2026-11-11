import { describe, expect, it } from 'vitest'
import { parsePattern, PATTERNS } from './patterns'
import { PatternPool, patternKey } from './pool'

const random = (): number => 0.42

describe('PatternPool', () => {
  it('占满时返回 null，释放前不以重复图案补位', () => {
    const pool = new PatternPool(PATTERNS, random)
    const selected = PATTERNS.map(() => pool.acquire(() => true)!)
    expect(new Set(selected.map((pattern) => pattern.name)).size).toBe(PATTERNS.length)
    expect(pool.size).toBe(PATTERNS.length)
    expect(pool.acquire(() => true)).toBeNull()
    pool.release(selected[0])
    expect(pool.acquire(() => true)).toBe(selected[0])
  })

  it('名字不同、留白和格子顺序不同的同一幅画也共享占用', () => {
    const first = parsePattern('first', ['gg', 'xx'])
    const alias = parsePattern('alias', ['....', '.gg.', '.xx.', '....'])
    const reversed = { ...alias, cells: [...alias.cells].reverse() }
    expect(patternKey(first)).toBe(patternKey(reversed))
    const pool = new PatternPool([first, reversed], random)
    const owner = pool.acquire(() => true)!
    expect(pool.acquire(() => true)).toBeNull()
    pool.release(owner === first ? reversed : first)
    expect(pool.size).toBe(1)
    pool.release(owner)
    expect(pool.size).toBe(0)
  })

  it('失败落点不占位，并会继续尝试其他候选', () => {
    const pool = new PatternPool(PATTERNS, random)
    expect(pool.acquire(() => false)).toBeNull()
    expect(pool.size).toBe(0)
    expect(pool.acquire((pattern) => pattern.name === 'heart')?.name).toBe('heart')
  })

  it('公平轮换：每轮使用完整库后才重复，连续运行占用数量有界', () => {
    const pool = new PatternPool(PATTERNS, random)
    for (let round = 0; round < 100; round += 1) {
      const seen = new Set<string>()
      for (let i = 0; i < PATTERNS.length; i += 1) {
        const pattern = pool.acquire(() => true)!
        seen.add(pattern.name)
        pool.release(pattern)
        expect(pool.size).toBe(0)
      }
      expect(seen.size).toBe(PATTERNS.length)
    }
    pool.clear()
    expect(pool.size).toBe(0)
  })

  it('拒绝重名和空图案', () => {
    expect(() => new PatternPool([PATTERNS[0], PATTERNS[0]], random)).toThrow(/重名/)
    expect(() => new PatternPool([{ name: 'empty', cols: 1, rows: 1, cells: [] }], random)).toThrow(/无效/)
    expect(() => new PatternPool([{ ...PATTERNS[0], cols: NaN }], random)).toThrow(/无效/)
    expect(() => new PatternPool([{ ...PATTERNS[0], cells: [PATTERNS[0].cells[0], PATTERNS[0].cells[0]] }], random)).toThrow(/重复像素/)
  })
})
