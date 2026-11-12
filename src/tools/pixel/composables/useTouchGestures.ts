import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { anchorScrollDelta } from '../gesture'
import { clampZoom } from '../zoom'

/**
 * 双指缩放与平移。
 *
 * 手机上既没有滚轮也没有空格键：单指绘制、双指缩放/平移是这类编辑器的既定手势。
 * 单指不在这里处理（交给绘制逻辑），只有两指才接管。
 *
 * 算法只有一条：手势开始时记住「双指中点落在哪一格」，
 * 之后每帧按双指距离决定单格像素，再把那一格重新对齐到当前中点。
 * 缩放和平移共用这个式子，所以一边缩放一边挪动也不会打架。
 */
export function useTouchGestures(options: {
  el: Ref<HTMLElement | null>
  /** 画布本身：手势锚点必须按画布矩形换算，不能按滚动容器 */
  canvas: Ref<HTMLCanvasElement | null>
  cell: Ref<number>
  setCell: (v: number) => number
  /** 同步更新画布显示尺寸，让滚动范围立刻跟上缩放 */
  syncSize: () => void
}) {
  const { el, canvas, cell, setCell, syncSize } = options

  let active = false
  let startDist = 1
  let startCell = 1
  /** 手势起点对应的格坐标（可为小数） */
  let gridX = 0
  let gridY = 0


  function midpoint(a: Touch, b: Touch): { x: number; y: number } {
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
  }

  function spread(a: Touch, b: Touch): number {
    return Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY))
  }

  function onStart(e: TouchEvent): void {
    const board = canvas.value
    if (!board || e.touches.length !== 2) return

    // 两指一落下就掐掉浏览器自己的整页捏合缩放。否则页面会被整体放大，
    // 画布右边跑到屏幕外，还会和这里的自定义双指缩放叠在一起。
    e.preventDefault()

    const a = e.touches[0]
    const b = e.touches[1]
    if (!a || !b) return

    const mid = midpoint(a, b)
    const rect = board.getBoundingClientRect()

    startDist = spread(a, b)
    startCell = cell.value
    // 相对画布左上角的格坐标；中点落在画布外的留白时会越界，这是允许的
    gridX = (mid.x - rect.left) / startCell
    gridY = (mid.y - rect.top) / startCell
    active = true
  }

  function onMove(e: TouchEvent): void {
    if (!active || e.touches.length !== 2) return
    const node = el.value
    const board = canvas.value
    if (!node || !board) return

    // 拦住页面自身的滚动与缩放，画布里的手势不该外溢
    e.preventDefault()

    const a = e.touches[0]
    const b = e.touches[1]
    if (!a || !b) return

    const mid = midpoint(a, b)
    const next = setCell(clampZoom(startCell * (spread(a, b) / startDist)))

    // 先把显示尺寸同步到位，否则下面按差值修正滚动时会被旧的内容尺寸夹住
    syncSize()

    // 差值法：保持「开始时捏住的那一格」跟着双指中点走（公式见 gesture.ts）
    const rect = board.getBoundingClientRect()
    node.scrollLeft += anchorScrollDelta(rect.left, mid.x, gridX, next)
    node.scrollTop += anchorScrollDelta(rect.top, mid.y, gridY, next)
  }

  function onEnd(e: TouchEvent): void {
    // 少于两指就结束手势；剩下那一指不接着画，避免落手/抬手时留下误笔
    if (e.touches.length < 2) active = false
  }

  /** iOS Safari 会把双指识别成整页缩放，必须先拦掉 */
  function onGestureStart(e: Event): void {
    e.preventDefault()
  }

  onMounted(() => {
    const node = el.value
    if (!node) return
    node.addEventListener('touchstart', onStart, { passive: false })
    node.addEventListener('touchmove', onMove, { passive: false })
    node.addEventListener('touchend', onEnd)
    node.addEventListener('touchcancel', onEnd)
    node.addEventListener('gesturestart', onGestureStart)
  })

  onBeforeUnmount(() => {
    const node = el.value
    if (!node) return
    node.removeEventListener('touchstart', onStart)
    node.removeEventListener('touchmove', onMove)
    node.removeEventListener('touchend', onEnd)
    node.removeEventListener('touchcancel', onEnd)
    node.removeEventListener('gesturestart', onGestureStart)
  })

  return { isGesturing: (): boolean => active }
}
