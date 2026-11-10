import { clampCell, zoomStep as stepCell } from '@/core/viewport'
import { ZOOM_MAX, ZOOM_MIN } from './types'

/**
 * 像素画画布的缩放档位。
 *
 * 具体算法在 core/viewport.ts（结构查看器共用），这里只负责绑本工具的上下限。
 * 加法步进是为了避免小尺寸下取整把步进吃掉，见 core/viewport.ts 的注释。
 */
export function clampZoom(v: number): number {
  return clampCell(v, ZOOM_MIN, ZOOM_MAX)
}

/** 单次缩放的目标值：方向 +1 放大 / -1 缩小 */
export function zoomStep(base: number, dir: 1 | -1): number {
  return stepCell(base, dir, ZOOM_MIN, ZOOM_MAX)
}
