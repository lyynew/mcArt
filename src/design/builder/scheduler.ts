/* ============================================================
   任务调度：谁去建哪一块
   ------------------------------------------------------------
   纯函数，只关心坐标，不碰 DOM，方便单测。

   策略是「文档顺序 + 就近」：只在还没轮到的最多 window 块里挑
   离光标最近的一块。纯就近会让光标在页面上来回横跳；纯顺序又
   显得机械，取窗口能兼顾「从上往下建」和「谁近谁去」。
   ============================================================ */

export interface Pickable {
  readonly index: number
  readonly x: number
  readonly y: number
}

export interface Point {
  readonly x: number
  readonly y: number
}

/**
 * 从待施工队列里挑一块给光标。
 * @param pool 待施工的块，必须按文档顺序排列
 * @param from 光标当前位置
 * @param window 只看队列最前面几块
 * @returns 选中块的 index；没有可做的返回 null
 */
export function pickNearest(
  pool: readonly Pickable[],
  from: Point,
  window = 3,
): number | null {
  if (pool.length === 0) return null

  const span = Math.max(1, window)
  const head = pool.length > span ? pool.slice(0, span) : pool

  let best = head[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const item of head) {
    const distance = Math.hypot(item.x - from.x, item.y - from.y)
    if (distance < bestDistance) {
      bestDistance = distance
      best = item
    }
  }
  return best.index
}

/** 空闲光标游走的目标：随机撒点，取离其他光标最远的一个，避免扎堆 */
export function pickIdleSpot(
  bounds: { x: number; y: number; w: number; h: number },
  others: readonly Point[],
  random: () => number = Math.random,
  tries = 8,
): Point {
  let best: Point = { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 }
  let bestGap = -1

  for (let i = 0; i < tries; i += 1) {
    const spot = {
      x: bounds.x + bounds.w * random(),
      y: bounds.y + bounds.h * random(),
    }
    let gap = Number.POSITIVE_INFINITY
    for (const other of others) {
      gap = Math.min(gap, Math.hypot(spot.x - other.x, spot.y - other.y))
    }
    if (gap > bestGap) {
      bestGap = gap
      best = spot
    }
  }
  return best
}
