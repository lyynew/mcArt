<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import { McWindow } from '@/design/components'
import { useEditor } from '../store/editor'
import { useCanvasView } from '../composables/useCanvasView'
import { useTouchGestures } from '../composables/useTouchGestures'
import { useBoardPainter } from '../composables/useBoardPainter'
import { usePointerTools } from '../composables/usePointerTools'
import { useHotkeys } from '../composables/useHotkeys'
import EditorToolbar from './EditorToolbar.vue'
import StageStatus from './StageStatus.vue'

/**
 * 舞台控制器。
 *
 * 职责：把表格上的交互接到四个 composable 上（视口、绘制、指针、快捷键），
 * 自己只管 DOM 结构与事件挂载，具体逻辑都在 composable 里。
 */
const editor = useEditor()
const { settings } = editor

const wrapper = ref<HTMLElement | null>(null)
const board = ref<HTMLCanvasElement | null>(null)

const view = useCanvasView(wrapper, toRef(settings, 'n'), toRef(settings, 'zoomPx'))
const painter = useBoardPainter(board, view.cell)

// 触屏上的双指缩放/平移。桌面没有触摸事件，挂着也不会有副作用
useTouchGestures({
  el: wrapper,
  canvas: board,
  cell: view.cell,
  setCell: view.setCell,
  syncSize: painter.syncCssSize,
})

const pointer = usePointerTools({
  canvas: board,
  wrapper,
  onHover: (pos) => {
    editor.hover.value = pos
  },
})

const hotkeys = useHotkeys({ zoomBy: view.zoomBy, fit: view.fit })

/** 放大到舞台装不下时，底栏提示一句「点适应看全图」，别让人以为画面丢了 */
const overflowing = ref(false)
let fitObserver: ResizeObserver | null = null

function syncOverflow(): void {
  const wrap = wrapper.value
  const canvas = board.value
  if (!wrap || !canvas) return
  // 28px 是内边距与边框的余量，「刚好装下」不该算溢出
  overflowing.value =
    canvas.clientWidth > wrap.clientWidth - 28 || canvas.clientHeight > wrap.clientHeight - 28
}

onMounted(() => {
  hotkeys.attach()
  // passive:false 才能拦住页面滚动
  wrapper.value?.addEventListener('wheel', view.wheel, { passive: false })
  if (typeof ResizeObserver !== 'undefined' && wrapper.value && board.value) {
    fitObserver = new ResizeObserver(syncOverflow)
    fitObserver.observe(wrapper.value)
    fitObserver.observe(board.value)
  }
  watch(view.cell, () => requestAnimationFrame(syncOverflow))
})

onBeforeUnmount(() => {
  hotkeys.detach()
  fitObserver?.disconnect()
  fitObserver = null
  wrapper.value?.removeEventListener('wheel', view.wheel)
})
</script>

<template>
  <McWindow flush class="stage">
    <EditorToolbar
      :tool="settings.tool"
      :brush="settings.brush"
      :mirror="settings.mirror"
      :can-undo="editor.canUndo.value"
      :can-redo="editor.canRedo.value"
      :zoom-label="view.zoomLabel.value"
      @update:tool="editor.setTool"
      @update:brush="editor.setBrush"
      @toggle-mirror="editor.toggleMirror"
      @undo="editor.doUndo"
      @redo="editor.doRedo"
      @zoom-in="view.zoomBy(1.15)"
      @zoom-out="view.zoomBy(1 / 1.15)"
      @fit="view.fit"
    />

    <div ref="wrapper" class="canvaswrap">
      <div class="canvasinner">
        <canvas ref="board" class="board" :style="{ cursor: pointer.cursor.value }" />
      </div>
    </div>

    <StageStatus :overflowing="overflowing" />

    <div v-if="editor.busy.value" class="stage__busy">计算中…</div>
  </McWindow>
</template>

<style scoped>
.stage {
  flex: 1;
  min-height: 0;
  position: relative;
}

.canvaswrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  /* 手势拖到边界时不要带动整页滚动或触发下拉刷新 */
  overscroll-behavior: contain;
  /* 手势拖到边界时不要带动整页滚动或触发下拉刷新 */
  overscroll-behavior: contain;
  padding: 14px;
  background: var(--mc-stage);
  background-image: repeating-linear-gradient(
    45deg,
    rgb(255 255 255 / 2.2%) 0 6px,
    transparent 6px 12px
  );
}

.canvasinner {
  display: flex;
  min-width: 100%;
  min-height: 100%;
}

.board {
  display: block;
  margin: auto;
  background: #fff;
  image-rendering: pixelated;
  box-shadow:
    0 0 0 2px #000,
    0 0 0 4px #6b6553,
    10px 10px 0 rgb(0 0 0 / 45%);
  touch-action: none;
}

.stage__busy {
  position: absolute;
  right: 14px;
  bottom: 40px;
  padding: 3px 8px;
  font-size: var(--fs-note);
  color: #fff;
  background: rgb(0 0 0 / 65%);
  border: 1px solid #000;
  pointer-events: none;
}

/*
 * 窄屏：舞台固定高度（PixelPage.vue），画布容器只按剩余空间分配，
 * 放大的画布在自己内部滚动，不再把工具条与底栏顶出屏幕。
 * pan-x pan-y 让单指在画布空白处仍能滚动容器，同时禁掉浏览器整页的
 * 捏合缩放——双指缩放交给 useTouchGestures，两个手势不会打架。
 */
@media (max-width: 1120px) {
  .canvaswrap {
    flex-basis: 0;
    touch-action: pan-x pan-y;
  }
}
</style>
