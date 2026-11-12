<script setup lang="ts">
/**
 * 自定义截取区域。
 *
 * 用户自己放进来的图片不强制居中裁：这里给一个 1:1 的方框，
 * 可以整块拖动、拖右下角改大小，也可以用滑杆精确调边长。
 * 选区坐标一律按「原图像素」算（core/crop.ts），显示缩放只用于绘制，
 * 所以预览里看到的和最终 readSquareImage() 裁出来的一定是同一块。
 *
 * 内置材质不走这里：长条动画贴图由 core 直接取左上角第一帧。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { McButton, McModal, McNote, McSlider } from '@/design/components'
import {
  centeredCrop,
  moveCrop,
  resizeCrop,
  type CropRect,
} from '@/core/crop'
import { readSquareImage, type SquareImage } from '@/core/image'
import type { CropRequest } from './source-intake'

const props = defineProps<{ request: CropRequest | null }>()
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ confirm: [image: SquareImage] }>()

const url = ref('')
const natural = ref({ w: 0, h: 0 })
const crop = ref<CropRect>({ x: 0, y: 0, size: 1 })
/** 显示尺寸 / 原图尺寸：把屏幕上的拖动位移换算回原图像素 */
const displayScale = ref(1)
const busy = ref(false)
const error = ref('')
const imgEl = ref<HTMLImageElement | null>(null)

let observer: ResizeObserver | null = null

watch(
  () => props.request,
  (req) => {
    if (url.value) URL.revokeObjectURL(url.value)
    url.value = req ? URL.createObjectURL(req.blob) : ''
    natural.value = { w: 0, h: 0 }
    crop.value = { x: 0, y: 0, size: 1 }
    displayScale.value = 1
    error.value = ''
  },
  { immediate: true },
)

function updateScale(): void {
  const el = imgEl.value
  if (el && natural.value.w) displayScale.value = el.clientWidth / natural.value.w
}

function onImgLoad(): void {
  const el = imgEl.value
  if (!el) return
  natural.value = { w: el.naturalWidth, h: el.naturalHeight }
  crop.value = centeredCrop(natural.value.w, natural.value.h)
  requestAnimationFrame(updateScale)
  observer?.disconnect()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(updateScale)
    observer.observe(el)
  }
}

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  if (url.value) URL.revokeObjectURL(url.value)
})

const maxSide = computed(() => Math.max(1, Math.min(natural.value.w, natural.value.h)))
const minSide = computed(() => Math.max(1, Math.floor(maxSide.value * 0.05)))

const boxStyle = computed(() => ({
  left: `${crop.value.x * displayScale.value}px`,
  top: `${crop.value.y * displayScale.value}px`,
  width: `${crop.value.size * displayScale.value}px`,
  height: `${crop.value.size * displayScale.value}px`,
}))

const info = computed(() =>
  natural.value.w
    ? `原图 ${natural.value.w} × ${natural.value.h} · 截取 ${crop.value.size} × ${crop.value.size} @ (${crop.value.x}, ${crop.value.y})`
    : '正在读取图片…',
)

function setSize(next: number): void {
  crop.value = resizeCrop(crop.value, next, natural.value.w, natural.value.h)
}

function recenter(): void {
  crop.value = centeredCrop(natural.value.w, natural.value.h)
}

type DragMode = 'move' | 'resize'
let drag: { mode: DragMode; x: number; y: number; origin: CropRect } | null = null

function onDragStart(e: PointerEvent, mode: DragMode): void {
  if (!natural.value.w) return
  e.preventDefault()
  drag = { mode, x: e.clientX, y: e.clientY, origin: { ...crop.value } }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd, { once: true })
}

function onDragMove(e: PointerEvent): void {
  if (!drag) return
  const dx = (e.clientX - drag.x) / (displayScale.value || 1)
  const dy = (e.clientY - drag.y) / (displayScale.value || 1)
  const { w, h } = natural.value
  crop.value =
    drag.mode === 'move'
      ? moveCrop(drag.origin, dx, dy, w, h)
      : resizeCrop(drag.origin, drag.origin.size + (dx + dy) / 2, w, h, 'start')
}

