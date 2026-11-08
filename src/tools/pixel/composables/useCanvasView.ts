import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { clampZoom, zoomStep } from '../zoom'

/**
 * 画布视口：单格像素、滚轮缩放、适应窗口。
 *
 * 缩放时以鼠标位置为锚点：先把光标处的格坐标算出来，改完单格像素再反推滚动位置，
 * 这样「放大时盯着的那一格」不会跑掉——这是地图类编辑器最容易做糙的地方。
 *
 * 缩放步进用「加法 + 最小 1px」，不用「每次乘一个系数」。
 * 早先按 2 的幂次相乘再取整：缩到 2px/格时，2 × 1.15 = 2.3 取整又回到 2，
 * 于是无论滚多少次都停在 2，放大方向被取整彻底吃掉——用户看到的就是「缩到底之后动不了」。
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
    cell.value = clampZoom(zoomPx.value > 0 ? zoomPx.value : fitCell())
  }

  /** 缩放锚定到视口里的某个点（通常是鼠标位置） */
  function zoomAtPoint(clientX: number, clientY: number, nextCell: number): void {
    const target = clampZoom(nextCell)
    if (target === cell.value) return

    const el = wrapper.value
    if (!el) {
      zoomPx.value = target
      cell.value = target
      return
    }

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
    const dir = e.deltaY < 0 ? 1 : -1
    zoomAtPoint(e.clientX, e.clientY, zoomStep(cell.value, dir))
  }

  /** 按钮与快捷键用：正数放大、负数缩小，实际步长按当前尺寸决定 */
  function zoomBy(factor: number): void {
    const dir = factor >= 1 ? 1 : -1
    const target = zoomStep(cell.value, dir)
    const el = wrapper.value
    if (!el) {
      zoomPx.value = target
      cell.value = target
      return
    }
    const rect = el.getBoundingClientRect()
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, target)
  }

  /** 直接设定单格像素，不做锚点修正（触摸手势自己算滚动位置） */
  function setCell(next: number): number {
    const target = clampZoom(next)
    if (target === cell.value) return target
    zoomPx.value = target
    cell.value = target
    return target
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

  return { cell, zoomLabel, recalc, fit, wheel, zoomBy, setCell, fitCell }
}
