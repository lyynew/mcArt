<script setup lang="ts">
import { ref, watch } from 'vue'
import { McNote, McWindow } from '@/design/components'
import BlockGrid from '@/components/blocks/BlockGrid.vue'
import { ALL_BLOCK_DEFS, PALETTE_IDS } from '@/core/blocks'
import { ITEMS } from '@/core/items'
import { useAtlas } from './composables/useAtlas'
import AtlasFilters from './components/AtlasFilters.vue'
import BlockDetailCard from './components/BlockDetailCard.vue'
import ItemDetailCard from './components/ItemDetailCard.vue'

/**
 * 图鉴：方块 + 物品。
 *
 * 方块是全量注册表（色板源 + 识别扩展）的贴图、中文名与 ID；
 * 物品是不参与像素画的那 563 条，只用于查名字、拿 ID 和给成就图标找素材。
 * 两边共用同一套格子，靠顶部的模式切换在两组数据间跳。
 *
 * 没有生成器那套画布逻辑，纯粹是查询与复制。一次能排出近千个格子，
 * 所以贴图交给 BlockSlot 的懒加载，滚到哪儿请求到哪儿。
 */
const {
  mode,
  keyword,
  family,
  paletteOnly,
  selectedBlock,
  selectedItem,
  blockGroups,
  itemGroups,
  matched,
  filterKey,
  familyOptions,
} = useAtlas()

const scroller = ref<HTMLElement>()

/** 换模式/分组/改关键词后回到顶部，否则停在上一个列表的中间位置很困惑 */
watch(filterKey, () => {
  if (scroller.value) scroller.value.scrollTop = 0
})
</script>

<template>
  <div class="atlas">
    <div class="atlas__main">
      <McWindow :title="mode === 'block' ? '方块图鉴' : '物品图鉴'">
        <AtlasFilters
          v-model:mode="mode"
          v-model:keyword="keyword"
          v-model:family="family"
          v-model:palette-only="paletteOnly"
          :family-options="familyOptions"
        />

        <div ref="scroller" class="atlas__scroll">
          <BlockGrid
            v-if="mode === 'block'"
            :groups="blockGroups"
            :size="40"
            @select="selectedBlock = $event"
          />
          <BlockGrid
            v-else
            :groups="itemGroups"
            :size="40"
            empty-text="没有匹配的物品"
            @select="selectedItem = $event"
          />
        </div>

        <McNote v-if="mode === 'block'">
          {{ matched }} / {{ ALL_BLOCK_DEFS.length }} 种 · 共
          {{ PALETTE_IDS.size }} 种参与像素画配色 · 点方块看详情与命令
        </McNote>
        <McNote v-else>
          {{ matched }} / {{ ITEMS.length }} 种物品 · 不进像素画色板，供图鉴与成就图标使用
        </McNote>
      </McWindow>
    </div>

    <aside class="atlas__side">
      <BlockDetailCard v-if="mode === 'block'" :block="selectedBlock" />
      <ItemDetailCard v-else :item="selectedItem" />
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
