<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { McNote, McSlider, McWindow } from '@/design/components'
import { debounce } from '@/shared/debounce'
import { useEditor } from '../store/editor'

/**
 * 调色：对比度与饱和度。
 * 两个值一起防抖提交，避免拖动时反复整图重算。
 */
const editor = useEditor()
const { settings } = editor

const contrast = ref(settings.contrast)
const sat = ref(settings.sat)

watch(
  () => [settings.contrast, settings.sat] as const,
  ([c, s]) => {
    if (c !== contrast.value) contrast.value = c
    if (s !== sat.value) sat.value = s
  },
)

const apply = debounce((c: number, s: number) => editor.setTone(c, s), 220)

watch([contrast, sat], ([c, s]) => {
  if (c === settings.contrast && s === settings.sat) return
  apply(c, s)
})

onBeforeUnmount(() => {
  // 还没提交就离开页面时，把最后一次调整补上
  apply.flush()
  apply.cancel()
})
</script>

<template>
  <McWindow title="调色">
    <McSlider v-model="contrast" label="对比度" :min="-60" :max="60" :step="2" />
    <McSlider v-model="sat" label="饱和度" :min="-60" :max="60" :step="2" />
    <McNote>照片发灰就加对比度，颜色过艳降饱和度</McNote>
  </McWindow>
</template>
