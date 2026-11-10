<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ParsedStructure } from '@/core/nbt-read'
import { findBlock, normalizeBlockId } from '@/core/blocks'
import { textureImage, textureUrl } from '@/core/textures'
import { anchorScrollDelta, clampCell, zoomStep } from '@/core/viewport'
import { cellsOf, coordOf, projectionOf, type PickedCell } from './projection'

/**
 * 分层预览画布：绘制、缩放、平移、点选。
 *
 * 交互与像素画编辑器保持一致（手感 learns once）：
 *   · 滚轮直接缩放，以光标下的那一格为锚点；触控板横向滑动交给原生滚动
 *   · 按住左键/中键拖动平移，移动不足 4px 仍算「点一下」用来选方块
 *   · 触屏单指拖动平移、轻点选方块、双指捏合缩放
 *   · 右上角 − / 适应 / + 与键盘 + / - / 0
 *
 * 两件容易踩坑的事：
 * 1. 缩放不重画位图。位图始终按「适应窗口」的格宽绘制（上限 32px），
 *    只放大 canvas 的 CSS 尺寸，交给 image-rendering: pixelated 整数放大——
 *    放大后与直接按大格宽画逐像素一致，显存占用不随缩放增长。
 * 2. 网格与选中框用 DOM 叠层，不画在 canvas 上：canvas 被放大后 1px 网格
 *    会跟着变成 Npx 粗，叠层则任何档位都是恒定 1px。
 */
const props = defineProps<{
  structure: ParsedStructure
  layer: number
  /** 选中的格子下标（跨层切换时由外层清空） */
  selected?: number | null
}>()

const emit = defineEmits<{ (e: 'pick', cell: PickedCell | null): void }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const paper = ref<HTMLElement | null>(null)
/** 凹槽：放大后它自己滚动 */
const box = ref<HTMLElement | null>(null)
/** 整个组件，浮标按它定位（挂在滚动容器外面才不会被裁） */
const root = ref<HTMLElement | null>(null)

const layout = computed(() => projectionOf(props.structure.size))
const cells = computed(() => cellsOf(props.structure, props.layer, layout.value))

/* —— 视口与缩放 —— */

/** 用户手动设的格宽；null = 适应窗口 */
const CELL_MIN = 2
const CELL_MAX = 64
/** 位图的格宽上限：再大只是把 16×16 贴图糊成色块 */
const BASE_MAX = 32
/** 凹槽内边距 + 边框，算可用空间时扣掉 */
const INSET = 26
/** 拖动超过这个距离才算平移，否则轻点仍要能选中方块 */
const DRAG_THRESHOLD = 4

const manualCell = ref<number | null>(null)
/** 用 offsetWidth/Height 量：滚动条出现不会让它变小，避免「缩放 → 尺寸变 → 再缩放」循环 */
const viewport = ref({ w: 0, h: 0 })

const fitCell = computed(() => {
  const { cols, rows } = layout.value
  const { w, h } = viewport.value
  if (!w || !h) return 12
  return clampCell(Math.floor(Math.min(w / cols, h / rows)), CELL_MIN, BASE_MAX)
})

/** 实际显示的一格多少 CSS 像素 */
const cell = computed(() => manualCell.value ?? fitCell.value)

const pannable = computed(() => {
  const { cols, rows } = layout.value
  const { w, h } = viewport.value
  return w > 0 && (cols * cell.value > w - INSET || rows * cell.value > h - INSET)
})

const canZoomOut = computed(() => cell.value > CELL_MIN)
const canZoomIn = computed(() => cell.value < CELL_MAX)
const zoomLabel = computed(() => (manualCell.value === null ? '适应' : `${cell.value}px`))

const paperStyle = computed(() => ({
  width: `${layout.value.cols * cell.value}px`,
  height: `${layout.value.rows * cell.value}px`,
}))

function measure(): void {
  const el = box.value
  if (!el) return
  const w = Math.max(120, el.offsetWidth - INSET)
  const h = Math.max(120, el.offsetHeight - INSET)
  if (w !== viewport.value.w || h !== viewport.value.h) viewport.value = { w, h }
}

/**
 * 缩放并让「光标下那一格」留在原处。
 *
 * 用画布自身的矩形做锚点，而不是滚动容器：内容放得下时会被 flex 居中，
 * 拿容器坐标算会差一个居中偏移，放大几次画面就飘走了。
 */
