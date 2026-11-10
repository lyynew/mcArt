<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ParsedStructure } from '@/core/nbt-read'
import { findBlock, normalizeBlockId } from '@/core/blocks'
import { textureImage, textureUrl } from '@/core/textures'
import { cellsOf, coordOf, projectionOf, type PickedCell } from './projection'

/**
 * 分层预览画布。
 * 投影与取格逻辑在 projection.ts，这里只负责画、缩放与点选。
 *
 * 两件事决定了实现方式：
 * 1. 缩放不重画画布，只放大 canvas 的 CSS 尺寸。位图始终按「适应窗口」的
 *    格宽绘制（一个方块最多 32px），再交给浏览器按 image-rendering: pixelated
 *    整数倍放大——放大后和直接按大格宽画逐像素一致，但显存占用不跟着涨。
 * 2. 网格与选中框用 DOM 叠层，不用 canvas 画。canvas 被放大后 1px 网格会跟着
 *    变成 Npx 粗，叠层则是恒定 1px，缩放到哪一档都干净。
 */
const props = defineProps<{
  structure: ParsedStructure
  layer: number
  /** 选中的格子下标（跨层切换时由外层清空） */
  selected?: number | null
}>()

const emit = defineEmits<{ (e: 'pick', cell: PickedCell | null): void }>()

const canvas = ref<HTMLCanvasElement | null>(null)
/** 画布外面的凹槽，尺寸以它为准；放大后它自己滚动 */
const box = ref<HTMLElement | null>(null)
/** 整个组件，浮标按它定位（浮标要挂在滚动容器外面才不会被裁） */
const root = ref<HTMLElement | null>(null)

const layout = computed(() => projectionOf(props.structure.size))
const cells = computed(() => cellsOf(props.structure, props.layer, layout.value))

/* —— 缩放 —— */

/** 位图里一格多少像素：按容器算，上下限防止糊成色块或细到看不见 */
const BASE_MIN = 2
const BASE_MAX = 32
/** 放大后一格最多多少 CSS 像素：再大只是把 16×16 的贴图拉成马赛克 */
const DISPLAY_MAX = 64
const MIN_ZOOM = 0.5
const MAX_ZOOM = 8
/** 缩放档位用倍数而不是像素，滚轮手感才均匀 */
const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 6, 8] as const

const zoom = ref(1)
const baseCell = ref(8)

const displayCell = computed(() =>
  Math.max(BASE_MIN, Math.min(DISPLAY_MAX, Math.round(baseCell.value * zoom.value))),
)

const canvasStyle = computed(() => ({
  width: `${layout.value.cols * displayCell.value}px`,
  height: `${layout.value.rows * displayCell.value}px`,
}))

const zoomLabel = computed(() =>
  zoom.value === 1 ? '适应' : `${displayCell.value}px`,
)

const canZoomOut = computed(() => zoom.value > MIN_ZOOM)
const canZoomIn = computed(() => zoom.value < MAX_ZOOM)

/* —— 叠层：网格、选中框、悬停框 —— */

const showGrid = computed(() => displayCell.value >= 6)

const gridStyle = computed(() => ({
  backgroundImage:
    'linear-gradient(to right, rgb(0 0 0 / 32%) 0 1px, transparent 1px),' +
    'linear-gradient(to bottom, rgb(0 0 0 / 32%) 0 1px, transparent 1px)',
  backgroundSize: `${displayCell.value}px ${displayCell.value}px`,
}))

function cellRect(index: number | null | undefined): Record<string, string> | null {
  if (index === null || index === undefined || index < 0) return null
  const cols = layout.value.cols
  if (index >= cols * layout.value.rows) return null
  const c = displayCell.value
  return {
    left: `${(index % cols) * c}px`,
    top: `${Math.floor(index / cols) * c}px`,
    width: `${c}px`,
    height: `${c}px`,
  }
}

const selectedRect = computed(() => cellRect(props.selected))

/* —— 容器尺寸与滚动 —— */

/** 凹槽的内尺寸，判断放大后要不要滚动、要不要居中，都看它 */
const boxSize = ref({ w: 0, h: 0 })

/* 哪一轴放不下，那一轴就取消居中——居中会把超出的一侧推到滚不到的地方；
   另一轴照旧居中，缩放到只比容器高一点时也不会突然贴到左边 */
