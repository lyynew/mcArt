import { describe, expect, it } from 'vitest'
import { driftAt, smoothstep } from './motion'

describe('continuous motion', () => {
  const drift = { phase: 1.3, period: 20, amplitude: 0.65 }
  it('起点位移为零，周期交界不跳变，逐帧移动很小', () => {
    expect(driftAt(0, drift)).toEqual({ x: 0, y: 0 })
    const before = driftAt(20 - 1e-5, drift)
    const after = driftAt(20 + 1e-5, drift)
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(0.00001)
    let last = driftAt(0, drift)
    for (let age = 1 / 60; age < 120; age += 1 / 60) {
      const point = driftAt(age, drift)
      if (Math.abs(point.x) > drift.amplitude || Math.abs(point.y) > drift.amplitude) throw new Error('超出占位包络')
      if (Math.hypot(point.x - last.x, point.y - last.y) > 0.02) throw new Error('运动跳变')
      last = point
    }
  })

  it('过渡权重单调，起终点速度接近零', () => {
    expect(smoothstep(-1)).toBe(0)
    expect(smoothstep(2)).toBe(1)
    expect(smoothstep(0.001)).toBeLessThan(0.00001)
    expect(1 - smoothstep(0.999)).toBeLessThan(0.00001)
    let last = 0
    for (let t = 0; t <= 1; t += 0.01) {
      expect(smoothstep(t)).toBeGreaterThanOrEqual(last)
      last = smoothstep(t)
    }
  })
})
