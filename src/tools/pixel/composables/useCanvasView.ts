import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { ZOOM_MAX, ZOOM_MIN } from '../types'

/**
 * 画布视口：单格像素、滚轮缩放、适应窗口。
 *
 * 缩放时以鼠标位置为锚点：先把光标处的格坐标算出来，改完单格像素再反推滚动位置，
 * 这样「放大时盯着的那一格」不会跑掉——这是地图类编辑器最容易做糙的地方。
 */
export function useCanvasView(
  wrapper: Ref<HTMLElement | null>,
  n: Ref<number>,
  zoomPx: Ref<number>,
) {
  const cell = ref(12)

  function fitCell(): number {
    const el = wrapper.value
    if (!el) return 12
    // 留出画布边框与内边距，不然会出现一圈滚动条
    const availW = Math.max(120, el.clientWidth - 42)
    const availH = Math.max(120, el.clientHeight - 42)
    return Math.max(1, Math.floor(Math.min(availW, availH) / Math.max(1, n.value)))
  }

  function recalc(): void {
    cell.value = zoomPx.value > 0 ? zoomPx.value : fitCell()
  }

  /** 缩放锚定到视口里的某个点（通常是鼠标位置） */
  function zoomAtPoint(clientX: number, clientY: number, nextCell: number): void {
    const el = wrapper.value
    if (!el) return

    const target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(nextCell)))
    if (target === cell.value && zoomPx.value === target) return

    const rect = el.getBoundingClientRect()
    const beforeX = (clientX - rect.left + el.scrollLeft) / cell.value
    const beforeY = (clientY - rect.top + el.scrollTop) / cell.value

    zoomPx.value = target
    cell.value = target

    // 等 DOM 尺寸更新后再修正滚动位置
    requestAnimationFrame(() => {
      el.scrollLeft = beforeX * target - (clientX - rect.left)
      el.scrollTop = beforeY * target - (clientY - rect.top)
    })
  }

  function wheel(e: WheelEvent): void {
    // 触控板的横向滚动不算缩放
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    zoomAtPoint(e.clientX, e.clientY, cell.value * factor)
  }

  function zoomBy(factor: number): void {
    const el = wrapper.value
    if (!el) {
      cell.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cell.value * factor))
      return
    }
    const rect = el.getBoundingClientRect()
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, cell.value * factor)
  }

  /** 适应窗口 */
  function fit(): void {
    zoomPx.value = 0
    recalc()
  }

  const zoomLabel = computed(() => `${cell.value} px/格`)

  let observer: ResizeObserver | null = null

  onMounted(() => {
    recalc()
    if (typeof ResizeObserver !== 'undefined' && wrapper.value) {
      observer = new ResizeObserver(() => recalc())
      observer.observe(wrapper.value)
    }
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  watch([n, zoomPx], recalc)

  return { cell, zoomLabel, recalc, fit, wheel, zoomBy, fitCell }
}
