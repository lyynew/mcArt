import { describe, expect, it } from 'vitest'
import { breathe, glyphAt, lifeSpan, revealWeight, stageOf, sweep, type LifeWindow } from './life'

const LIFE: LifeWindow = { fadeIn: 1, hold: 3, fadeOut: 1 }

describe('stageOf', () => {
  it('分三段：浮现 → 停留 → 消散', () => {
    expect(stageOf(0.5, LIFE).stage).toBe('in')
    expect(stageOf(2, LIFE).stage).toBe('hold')
    expect(stageOf(4.5, LIFE).stage).toBe('out')
  })

  it('各段的进度落在 0..1', () => {
    expect(stageOf(0.5, LIFE).t).toBeCloseTo(0.5)
    expect(stageOf(2, LIFE).t).toBe(1)
    expect(stageOf(4, LIFE).t).toBeCloseTo(0)
    expect(stageOf(4.5, LIFE).t).toBeCloseTo(0.5)
  })

  it('超出寿命封顶，不会算出负的不透明度', () => {
    expect(stageOf(99, LIFE).t).toBe(1)
    expect(lifeSpan(LIFE)).toBe(5)
  })
})

describe('revealWeight', () => {
  it('起点全暗、终点全亮', () => {
    for (const radius of [0, 0.5, 1]) {
      for (const jitter of [0, 0.5, 1]) {
        expect(revealWeight(radius, jitter, 0)).toBe(0)
        expect(revealWeight(radius, jitter, 1)).toBe(1)
      }
    }
  })

  it('离中心近的先亮，才有从中间扩散出去的感觉', () => {
    expect(revealWeight(0, 0.5, 0.4)).toBeGreaterThan(revealWeight(1, 0.5, 0.4))
  })

  it('越往后越亮，中间不会回跳', () => {
    let prev = -1
    for (let t = 0; t <= 1; t += 0.05) {
      const weight = revealWeight(0.3, 0.4, t)
      expect(weight).toBeGreaterThanOrEqual(prev)
      prev = weight
    }
  })
})

describe('breathe', () => {
  it('在 1 附近小幅起伏，不会把元素压没', () => {
    for (let t = 0; t < 12; t += 0.13) {
      const value = breathe(t, 0.42)
      expect(value).toBeGreaterThan(0.8)
      expect(value).toBeLessThan(1.2)
    }
  })
})

describe('sweep', () => {
  it('同一轮里只有一条窄带被点亮', () => {
    const period = 10
    const lit = []
    for (let gx = 0; gx < 60; gx += 1) {
      if (sweep(3, gx, 0, 60, 40, period) > 0.4) lit.push(gx)
    }
    expect(lit.length).toBeGreaterThan(0)
    expect(lit.length).toBeLessThan(40)
  })

  it('值域限制在 0..1', () => {
    for (let t = 0; t < 30; t += 0.37) {
      for (let gx = 0; gx < 40; gx += 3) {
        const value = sweep(t, gx, gx / 2, 40, 40, 13)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })

  it('周期性：经过一整轮回到同样的状态', () => {
    expect(sweep(2.4, 20, 10, 60, 40, 13)).toBeCloseTo(sweep(15.4, 20, 10, 60, 40, 13))
  })
})

describe('glyphAt', () => {
  const chars = '#%&@+'

  it('同一时刻同一格给出同一个字符，不会逐帧乱闪', () => {
    expect(glyphAt(chars, 0.31, 4.2)).toBe(glyphAt(chars, 0.31, 4.2))
  })

  it('结果一定在字符表里', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(chars).toContain(glyphAt(chars, i / 50, i * 0.31))
    }
  })

  it('时间推移会换字，看起来像还在敲', () => {
    const seen = new Set<string>()
    for (let t = 0; t < 6; t += 0.15) seen.add(glyphAt(chars, 0.5, t))
    expect(seen.size).toBeGreaterThan(1)
  })

  it('空字符表返回空串，不崩', () => {
    expect(glyphAt('', 0.5, 1)).toBe('')
  })
})
