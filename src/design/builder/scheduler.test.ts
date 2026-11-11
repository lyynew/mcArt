import { describe, expect, it } from 'vitest'
import { pickIdleSpot, pickNearest, type Pickable } from './scheduler'

const pool = (spots: Array<[number, number]>): Pickable[] =>
  spots.map(([x, y], index) => ({ index, x, y }))

describe('pickNearest', () => {
  it('没有待施工的块时返回 null', () => {
    expect(pickNearest([], { x: 0, y: 0 })).toBeNull()
  })

  it('只有一块就选它', () => {
    expect(pickNearest(pool([[500, 500]]), { x: 0, y: 0 })).toBe(0)
  })

  it('在窗口内挑离光标最近的', () => {
    const spots = pool([
      [0, 900],
      [0, 10],
      [0, 700],
    ])
    expect(pickNearest(spots, { x: 0, y: 0 })).toBe(1)
  })

  it('窗口之外的块再近也不选，保证大体从上往下建', () => {
    const spots = pool([
      [0, 0],
      [0, 500],
      [0, 900],
      [0, 20],
    ])
    // 第 4 块（index 3）离光标最近，但它不在前三块里
    expect(pickNearest(spots, { x: 0, y: 30 }, 3)).toBe(0)
    expect(pickNearest(spots, { x: 0, y: 30 }, 1)).toBe(0)
  })

  it('窗口比队列长时不会越界', () => {
    expect(pickNearest(pool([[0, 0]]), { x: 0, y: 0 }, 10)).toBe(0)
  })
})

describe('pickIdleSpot', () => {
  const bounds = { x: 0, y: 0, w: 100, h: 100 }

  it('取离其他光标最远的候选点', () => {
    // 固定随机序列，保证用例可重复
    const sequence = [0, 0, 0.05, 0.05, 0.9, 0.9, 0.5, 0.5]
    let cursor = 0
    const random = () => sequence[cursor++ % sequence.length]

    const spot = pickIdleSpot(bounds, [{ x: 2, y: 2 }], random, 4)
    expect(spot).toEqual({ x: 90, y: 90 })
  })

  it('没有其他光标时也落在范围内', () => {
    const spot = pickIdleSpot(bounds, [], () => 0.5)
    expect(spot.x).toBeGreaterThanOrEqual(bounds.x)
    expect(spot.y).toBeGreaterThanOrEqual(bounds.y)
  })
})
