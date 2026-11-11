import { describe, expect, it } from 'vitest'
import { elementBudget, overlaps, pickSpot, weightedIndex, type Rect } from './grid'

/** 固定种子的随机数，测试要可复现 */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('overlaps', () => {
  it('相交与不相交', () => {
    const a: Rect = { x: 0, y: 0, w: 4, h: 4 }
    expect(overlaps(a, { x: 2, y: 2, w: 4, h: 4 })).toBe(true)
    expect(overlaps(a, { x: 4, y: 0, w: 4, h: 4 })).toBe(false)
  })

  it('留白会算成相交，元素之间才有间距', () => {
    const a: Rect = { x: 0, y: 0, w: 4, h: 4 }
    expect(overlaps(a, { x: 4, y: 0, w: 4, h: 4 }, 2)).toBe(true)
    expect(overlaps(a, { x: 8, y: 0, w: 4, h: 4 }, 2)).toBe(false)
  })
})

describe('weightedIndex', () => {
  it('按权重落在对应区间', () => {
    expect(weightedIndex([1, 0, 0], () => 0)).toBe(0)
    expect(weightedIndex([0, 1, 0], () => 0.5)).toBe(1)
    expect(weightedIndex([0, 0, 1], () => 0.99)).toBe(2)
  })

  it('权重全零时退化成第一个，不抛错', () => {
    expect(weightedIndex([0, 0], () => 0.7)).toBe(0)
  })
})

describe('pickSpot', () => {
  it('放不下时返回 null，调用方直接跳过', () => {
    expect(pickSpot({ cols: 6, rows: 6, w: 8, h: 8, taken: [], rand: () => 0.5 })).toBeNull()
  })

  it('落点不超出网格', () => {
    const rand = seeded(11)
    for (let i = 0; i < 40; i += 1) {
      const spot = pickSpot({ cols: 30, rows: 20, w: 7, h: 6, taken: [], rand })
      expect(spot).not.toBeNull()
      expect(spot!.x).toBeGreaterThanOrEqual(0)
      expect(spot!.y).toBeGreaterThanOrEqual(0)
      expect(spot!.x + 7).toBeLessThanOrEqual(30)
      expect(spot!.y + 6).toBeLessThanOrEqual(20)
    }
  })

  it('与已有元素保持间距', () => {
    const rand = seeded(5)
    const taken: Rect[] = [{ x: 10, y: 8, w: 8, h: 8 }]
    for (let i = 0; i < 30; i += 1) {
      const spot = pickSpot({ cols: 40, rows: 24, w: 7, h: 6, taken, rand, pad: 2 })
      if (!spot) continue
      expect(overlaps({ x: spot.x, y: spot.y, w: 7, h: 6 }, taken[0], 2)).toBe(false)
    }
  })

  it('连续摆放会铺开到整块网格，不会挤在一个角落', () => {
    const rand = seeded(2024)
    const taken: Rect[] = []
    for (let i = 0; i < 8; i += 1) {
      const spot = pickSpot({ cols: 60, rows: 40, w: 8, h: 7, taken, rand, pad: 1 })
      expect(spot).not.toBeNull()
      taken.push({ x: spot!.x, y: spot!.y, w: 8, h: 7 })
    }
    // 纵向至少落在两个不同的带里，横向也跨过多个扇区
    const bands = new Set(taken.map((rect) => Math.floor(rect.y / 14)))
    const zones = new Set(taken.map((rect) => Math.floor(rect.x / 18)))
    expect(bands.size).toBeGreaterThanOrEqual(2)
    expect(zones.size).toBeGreaterThanOrEqual(2)
    expect(Math.max(...taken.map((rect) => rect.y))).toBeGreaterThan(18)
  })

  it('塞满之后返回 null 而不是叠上去', () => {
    const cols = 18
    const rows = 12
    const taken: Rect[] = []
    const rand = seeded(9)
    let last = 0
    for (let i = 0; i < 20; i += 1) {
      const spot = pickSpot({ cols, rows, w: 8, h: 7, taken, rand, pad: 3 })
      if (!spot) {
        last = i
        break
      }
      taken.push({ x: spot.x, y: spot.y, w: 8, h: 7 })
    }
    expect(last).toBeGreaterThan(0)
    expect(taken.length).toBeLessThan(4)
  })
})

describe('elementBudget', () => {
  it('随屏幕面积增长并封顶', () => {
    expect(elementBudget(17, 38)).toBe(3)
    expect(elementBudget(58, 41)).toBe(6)
    expect(elementBudget(200, 120)).toBe(7)
  })
})
