<script setup lang="ts">
import { ref } from 'vue'
import { McDropzone, McNote, McWindow } from '@/design/components'
import { useEditor } from '../store/editor'

/**
 * 原图：拖入 / 点选 / 粘贴。
 * 粘贴监听放在页面级（PixelPage），这里只处理选文件与展示状态。
 */
const editor = useEditor()
const { settings } = editor

const loading = ref(false)
const error = ref('')

async function onFiles(files: File[]): Promise<void> {
  const file = files[0]
  if (!file) return
  error.value = ''
  loading.value = true
  try {
    await editor.loadImage(file, file.name)
  } catch {
    error.value = '这张图读不出来，换一张试试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <McWindow title="原图">
    <McDropzone :disabled="loading" @files="onFiles">
      <strong class="source__title">{{ loading ? '读取中…' : '放入图片' }}</strong>
      <small class="source__hint">点击选择 / 拖进来 / Ctrl+V 粘贴<br />方形裁切，透明处留空</small>
    </McDropzone>

    <div v-if="settings.imageName" class="source__file" :title="settings.imageName">
      {{ settings.imageName }}
    </div>
    <McNote v-if="error" tone="warn">{{ error }}</McNote>
  </McWindow>
</template>

<style scoped>
.source__title {
  display: block;
  font-size: 12.5px;
  margin-bottom: 3px;
}

.source__hint {
  display: block;
  font-size: var(--fs-sm);
  line-height: 1.5;
  color: var(--mc-ink-soft);
}

.source__file {
  margin-top: var(--sp-2);
  padding: 4px 6px;
  font-size: var(--fs-sm);
  color: #fff;
  background: #8f8f8f;
  border: 1px solid #5a5a5a;
  text-shadow: var(--mc-ts-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
