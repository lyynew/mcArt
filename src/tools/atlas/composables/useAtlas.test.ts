import { describe, expect, it } from 'vitest'
import { ALL_BLOCK_DEFS, FAMILY_CATALOG, PALETTE_IDS } from '@/core/blocks'
import { ITEMS } from '@/core/items'
import { useAtlas } from './useAtlas'

/**
 * 图鉴的分组与筛选是界面上唯一会「算错」的地方，这里逐条钉住。
 *
 * 物品按英文首字母分桶是后来加上的：规则必须稳定（同样的数据永远同样
 * 的分组顺序），否则每次打开图鉴组的位置都在跳。
 */
const flatten = (groups: readonly { items: readonly unknown[] }[]) =>
  groups.flatMap((g) => g.items)

describe('图鉴 · 方块模式', () => {
  it('默认铺满全量注册表，分组顺序跟 FAMILY_CATALOG 一致', () => {
    const a = useAtlas()
    expect(a.mode.value).toBe('block')

    const famOrder = FAMILY_CATALOG.map((f) => f.id)
    const usedOrder = a.blockGroups.value.map((g) => g.key)
    // 只比较出现过的分组，顺序必须和目录一致
    expect(usedOrder).toEqual(famOrder.filter((id) => usedOrder.includes(id)))
    expect(a.matched.value).toBe(ALL_BLOCK_DEFS.length)
  })

  it('只看色板时结果全部在 PALETTE_IDS 里，且数量对得上', () => {
    const a = useAtlas()
    a.paletteOnly.value = true

    const shown = flatten(a.blockGroups.value) as { block: { id: string } }[]
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.every((it) => PALETTE_IDS.has(it.block.id))).toBe(true)
  })

  it('分组筛选只留下那一组', () => {
    const a = useAtlas()
    const fam = FAMILY_CATALOG[0]!.id
    a.family.value = fam

    expect(a.blockGroups.value.map((g) => g.key)).toEqual([fam])
  })

  it('中文名、英文名、ID 都能搜到', () => {
    const a = useAtlas()
    a.keyword.value = '混凝土'
    expect(a.matched.value).toBeGreaterThan(0)

    a.keyword.value = 'concrete'
    const byEn = a.matched.value
    expect(byEn).toBeGreaterThan(0)

    a.keyword.value = 'white_concrete'
    expect(a.matched.value).toBeGreaterThan(0)
  })

  it('搜不到时返回空数组而不是空分组', () => {
    const a = useAtlas()
    a.keyword.value = '这个词一定搜不到'
    expect(a.blockGroups.value).toEqual([])
    expect(a.matched.value).toBe(0)
  })
})

describe('图鉴 · 物品模式', () => {
  it('分组按 A→Z 排，非字母开头的落末尾', () => {
    const a = useAtlas()
    a.mode.value = 'item'

    const keys = a.itemGroups.value.map((g) => g.key.replace(/^item-/, ''))
    const letters = keys.filter((k) => k !== '#')
    expect(letters).toEqual([...letters].sort((x, y) => x.localeCompare(y)))
    // '#' 只在数字/符号开头时才出现，出现就必须在最后
    if (keys.includes('#')) expect(keys.at(-1)).toBe('#')
    expect(a.matched.value).toBe(ITEMS.length)
  })

  it('每个物品只出现在一个分组里，没有重复也没有漏', () => {
    const a = useAtlas()
    a.mode.value = 'item'

    const ids = flatten(a.itemGroups.value).map((it) => (it as { block: { id: string } }).block.id)
    expect(ids.length).toBe(ITEMS.length)
    // ITEMS 里有 _shard / _sherd 这种同名不同 id 的重复贴图，所以只能比集合大小
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('物品搜索同样吃中文名与 ID', () => {
    const a = useAtlas()
    a.mode.value = 'item'

    a.keyword.value = '钻石剑'
    const shown = flatten(a.itemGroups.value) as { block: { id: string } }[]
    expect(shown.some((it) => it.block.id === 'diamond_sword')).toBe(true)

    a.keyword.value = 'diamond_sword'
    expect(a.matched.value).toBe(1)
  })

  it('「只看色板」不影响物品：物品本来就不进色板', () => {
    const a = useAtlas()
    a.mode.value = 'item'
    a.paletteOnly.value = true

    expect(a.matched.value).toBe(ITEMS.length)
  })

  it('方块与物品各记一份选中项，来回切不丢', () => {
    const a = useAtlas()
    const item = ITEMS[10]!
    a.mode.value = 'item'
    a.selectedItem.value = item

    a.mode.value = 'block'
    // 切回物品，选中的还是刚才那个
    a.mode.value = 'item'
    expect(a.selectedItem.value.id).toBe(item.id)

    const marked = flatten(a.itemGroups.value).filter(
      (it) => (it as { selected: boolean }).selected,
    )
    expect(marked).toHaveLength(1)
  })

  it('filterKey 跟着模式走，用来触发列表回顶', () => {
    const a = useAtlas()
    const before = a.filterKey.value
    a.mode.value = 'item'
    expect(a.filterKey.value).not.toBe(before)
  })
})
