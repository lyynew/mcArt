<script setup lang="ts">
import { computed } from 'vue'
import { notice } from '../store/view-state'
import { useEditor } from '../store/editor'
import type { ToolId } from '../types'

/**
 * 舞台底栏：规格 / 方块数 / 用色数 / 光标位置 / 当前工具的提示。
 * 批量操作的临时回执（例如「已替换 128 格」）也显示在这里，盖过工具提示。
 */
const editor = useEditor()
const { settings, stats } = editor

const HINTS: Record<ToolId, string> = {
  brush: '左键绘制 · 滚轮缩放 · 空格拖动',
  eraser: '左键擦成空格 · 滚轮缩放',
  picker: '左键吸取方块 · 滚轮缩放',
  fill: '左键填充整片连通同色区域 · 滚轮缩放',
  replace: '点实心方块 → 全图同种替换 · 按住 Shift 只换相连一片',
  pan: '左键拖动画面 · 滚轮缩放',
}

const hint = computed(() => notice.value || HINTS[settings.tool])

const hoverText = computed(() => {
  const h = editor.hover.value
  if (!h) return '-'
  const block = editor.blocks.value[h.k]
  return `第 ${h.x + 1} 列 · 第 ${h.y + 1} 行 · ${block ? block.zh : '空格'}`
})

const sizeText = computed(() => `${settings.n} × ${settings.n}`)
</script>

<template>
  <div class="stage-foot">
    <span><i class="stage-foot__dot" />规格 <b>{{ sizeText }}</b></span>
    <span>方块 <b>{{ stats.solid }}</b></span>
    <span>用色 <b>{{ stats.colors }}</b></span>
    <span class="stage-foot__hover">{{ hoverText }}</span>
    <span class="stage-foot__hint" :class="{ 'stage-foot__hint--notice': notice }">{{ hint }}</span>
  </div>
</template>

<style scoped>
.stage-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-5);
  padding: 6px var(--sp-4);
  border-top: var(--mc-bd) solid #000;
  background: #b6b6b6;
  box-shadow: inset 0 2px 0 var(--mc-plate-hi);
  font-size: var(--fs-sm);
  color: #3b3b3b;
}

.stage-foot b {
  color: #1f1f1f;
}

.stage-foot__dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  vertical-align: 1px;
  background: var(--mc-accent);
  border: 1px solid #2b2b2b;
}

.stage-foot__hint {
  margin-left: auto;
  color: var(--mc-ink-soft);
}

/* 临时回执要比常规提示显眼，否则用户不会注意到刚才那一下改了多少 */
.stage-foot__hint--notice {
  padding: 1px 6px;
  color: #fff;
  background: #4a6b1f;
  box-shadow: inset 1px 1px 0 #6f9436;
}
</style>
