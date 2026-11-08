<script setup lang="ts">
import { computed, ref } from 'vue'
import { McInput, McNote, McSwitch, McWindow } from '@/design/components'
import { FAMILIES } from '@/core/blocks'
import { ALL_BLOCKS, FAMILY_LABELS, type PaletteBlock } from '@/core/palettes'
import { useEditor } from '../store/editor'
import BlockGrid from '@/components/blocks/BlockGrid.vue'
import HotbarSlots from './HotbarSlots.vue'
import type { BlockGridGroup, HotbarItem } from '@/components/blocks/types'

/**
 * 方块调色板：搜索、只看用到的、按分组排列、九格物品栏。
 */
const editor = useEditor()
const { settings, blocks, counts } = editor

const keyword = ref('')
const onlyUsed = ref(false)

const groups = computed<BlockGridGroup[]>(() => {
  const q = keyword.value.trim().toLowerCase()
  const result: BlockGridGroup[] = []

  for (const family of FAMILIES) {
    const items = blocks.value
      .filter((b) => b.fam === family)
      .filter((b) =>
        q ? b.zh.includes(q) || b.en.toLowerCase().includes(q) || b.id.includes(q) : true,
      )
      .filter((b) => (onlyUsed.value ? (counts.value[b.i] ?? 0) > 0 : true))
      .map((b) => ({
        block: b,
        count: counts.value[b.i] || undefined,
        selected: settings.selected === b.i,
      }))

    if (items.length) {
      result.push({ key: family, label: FAMILY_LABELS[family] ?? family, items })
    }
  }

  return result
})

const hotbarItems = computed<(HotbarItem | null)[]>(() =>
  editor.hotbar.value.map((all) => {
    if (all === null || all === undefined) return null
    const block = ALL_BLOCKS[all]
    if (!block) return null
    return { block, inPalette: blocks.value.some((b) => b.all === all) }
  }),
)

function onSelect(block: PaletteBlock): void {
  editor.selectBlock(block.i)
}
</script>

<template>
  <McWindow title="方块调色板">
    <McInput v-model="keyword" type="search" placeholder="搜方块 / 英文名 / ID" />
    <McSwitch v-model="onlyUsed" label="只看用到的" class="palette__only" />

    <div class="palette__scroll">
      <BlockGrid :groups="groups" @select="onSelect" />
    </div>

    <HotbarSlots
      :items="hotbarItems"
      :active-index="settings.hotSlot"
      @select="editor.selectHotSlot"
      @clear="editor.clearHotSlot"
    />

    <McNote>先点一个格子选中，再点上面的方块放进去；右键格子清空</McNote>
  </McWindow>
</template>

<style scoped>
.palette__only {
  margin: var(--sp-2) 0 4px;
}

.palette__scroll {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 2px;
  box-shadow: inset 0 -10px 10px -10px rgb(0 0 0 / 45%);
}
</style>
