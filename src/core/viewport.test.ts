import { describe, expect, it } from 'vitest'
import { anchorScrollDelta, clampCell, zoomStep } from './viewport'

describe('clampCell', () => {
  it('夹在上下限之间并取整', () => {
    expect(clampCell(0, 2, 64)).toBe(2)
    expect(clampCell(1000, 2, 64)).toBe(64)
    expect(clampCell(12.4, 2, 64)).toBe(12)
    expect(clampCell(12.6, 2, 64)).toBe(13)
  })
})

describe('zoomStep', () => {
  it('最小值再放大也涨得动，加法步进不会被取整吃掉', () => {
    expect(zoomStep(2, 1, 2, 64)).toBeGreaterThan(2)
    expect(zoomStep(2, -1, 2, 64)).toBe(2)
  })

  it('最大值再放大保持不动，缩小能下来', () => {
    expect(zoomStep(64, 1, 2, 64)).toBe(64)
    expect(zoomStep(64, -1, 2, 64)).toBeLessThan(64)
  })

  it('反复放大能一路走到上限', () => {
    let v = 2
    for (let i = 0; i < 60; i++) v = zoomStep(v, 1, 2, 64)
    expect(v).toBe(64)
  })
})

describe('anchorScrollDelta', () => {
  it('没缩放、指针没动时不需要修正滚动', () => {
    // 画布左缘 100、指针 300、锚点格 10、每格 20px：100 - (300 - 200) = 0
    expect(anchorScrollDelta(100, 300, 10, 20)).toBe(0)
  })

  it('锚点格被推到指针右边/左边时给出对应补偿', () => {
    expect(anchorScrollDelta(100, 180, 10, 20)).toBe(120)
    expect(anchorScrollDelta(100, 420, 10, 20)).toBe(-120)
  })

  it('锚点可越界（指针落在画布外留白）', () => {
    expect(anchorScrollDelta(100, 300, -2, 20)).toBeLessThan(0)
  })
})
