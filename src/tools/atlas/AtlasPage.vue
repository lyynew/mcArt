<script setup lang="ts">
import { computed, ref } from 'vue'
import { McInput, McNote, McSegmented, McWindow, type SegOption } from '@/design/components'
import BlockGrid from '@/components/blocks/BlockGrid.vue'
import type { BlockGridGroup } from '@/components/blocks/types'
import { FAMILIES } from '@/core/blocks'
import { ALL_BLOCKS, FAMILY_LABELS, type PaletteBlock } from '@/core/palettes'
import BlockDetailCard from './components/BlockDetailCard.vue'

/**
 * 方块图鉴。
 *
 * 142 种方块的原版贴图与 ID，按分组浏览、可搜索，点开就能复制命令。
 * 没有生成器那套画布逻辑，纯粹是查询与复制。
 */
const keyword = ref('')
const family = ref('all')
const selected = ref<PaletteBlock>(ALL_BLOCKS[0]!)

const familyOptions = computed<SegOption[]>(() => [
  { value: 'all', label: '全部' },
  ...FAMILIES.map((f) => ({ value: f, label: FAMILY_LABELS[f] ?? f })),
])

const groups = computed<BlockGridGroup[]>(() => {
  const q = keyword.value.trim().toLowerCase()
  const out: BlockGridGroup[] = []

  for (const fam of FAMILIES) {
    if (family.value !== 'all' && family.value !== fam) continue

    const items = ALL_BLOCKS.filter((b) => b.fam === fam)
      .filter((b) =>
        q ? b.zh.includes(q) || b.en.toLowerCase().includes(q) || b.id.includes(q) : true,
      )
      .map((b) => ({ block: b, selected: selected.value.id === b.id }))

    if (items.length) {
      out.push({ key: fam, label: FAMILY_LABELS[fam] ?? fam, items })
    }
  }

  return out
})

const matched = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0))
</script>

<template>
  <div class="atlas">
    <div class="atlas__main">
      <McWindow title="方块图鉴">
        <div class="atlas__filters">
          <McInput v-model="keyword" type="search" placeholder="搜方块 / 英文名 / ID" />
          <McSegmented
            :options="familyOptions"
            :columns="3"
            dense
            :model-value="family"
            @update:model-value="family = $event"
          />
        </div>

        <div class="atlas__scroll">
          <BlockGrid :groups="groups" :size="40" @select="selected = $event" />
        </div>

        <McNote>{{ matched }} 种方块 · 点方块看详情与命令</McNote>
      </McWindow>
    </div>

    <aside class="atlas__side">
      <BlockDetailCard :block="selected" />
    </aside>
  </div>
</template>

<style scoped>
.atlas {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: var(--sp-5);
  padding: var(--sp-5) 14px 14px;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}

.atlas__main {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.atlas__main :deep(.mc-window) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.atlas__filters {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.atlas__scroll {
  flex: 1;
  min-height: 0;
  margin-top: var(--sp-3);
  padding-right: 2px;
  overflow-y: auto;
}

.atlas__side {
  min-height: 0;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .atlas {
    grid-template-columns: 1fr;
    /* 单列时退出「撑满视口」的角色：按内容撑高，滚动交给外层容器。
       宽屏那套 flex: 1 + 内部滚动在窄屏会把两行挤扁。 */
    flex: 0 0 auto;
    height: auto;
    grid-auto-rows: max-content;
    align-content: start;
  }

  .atlas__main {
    min-height: 60vh;
  }

  /* 手指滑动时不要嵌套滚动：列表跟着页面一起走 */
  .atlas__scroll,
  .atlas__side {
    overflow: visible;
  }
}
</style>
