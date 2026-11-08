<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, toRef } from 'vue'
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

onMounted(() => {
  hotkeys.attach()
  // passive:false 才能拦住页面滚动
  wrapper.value?.addEventListener('wheel', view.wheel, { passive: false })
})

onBeforeUnmount(() => {
  hotkeys.detach()
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

    <StageStatus />

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
</style>