const pannableX = computed(
  () => boxSize.value.w > 0 && layout.value.cols * displayCell.value > boxSize.value.w,
)
const pannableY = computed(
  () => boxSize.value.h > 0 && layout.value.rows * displayCell.value > boxSize.value.h,
)

function measure(): { w: number; h: number } {
  const el = box.value
  if (!el) return { w: 560, h: 420 }
  // 首次挂载时可能是 0，给个下限，别按 0 画出 2px 的格子
  const w = Math.max(120, el.clientWidth - 24)
  const h = Math.max(120, el.clientHeight - 24)
  boxSize.value = { w, h }
  return { w, h }
}

async function applyZoom(next: number): Promise<void> {
  const el = box.value
  const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next))
  if (z === zoom.value) return

  // 记住视口中心落在内容的哪个比例位置，缩放后回到同一处，不至于跳回左上角
  const center =
    el && el.scrollWidth > el.clientWidth
      ? {
          x: (el.scrollLeft + el.clientWidth / 2) / Math.max(1, el.scrollWidth),
          y: (el.scrollTop + el.clientHeight / 2) / Math.max(1, el.scrollHeight),
        }
      : null

  zoom.value = z
  await nextTick()
  if (!el) return

  // 两个轴各算各的：很多结构只是竖向超出，横向仍然放得下
  const canX = el.scrollWidth > el.clientWidth
  const canY = el.scrollHeight > el.clientHeight
  if (canX) {
    el.scrollLeft = center
      ? center.x * el.scrollWidth - el.clientWidth / 2
      : (el.scrollWidth - el.clientWidth) / 2
  }
  if (canY) {
    el.scrollTop = center
      ? center.y * el.scrollHeight - el.clientHeight / 2
      : (el.scrollHeight - el.clientHeight) / 2
  }
}

function zoomBy(direction: 1 | -1): void {
  const at = ZOOM_STEPS.findIndex((s) => s >= zoom.value - 0.001)
  const index = at < 0 ? ZOOM_STEPS.length - 1 : at
  const next = ZOOM_STEPS[index + direction]
  if (next !== undefined) void applyZoom(next)
}

function resetZoom(): void {
  void applyZoom(1)
}

/** Ctrl / ⌘ + 滚轮缩放。普通滚轮留给容器滚动，别抢。 */
function onWheel(e: WheelEvent): void {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  zoomBy(e.deltaY < 0 ? 1 : -1)
}

/* —— 绘制 —— */

/** 已经解码好的贴图，按 URL 缓存，避免每帧都重新开 Promise */
const ready = new Map<string, HTMLImageElement>()

let frame = 0
let observer: ResizeObserver | null = null

function paint(): void {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    draw()
  })
}

function draw(): void {
  const el = canvas.value
  if (!el) return

  const { cols, rows } = layout.value
  const { w, h } = measure()
  // 上限 32px：再大只是把 16×16 的贴图糊成色块，反而看不清边界
  const cell = Math.max(BASE_MIN, Math.min(BASE_MAX, Math.floor(Math.min(w / cols, h / rows))))
  baseCell.value = cell
  const dpr = window.devicePixelRatio || 1

  el.width = Math.round(cols * cell * dpr)
  el.height = Math.round(rows * cell * dpr)

  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = '#241f19'
  ctx.fillRect(0, 0, cols * cell, rows * cell)

  const grid = cells.value
  for (let i = 0; i < grid.length; i++) {
    const id = grid[i]
    if (!id) continue

    const x = (i % cols) * cell
    const y = Math.floor(i / cols) * cell
    const block = findBlock(id)

    ctx.fillStyle = block?.hex ?? '#8b8b8b'
    ctx.fillRect(x, y, cell, cell)

    if (block && cell >= 6) {
      const url = textureUrl(block.tex)
      const img = url ? ready.get(url) : undefined
      if (img) ctx.drawImage(img, x, y, cell, cell)
    }
  }
}

async function preload(): Promise<void> {
  const ids = new Set(props.structure.palette.map((id) => normalizeBlockId(id)))
  await Promise.all(
    [...ids].map(async (id) => {
      const block = findBlock(id)
      if (!block) return
      const url = textureUrl(block.tex)
      if (!url || ready.has(url)) return
      try {
        const img = await textureImage(block.tex)
        if (img) ready.set(url, img)
      } catch {
        /* 单张失败就保留平均色 */
      }
    }),
  )
  paint()
}

