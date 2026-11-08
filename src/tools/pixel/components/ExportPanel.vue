<script setup lang="ts">
import { McButton, McNote, McWindow } from '@/design/components'
import { useEditor } from '../store/editor'
import { useExporter } from '../composables/useExporter'

/**
 * 图片与清单导出。
 * 四件事都是「点了就给文件」，所以按钮做成竖排的一列，主动作在第一位。
 */
const editor = useEditor()
const { message, exportPng, exportCsv } = useExporter()
</script>

<template>
  <McWindow title="图片导出">
    <div class="exports">
      <McButton variant="primary" @click="exportPng(false)">纯净像素图 PNG</McButton>
      <McButton @click="exportPng(true)">施工图 PNG（带坐标）</McButton>
      <McButton @click="exportCsv">材料清单 CSV</McButton>
      <McButton @click="editor.regenerate">按原图重新生成</McButton>
    </div>

    <McNote>{{ message || '导出的图始终是纯色，方便照着铺' }}</McNote>
  </McWindow>
</template>

<style scoped>
.exports {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
</style>
