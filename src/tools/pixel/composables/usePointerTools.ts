import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { useEditor } from '../store/editor'
import { buffers } from '../store/buffers'
import { panning, spaceHeld } from '../store/view-state'

/**
 * 画布上的指针交互：绘制、吸取、填充、替换、拖动画面。
 *
 * 这里只做「事件 → 格子坐标 → store 动作」的翻译，
 * 具体怎么改变方块由 store 决定，画面怎么画由 board-painter 决定。
 */
export function usePointerTools(options: {
  canvas: Ref<HTMLCanvasElement | null>
  wrapper: Ref<HTMLElement | null>
  onHover: (pos: { x: number; y: number; k: number } | null) => void
}) {
  const { canvas, wrapper, onHover } = options
  const editor = useEditor()
  const { settings } = editor

  /** 只能在按下并拖动时连续绘制（填充、替换是单次） */
  const dragging = ref(false)

  /**
   * 画布上按着的手指数。
   * 第二根手指落下时意味着用户要做双指手势，必须立刻停止绘制，
   * 否则手掌边缘或第二指会被当成画笔，在画面上留下一道。
   */
  const touchPointers = new Set<number>()

  function trackTouch(e: PointerEvent, add: boolean): void {
    if (e.pointerType !== 'touch') return
    if (add) touchPointers.add(e.pointerId)
    else touchPointers.delete(e.pointerId)
  }

  let panStart = { x: 0, y: 0, left: 0, top: 0 }

  function cellFromEvent(e: PointerEvent | MouseEvent): { x: number; y: number } | null {
    const el = canvas.value
    if (!el) return null
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    const n = buffers.n
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * n)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * n)
    if (x < 0 || y < 0 || x >= n || y >= n) return null
    return { x, y }
  }

  function isPanTrigger(e: PointerEvent): boolean {
    return e.button === 1 || spaceHeld.value || settings.tool === 'pan'
  }

  function onPointerDown(e: PointerEvent): void {
    trackTouch(e, true)

    // 第二指落下：交给双指手势，当前这一笔收尾，不再继续画
    if (e.pointerType === 'touch' && touchPointers.size >= 2) {
      if (dragging.value) {
        dragging.value = false
        editor.endStroke()
      }
      panning.value = false
      return
    }

    if (isPanTrigger(e)) {
      const el = wrapper.value
      if (!el) return
      e.preventDefault()
      panning.value = true
      panStart = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
      canvas.value?.setPointerCapture(e.pointerId)
      return
    }

    if (e.button !== 0) return

    const pos = cellFromEvent(e)
    if (!pos) return

    // 吸管不动画面数据，不该进历史
    if (settings.tool === 'picker') {
      editor.strokeAt(pos.x, pos.y)
      return
    }

    editor.beginStroke()
    // Shift 是替换工具的「只换相连一片」修饰键；其他工具忽略它
    const changed = editor.strokeAt(pos.x, pos.y, { region: e.shiftKey })
    editor.trackStroke(changed)

    dragging.value = settings.tool === 'brush' || settings.tool === 'eraser'
    canvas.value?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent): void {
    if (panning.value) {
      const el = wrapper.value
      if (!el) return
      el.scrollLeft = panStart.left - (e.clientX - panStart.x)
      el.scrollTop = panStart.top - (e.clientY - panStart.y)
      return
    }

    const pos = cellFromEvent(e)
    if (!pos) {
      onHover(null)
      return
    }

    onHover({ ...pos, k: buffers.idx[pos.y * buffers.n + pos.x] ?? -1 })

    if (dragging.value) {
      editor.trackStroke(editor.strokeAt(pos.x, pos.y))
    }
  }

  function onPointerUp(e: PointerEvent): void {
    trackTouch(e, false)

    if (panning.value) {
      panning.value = false
      return
    }
    if (dragging.value) {
      dragging.value = false
      editor.endStroke()
      return
    }
    // 单次操作（填充 / 替换）也要收尾，没改动就把历史快照丢掉
    editor.endStroke()
  }

  function onPointerLeave(e: PointerEvent): void {
    trackTouch(e, false)
    onHover(null)
    if (dragging.value) {
      dragging.value = false
      editor.endStroke()
    }
    panning.value = false
  }

  /** 触摸被系统打断（来电、手势返回）时同样要收尾，否则历史里会留半笔 */
  function onPointerCancel(e: PointerEvent): void {
    trackTouch(e, false)
    if (dragging.value) {
      dragging.value = false
      editor.endStroke()
    }
    panning.value = false
    onHover(null)
  }

  const cursor = computed(() => {
    if (panning.value) return 'grabbing'
    if (spaceHeld.value || settings.tool === 'pan') return 'grab'
    if (settings.tool === 'picker') return 'copy'
    if (settings.tool === 'fill') return 'cell'
    return 'crosshair'
  })

  onMounted(() => {
    const el = canvas.value
    if (!el) return
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)
    el.addEventListener('pointerleave', onPointerLeave)
  })

  onBeforeUnmount(() => {
    const el = canvas.value
    if (!el) return
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerCancel)
    el.removeEventListener('pointerleave', onPointerLeave)
  })

  return { cursor, cellFromEvent, dragging }
}
