<script setup lang="ts">
import { McButton } from '@/design/components'
import type { ToolId } from '../types'

/**
 * 舞台工具栏。纯展示：所有状态与动作由 StagePanel 传入传出。
 */
defineProps<{
  tool: ToolId
  brush: number
  mirror: boolean
  canUndo: boolean
  canRedo: boolean
  zoomLabel: string
}>()

const emit = defineEmits<{
  (e: 'update:tool', value: ToolId): void
  (e: 'update:brush', value: number): void
  (e: 'toggle-mirror'): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'fit'): void
}>()

const TOOLS: { id: ToolId; label: string; title: string }[] = [
  { id: 'brush', label: '画笔', title: '画笔：左键落方块（B）' },
  { id: 'eraser', label: '橡皮', title: '橡皮：把格子擦成空格（E）' },
  { id: 'picker', label: '吸管', title: '吸管：吸取画面里已有的方块（I）' },
  { id: 'fill', label: '填充', title: '填充：一整片同色区域换掉（F）' },
  {
    id: 'replace',
    label: '替换',
    title: '替换：点实心方块，全图同种都换成当前方块；按住 Shift 只换相连一片；点空格不处理（R）',
  },
  { id: 'pan', label: '抓手', title: '抓手：拖动画面（H），任何时候按住空格或中键也能拖' },
]

const BRUSHES = [1, 2, 3]
</script>

<template>
  <div class="toolbar">
    <div class="toolbar__line">
      <div class="toolbar__group">
        <span class="toolbar__label">工具</span>
        <McButton
          v-for="item in TOOLS"
          :key="item.id"
          size="sm"
          :active="tool === item.id"
          :title="item.title"
          @click="emit('update:tool', item.id)"
        >
          {{ item.label }}
        </McButton>
      </div>

      <span class="toolbar__sep" />

      <div class="toolbar__group">
        <span class="toolbar__label">笔刷</span>
        <McButton
          v-for="width in BRUSHES"
          :key="width"
          size="sm"
          :active="brush === width"
          :title="`${width} 格宽（[ ] 切换）`"
          @click="emit('update:brush', width)"
        >
          {{ width }}格
        </McButton>
      </div>

      <span class="toolbar__sep" />

      <McButton
        size="sm"
        :active="mirror"
        title="左右对称绘制，画一边自动镜像到另一边（M）"
        @click="emit('toggle-mirror')"
      >
        对称绘制
      </McButton>
    </div>

    <div class="toolbar__line toolbar__line--second">
      <McButton size="sm" :disabled="!canUndo" title="撤销（Ctrl+Z）" @click="emit('undo')">
        撤销
      </McButton>
      <McButton size="sm" :disabled="!canRedo" title="重做（Ctrl+Shift+Z）" @click="emit('redo')">
        重做
      </McButton>

      <div class="toolbar__zoom">
        <McButton size="sm" icon title="缩小（-）" @click="emit('zoom-out')">−</McButton>
        <span class="toolbar__zoomval">{{ zoomLabel }}</span>
        <McButton size="sm" icon title="放大（+）" @click="emit('zoom-in')">+</McButton>
        <McButton size="sm" title="缩放到刚好铺满窗口（0）" @click="emit('fit')">适应</McButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: var(--sp-3);
  border-bottom: var(--mc-bd) solid #000;
  background: #b6b6b6;
  box-shadow: inset 0 2px 0 var(--mc-plate-hi);
}

/* 两行：上面是绘制工具，下面是历史与视图；舞台窄时也不会挤成一团 */
.toolbar__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.toolbar__line--second {
  padding-top: 4px;
  border-top: 1px solid rgb(0 0 0 / 12%);
}

.toolbar__group {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  flex-wrap: wrap;
}

.toolbar__label {
  margin-right: 1px;
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
  letter-spacing: 0.06em;
  user-select: none;
}

.toolbar__sep {
  width: 2px;
  height: 20px;
  margin: 0 3px;
  background: var(--mc-btn);
  box-shadow: 1px 0 0 #fff;
}

.toolbar__zoom {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-wrap: nowrap;
}

.toolbar__zoomval {
  min-width: 74px;
  padding: 3px 4px;
  font-size: var(--fs-note);
  text-align: center;
  color: var(--mc-ink-strong);
  background: #a9a9a9;
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #d4d4d4;
}
</style>