async function zoomAtPoint(clientX: number, clientY: number, target: number): Promise<void> {
  const el = canvas.value
  const boxEl = box.value
  if (!el || !boxEl) return

  const next = clampCell(target, CELL_MIN, CELL_MAX)
  if (next === cell.value) return

  const before = el.getBoundingClientRect()
  const anchorX = (clientX - before.left) / cell.value
  const anchorY = (clientY - before.top) / cell.value

  manualCell.value = next
  await nextTick()

  // 尺寸变了、scrollLeft 也可能被浏览器夹过，按「变化后的实际位置」求差值
  const after = el.getBoundingClientRect()
  boxEl.scrollLeft += after.left + anchorX * next - clientX
  boxEl.scrollTop += after.top + anchorY * next - clientY
}

/** 按钮与快捷键：以视口中心为锚点 */
function zoomBy(direction: 1 | -1): void {
  const rect = box.value?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : 0
  const y = rect ? rect.top + rect.height / 2 : 0
  void zoomAtPoint(x, y, zoomStep(cell.value, direction, CELL_MIN, CELL_MAX))
}

function fit(): void {
  manualCell.value = null
  const el = box.value
  if (el) {
    el.scrollLeft = 0
    el.scrollTop = 0
  }
}

function onWheel(e: WheelEvent): void {
  // Shift + 滚轮是水平平移（交给浏览器），触控板横向滑动同理
  if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  e.preventDefault()
  void zoomAtPoint(
    e.clientX,
    e.clientY,
    zoomStep(cell.value, e.deltaY < 0 ? 1 : -1, CELL_MIN, CELL_MAX),
  )
}

/* —— 叠层：网格、选中框、悬停框 —— */

const showGrid = computed(() => cell.value >= 6)

const gridStyle = computed(() => ({
  backgroundImage:
    'linear-gradient(to right, rgb(0 0 0 / 32%) 0 1px, transparent 1px),' +
    'linear-gradient(to bottom, rgb(0 0 0 / 32%) 0 1px, transparent 1px)',
  backgroundSize: `${cell.value}px ${cell.value}px`,
}))

function cellRect(index: number | null | undefined): Record<string, string> | null {
  if (index === null || index === undefined || index < 0) return null
  const cols = layout.value.cols
  if (index >= cols * layout.value.rows) return null
  const c = cell.value
  return {
    left: `${(index % cols) * c}px`,
    top: `${Math.floor(index / cols) * c}px`,
    width: `${c}px`,
    height: `${c}px`,
  }
}

const selectedRect = computed(() => cellRect(props.selected))

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
  measure()

  const { cols, rows } = layout.value
  const base = fitCell.value
  const dpr = window.devicePixelRatio || 1

  el.width = Math.round(cols * base * dpr)
  el.height = Math.round(rows * base * dpr)

  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = '#241f19'
  ctx.fillRect(0, 0, cols * base, rows * base)

  const grid = cells.value
  for (let i = 0; i < grid.length; i++) {
    const id = grid[i]
    if (!id) continue

    const x = (i % cols) * base
    const y = Math.floor(i / cols) * base
    const block = findBlock(id)

    ctx.fillStyle = block?.hex ?? '#8b8b8b'
    ctx.fillRect(x, y, base, base)

    if (block && base >= 6) {
      const url = textureUrl(block.tex)
      const img = url ? ready.get(url) : undefined
      if (img) ctx.drawImage(img, x, y, base, base)
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

/* —— 悬停、点选与拖拽平移 —— */

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
const panning = ref(false)

/** 把指针位置换算成格子；落在画布外或空格返回 null */
function cellFromEvent(
  e: PointerEvent,
): { index: number; id: string; pos: [number, number, number] } | null {
  const el = canvas.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const localX = e.clientX - rect.left
  const localY = e.clientY - rect.top
  if (localX < 0 || localY < 0 || localX >= rect.width || localY >= rect.height) return null

  const { cols, rows } = layout.value
  const c = cell.value
  const col = Math.min(cols - 1, Math.floor(localX / c))
  const row = Math.min(rows - 1, Math.floor(localY / c))
  const index = row * cols + col
  const id = cells.value[index]
  if (!id) return null
  return { index, id, pos: coordOf(index, props.layer, layout.value) }
}

interface Drag {
  id: number
  x: number
  y: number
  left: number
  top: number
  moved: boolean
}

let drag: Drag | null = null

function updateHover(e: PointerEvent): void {
  // 触屏没有悬停；拖动过程中也别弹浮标
  if (e.pointerType !== 'mouse' || panning.value) {
    if (hover.value) hover.value = null
    return
  }
  const target = cellFromEvent(e)
  if (!target) {
    if (hover.value) hover.value = null
    return
  }
  const base = root.value?.getBoundingClientRect()
  hover.value = {
    ...target,
    name: findBlock(target.id)?.zh ?? normalizeBlockId(target.id),
    x: e.clientX - (base?.left ?? 0),
    y: e.clientY - (base?.top ?? 0),
  }
}

function onPointerDown(e: PointerEvent): void {
  // 左键既能点选也能拖动平移，中键只平移
  if (e.button !== 0 && e.button !== 1) return
  const el = box.value
  if (!el) return
  drag = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    left: el.scrollLeft,
    top: el.scrollTop,
    moved: false,
  }
  // 指针已释放或来自自动化事件时捕获会抛错，别让它打断后面的点选
  try {
    el.setPointerCapture(e.pointerId)
  } catch {
    /* 没有捕获也能靠 box 上的 pointermove/up 正常工作 */
  }
}

function onPointerMove(e: PointerEvent): void {
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    drag.moved = true
    panning.value = true
    if (hover.value) hover.value = null
    const el = box.value
    if (el) {
      el.scrollLeft = drag.left - dx
      el.scrollTop = drag.top - dy
    }
    return
  }
  updateHover(e)
}

