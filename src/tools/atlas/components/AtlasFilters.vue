<script setup lang="ts">
import { McInput, McSegmented, McSwitch, type SegOption } from '@/design/components'
import { ALL_BLOCK_DEFS } from '@/core/blocks'
import { ITEMS } from '@/core/items'
import type { AtlasMode } from '../composables/useAtlas'

/**
 * 图鉴顶部筛选栏。
 *
 * 第一行切「方块 / 物品」，后面几行只服务于方块：物品没有分组字段，
 * 也没有「是否进色板」这个概念，留着这些控件点了没反应就是骗人。
 *
 * 各项都用 defineModel 交由页面持有，切模式时状态留在页面里不丢。
 */
defineProps<{ familyOptions: SegOption[] }>()

const mode = defineModel<AtlasMode>('mode', { required: true })
const keyword = defineModel<string>('keyword', { required: true })
const family = defineModel<string>('family', { required: true })
const paletteOnly = defineModel<boolean>('paletteOnly', { required: true })

const modeOptions: SegOption[] = [
  { value: 'block', label: `方块 ${ALL_BLOCK_DEFS.length}` },
  { value: 'item', label: `物品 ${ITEMS.length}` },
]
</script>

<template>
  <div class="filters">
    <!-- McSegmented 的 model 是 string，这里显式收回 AtlasMode -->
    <McSegmented
      :options="modeOptions"
      :model-value="mode"
      @update:model-value="mode = $event as AtlasMode"
    />

    <McInput
      v-model="keyword"
      type="search"
      :placeholder="mode === 'block' ? '搜方块 / 英文名 / ID' : '搜物品 / 英文名 / ID'"
    />

    <template v-if="mode === 'block'">
      <McSwitch v-model="paletteOnly" label="只看可用于像素画的色板方块" />
      <McSegmented
        :options="familyOptions"
        :columns="4"
        dense
        :model-value="family"
        @update:model-value="family = $event"
      />
    </template>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
</style>
