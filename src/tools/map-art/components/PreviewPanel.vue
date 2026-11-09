<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { McWindow } from '@/design/components'
import { useMapArt } from '../store'
import { COLOR_BY_ID, describeColor } from '../map-colors'
import { paintMap } from '../render'
import { MAP_PIXELS, MAP_SIZE } from '../model'

/** 预览：画布 + 统计 + 悬浮读数。渲染函数与 PNG 导出共用。 */
const { result, hasImage } = useMapArt()
const canvas = ref<HTMLCanvasElement | null>(null)
const hover = ref<{ x: number; y: number; id: number } | null>(null)

const emptyColors = new Uint8Array(MAP_PIXELS)

function repaint(): void {
  const el = canvas.value
  if (!el) return
  paintMap(el, result.value?.colors ?? emptyColors, COLOR_BY_ID)
}

onMounted(repaint)
watch(result, repaint)

function onMove(e: MouseEvent): void {
  const el = canvas.value
  const r = result.value
  if (!el || !r) return
  const box = el.getBoundingClientRect()
  const toCell = (v: number, span: number) =>
    Math.min(MAP_SIZE - 1, Math.max(0, Math.floor((v / span) * MAP_SIZE)))
  const x = toCell(e.clientX - box.left, box.width)
  const y = toCell(e.clientY - box.top, box.height)
  hover.value = { x, y, id: r.colors[y * MAP_SIZE + x]! }
}

const hoverText = computed(() => {
  const h = hover.value
  return h ? `${h.x}, ${h.y} · ${describeColor(h.id)}` : '把鼠标移到画面上看色号'
})

const stats = computed(() => {
  const r = result.value
  return r
    ? `用色 ${r.used} 种 · 透明 ${r.transparent.toLocaleString('zh-CN')} 格 · 平均 ΔE ${r.meanError.toFixed(1)}`
    : '等待图片'
})
</script>

<template>
  <McWindow title="预览 · 128 × 128" flush class="preview">
    <div class="preview__stage">
      <canvas
        ref="canvas"
        class="preview__canvas"
        width="128"
        height="128"
        aria-label="地图画预览"
        @mousemove="onMove"
        @mouseleave="hover = null"
      />
      <div v-if="!hasImage" class="preview__empty">载入一张图片，这里会显示 128 × 128 的调色结果</div>
    </div>
    <div class="preview__bar">
      <span>{{ stats }}</span>
      <span class="preview__hover">{{ hoverText }}</span>
    </div>
  </McWindow>
</template>

<style scoped>
.preview {
  min-height: 0;
}

.preview__stage {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  place-items: center;
  position: relative;
  padding: var(--sp-4);
  /* 棋盘格：透明（未探索）像素要能一眼看出来 */
  background: repeating-conic-gradient(#2c2c2c 0% 25%, #383838 0% 50%) 50% / 16px 16px;
}

.preview__canvas {
  display: block;
  width: min(100%, 640px);
  height: auto;
  aspect-ratio: 1;
  image-rendering: pixelated;
  border: var(--mc-bd) solid #000;
  box-shadow: var(--mc-shadow-panel);
}

.preview__empty {
  position: absolute;
  padding: var(--sp-3) var(--sp-4);
  background: rgb(20 18 14 / 82%);
  color: var(--mc-text);
  font-size: var(--fs-sm);
  text-align: center;
}

.preview__bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4);
  font-size: var(--fs-note);
  color: var(--mc-ink-strong);
  border-top: var(--mc-bd) solid #000;
  background: var(--mc-plate);
}

.preview__hover {
  color: var(--mc-ink-soft);
}

/* 触屏没有 hover，「把鼠标移到画面上」这句只会误导 */
@media (pointer: coarse) {
  .preview__hover {
    display: none;
  }
}
</style>
