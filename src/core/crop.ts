/**
 * 方形裁切区域。
 *
 * 坐标一律用「原图像素」表示，跟显示缩放无关：预览里把图缩到多小、
 * 用户怎么拖选区，最后交给 readSquareImage() 的都是同一份整数坐标，
 * 不会出现预览和成品对不上的情况。
 *
 * 这一层是纯函数，不碰 canvas / DOM，可以直接单测。
 */

/** x、y 是选区左上角，size 是正方形边长 */
export interface CropRect {
  x: number
  y: number
  size: number
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** 默认选区：以短边为边长、居中 */
export function centeredCrop(width: number, height: number): CropRect {
  const size = Math.max(1, Math.min(width, height))
  return { x: (width - size) / 2, y: (height - size) / 2, size }
}

/**
 * 内置材质专用：长条贴图（16×N 的动画帧 / 多个面）只取最开始的
 * 那一帧，也就是左上角的窄边方形，和 core/textures.ts 的 squareSide 同规则。
 */
export function firstFrameCrop(width: number, height: number): CropRect {
  return { x: 0, y: 0, size: Math.max(1, Math.min(width, height)) }
}

/** 把选区夹回图片内，并把坐标收敛成整数，避免 drawImage 取到半个像素 */
export function clampCrop(rect: CropRect, width: number, height: number): CropRect {
  const size = clamp(Math.round(rect.size), 1, Math.max(1, Math.min(width, height)))
  return {
    x: clamp(Math.round(rect.x), 0, Math.max(0, width - size)),
    y: clamp(Math.round(rect.y), 0, Math.max(0, height - size)),
    size,
  }
}

/** 拖动选区：dx / dy 是原图像素位移 */
export function moveCrop(
  rect: CropRect,
  dx: number,
  dy: number,
  width: number,
  height: number,
): CropRect {
  return clampCrop({ ...rect, x: rect.x + dx, y: rect.y + dy }, width, height)
}

/**
 * 改变选区大小。默认保持中心不动，这样用滑杆缩小时画面不会往一角跑。
 * anchor 传 'start' 时保持左上角（右下角拖把手用）。
 */
export function resizeCrop(
  rect: CropRect,
  nextSize: number,
  width: number,
  height: number,
  anchor: 'center' | 'start' = 'center',
): CropRect {
  const cx = rect.x + rect.size / 2
  const cy = rect.y + rect.size / 2
  const size = clamp(Math.round(nextSize), 1, Math.max(1, Math.min(width, height)))
  const x = anchor === 'start' ? rect.x : cx - size / 2
  const y = anchor === 'start' ? rect.y : cy - size / 2
  return clampCrop({ x, y, size }, width, height)
}
