<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { McNote, McSegmented, McSlider, McWindow, type SegOption } from '@/design/components'
import { debounce } from '@/shared/debounce'
import { useEditor } from '../store/editor'
import { SIZE_PRESETS } from '../types'

/**
 * 画幅规格。
 * 滑杆拖动时用防抖——每格都要重新采样和匹配，连续触发会明显卡顿；
 * 预设按钮是离散值，点了就立即生效。
 */
const editor = useEditor()
const { settings } = editor

const draft = ref(settings.n)

watch(
  () => settings.n,
  (n) => {
    if (n !== draft.value) draft.value = n
  },
)

const applySize = debounce((n: number) => editor.setSize(n), 200)

watch(draft, (n) => {
  if (n === settings.n) return
  applySize(n)
})

onBeforeUnmount(() => applySize.cancel())

const presets = computed<SegOption[]>(() =>
  SIZE_PRESETS.map((n) => ({ value: String(n), label: String(n) })),
)

const activePreset = computed(() =>
  SIZE_PRESETS.includes(settings.n as (typeof SIZE_PRESETS)[number]) ? String(settings.n) : '',
)

function onPreset(value: string): void {
  const n = Number(value)
  if (!Number.isFinite(n)) return
  applySize.cancel()
  draft.value = n
  editor.setSize(n)
}
</script>

<template>
  <McWindow title="规格">
    <McSlider
      v-model="draft"
      label="边长格数"
      :min="16"
      :max="160"
      :step="1"
      suffix=" 格"
    />
    <McSegmented :options="presets" :columns="3" :model-value="activePreset" @update:model-value="onPreset" />
    <McNote>格数越少越像图标，越多越接近照片</McNote>
  </McWindow>
</template>