/* —— 点选与悬停 —— */

interface Hover {
  index: number
  id: string
  name: string
  pos: [number, number, number]
  /** 相对 .layer 的鼠标位置，给浮标定位用 */
  x: number
  y: number
}

const hover = ref<Hover | null>(null)
const hoverRect = computed(() => cellRect(hover.value?.index))

/** 把指针位置换算成格子；落在画布外或空格返回 null */
function cellFromEvent(e: PointerEvent): { index: number; id: string; pos: [number, number, number] } | null {
  const el = canvas.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const localX = e.clientX - rect.left
  const localY = e.clientY - rect.top
  if (localX < 0 || localY < 0 || localX >= rect.width || localY >= rect.height) return null

  const { cols, rows } = layout.value
  const c = displayCell.value
  const col = Math.min(cols - 1, Math.floor(localX / c))
  const row = Math.min(rows - 1, Math.floor(localY / c))
  const index = row * cols + col
  const id = cells.value[index]
  if (!id) return null
  return { index, id, pos: coordOf(index, props.layer, layout.value) }
}

function onPointerMove(e: PointerEvent): void {
  // 触屏没有悬停这件事，拖动时也别弹浮标
  if (e.pointerType !== 'mouse') {
    if (hover.value) hover.value = null
    return
  }
  const cell = cellFromEvent(e)
  if (!cell) {
    if (hover.value) hover.value = null
    return
  }
  const base = root.value?.getBoundingClientRect()
  hover.value = {
    ...cell,
    name: findBlock(cell.id)?.zh ?? normalizeBlockId(cell.id),
    x: e.clientX - (base?.left ?? 0),
    y: e.clientY - (base?.top ?? 0),
  }
}

function onPointerLeave(): void {
  if (hover.value) hover.value = null
}

function onClick(e: MouseEvent): void {
  const cell = cellFromEvent(e as PointerEvent)
  emit('pick', cell)
}

const tipStyle = computed(() => {
  const h = hover.value
  if (!h) return undefined
  // 浮标挂在滚动容器外面，避免被裁掉；左右各留半个浮标宽，别顶出面板
  const half = 88
  const width = root.value?.clientWidth ?? boxSize.value.w + 24
  return {
    left: `${Math.min(Math.max(h.x, half), Math.max(half, width - half))}px`,
    top: `${h.y - 12}px`,
  }
})

/* —— 生命周期 —— */

watch(() => props.layer, () => {
  hover.value = null
  paint()
})

watch(
  () => props.structure,
  () => {
    ready.clear()
    hover.value = null
    zoom.value = 1
    paint()
    void preload()
  },
)

onMounted(() => {
  paint()
  void preload()

  // 窗口缩放、侧栏折叠都会让容器变宽，格宽要跟着重算
  if (typeof ResizeObserver !== 'undefined' && box.value) {
    observer = new ResizeObserver(() => paint())
    observer.observe(box.value)
  }
  // 带修饰键的滚轮要拦掉浏览器缩放，必须显式声明非 passive
  box.value?.addEventListener('wheel', onWheel, { passive: false })
})

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
  observer?.disconnect()
  observer = null
  box.value?.removeEventListener('wheel', onWheel)
})
</script>

