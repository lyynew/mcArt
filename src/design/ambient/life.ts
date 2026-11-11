/* ============================================================
   背景元素的「时间函数」
   ------------------------------------------------------------
   全是纯计算：给年龄、坐标、时间，算出不透明度和权重，不碰 DOM，
   也不持有状态。这样节奏可以单测，调参不用开浏览器。

   一个元素的寿命分三段：浮现（逐格错峰）→ 停留（呼吸）→ 消散。
   错峰是关键：整块同时亮起来像贴图，逐格亮起来才像有人在拼。
   ============================================================ */

export type ElementStage = 'in' | 'hold' | 'out'

export interface LifeWindow {
  readonly fadeIn: number
  readonly hold: number
  readonly fadeOut: number
}

export interface StageState {
  readonly stage: ElementStage
  /** in / out 的进度 0..1；hold 恒为 1 */
  readonly t: number
}

/** 错峰占了浮现阶段的多大比例：这部分的显形被摊薄，其余留给真正的淡入 */
const DELAY_SPREAD = 0.58

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/** 元素总寿命 */
export function lifeSpan(life: LifeWindow): number {
  return life.fadeIn + life.hold + life.fadeOut
}

/** 按年龄判断处在哪一段 */
export function stageOf(age: number, life: LifeWindow): StageState {
  const { fadeIn, hold, fadeOut } = life
  if (!(age > 0)) return { stage: 'in', t: 0 }
  if (age < fadeIn) return { stage: 'in', t: age / fadeIn }
  if (age < fadeIn + hold) return { stage: 'hold', t: 1 }
  return { stage: 'out', t: clamp01((age - fadeIn - hold) / fadeOut) }
}

/**
 * 单格的显形权重。
 *
 * `radius` 是这一格到图案中心的归一化距离（0 中心，1 最远），`jitter`
 * 是固定的随机偏移（同一格每次都用它，图案才不会闪）。近距离的格子
 * 先亮，远的后亮；`t` 是当前阶段的进度，`t = 1` 时全部为 1。
 */
export function revealWeight(radius: number, jitter: number, t: number): number {
  const delay = (clamp01(radius) * 0.7 + clamp01(jitter) * 0.3) * DELAY_SPREAD
  return clamp01((t - delay) / (1 - DELAY_SPREAD))
}

/** 停留期的呼吸：0.86–1.14 之间缓慢起伏，让静止的图案不至于像死图 */
export function breathe(time: number, seed: number): number {
  return 1 + 0.14 * Math.sin(time * 1.15 + seed * 6.2832)
}

/**
 * 斜向扫过的亮带：波峰从左上角走到右下角，每 period 秒一轮。
 *
 * 相位故意从 -0.2 走到 1.2，让波从屏幕外进来、再从屏幕外出去，
 * 循环点上没有跳变。返回 0..1 的提亮系数。
 */
export function sweep(
  time: number,
  gx: number,
  gy: number,
  cols: number,
  rows: number,
  period: number,
): number {
  const nx = cols > 1 ? gx / (cols - 1) : 0
  const ny = rows > 1 ? gy / (rows - 1) : 0
  const pos = (nx + ny) / 2
  const phase = ((time % period) / period) * 1.4 - 0.2
  const width = 0.085
  const d = Math.abs(pos - phase)
  if (d > width) return 0
  const k = 1 - d / width
  return k * k
}

/**
 * 取一格此刻该显示的字符：同一个 seed 每一帧稳定，每隔一段时间跳一次。
 * 用整数哈希而不是 Math.random，避免每帧都重新随机导致闪烁。
 */
export function glyphAt(chars: string, seed: number, time: number): string {
  if (!chars) return ''
  const slot = Math.floor((time + seed * 7.3) * 0.7)
  const hash = Math.imul(slot ^ Math.imul(seed * 2654435761, 0x9e3779b1), 0x85ebca6b)
  return chars[Math.abs(hash) % chars.length]
}
