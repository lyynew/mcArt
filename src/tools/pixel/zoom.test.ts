import { describe, expect, it } from 'vitest'
import { ZOOM_MAX, ZOOM_MIN } from './types'
import { clampZoom, zoomStep } from './zoom'

describe('clampZoom', () => {
  it('限制在允许区间内并取整', () => {
    expect(clampZoom(0)).toBe(ZOOM_MIN)
    expect(clampZoom(1)).toBe(ZOOM_MIN)
    expect(clampZoom(1000)).toBe(ZOOM_MAX)
    expect(clampZoom(12.4)).toBe(12)
    expect(clampZoom(12.6)).toBe(13)
  })
})

describe('zoomStep', () => {
  it('最小值时仍能放大 —— 这是曾经卡死的地方', () => {
    // 旧实现 2 × 1.15 = 2.3，取整回到 2，于是永远停在 2
    expect(zoomStep(ZOOM_MIN, 1)).toBeGreaterThan(ZOOM_MIN)
  })

  it('最小值时继续缩小保持不变', () => {
    expect(zoomStep(ZOOM_MIN, -1)).toBe(ZOOM_MIN)
  })

  it('最大值时继续放大保持不变', () => {
    expect(zoomStep(ZOOM_MAX, 1)).toBe(ZOOM_MAX)
  })

  it('从最小值连续放大，每一步都必须前进', () => {
    let v = ZOOM_MIN
    const visited = [v]
    for (let i = 0; i < 40 && v < ZOOM_MAX; i++) {
      const next = zoomStep(v, 1)
      expect(next).toBeGreaterThan(v)
      v = next
      visited.push(v)
    }
    expect(v).toBe(ZOOM_MAX)
    // 40 步之内必须能走完全程，否则手感太迟滞
    expect(visited.length).toBeLessThanOrEqual(41)
  })

  it('从最大值连续缩小，每一步都必须后退', () => {
    let v = ZOOM_MAX
    while (v > ZOOM_MIN) {
      const next = zoomStep(v, -1)
      expect(next).toBeLessThan(v)
      v = next
    }
    expect(v).toBe(ZOOM_MIN)
  })

  it('中间尺寸按比例步进', () => {
    expect(zoomStep(20, 1)).toBe(24)
    expect(zoomStep(20, -1)).toBe(16)
  })
})
