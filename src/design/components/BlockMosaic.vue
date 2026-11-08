<script setup lang="ts">
import type { BlockDef } from '@/core/blocks'
import { textureUrl } from '@/core/textures'

/**
 * 方块马赛克缩略图：用真实原版贴图拼一小块像素画，
 * 缺贴图时退回该方块的平均色。
 *
 * 只做视觉，尺寸与网格固定，避免加载前后布局跳动。
 */
withDefaults(
  defineProps<{
    blocks: BlockDef[]
    /** 单格边长，px */
    cell?: number
    /** 每行格数 */
    cols?: number
  }>(),
  { cell: 18, cols: 3 },
)

/** 贴图用 cover 铺满格子；没有贴图就只留平均色 */
function cellStyle(b: BlockDef) {
  const url = textureUrl(b.tex)
  return {
    backgroundColor: b.hex,
    backgroundImage: url ? `url("${url}")` : undefined,
  }
}
</script>

<template>
  <div
    class="mosaic"
    :style="{
      '--cell': `${cell}px`,
      gridTemplateColumns: `repeat(${cols}, var(--cell))`,
    }"
    aria-hidden="true"
  >
    <span
      v-for="(b, i) in blocks"
      :key="`${b.id}-${i}`"
      class="mosaic__cell"
      :style="cellStyle(b)"
      :title="b.zh"
    />
  </div>
</template>

<style scoped>
.mosaic {
  display: grid;
  gap: 0;
  background: #000;
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset 1px 1px 0 rgb(255 255 255 / 22%),
    3px 3px 0 rgb(0 0 0 / 45%);
  width: fit-content;
}

.mosaic__cell {
  display: block;
  width: var(--cell);
  height: var(--cell);
  /* 16×16 的原版贴图放大后要保持硬边，不要被插值糊掉 */
  background-size: cover;
  background-position: center;
  image-rendering: pixelated;
  /* 1px 内描边让相邻色块有格子感，不至于糊成一片 */
  box-shadow: inset -1px -1px 0 rgb(0 0 0 / 28%);
}
</style>
