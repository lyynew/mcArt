<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { McButton, McInput, McModal } from '@/design/components'
import { FAMILIES, FAMILY_LABELS } from '@/core/blocks'
import { ALL_BLOCKS, type PaletteBlock } from '@/core/palettes'
import { useEditor } from '../store/editor'
import BlockGrid from '@/components/blocks/BlockGrid.vue'
import type { BlockGridGroup } from '@/components/blocks/types'

/**
 * 自定义方块方案。
 * 勾选状态先放在本地 pending 里，点「应用」才写回 store——
 * 中途反悔直接取消，不会污染当前方案。
 */
const open = defineModel<boolean>({ default: false })

const editor = useEditor()
const keyword = ref('')
const pending = ref<Set<string>>(new Set())

watch(open, (isOpen) => {
  if (!isOpen) return
  keyword.value = ''
  pending.value = new Set(editor.customIds.value)
})

const groups = computed<BlockGridGroup<PaletteBlock>[]>(() => {
  const q = keyword.value.trim().toLowerCase()
  const out: BlockGridGroup<PaletteBlock>[] = []

  for (const family of FAMILIES) {
    const items = ALL_BLOCKS.filter((b) => b.fam === family)
      .filter((b) =>
        q ? b.zh.includes(q) || b.en.toLowerCase().includes(q) || b.id.includes(q) : true,
      )
      .map((b) => ({ block: b, selected: pending.value.has(b.id) }))

    if (items.length) {
      out.push({ key: family, label: FAMILY_LABELS[family] ?? family, items })
    }
  }

  return out
})

function toggle(block: PaletteBlock): void {
  const next = new Set(pending.value)
  if (next.has(block.id)) next.delete(block.id)
  else next.add(block.id)
  pending.value = next
}

function selectAll(): void {
  pending.value = new Set(ALL_BLOCKS.map((b) => b.id))
}

function selectNone(): void {
  pending.value = new Set()
}

function selectUsed(): void {
  pending.value = new Set(editor.usedBlockIds.value)
}

function apply(): void {
  editor.setCustomIds([...pending.value])
  editor.setPalette('custom')
  open.value = false
}
</script>

<template>
  <McModal v-model="open" title="自定义方块方案" width="880px">
    <div class="custom__bar">
      <McInput v-model="keyword" type="search" placeholder="搜方块 / 英文名 / ID" />
      <span class="custom__count">已选 {{ pending.size }} 种</span>
    </div>

    <div class="custom__body">
      <BlockGrid :groups="groups" :size="34" @select="toggle" />
    </div>

    <template #footer>
      <McButton size="sm" @click="selectAll">全选</McButton>
      <McButton size="sm" @click="selectNone">清空</McButton>
      <McButton size="sm" @click="selectUsed">只留图里用到的</McButton>
      <span class="custom__spacer" />
      <McButton size="sm" @click="open = false">取消</McButton>
      <McButton size="sm" variant="primary" @click="apply">应用</McButton>
    </template>
  </McModal>
</template>

<style scoped>
.custom__bar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.custom__bar :deep(.mc-input) {
  flex: 1;
}

.custom__count {
  padding: 4px var(--sp-3);
  font-size: var(--fs-note);
  color: #fff;
  white-space: nowrap;
  background: var(--mc-btn);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset 1px 1px 0 #c8c8c8,
    inset -1px -1px 0 #5a5a5a;
  text-shadow: var(--mc-ts-dark);
}

.custom__body {
  margin-top: var(--sp-3);
  padding: var(--sp-3);
  max-height: 56vh;
  overflow-y: auto;
  background: var(--mc-plate);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-plate-hi);
}

.custom__spacer {
  flex: 1;
}
</style>
