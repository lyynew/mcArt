/**
 * 画布视口的纯计算：缩放步进、档位夹取、手势锚点。
 *
 * 两个画布（像素画编辑器、结构查看器）共用同一套手感，
 * 这里只算数，不碰 DOM，方便各自配测试。
 */
export function clampCell(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

/**
 * 单次缩放的目标格宽。
 *
 * 必须用加法步进：早先按比例相乘再取整，缩到 2px/格时
 * 2 × 1.15 = 2.3 取整又回到 2，放大方向被取整彻底吃掉。
 * 小尺寸保证至少 1px，大尺寸按比例，否则要滚几十次才看得出变化。
 */
export function zoomStep(base: number, direction: 1 | -1, min: number, max: number): number {
  const current = clampCell(base, min, max)
  const amount = Math.max(1, Math.round(current * 0.18))
  return clampCell(current + direction * amount, min, max)
}

/**
 * 手势/滚轮缩放时，滚动位置还需要修正多少。
 *
 * 不直接给 scrollLeft 的绝对值：那必须知道画布在容器里的居中偏移与内边距，
 * 漏一项画面就会一路滚到边界。改成算「开始时锚住的那一格」相对指针的差值。
 *
 * @param canvasEdge 画布左缘（或上缘）当前的视口坐标
 * @param pointer 指针/双指中点的视口坐标
 * @param anchorGrid 手势开始时该点对应的格坐标（可为小数、可越界）
 * @param nextCell 缩放后的单格像素
 */
export function anchorScrollDelta(
  canvasEdge: number,
  pointer: number,
  anchorGrid: number,
  nextCell: number,
): number {
  return canvasEdge - (pointer - anchorGrid * nextCell)
}
