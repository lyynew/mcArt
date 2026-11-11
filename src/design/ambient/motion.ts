/* 连续、可预测的小幅轨迹；不随机转向，不逐帧取整逻辑位置。 */
export interface Drift {
  readonly phase: number
  readonly period: number
  readonly amplitude: number
}

export function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

/** 整个运动包络都在占位矩形内；年龄零的位移为零，淡入不会突然挪动。 */
export function driftAt(age: number, drift: Drift): { x: number; y: number } {
  const phase = (age / drift.period) * Math.PI * 2
  const ease = smoothstep(age / 2)
  return {
    x: Math.sin(phase) * drift.amplitude * ease,
    y: (Math.cos(phase + drift.phase) - Math.cos(drift.phase)) * drift.amplitude * 0.5 * ease,
  }
}
