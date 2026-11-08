import { ZOOM_MAX, ZOOM_MIN } from './types'

/**
 * 缩放步进的纯逻辑。
 *
 * 单独成模块是因为这里踩过坑：早先用「每次乘以 1.15 再取整」，
 * 缩到 2px/格时 2 × 1.15 = 2.3，取整又回到 2，放大方向永远出不去，
 * 用户看到的就是「缩到底之后再也放大不了」。
 * 现在改成加法步进，小尺寸保证至少 1px，并由单测固定住这个行为。
 */

export function clampZoom(v: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(v)))
}

/** 单次缩放的目标值：方向 +1 放大 / -1 缩小 */
export function zoomStep(base: number, dir: 1 | -1): number {
  // 小尺寸至少 1px，否则取整会把步进吃掉；大尺寸按比例，否则要滚几十次才看得出变化
  const amount = Math.max(1, Math.round(clampZoom(base) * 0.18))
  return clampZoom(clampZoom(base) + dir * amount)
}
