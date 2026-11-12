<script setup lang="ts" generic="T extends BlockDef">
import type { BlockDef } from '@/core/blocks'
import BlockSlot from './BlockSlot.vue'
import type { BlockGridGroup } from './types'

/**
 * 分组方块网格。
 * 纯展示：分组、角标、选中态都由调用方算好，这里只负责排布与点击。
 * 泛型 T 跟着传进来的分组走，选中事件就能把调用方自己的方块类型原样还回去。
 */
withDefaults(
  defineProps<{
    groups: BlockGridGroup<T>[]
    /** 单格边长 */
    size?: number
    emptyText?: string
  }>(),
  { size: 36, emptyText: '没有匹配的方块' },
)

const emit = defineEmits<{ (e: 'select', block: T): void }>()
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
  /*
   * 选中态的金边是向外扩的（BlockSlot.is-on 的 2px 描边 + 8px 光晕）。
   * 外层滚动容器写 overflow-y:auto 时，overflow-x 会被连带算成 auto，
   * 于是最左 / 最上一列的外扩亮框正好落在裁剪边界上，被切掉半圈。
   * 网格自己留一点余量，调色板、图鉴、自定义方案弹窗三处都受益。
   */
  padding: 4px;
}
</style>
