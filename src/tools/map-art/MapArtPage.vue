<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ToolShell from '@/tools/ToolShell.vue'
import { useMapArt } from './store'
import SourcePanel from './components/SourcePanel.vue'
import TuningPanel from './components/TuningPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ExportPanel from './components/ExportPanel.vue'
import SourceIntake from '@/tools/shared/SourceIntake.vue'
import { requestCrop } from '@/tools/shared/source-intake'

/**
 * 地图画生成器。
 *
 * 页面只做两件事：把四块面板放进标准三栏外壳、接住整页拖放。
 * 参数、算法、导出、状态分别在 store / *.ts / components 里，
 * 这一层不写任何业务计算，新增功能不用改页面骨架。
 */
const { hasImage, loadDemo, setSource } = useMapArt()
const dragging = ref(false)
let dragDepth = 0

function hasFiles(e: DragEvent): boolean {
  const types = e.dataTransfer?.types
  return types ? Array.from(types).includes('Files') : false
}

function onDragEnter(e: DragEvent): void {
  if (!hasFiles(e)) return
  dragDepth += 1
  dragging.value = true
}

function onDragOver(e: DragEvent): void {
  if (!hasFiles(e)) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

function onDragLeave(e: DragEvent): void {
  if (!dragging.value) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0 || e.relatedTarget === null) {
    dragDepth = 0
    dragging.value = false
  }
}

/** 拖到 McDropzone 上时它已经 preventDefault，这里退让，避免同一张图解析两遍 */
function onDrop(e: DragEvent): void {
  if (!hasFiles(e)) return
  dragDepth = 0
  dragging.value = false
  if (e.defaultPrevented) return
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) requestCrop(file, file.name)
}

onMounted(() => {
  if (!hasImage.value) loadDemo()
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
})
</script>

<template>
  <!-- 三栏与像素画页面对齐：同样的列宽、同样不设最大宽度 -->
  <ToolShell
    mobile-stage-first
    max-width="none"
    controls-width="232px"
    aside-width="272px"
  >
    <template #controls>
      <SourcePanel />
      <TuningPanel />
    </template>
    <template #stage>
      <PreviewPanel />
    </template>
    <template #aside>
      <ExportPanel />
    </template>
  </ToolShell>

  <SourceIntake @pick="setSource" />

  <div v-if="dragging" class="mapart__overlay">
    <div class="mapart__overlay-box">
      <strong>松手即可生成</strong>
      <small>图片本地处理，不会上传</small>
    </div>
  </div>
</template>

<style scoped>
.mapart__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  pointer-events: none;
  background: rgb(12 11 8 / 62%);
  backdrop-filter: blur(2px);
}

.mapart__overlay-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: 28px 40px;
  color: var(--mc-text);
  background: var(--mc-bg);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-bar-top),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #14120d,
    var(--mc-shadow-modal);
}

.mapart__overlay-box strong {
  font-size: 16px;
  letter-spacing: 0.06em;
}

.mapart__overlay-box small {
  font-size: var(--fs-sm);
  color: var(--mc-text-dim);
}
</style>
