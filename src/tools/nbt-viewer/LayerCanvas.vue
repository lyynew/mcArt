<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ParsedStructure } from '@/core/nbt-read'
import { BLOCKS_BY_ID } from '@/core/blocks'
import { textureImage, textureUrl } from '@/core/textures'
import { cellsOf, projectionOf } from './projection'

/**
 * 分层预览画布。
 * 投影与取格逻辑在 projection.ts，这里只负责画。
 */
const props = defineProps<{
  structure: ParsedStructure
  layer: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)

const layout = computed(() => projectionOf(props.structure.size))
const cells = computed(() => cellsOf(props.structure, props.layer, layout.value))

/** 已经解码好的贴图，按 URL 缓存，避免每帧都重新开 Promise */
const ready = new Map<string, HTMLImageElement>()

let frame = 0

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
  const cell = Math.max(2, Math.min(24, Math.floor(560 / Math.max(cols, rows))))
  const dpr = window.devicePixelRatio || 1

  el.width = Math.round(cols * cell * dpr)
  el.height = Math.round(rows * cell * dpr)
  el.style.width = `${cols * cell}px`
  el.style.height = `${rows * cell}px`

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
    const block = BLOCKS_BY_ID.get(id.replace(/^minecraft:/, ''))

    ctx.fillStyle = block?.hex ?? '#8b8b8b'
    ctx.fillRect(x, y, cell, cell)

    if (block && cell >= 6) {
      const url = textureUrl(block.tex)
      const img = url ? ready.get(url) : undefined
      if (img) ctx.drawImage(img, x, y, cell, cell)
    }
  }

  if (cell >= 6) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i <= cols; i++) {
      const v = i * cell + 0.5
      ctx.moveTo(v, 0)
      ctx.lineTo(v, rows * cell)
    }
    for (let i = 0; i <= rows; i++) {
      const v = i * cell + 0.5
      ctx.moveTo(0, v)
      ctx.lineTo(cols * cell, v)
    }
    ctx.stroke()
  }
}

async function preload(): Promise<void> {
  const ids = new Set(props.structure.palette.map((id) => id.replace(/^minecraft:/, '')))
  await Promise.all(
    [...ids].map(async (id) => {
      const block = BLOCKS_BY_ID.get(id)
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

watch(() => props.layer, paint)

watch(
  () => props.structure,
  () => {
    ready.clear()
    paint()
    void preload()
  },
)

onMounted(() => {
  paint()
  void preload()
})

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <div class="layer">
    <div class="layer__head">
      <span>{{ layout.title }}</span>
      <span class="layer__size">{{ layout.cols }} × {{ layout.rows }}</span>
    </div>
    <div class="layer__canvas">
      <canvas ref="canvas" />
    </div>
  </div>
</template>

<style scoped>
.layer {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  align-items: center;
}

.layer__head {
  display: flex;
  gap: var(--sp-3);
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}

.layer__size {
  color: var(--mc-ink-strong);
}

.layer__canvas {
  display: grid;
  place-items: center;
  width: 100%;
  max-height: 460px;
  padding: 12px;
  overflow: auto;
  background: var(--mc-stage);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 rgb(0 0 0 / 45%),
    4px 4px 0 rgb(0 0 0 / 35%);
}

canvas {
  display: block;
  image-rendering: pixelated;
  box-shadow: 0 0 0 1px #000;
}
</style>
