<script setup lang="ts">
import { computed } from 'vue'
import { McButton, McDropzone, McNote, McWindow } from '@/design/components'
import { useMapArt } from '../store'
import {
  openBuiltinPicker,
  reopenCrop,
  requestCrop,
  useSourceIntake,
} from '@/tools/shared/source-intake'

/** 源图：放图、挑内置材质、重选截取区域、换示例、清空。读图都在 core 里。 */
const { source, message, loadDemo, clear } = useMapArt()
const { cropRequest } = useSourceIntake()
const canRecrop = computed(() => cropRequest.value !== null)

function onFiles(files: File[]): void {
  const file = files[0]
  if (file) requestCrop(file, file.name)
}

const sizeText = () => (source.value ? `${source.value.size} × ${source.value.size} px` : '—')
</script>

<template>
  <McWindow title="源图">
    <McDropzone class="source__drop" accept="image/*" @files="onFiles">
      <strong class="source__drop-title">把图片拖进来</strong>
      <small class="source__drop-hint">
        点击选择，或拖到页面任意位置<br />放好后可自己挑 1:1 截取区域 · 本地处理，不上传
      </small>
    </McDropzone>

    <div class="source__meta">
      <span>当前：{{ source?.name || '未载入' }}</span>
      <span>{{ sizeText() }}</span>
    </div>

    <div class="source__actions">
      <McButton size="sm" @click="openBuiltinPicker">使用内置方块图片</McButton>
      <McButton size="sm" :disabled="!canRecrop" @click="reopenCrop">重新截取</McButton>
      <McButton size="sm" @click="loadDemo">载入示例图</McButton>
      <McButton size="sm" :disabled="!source" @click="clear">清空</McButton>
    </div>

    <McNote v-if="message">{{ message }}</McNote>
    <McNote v-else>图片会按选中的方形区域压到 128 × 128 格。</McNote>
  </McWindow>
</template>

<style scoped>
.source__drop {
  padding: 26px var(--sp-3);
}

.source__drop-title {
  display: block;
  font-size: 13px;
  margin-bottom: 5px;
}

.source__drop-hint {
  display: block;
  font-size: var(--fs-note);
  line-height: 1.7;
  color: var(--mc-ink-soft);
}

.source__meta {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
  font-size: var(--fs-note);
  color: var(--mc-ink-strong);
}

.source__meta span:first-child {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.source__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}
</style>
