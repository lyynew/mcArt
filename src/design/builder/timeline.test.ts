import { describe, expect, it } from 'vitest'
import { blockDuration, exposeOf, poseOf, travelDuration, typedOf } from './timeline'
import type { BuildKind, Rect } from './types'

const RECT: Rect = { x: 100, y: 200, w: 240, h: 60 }
const KINDS: BuildKind[] = ['head', 'text', 'card', 'rule']

describe('blockDuration', () => {
  it('每种块的时长都是正数', () => {
    for (const kind of KINDS) expect(blockDuration(kind)).toBeGreaterThan(0)
  })

  it('标题按字数变长，段落有上限，不会拖太久', () => {
    expect(blockDuration('head', 20)).toBeGreaterThan(blockDuration('head', 5))
    expect(blockDuration('text', 400)).toBe(blockDuration('text', 1000))
  })
})

describe('exposeOf', () => {
  it('起点不显、终点全显（标题靠字符 span 控制，恒为 1）', () => {
    for (const kind of ['text', 'card', 'rule'] as BuildKind[]) {
      expect(exposeOf(kind, 0)).toBe(0)
    }
    expect(exposeOf('head', 0)).toBe(1)
    for (const kind of KINDS) expect(exposeOf(kind, 1)).toBe(1)
  })

  it('卡片前 30% 还在画框，元素不该透出来', () => {
    expect(exposeOf('card', 0.29)).toBe(0)
    expect(exposeOf('card', 0.6)).toBeGreaterThan(0)
  })

  it('进度单调不减', () => {
    let previous = -1
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const value = exposeOf('text', p)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })
})

describe('typedOf', () => {
  it('只有标题逐字显形', () => {
    expect(typedOf('text', 1, 40)).toBe(0)
    expect(typedOf('head', 1, 12)).toBe(12)
  })

  it('飞入阶段一个字都不显，避免边飞边打字', () => {
    expect(typedOf('head', 0.1, 12)).toBe(0)
  })

  it('字数不会超过实际字符数', () => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const n = typedOf('head', p, 7)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(7)
    }
  })
})

describe('poseOf', () => {
  it('标题打字时用文本竖线，并落在 caret 上', () => {
    const pose = poseOf('head', RECT, 0.6, { x: 150, y: 210, h: 30 })
    expect(pose.tool).toBe('ibeam')
    expect(pose.x).toBe(150)
    expect(pose.y).toBe(225)
  })

  it('卡片先画选框：十字 + 按下，从左上走到右下', () => {
    const start = poseOf('card', RECT, 0)
    const mid = poseOf('card', RECT, 0.25)
    expect(start.tool).toBe('cross')
    expect(start.down).toBe(true)
    expect(mid.x).toBeGreaterThan(start.x)
    expect(mid.y).toBeGreaterThan(start.y)
  })

  it('擦除阶段光标走在元素中部，并且是按下状态', () => {
    const pose = poseOf('text', RECT, 0.5)
    expect(pose.down).toBe(true)
    expect(pose.y).toBeCloseTo(RECT.y + RECT.h / 2, 5)
    expect(pose.x).toBeGreaterThan(RECT.x)
    expect(pose.x).toBeLessThan(RECT.x + RECT.w)
  })

  it('所有形态在任意进度下都给出有限坐标', () => {
    for (const kind of KINDS) {
      for (let p = 0; p <= 1.0001; p += 0.1) {
        const pose = poseOf(kind, RECT, p)
        expect(Number.isFinite(pose.x)).toBe(true)
        expect(Number.isFinite(pose.y)).toBe(true)
      }
    }
  })
})

describe('travelDuration', () => {
  it('近距离不会瞬移，远距离也有上限', () => {
    expect(travelDuration(0)).toBeGreaterThanOrEqual(0.16)
    expect(travelDuration(99999)).toBeLessThanOrEqual(0.42)
  })
})
