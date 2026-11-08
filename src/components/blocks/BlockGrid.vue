<script setup lang="ts">
import type { PaletteBlock } from '@/core/palettes'
import BlockSlot from './BlockSlot.vue'
import type { BlockGridGroup } from './types'

/**
 * 分组色板网格。
 * 纯展示：分组、角标、选中态都由调用方算好，这里只负责排布与点击。
 */
withDefaults(
  defineProps<{
    groups: BlockGridGroup[]
    /** 单格边长 */
    size?: number
    emptyText?: string
  }>(),
  { size: 36, emptyText: '没有匹配的方块' },
)

const emit = defineEmits<{ (e: 'select', block: PaletteBlock): void }>()
</script>

<template>
  <div class="block-grid" :style="{ '--slot': `${size}px` }">
    <p v-if="groups.length === 0" class="block-grid__empty">{{ emptyText }}</p>

    <section v-for="group in groups" :key="group.key" class="block-grid__group">
      <h3 class="block-grid__title">{{ group.label }}</h3>
      <div class="block-grid__slots">
        <BlockSlot
          v-for="item in group.items"
          :key="item.block.id"
          :block="item.block"
          :size="size"
          :count="item.count"
          :selected="item.selected"
          :muted="item.muted"
          :title="`${item.block.zh} · ${item.block.en} · ${item.block.id}`"
          @click="emit('select', item.block)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.block-grid__empty {
  padding: var(--sp-3);
  font-size: var(--fs-sm);
  color: var(--mc-ink-soft);
  text-align: center;
}

.block-grid__group + .block-grid__group {
  margin-top: var(--sp-2);
}

.block-grid__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px;
  font-size: var(--fs-note);
  font-weight: 400;
  letter-spacing: 0.06em;
  color: #5a5a5a;
  text-shadow: var(--mc-ts-light);
}

/* 标题右侧拉一条渐隐细线，把分组切得更清楚 */
.block-grid__title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgb(0 0 0 / 20%), transparent);
}

.block-grid__slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--slot));
  gap: 4px;
}
</style>
