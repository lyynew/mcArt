/**
 * 双指手势的锚点换算。
 *
 * 目标只有一个：开始时捏住的那一格，在手势过程中一直待在双指中点下面。
 * 做法是算「滚动位置还需要修正多少」，而不是直接给出 scrollLeft——
 * 直接给绝对值必须知道画布在容器里的居中偏移与内边距，漏一项画面就会一路滚到边界，
 * 这个坑踩过一次，所以把公式单独拎出来配测试。
 *
 * @param canvasEdge 画布左缘（或上缘）当前的视口坐标
 * @param mid 双指中点的视口坐标
 * @param anchorGrid 手势开始时该中点对应的格坐标（可为小数、可越界）
 * @param nextCell 缩放后的单格像素
 */
export function anchorScrollDelta(
  canvasEdge: number,
  mid: number,
  anchorGrid: number,
  nextCell: number,
): number {
  // 让锚点格的新位置对准中点，画布需要移动的距离
  return canvasEdge - (mid - anchorGrid * nextCell)
}
