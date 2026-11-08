<script setup lang="ts">
import { computed } from 'vue'
import { McButton, McNote, McSegmented, McWindow, type SegOption } from '@/design/components'
import { PALETTES, PALETTE_ORDER, type PaletteId } from '@/core/palettes'
import { useEditor } from '../store/editor'

/**
 * 方块色系。
 * 十套方案由数据推导（见 core/palettes），这里只负责选择和说明文案。
 */
const emit = defineEmits<{ (e: 'open-custom'): void }>()

const editor = useEditor()
const { settings } = editor

const options = computed<SegOption[]>(() =>
  PALETTE_ORDER.map((id) => ({
    value: id,
    label: PALETTES[id].label,
    title: PALETTES[id].desc,
    // 「自定义」独占一行，跟旧版布局一致
    span: id === 'custom',
  })),
)

const note = computed(() => {
  const palette = PALETTES[settings.paletteId]
  const count = editor.blocks.value.length
  if (palette.custom) {
    return count > 0 ? `自定义方案 · ${count} 种方块` : '还没挑方块，点下面「选择方块」'
  }
  return `${count} 种方块 · ${palette.desc}`
})

function onSelect(value: string): void {
  editor.setPalette(value as PaletteId)
}
</script>

<template>
  <McWindow title="方块色系">
    <McSegmented
      :options="options"
      :columns="3"
      dense
      :model-value="settings.paletteId"
      @update:model-value="onSelect"
    />
    <McButton size="sm" style="margin-top: var(--sp-2)" @click="emit('open-custom')">
      选择方块…
    </McButton>
    <McNote>{{ note }}</McNote>
  </McWindow>
</template>