function onDragEnd(): void {
  drag = null
  window.removeEventListener('pointermove', onDragMove)
}

async function confirm(): Promise<void> {
  if (!props.request || !natural.value.w) return
  busy.value = true
  error.value = ''
  try {
    const image = await readSquareImage(props.request.blob, props.request.name, crop.value)
    emit('confirm', image)
    open.value = false
  } catch (e) {
    error.value = e instanceof Error ? `读图失败：${e.message}` : '读图失败'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <McModal v-model="open" title="选择截取区域" width="720px">
    <div class="crop">
      <p class="crop__hint">
        拖动方框选要保留的部分，拖右下角或拉下面的滑杆改大小；生成器总是取 1:1 的方形。
      </p>

      <div class="crop__viewport">
        <div class="crop__frame">
          <img
            v-if="url"
            ref="imgEl"
            :src="url"
            class="crop__img"
            alt="待裁剪的原图"
            @load="onImgLoad"
          />
          <div
            v-if="natural.w"
            class="crop__box"
            :style="boxStyle"
            @pointerdown="onDragStart($event, 'move')"
          >
            <span class="crop__handle" @pointerdown.stop="onDragStart($event, 'resize')" />
          </div>
        </div>
      </div>

      <div class="crop__controls">
        <McSlider
          :model-value="crop.size"
          :min="minSide"
          :max="maxSide"
          :step="1"
          label="截取边长"
          suffix=" px"
          @update:model-value="setSize"
        />
        <McButton size="sm" :disabled="!natural.w" @click="recenter">回到居中</McButton>
      </div>

      <p class="crop__info">{{ info }}</p>
      <McNote v-if="error" tone="warn">{{ error }}</McNote>
    </div>

    <template #footer>
      <span class="crop__foot-note">图片只在本地处理，不会上传</span>
      <McButton size="sm" @click="open = false">取消</McButton>
      <McButton size="sm" variant="primary" :disabled="busy || !natural.w" @click="confirm">
        {{ busy ? '处理中…' : '使用这一块' }}
      </McButton>
    </template>
  </McModal>
</template>

<style scoped>
.crop {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.crop__hint {
  font-size: var(--fs-sm);
  color: var(--mc-ink-soft);
  line-height: 1.6;
}

.crop__viewport {
  display: grid;
  place-items: center;
  min-height: 180px;
  max-height: 360px;
  overflow: hidden;
  padding: var(--sp-3);
  background: repeating-conic-gradient(#2c2c2c 0% 25%, #383838 0% 50%) 50% / 16px 16px;
  border: var(--mc-bd) solid #000;
}

.crop__frame {
  position: relative;
  display: inline-block;
  line-height: 0;
  /* 别让选区的巨型投影溢出容器 */
  isolation: isolate;
}

.crop__img {
  display: block;
  max-width: 100%;
  max-height: 340px;
  width: auto;
  height: auto;
  image-rendering: pixelated;
  user-select: none;
  -webkit-user-drag: none;
}

.crop__box {
  position: absolute;
  box-sizing: border-box;
  border: 2px dashed #ffe36b;
  /* 9999px 的投影把框外压暗，比叠四块遮罩 div 简单 */
  box-shadow: 0 0 0 9999px rgb(0 0 0 / 55%);
  cursor: move;
  touch-action: none;
}

.crop__handle {
  position: absolute;
  right: -7px;
  bottom: -7px;
  width: 14px;
  height: 14px;
  background: #ffe36b;
  border: 2px solid #000;
  cursor: nwse-resize;
  touch-action: none;
}

.crop__controls {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-4);
}

.crop__controls > :first-child {
  flex: 1;
}

.crop__info {
  font-family: var(--font-mc);
  font-size: var(--fs-note);
  color: var(--mc-ink-strong);
}

.crop__foot-note {
  margin-right: auto;
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}
</style>
