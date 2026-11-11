/* 引擎内部用的几个数学小工具：不引依赖，也不想让每个文件各写一遍。 */

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v

export const clamp01 = (v: number): number => clamp(v, 0, 1)

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t

/** 减速：快进慢出，光标落位用 */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

/** 加减速：画框这类两头都要稳的动作 */
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
