/* 环境层的视觉/节奏预算集中配置，不与 Vue 或 DOM 耦合。 */
import type { Pattern } from './patterns'

export interface AmbientConfig {
  readonly cell: number
  readonly compactBreakpoint: number
  readonly compactScale: number
  readonly compactCount: number
  readonly maxElements: number
  readonly maxTransitions: number
  readonly opacity: number
  readonly compactOpacity: number
  readonly maxFps: number
  readonly maxPixels: number
  readonly maxDpr: number
  readonly maxDelta: number
  /** 站点动效开关已作为唯一真相时，可显式忽略系统默认偏好。 */
  readonly honorReducedMotion: boolean
  readonly spawnInterval: number
  readonly retryInterval: number
  readonly fadeIn: number
  readonly hold: readonly [number, number]
  readonly fadeOut: number
  readonly driftCells: number
  readonly driftPeriod: readonly [number, number]
  readonly spacing: number
}

export interface AmbientOptions extends Partial<AmbientConfig> {
  readonly patterns?: readonly Pattern[]
  /** 可注入随机源，便于复现布局和测试长时间轮换。 */
  readonly random?: () => number
}

export const DEFAULT_AMBIENT_CONFIG: AmbientConfig = {
  // 与页面底纹的 22px 方格同格：图案才「长」在网格上，也才有原来的体量
  cell: 22,
  compactBreakpoint: 640,
  compactScale: 0.6,
  compactCount: 3,
  maxElements: 7,
  maxTransitions: 2,
  opacity: 0.2,
  compactOpacity: 0.55,
  maxFps: 60,
  maxDpr: 2,
  maxPixels: 8_000_000,
  maxDelta: 0.1,
  honorReducedMotion: true,
  spawnInterval: 0.85,
  retryInterval: 1,
  fadeIn: 1.8,
  hold: [12, 20],
  fadeOut: 2.2,
  driftCells: 1.1,
  driftPeriod: [12, 18],
  spacing: 2,
}

export function resolveAmbientConfig(options: AmbientOptions = {}): AmbientConfig {
  // 只选配置键，图案和随机源不混入视觉配置。
  const config = { ...DEFAULT_AMBIENT_CONFIG }
  for (const key of Object.keys(config) as Array<keyof AmbientConfig>) {
    const value = options[key]
    if (value !== undefined) Object.assign(config, { [key]: value })
  }
  if (typeof config.honorReducedMotion !== 'boolean') {
    throw new Error('背景配置 honorReducedMotion 必须是布尔值')
  }
  for (const [key, value] of Object.entries(config)) {
    if (key === 'honorReducedMotion') continue
    if (Array.isArray(value)) {
      if (value.length !== 2 || value.some((v) => !Number.isFinite(v) || v <= 0) || value[0] > value[1]) {
        throw new Error(`背景配置 ${key} 必须是递增的正数区间`)
      }
    } else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`背景配置 ${key} 必须是有限非负数`)
    }
  }
  for (const key of ['cell', 'compactBreakpoint', 'compactScale', 'maxFps', 'maxDpr', 'maxPixels', 'maxDelta', 'spawnInterval', 'retryInterval', 'fadeIn', 'fadeOut'] as const) {
    if (config[key] <= 0) throw new Error(`背景配置 ${key} 必须大于零`)
  }
  for (const key of ['maxElements', 'compactCount', 'maxTransitions'] as const) {
    if (!Number.isInteger(config[key])) throw new Error(`背景配置 ${key} 必须为整数`)
  }
  if (config.opacity > 1 || config.compactOpacity > 1 || config.compactScale > 1) {
    throw new Error('背景透明度和窄屏比例不能大于一')
  }
  return config
}