<template>
  <div ref="root" class="layer">
    <div class="layer__head">
      <span>{{ layout.title }}</span>
      <span class="layer__size">{{ layout.cols }} × {{ layout.rows }}</span>

      <div class="layer__zoom" role="group" aria-label="缩放画布">
        <button
          type="button"
          class="layer__zbtn"
          :disabled="!canZoomOut"
          title="缩小（Ctrl + 滚轮）"
          aria-label="缩小"
          @click="zoomBy(-1)"
        >
          −
        </button>
        <button
          type="button"
          class="layer__zbtn layer__zval"
          :class="{ 'is-fit': zoom === 1 }"
          title="恢复适应窗口"
          aria-label="恢复适应窗口"
          @click="resetZoom"
        >
          {{ zoomLabel }}
        </button>
        <button
          type="button"
          class="layer__zbtn"
          :disabled="!canZoomIn"
          title="放大（Ctrl + 滚轮）"
          aria-label="放大"
          @click="zoomBy(1)"
        >
          +
        </button>
      </div>
    </div>

    <div
      ref="box"
      class="layer__canvas"
      :class="{ 'is-pannable-x': pannableX, 'is-pannable-y': pannableY }"
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
      @click="onClick"
    >
      <div class="layer__paper" :style="canvasStyle">
        <canvas ref="canvas" class="layer__bitmap" :style="canvasStyle" />
        <div v-if="showGrid" class="layer__grid" :style="gridStyle" />
        <div v-if="selectedRect" class="layer__ring layer__ring--sel" :style="selectedRect" />
        <div v-if="hoverRect" class="layer__ring layer__ring--hover" :style="hoverRect" />
      </div>
    </div>

    <span v-if="hover" class="layer__tip" :style="tipStyle">
      {{ hover.name }}
      <i>{{ hover.pos[0] }}, {{ hover.pos[1] }}, {{ hover.pos[2] }}</i>
    </span>
  </div>
</template>

<style scoped>
.layer {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  align-items: center;
  position: relative;
}

.layer__head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}

.layer__size {
  color: var(--mc-ink-strong);
}

/* —— 缩放按钮：贴着面板的小方块，视觉与分段控件一致 —— */
.layer__zoom {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.layer__zbtn {
  min-width: 22px;
  padding: 1px 5px;
  font-size: var(--fs-note);
  line-height: 1.4;
  color: #fff;
  background: var(--mc-btn);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-btn-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-btn-lo);
  text-shadow: var(--mc-ts-dark);
  cursor: pointer;
}

.layer__zbtn:hover:not(:disabled) {
  background: var(--mc-btn-hover);
}

.layer__zbtn:active:not(:disabled) {
  transform: translate(1px, 1px);
}

.layer__zbtn:disabled {
  color: #9a9a9a;
  cursor: default;
}

.layer__zval {
  min-width: 44px;
  font-family: var(--font-mc);
}

.layer__zval.is-fit {
  color: #3a3a3a;
  background: var(--mc-accent);
  text-shadow: none;
}

/* —— 舞台 —— */
.layer__canvas {
  position: relative;
  flex: 1;
  min-height: 160px;
  align-self: stretch;
  display: grid;
  place-items: center;
  width: 100%;
  padding: 12px;
  overflow: auto;
  background: var(--mc-stage);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 rgb(0 0 0 / 45%),
    4px 4px 0 rgb(0 0 0 / 35%);
  cursor: crosshair;
}

/* 放大到超出容器时，放不下的那一轴取消居中：grid 居中会把超出的一侧推到滚不到的地方 */
.layer__canvas.is-pannable-x {
  justify-items: start;
}

.layer__canvas.is-pannable-y {
  align-items: start;
}

.layer__paper {
  position: relative;
  box-shadow: 0 0 0 1px #000;
}

.layer__bitmap {
  display: block;
  image-rendering: pixelated;
}

.layer__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.layer__ring {
  position: absolute;
  pointer-events: none;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px rgb(0 0 0 / 55%);
}

.layer__ring--hover {
  border-width: 1px;
  border-style: dashed;
  border-color: rgb(255 255 255 / 85%);
  box-shadow: none;
}

.layer__tip {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 6px;
  font-size: var(--fs-note);
  white-space: nowrap;
  pointer-events: none;
  color: #fff;
  background: rgb(20 18 13 / 92%);
  border: 1px solid #000;
  box-shadow: inset 1px 1px 0 rgb(255 255 255 / 12%);
  transform: translate(-50%, -100%);
}

.layer__tip i {
  font-style: normal;
  font-family: var(--font-mc);
  font-size: var(--fs-micro);
  color: var(--mc-text-dim);
}

@media (pointer: coarse) {
  .layer__canvas {
    cursor: default;
  }

  /* 触屏没有 Ctrl + 滚轮，缩放全靠这两颗按钮，得给够手指的面积 */
  .layer__zbtn {
    min-width: 34px;
    padding: 5px 9px;
    font-size: 13px;
  }

  .layer__zval {
    min-width: 58px;
  }
}
</style>
