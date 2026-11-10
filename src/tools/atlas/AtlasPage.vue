<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { McInput, McNote, McSegmented, McSwitch, McWindow, type SegOption } from '@/design/components'
import BlockGrid from '@/components/blocks/BlockGrid.vue'
import type { BlockGridGroup } from '@/components/blocks/types'
import { ALL_BLOCK_DEFS, FAMILY_CATALOG, FAMILY_LABELS, PALETTE_IDS, type BlockDef } from '@/core/blocks'
import BlockDetailCard from './components/BlockDetailCard.vue'

/**
 * 方块图鉴。
 *
 * 全量注册表（色板源 + 识别扩展）的原版贴图、中文名与 ID：按分组浏览、
 * 中文名/英文名/ID 都能搜，点开就能复制 ID 或 give 命令。
 * 没有生成器那套画布逻辑，纯粹是查询与复制。
 *
 * 一次能排出近千个格子，所以：分组由 FAMILY_CATALOG 固定顺序，
 * 贴图交给 BlockSlot 的懒加载，滚到哪儿请求到哪儿。
 */
const keyword = ref('')
const family = ref('all')
const paletteOnly = ref(false)
const selected = ref<BlockDef>(ALL_BLOCK_DEFS[0]!)
const scroller = ref<HTMLElement>()

/** 按分组预先分桶，筛选时不用每次全表扫一遍 */
const byFamily = computed(() => {
  const map = new Map<string, BlockDef[]>()
  for (const b of ALL_BLOCK_DEFS) {
    const list = map.get(b.fam)
    if (list) list.push(b)
    else map.set(b.fam, [b])
  }
  return map
})

const familyOptions: SegOption[] = [
  { value: 'all', label: '全部' },
  ...FAMILY_CATALOG.map((f) => ({ value: f.id, label: f.label })),
]

function matches(b: BlockDef, q: string): boolean {
  if (paletteOnly.value && !PALETTE_IDS.has(b.id)) return false
  if (!q) return true
  return b.zh.includes(q) || b.en.toLowerCase().includes(q) || b.id.includes(q)
}

const groups = computed<BlockGridGroup[]>(() => {
  const q = keyword.value.trim().toLowerCase()
  const out: BlockGridGroup[] = []

  for (const fam of FAMILY_CATALOG) {
    if (family.value !== 'all' && family.value !== fam.id) continue

    const items = (byFamily.value.get(fam.id) ?? [])
      .filter((b) => matches(b, q))
      .map((b) => ({ block: b, selected: selected.value.id === b.id }))

    if (items.length) {
      out.push({ key: fam.id, label: `${FAMILY_LABELS[fam.id] ?? fam.id} ${items.length}`, items })
    }
  }

  return out
})

const matched = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0))

/** 换分组/改关键词后回到顶部，否则停在上一个分组的中间位置很困惑 */
watch([family, paletteOnly, keyword], () => {
  if (scroller.value) scroller.value.scrollTop = 0
})
</script>

<template>
  <div class="atlas">
    <div class="atlas__main">
      <McWindow title="方块图鉴">
        <div class="atlas__filters">
          <McInput v-model="keyword" type="search" placeholder="搜方块 / 英文名 / ID" />
          <McSwitch v-model="paletteOnly" label="只看可用于像素画的 142 种" />
          <McSegmented
            :options="familyOptions"
            :columns="4"
            dense
            :model-value="family"
            @update:model-value="family = $event"
          />
        </div>

        <div ref="scroller" class="atlas__scroll">
          <BlockGrid :groups="groups" :size="40" @select="selected = $event" />
        </div>

        <McNote>
          {{ matched }} / {{ ALL_BLOCK_DEFS.length }} 种 · 共
          {{ PALETTE_IDS.size }} 种参与像素画配色 · 点方块看详情与命令
        </McNote>
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
