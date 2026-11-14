<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ICON_SIZE } from '../model'
import { paintCube } from '../cube'
import type { ToastAssets } from '../render'
import type { IconKind } from '../model'

/** 图标面板里的小预览：和主横幅用同一份绘制规则，只是放大到 2× 便于看清 */
const props = defineProps<{
  kind: IconKind
  assets: ToastAssets
}>()

const canvas = ref<HTMLCanvasElement>()
const SCALE = 2

function draw(): void {
  const el = canvas.value
  if (!el) return
  el.width = ICON_SIZE * SCALE
  el.height = ICON_SIZE * SCALE
  const ctx = el.getContext('2d')
  if (!ctx) return

  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE)
  ctx.imageSmoothingEnabled = false

  if (props.kind === 'block') {
    paintCube(ctx, { top: props.assets.top ?? undefined, side: props.assets.side ?? undefined })
    return
  }

  const img = props.kind === 'upload' ? props.assets.upload : props.assets.flat
  if (!img) return
  const dims = img as { naturalWidth?: number; naturalHeight?: number; width: number; height: number }
  const w = dims.naturalWidth || dims.width
  const h = dims.naturalHeight || dims.height
  const src = Math.min(w, h)
  if (!src) return
  ctx.drawImage(
    img,
    (w - src) / 2,
    (h - src) / 2,
    src,
    src,
    0,
    0,
    ICON_SIZE,
    ICON_SIZE,
  )
}

onMounted(draw)
watch(
  () => [props.kind, props.assets.top, props.assets.side, props.assets.flat, props.assets.upload],
  draw,
)
</script>

<template>
  <canvas ref="canvas" class="icon-preview" aria-label="当前图标预览" />
</template>

<style scoped>
.icon-preview {
  display: block;
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  background: var(--mc-btn);
  border: var(--mc-bd) solid #000;
  box-shadow: inset 2px 2px 0 var(--mc-btn-hi);
}
</style>
