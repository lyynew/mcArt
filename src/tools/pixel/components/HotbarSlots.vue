<script setup lang="ts">
import BlockSlot from '@/components/blocks/BlockSlot.vue'
import type { HotbarItem } from '@/components/blocks/types'

/**
 * 九格物品栏。
 * 先点格子选中，再点色板里的方块放进去；右键清空。可以重复放同一格，不会互相挤掉。
 */
defineProps<{
  items: (HotbarItem | null)[]
  activeIndex: number
}>()

const emit = defineEmits<{
  (e: 'select', index: number): void
  (e: 'clear', index: number): void
}>()
</script>

<template>
  <div class="hotbar">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="hotbar__cell"
      @contextmenu.prevent="emit('clear', index)"
    >
      <BlockSlot
        :block="item?.block ?? null"
        :size="0"
        :label="String(index + 1)"
        :muted="!!item && !item.inPalette"
        :selected="index === activeIndex"
        :title="
          item
            ? `${item.block.zh} · 第 ${index + 1} 格（右键清空）`
            : `空格子 ${index + 1}：点它选中，再点上面的方块放进来`
        "
        @click="emit('select', index)"
      />
    </div>
  </div>
</template>

<style scoped>
.hotbar {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 2px;
  margin-top: var(--sp-3);
  padding: 3px;
  background: #5c5c5c;
  border: var(--mc-bd) solid #000;
  box-shadow: inset 2px 2px 0 #3a3a3a;
}

.hotbar__cell {
  display: flex;
  min-width: 0;
}

/* 物品栏里的格子随栏宽自适应，去掉 BlockSlot 的固定尺寸 */
.hotbar__cell :deep(.slot) {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
}
</style>
