/* ============================================================
   元素在网格上的落点
   ------------------------------------------------------------
   要解决的是「别都挤在一起」：把网格切成若干扇区，优先落在当前最空的
   那一片，片内随机取点并与已有元素保持间距。效果就是任意时刻抬头看，
   整屏都有东西在动，而不是角落堆成一团。

   纯函数，随机数由外部传进来，所以可以拿固定种子测。
   ============================================================ */

export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface SpotQuery {
  readonly cols: number
  readonly rows: number
  readonly w: number
  readonly h: number
  /** 已经占位的元素 */
  readonly taken: readonly Rect[]
  readonly rand: () => number
  /** 元素之间至少留几格，默认 2 */
  readonly pad?: number
}

/** 横竖各切几片：3×2 六片，够铺开又不至于每片太小 */
const ZONES_X = 3
const ZONES_Y = 2
/** 片内试探次数，试不到就放弃这一轮 */
const ATTEMPTS = 28

/** 两块矩形（各向外扩 pad）是否相交 */
export function overlaps(a: Rect, b: Rect, pad = 0): boolean {
  return (
    a.x - pad < b.x + b.w &&
    b.x - pad < a.x + a.w &&
    a.y - pad < b.y + b.h &&
    b.y - pad < a.y + a.h
  )
}

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/** 按权重随机取一个下标 */
export function weightedIndex(weights: readonly number[], rand: () => number): number {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0)
  if (total <= 0) return 0
  let target = rand() * total
  for (let i = 0; i < weights.length; i += 1) {
    target -= Math.max(0, weights[i])
    if (target <= 0) return i
  }
  return weights.length - 1
}

/** 画面四周留一格，元素不贴着屏幕边被截断 */
const MARGIN = 1

/**
 * 挑一个落点。网格塞不下这个图案时返回 null，调用方跳过这次生成即可。
 */
export function pickSpot(query: SpotQuery): { x: number; y: number } | null {
  const { cols, rows, w, h, taken, rand } = query
  const pad = query.pad ?? 2
  const spanX = cols - w - MARGIN * 2
  const spanY = rows - h - MARGIN * 2
  if (spanX < 0 || spanY < 0) return null

  // 窄屏放不下三列，扇区数跟着缩，否则每片比图案还窄
  const zonesX = Math.max(1, Math.min(ZONES_X, Math.floor((spanX + w) / (w + pad * 2))))
  const zonesY = Math.max(1, Math.min(ZONES_Y, Math.floor((spanY + h) / (h + pad * 2))))
  const zoneW = spanX / zonesX
  const zoneH = spanY / zonesY

  // 越空的扇区权重越高，于是元素自动填满整屏。倍数放大到 6，
  // 否则「已占一个元素」的扇区权重只掉两成，等于没起作用
  const weights: number[] = []
  for (let i = 0; i < zonesX * zonesY; i += 1) {
    const zone: Rect = {
      x: MARGIN + (i % zonesX) * zoneW,
      y: MARGIN + Math.floor(i / zonesX) * zoneH,
      w: zoneW,
      h: zoneH,
    }
    const used = taken.reduce((sum, rect) => sum + overlapArea(zone, rect), 0)
    weights.push(1 / (1 + (used / (zoneW * zoneH + 1)) * 6))
  }

  const start = weightedIndex(weights, rand)
  const originX = MARGIN + (start % zonesX) * zoneW
  const originY = MARGIN + Math.floor(start / zonesX) * zoneH

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const x = Math.min(MARGIN + spanX, Math.round(originX + rand() * zoneW))
    const y = Math.min(MARGIN + spanY, Math.round(originY + rand() * zoneH))
    const box: Rect = { x, y, w, h }
    if (taken.every((rect) => !overlaps(box, rect, pad))) return { x, y }
  }

  // 这一片挤不下，再给整块网格一次机会，别让画面出现空档
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const box: Rect = {
      x: MARGIN + Math.round(rand() * spanX),
      y: MARGIN + Math.round(rand() * spanY),
      w,
      h,
    }
    if (taken.every((rect) => !overlaps(box, rect, pad))) return { x: box.x, y: box.y }
  }

  return null
}

/** 屏幕越大放越多：桌面 6 个左右，手机 3 个，超宽屏封顶 7 个 */
export function elementBudget(cols: number, rows: number): number {
  const area = Math.max(1, cols * rows)
  return Math.max(3, Math.min(7, Math.round(Math.sqrt(area) / 8)))
}
