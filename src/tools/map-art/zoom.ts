/**
 * 地图画预览的缩放。
 *
 * 缩放值是「相对于适应窗口尺寸」的倍数，不是单格像素：
 * 1× 正好装进舞台，放大后画布变大、舞台出现滚动条。
 * 纯函数，不碰 DOM，方便单测。
 */

export const MAP_ZOOM_MIN = 0.5
export const MAP_ZOOM_MAX = 8
const STEP = 1.25

export function clampMapZoom(zoom: number): number {
  const n = Number.isFinite(zoom) ? zoom : 1
  return Math.round(Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, n)) * 100) / 100
}

/** dir > 0 放大、dir < 0 缩小；到边界就停住，不会卡在某个值上滚不动 */
export function mapZoomStep(zoom: number, dir: number): number {
  const current = clampMapZoom(zoom)
  return clampMapZoom(dir >= 0 ? current * STEP : current / STEP)
}

export function mapZoomLabel(zoom: number): string {
  return `${Math.round(clampMapZoom(zoom) * 100)}%`
}
