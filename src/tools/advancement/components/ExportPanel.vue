<script setup lang="ts">
import { ref } from 'vue'
import { McButton, McNote, McSegmented, McWindow, type SegOption } from '@/design/components'
import { downloadBlob } from '@/shared/download'
import { EXPORT_SCALES, TOAST_HEIGHT, TOAST_WIDTH, type ExportScale } from '../model'
import { copyToastImage, toastFileName, toastPngBlob } from '../export'
import { useAdvancement } from '../store'

/** 导出面板：只出 PNG。倍率只改画布尺寸，不改任何布局数字 */
const { spec, assets, scale } = useAdvancement()
const busy = ref(false)
/** 导出回执只属于这块面板，不写进全局状态串到图标面板去 */
const reply = ref('')

const SCALE_OPTIONS: SegOption[] = EXPORT_SCALES.map((s) => ({
  value: String(s),
  label: `${s}×`,
  title: `${TOAST_WIDTH * s} × ${TOAST_HEIGHT * s} 像素`,
}))

// McSegmented 的 model 是 string，而 scale 是 1|2|4 的字面量联合
function onScale(v: string): void {
  scale.value = Number(v) as ExportScale
}

async function run(action: 'download' | 'copy'): Promise<void> {
  if (busy.value) return
  busy.value = true
  try {
    if (action === 'download') {
      const blob = await toastPngBlob(spec.value, assets.value)
      downloadBlob(blob, toastFileName(spec.value))
      reply.value = `已导出 ${TOAST_WIDTH * scale.value} × ${TOAST_HEIGHT * scale.value} PNG`
    } else {
      await copyToastImage(spec.value, assets.value)
      reply.value = '图片已复制到剪贴板'
    }
  } catch (e) {
    reply.value = e instanceof Error ? e.message : '导出失败，请重试'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <McWindow title="导出">
    <div class="export-panel">
      <span class="export-panel__label">导出倍率</span>
      <McSegmented
        :options="SCALE_OPTIONS"
        :columns="3"
        dense
        :model-value="String(scale)"
        @update:model-value="onScale"
      />
      <span class="export-panel__size">
        {{ TOAST_WIDTH * scale }} × {{ TOAST_HEIGHT * scale }} 像素
      </span>

      <McButton variant="primary" :disabled="busy" @click="run('download')">下载 PNG</McButton>
      <McButton :disabled="busy" @click="run('copy')">复制到剪贴板</McButton>

      <McNote>四角是透明的圆角，导出保留 alpha。图片只在本机生成，不上传、不产出 JSON 或命令。</McNote>
      <p class="export-panel__reply">{{ reply }}</p>
    </div>
  </McWindow>
</template>

<style scoped>
.export-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.export-panel__label {
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}

.export-panel__size {
  font-family: var(--font-mc);
  font-size: var(--fs-sm);
  color: var(--mc-ink-strong);
}

.export-panel__reply {
  min-height: 14px;
  margin: 0;
  font-size: var(--fs-note);
  color: var(--mc-accent-lo);
}
</style>
