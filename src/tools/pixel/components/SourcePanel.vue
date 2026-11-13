<script setup lang="ts">
import { computed } from 'vue'
import { McButton, McDropzone, McWindow } from '@/design/components'
import { useEditor } from '../store/editor'
import {
  openBuiltinPicker,
  reopenCrop,
  requestCrop,
  useSourceIntake,
} from '@/tools/shared/source-intake'

/**
 * 原图：拖入 / 点选 / 粘贴 / 挑内置材质。
 * 粘贴与整页拖放由页面级监听收进来，三条路径都会打开同一个裁剪弹层，
 * 用户自己决定取 1:1 的哪一块；内置材质则由 core 自动取左上角第一帧。
 */
const editor = useEditor()
const { settings } = editor
const { cropRequest } = useSourceIntake()
const canRecrop = computed(() => cropRequest.value !== null)

function onFiles(files: File[]): void {
  const file = files[0]
  if (file) requestCrop(file, file.name)
}
</script>

<template>
  <McWindow title="原图">
    <McDropzone @files="onFiles">
      <strong class="source__title">放入图片</strong>
      <small class="source__hint">
        点击选择 / 拖进来 / Ctrl+V 粘贴<br />放好后可自己挑 1:1 截取区域 · 内置方块 / 物品图标可直接生成
      </small>
    </McDropzone>

    <div class="source__actions">
      <McButton size="sm" @click="openBuiltinPicker">使用内置素材</McButton>
      <McButton size="sm" :disabled="!canRecrop" @click="reopenCrop">重新截取</McButton>
    </div>

    <div v-if="settings.imageName" class="source__file" :title="settings.imageName">
      {{ settings.imageName }}
    </div>
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

.source__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
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