function onPointerUp(e: PointerEvent): void {
  if (!drag || e.pointerId !== drag.id) return
  const { moved } = drag
  drag = null
  panning.value = false
  // 没拖动过、且是左键：这一下算点选（空格会清掉选中）
  if (!moved && e.button === 0) emit('pick', cellFromEvent(e))
  try {
    box.value?.releasePointerCapture(e.pointerId)
  } catch {
    /* 指针本就没被捕获 */
  }
}

function onPointerCancel(): void {
  drag = null
  panning.value = false
  if (hover.value) hover.value = null
}

function onPointerLeave(): void {
  if (!drag && hover.value) hover.value = null
}

const tipStyle = computed(() => {
  const h = hover.value
  if (!h) return undefined
  // 浮标挂在滚动容器外面，避免被裁掉；左右各留半个浮标宽，别顶出面板
  const half = 88
  const width = root.value?.clientWidth ?? viewport.value.w
  return {
    left: `${Math.min(Math.max(h.x, half), Math.max(half, width - half))}px`,
    top: `${h.y - 12}px`,
  }
})

/* —— 触屏双指捏合 —— */

interface Gesture {
  startDist: number
  startCell: number
  gridX: number
  gridY: number
}

let gesture: Gesture | null = null

function spread(a: Touch, b: Touch): number {
  return Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY))
}

function midpoint(a: Touch, b: Touch): { x: number; y: number } {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
}

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length !== 2) return
  const el = canvas.value
  if (!el) return
  const a = e.touches[0]
  const b = e.touches[1]
  if (!a || !b) return
  const mid = midpoint(a, b)
  const rect = el.getBoundingClientRect()
  gesture = {
    startDist: spread(a, b),
    startCell: cell.value,
    gridX: (mid.x - rect.left) / cell.value,
    gridY: (mid.y - rect.top) / cell.value,
  }
  // 第二根手指落下就不再是单指拖拽
  drag = null
  panning.value = false
}

function onTouchMove(e: TouchEvent): void {
  if (!gesture || e.touches.length !== 2) return
  e.preventDefault()
  const a = e.touches[0]
  const b = e.touches[1]
  const el = canvas.value
  const boxEl = box.value
  if (!a || !b || !el || !boxEl) return

  const mid = midpoint(a, b)
  const next = clampCell(
    gesture.startCell * (spread(a, b) / gesture.startDist),
    CELL_MIN,
    CELL_MAX,
  )
  manualCell.value = next

  // 手势必须当帧生效，不能等 Vue 的下一个 tick；Vue 随后会用同样的值覆盖一遍
  const w = `${layout.value.cols * next}px`
  const h = `${layout.value.rows * next}px`
  el.style.width = w
  el.style.height = h
  if (paper.value) {
    paper.value.style.width = w
    paper.value.style.height = h
  }

  const rect = el.getBoundingClientRect()
  boxEl.scrollLeft += anchorScrollDelta(rect.left, mid.x, gesture.gridX, next)
  boxEl.scrollTop += anchorScrollDelta(rect.top, mid.y, gesture.gridY, next)
}

function onTouchEnd(e: TouchEvent): void {
  if (e.touches.length < 2) gesture = null
}

/** iOS Safari 会把双指识别成整页缩放，必须先拦掉 */
function onGestureStart(e: Event): void {
  e.preventDefault()
}

/* —— 快捷键：与像素画编辑器一致 —— */

