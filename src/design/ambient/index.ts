/* 背景环境层：对外只有工厂与图案库 */

export { createAmbientField } from './field'
export type { AmbientField, AmbientOptions } from './field'
export { elementBudget, overlaps, pickSpot } from './grid'
export type { Rect, SpotQuery } from './grid'
export { PATTERNS, parsePattern, scatterPattern } from './patterns'
export type { Pattern, PatternCell, PatternTone } from './patterns'
export { DEFAULT_AMBIENT_CONFIG, resolveAmbientConfig } from './config'
export type { AmbientConfig } from './config'
