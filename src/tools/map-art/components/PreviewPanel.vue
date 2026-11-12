<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { McButton, McWindow } from '@/design/components'
import { useMapArt } from '../store'
import { COLOR_BY_ID, describeColor } from '../map-colors'
import { paintHeightMap, paintMap } from '../render'
import { MAP_PIXELS, MAP_SIZE } from '../model'
import { clampMapZoom, mapZoomLabel, mapZoomStep } from '../zoom'

/** 预览：画面 / 高度图两种视图 + 缩放 + 统计 + 悬浮读数。渲染函数与 PNG 导出共用。 */
const { result, hasImage, isBuild, heightMap } = useMapArt()
const canvas = ref<HTMLCanvasElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)
const hover = ref<{ x: number; y: number; id: number } | null>(null)
const view = ref<'color' | 'height'>('color')

const emptyColors = new Uint8Array(MAP_PIXELS)
const showHeight = computed(
  () => isBuild.value && view.value === 'height' && heightMap.value !== null,
)

function repaint(): void {
  const el = canvas.value
  if (!el) return
  const map = heightMap.value
  if (showHeight.value && map) paintHeightMap(el, map.heights, map.maxHeight)
  else paintMap(el, result.value?.colors ?? emptyColors, COLOR_BY_ID)
}

/* ---------------- 缩放 ---------------- */

/** 1× 时的画布边长（随舞台尺寸变化），缩放只是它的倍数 */
const base = ref(320)
const zoom = ref(1)
const canvasPx = computed(() => Math.round(base.value * zoom.value))
const zoomLabel = computed(() => mapZoomLabel(zoom.value))
const zoomed = computed(() => zoom.value > 1)

function zoomBy(dir: number): void {
  zoom.value = mapZoomStep(zoom.value, dir)
}

function fit(): void {
  zoom.value = 1
}

/** 用 rect 而不是 clientWidth：滚动条出现/消失不会让基准尺寸反复跳 */
function syncBase(): void {
  const el = stageEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  base.value = Math.max(96, Math.min(r.width, r.height) - 28)
}

function onWheel(e: WheelEvent): void {
  // 触控板的横向滚动不算缩放
  if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
  e.preventDefault()
  zoom.value = clampMapZoom(mapZoomStep(zoom.value, e.deltaY < 0 ? 1 : -1))
}

/* 放大后按住画面可以拖着看，和像素画编辑器的手感保持一致 */
let pan: { x: number; y: number; left: number; top: number } | null = null

function onPanStart(e: PointerEvent): void {
  if (!zoomed.value || e.button !== 0 || !stageEl.value) return
  pan = {
    x: e.clientX,
    y: e.clientY,
    left: stageEl.value.scrollLeft,
    top: stageEl.value.scrollTop,
  }
  window.addEventListener('pointermove', onPanMove)
  window.addEventListener('pointerup', onPanEnd, { once: true })
}

function onPanMove(e: PointerEvent): void {
  if (!pan || !stageEl.value) return
  stageEl.value.scrollLeft = pan.left - (e.clientX - pan.x)
  stageEl.value.scrollTop = pan.top - (e.clientY - pan.y)
}

function onPanEnd(): void {
  pan = null
  window.removeEventListener('pointermove', onPanMove)
}

let observer: ResizeObserver | null = null

onMounted(() => {
  repaint()
  syncBase()
  if (typeof ResizeObserver !== 'undefined' && stageEl.value) {
    observer = new ResizeObserver(syncBase)
    observer.observe(stageEl.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  window.removeEventListener('pointermove', onPanMove)
})

watch([result, heightMap, showHeight], repaint)

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
  if (showHeight.value && heightMap.value && hover.value) {
    const h = heightMap.value.heights[hover.value.y * MAP_SIZE + hover.value.x]!
    return `${hover.value.x}, ${hover.value.y} · 高度 ${h}`
  }
  const h = hover.value
  return h ? `${h.x}, ${h.y} · ${describeColor(h.id)}` : '把鼠标移到画面上看色号'
})

const stats = computed(() => {
  const r = result.value
  return r
    ? `用色 ${r.used} 种 · 透明 ${r.transparent.toLocaleString('zh-CN')} 格 · 平均 ΔE ${r.meanError.toFixed(1)}`
    : '等待图片'
})

const buildStats = computed(() => {
  const m = heightMap.value
  if (!m) return ''
  return `${m.maxHeight + 1} 层 · ${m.totalBlocks.toLocaleString('zh-CN')} 方块 · 支撑 ${m.supportBlocks.toLocaleString('zh-CN')}`
})
</script>

<template>
  <McWindow title="预览 · 128 × 128" flush class="preview">
    <div
      ref="stageEl"
      class="preview__stage"
      :class="{ 'preview__stage--zoomed': zoomed }"
      @wheel="onWheel"
      @pointerdown="onPanStart"
    >
      <canvas
        ref="canvas"
        class="preview__canvas"
        width="128"
        height="128"
        :style="{ width: `${canvasPx}px`, height: `${canvasPx}px` }"
        aria-label="地图画预览"
        @mousemove="onMove"
        @mouseleave="hover = null"
      />
      <div v-if="!hasImage" class="preview__empty">载入一张图片，这里会显示 128 × 128 的调色结果</div>
    </div>

    <div class="preview__tools">
      <template v-if="isBuild">
        <McButton size="sm" :active="view === 'color'" @click="view = 'color'">画面</McButton>
        <McButton size="sm" :active="view === 'height'" @click="view = 'height'">高度图</McButton>
      </template>
      <div class="preview__zoom">
        <McButton size="sm" icon title="缩小（滚轮向下）" @click="zoomBy(-1)">−</McButton>
        <span class="preview__zoom-label">{{ zoomLabel }}</span>
        <McButton size="sm" icon title="放大（滚轮向上）" @click="zoomBy(1)">＋</McButton>
        <McButton size="sm" :disabled="zoom === 1" title="适应窗口" @click="fit">适应</McButton>
      </div>
      <span v-if="isBuild" class="preview__build">{{ buildStats }}</span>
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
  /* 放大后画布超出舞台：flex + margin:auto 能居中、也能滚到每一角 */
  display: flex;
  overflow: auto;
  position: relative;
  padding: var(--sp-4);
  /* 棋盘格：透明（未探索）像素要能一眼看出来 */
  background: repeating-conic-gradient(#2c2c2c 0% 25%, #383838 0% 50%) 50% / 16px 16px;
  overscroll-behavior: contain;
}

.preview__stage--zoomed {
  cursor: grab;
}

.preview__stage--zoomed:active {
  cursor: grabbing;
}

.preview__canvas {
  display: block;
  flex: 0 0 auto;
  margin: auto;
  aspect-ratio: 1;
  image-rendering: pixelated;
  border: var(--mc-bd) solid #000;
  box-shadow: var(--mc-shadow-panel);
  touch-action: none;
}

.preview__empty {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: var(--sp-3) var(--sp-4);
  background: rgb(20 18 14 / 82%);
  color: var(--mc-text);
  font-size: var(--fs-sm);
  text-align: center;
  pointer-events: none;
}

.preview__tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4);
  border-top: var(--mc-bd) solid #000;
  background: var(--mc-plate);
}

.preview__zoom {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-left: auto;
}

.preview__zoom-label {
  min-width: 44px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--fs-note);
  color: var(--mc-ink-strong);
}

.preview__build {
  margin-left: var(--sp-3);
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
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
