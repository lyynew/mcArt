import { computed, ref } from 'vue'
import {
  ALL_BLOCK_DEFS,
  FAMILY_CATALOG,
  FAMILY_LABELS,
  PALETTE_IDS,
  type BlockDef,
} from '@/core/blocks'
import { ITEMS, type ItemDef } from '@/core/items'
import type { BlockGridGroup } from '@/components/blocks/types'

/**
 * 图鉴的两套数据与筛选状态。
 *
 * 方块（2913 条）按 FAMILY_CATALOG 的固定顺序分组，和调色板的分组一致；
 * 物品（563 条）没有分组字段，按英文名首字母分桶——这是唯一不需要维护、
 * 也不会猜错的分桶方式，滚动时有个定位抓手。
 *
 * 两套各留一份选中项：来回切模式不用重新找上次看的是哪个。
 */
export type AtlasMode = 'block' | 'item'

/** 不在 A–Z 的（数字、符号开头）统一落到末尾 */
const MISC_KEY = '#'

function firstLetter(name: string): string {
  const head = name.trim().charAt(0).toUpperCase()
  return head >= 'A' && head <= 'Z' ? head : MISC_KEY
}

export function useAtlas() {
  const mode = ref<AtlasMode>('block')
  const keyword = ref('')
  const family = ref('all')
  const paletteOnly = ref(false)

  const selectedBlock = ref<BlockDef>(ALL_BLOCK_DEFS[0]!)
  const selectedItem = ref<ItemDef>(ITEMS[0]!)

  /** 方块按 fam 预先分桶，筛选时不用每次全表扫一遍 */
  const blockByFamily = computed(() => {
    const map = new Map<string, BlockDef[]>()
    for (const b of ALL_BLOCK_DEFS) {
      const list = map.get(b.fam)
      if (list) list.push(b)
      else map.set(b.fam, [b])
    }
    return map
  })

  const query = computed(() => keyword.value.trim().toLowerCase())

  function matchBlock(b: BlockDef, q: string): boolean {
    if (paletteOnly.value && !PALETTE_IDS.has(b.id)) return false
    if (!q) return true
    return b.zh.includes(q) || b.en.toLowerCase().includes(q) || b.id.includes(q)
  }

  function matchItem(item: ItemDef, q: string): boolean {
    if (!q) return true
    return item.zh.includes(q) || item.en.toLowerCase().includes(q) || item.id.includes(q)
  }

  const blockGroups = computed<BlockGridGroup<BlockDef>[]>(() => {
    const q = query.value
    const out: BlockGridGroup<BlockDef>[] = []

    for (const fam of FAMILY_CATALOG) {
      if (family.value !== 'all' && family.value !== fam.id) continue

      const items = (blockByFamily.value.get(fam.id) ?? [])
        .filter((b) => matchBlock(b, q))
        .map((b) => ({ block: b, selected: selectedBlock.value.id === b.id }))

      if (items.length) {
        out.push({ key: fam.id, label: `${FAMILY_LABELS[fam.id] ?? fam.id} ${items.length}`, items })
      }
    }

    return out
  })

  const itemGroups = computed<BlockGridGroup<ItemDef>[]>(() => {
    const q = query.value
    const buckets = new Map<string, ItemDef[]>()

    for (const item of ITEMS) {
      if (!matchItem(item, q)) continue
      const key = firstLetter(item.en)
      const list = buckets.get(key)
      if (list) list.push(item)
      else buckets.set(key, [item])
    }

    const keys = [...buckets.keys()].sort((a, b) => {
      if (a === MISC_KEY) return 1
      if (b === MISC_KEY) return -1
      return a.localeCompare(b)
    })

    return keys.map((key) => ({
      key: `item-${key}`,
      label: `${key} ${buckets.get(key)!.length}`,
      items: buckets.get(key)!.map((item) => ({
        block: item,
        selected: selectedItem.value.id === item.id,
      })),
    }))
  })

  const matched = computed(() =>
    mode.value === 'block'
      ? blockGroups.value.reduce((n, g) => n + g.items.length, 0)
      : itemGroups.value.reduce((n, g) => n + g.items.length, 0),
  )

  /** 模式、分组、关键词任一变化都意味着列表整体换了一批 */
  const filterKey = computed(
    () => `${mode.value}|${family.value}|${paletteOnly.value}|${query.value}`,
  )

  const familyOptions = computed(() => [
    { value: 'all', label: '全部' },
    ...FAMILY_CATALOG.map((f) => ({ value: f.id, label: f.label })),
  ])

  return {
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
  }
}