function onKeydown(e: KeyboardEvent): void {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  const el = e.target as HTMLElement | null
  const tag = el?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return

  if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    zoomBy(1)
  } else if (e.key === '-' || e.key === '_') {
    e.preventDefault()
    zoomBy(-1)
  } else if (e.key === '0') {
    e.preventDefault()
    fit()
  }
}

/* —— 生命周期 —— */

watch(fitCell, paint)
watch(() => props.layer, () => {
  hover.value = null
  paint()
})
watch(
  () => props.structure,
  () => {
    ready.clear()
    hover.value = null
    fit()
    paint()
    void preload()
  },
)

onMounted(() => {
  paint()
  void preload()

  if (typeof ResizeObserver !== 'undefined' && box.value) {
    observer = new ResizeObserver(() => paint())
    observer.observe(box.value)
  }

  // 滚轮与触摸手势都要拦默认行为，必须显式声明非 passive
  const el = box.value
  el?.addEventListener('wheel', onWheel, { passive: false })
  el?.addEventListener('touchstart', onTouchStart, { passive: false })
  el?.addEventListener('touchmove', onTouchMove, { passive: false })
  el?.addEventListener('touchend', onTouchEnd)
  el?.addEventListener('touchcancel', onTouchEnd)
  el?.addEventListener('gesturestart', onGestureStart)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
  observer?.disconnect()
  observer = null
  const el = box.value
  el?.removeEventListener('wheel', onWheel)
  el?.removeEventListener('touchstart', onTouchStart)
  el?.removeEventListener('touchmove', onTouchMove)
  el?.removeEventListener('touchend', onTouchEnd)
  el?.removeEventListener('touchcancel', onTouchEnd)
  el?.removeEventListener('gesturestart', onGestureStart)
  window.removeEventListener('keydown', onKeydown)
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
          title="缩小（滚轮 / -）"
          aria-label="缩小"
          @click="zoomBy(-1)"
        >
          −
        </button>
        <button
          type="button"
          class="layer__zbtn layer__zval"
          :class="{ 'is-fit': manualCell === null }"
          title="适应窗口（0）"
          aria-label="适应窗口"
          @click="fit"
        >
          {{ zoomLabel }}
        </button>
        <button
          type="button"
          class="layer__zbtn"
          :disabled="!canZoomIn"
          title="放大（滚轮 / +）"
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
      :class="{ 'is-pannable': pannable, 'is-panning': panning }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @pointerleave="onPointerLeave"
    >
      <div class="layer__inner">
        <div ref="paper" class="layer__paper" :style="paperStyle">
          <canvas ref="canvas" class="layer__bitmap" :style="paperStyle" />
          <div v-if="showGrid" class="layer__grid" :style="gridStyle" />
          <div v-if="selectedRect" class="layer__ring layer__ring--sel" :style="selectedRect" />
          <div v-if="hoverRect" class="layer__ring layer__ring--hover" :style="hoverRect" />
        </div>
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
  /* 不写这一条，放大的内容会把 flex 子项连同滚动容器一起撑宽，
     横向就没有可滚动范围了（曾导致「放大后只能上下看一个区域」） */
  min-width: 0;
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
  width: 100%;
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

/* —— 舞台：与像素画编辑器同一套「放得下居中、放不下完整可滚」结构 —— */
.layer__canvas {
  flex: 1;
  min-width: 0;
  min-height: 160px;
  align-self: stretch;
  width: 100%;
  padding: 12px;
  overflow: auto;
  /* 拖到边界时不要带动整页滚动或触发下拉刷新 */
  overscroll-behavior: contain;
  /* 拖拽平移时别把网格/浮标文字选中成一片蓝色 */
  user-select: none;
  background: var(--mc-stage);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 rgb(0 0 0 / 45%),
    4px 4px 0 rgb(0 0 0 / 35%);
  cursor: crosshair;
}

.layer__canvas.is-pannable {
  cursor: grab;
}

.layer__canvas.is-panning {
  cursor: grabbing;
}

.layer__inner {
  display: flex;
  min-width: 100%;
  min-height: 100%;
}

.layer__paper {
  position: relative;
  flex: 0 0 auto;
  margin: auto;
  box-shadow: 0 0 0 1px #000;
  /* 放不下时接管手势自己平移；放得下时把纵向滚动还给页面 */
  touch-action: pan-y;
}

.layer__canvas.is-pannable .layer__paper {
  touch-action: none;
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
  .layer__canvas,
  .layer__canvas.is-pannable,
  .layer__canvas.is-panning {
    cursor: default;
  }

  /* 触屏没有滚轮，缩放全靠这两颗按钮，得给够手指的面积 */
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
