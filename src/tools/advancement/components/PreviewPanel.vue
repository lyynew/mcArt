<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { McNote, McWindow } from '@/design/components'
import { TOAST_HEIGHT, TOAST_WIDTH } from '../model'
import { paintToast } from '../render'
import { useAdvancement } from '../store'

/**
 * 实时预览。canvas 由 render.ts 的 paintToast 绘制，和 PNG 导出共用同一份代码，
 * 预览固定用 1×（320×64），只是 CSS 放大显示——导出倍率不会让预览变形。
 */
const { spec, assets, fontReady } = useAdvancement()
const canvas = ref<HTMLCanvasElement>()
const note = ref('')

function repaint(): void {
  const el = canvas.value
  if (!el) return
  const result = paintToast(el, { ...spec.value, scale: 1 }, assets.value)
  note.value = result.note
}

onMounted(repaint)
// assets 是 shallowRef，素材加载完整体替换才触发；单独 watch 内部字段会漏
watch([spec, assets, fontReady], repaint)
</script>

<template>
  <McWindow :title="`预览 · ${TOAST_WIDTH} × ${TOAST_HEIGHT}`" flush class="preview">
    <div class="preview__stage">
      <canvas ref="canvas" class="preview__canvas" aria-label="进度提示图预览" />
    </div>

    <div class="preview__bar">
      <McNote v-if="!fontReady">正在加载像素字体…</McNote>
      <McNote v-else-if="note" tone="warn">{{ note }}</McNote>
      <McNote v-else>实时预览 · 底图为游戏原版进度提示 · 只导出 PNG</McNote>
    </div>
  </McWindow>
</template>

<style scoped>
.preview {
  flex: 1 1 auto;
  min-height: 0;
}

.preview__stage {
  flex: 1 1 auto;
  min-height: 0;
  /*
   * 横幅是 5:1 的固定比例块。只按宽度定尺寸在矮视口必然溢出（地图画踩过），
   * 容器查询同时听宽和高：500cqh 就是「高度够放 5:1 时的最大宽度」。
   */
  container-type: size;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-4);
  background: repeating-conic-gradient(#2c2c2c 0% 25%, #383838 0% 50%) 50% / 16px 16px;
}

.preview__canvas {
  display: block;
  width: min(100cqw, 500cqh, 640px);
  height: auto;
  aspect-ratio: 5 / 1;
  image-rendering: pixelated;
  border: var(--mc-bd) solid #000;
  box-shadow: var(--mc-shadow-panel);
}

.preview__bar {
  padding: var(--sp-2) var(--sp-4);
  border-top: var(--mc-bd) solid #000;
  background: var(--mc-plate);
}
</style>
