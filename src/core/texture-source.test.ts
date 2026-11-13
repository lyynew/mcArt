import { describe, expect, it } from 'vitest'
import { BLOCKS } from './blocks'
import { textureUrl } from './textures'
import {
  BUILTIN_FAMILIES,
  BUILTIN_ITEM_GROUPS,
  BUILTIN_TEXTURES,
  countBuiltinTextures,
  familiesFor,
  filterBuiltinTextures,
  type BuiltinTexture,
} from './texture-source'

describe('内置素材源图清单', () => {
  it('方块与物品图标都在，且每条都有名字与贴图键', () => {
    const blocks = BUILTIN_TEXTURES.filter((t) => t.kind === 'block')
    const items = BUILTIN_TEXTURES.filter((t) => t.kind === 'item')
    expect(blocks.length).toBeGreaterThan(1000)
    expect(items.length).toBeGreaterThan(800)
    for (const item of BUILTIN_TEXTURES) {
      expect(item.label).toBeTruthy()
      expect(item.tex).toBeTruthy()
      expect(item.tex.startsWith('items/')).toBe(item.kind === 'item')
    }
  })

  it('色板里的方块优先用它们自己的中文名', () => {
    const grass = BUILTIN_TEXTURES.find((t) => t.tex === BLOCKS[0]!.tex)
    expect(grass?.label).toBe(BLOCKS[0]!.zh)
  })

  it('分组列表分开：方块中文分组，物品 A–Z 首字母桶', () => {
    expect(BUILTIN_FAMILIES.length).toBeGreaterThan(2)
    expect(new Set(BUILTIN_FAMILIES).size).toBe(BUILTIN_FAMILIES.length)
    expect(BUILTIN_ITEM_GROUPS).toContain('A')
    expect(BUILTIN_ITEM_GROUPS.every((g) => /^[A-Z#]$/.test(g))).toBe(true)
    expect(familiesFor('all').length).toBe(
      new Set([...BUILTIN_FAMILIES, ...BUILTIN_ITEM_GROUPS]).size,
    )
  })
})

describe('内置素材搜索', () => {
  const sample = [
    { tex: 'grass_block_side', label: '草方块', en: 'Grass Block', family: '自然', kind: 'block', named: true },
    { tex: 'diamond_block', label: '钻石块', en: 'Diamond Block', family: '金属宝石', kind: 'block', named: true },
    { tex: 'water_still', label: '水', en: 'Water', family: '自然', kind: 'block', named: true },
    { tex: 'items/apple', label: '苹果', en: 'Apple', family: 'A', kind: 'item', named: true },
    { tex: 'items/diamond_sword', label: '钻石剑', en: 'Diamond Sword', family: 'D', kind: 'item', named: true },
  ] as const satisfies readonly BuiltinTexture[]

  it('中文、英文、贴图名都能搜到', () => {
    expect(filterBuiltinTextures(sample, '钻石')).toEqual([sample[1], sample[4]])
    expect(filterBuiltinTextures(sample, 'DIAMOND')).toEqual([sample[1], sample[4]])
    expect(filterBuiltinTextures(sample, 'still')).toEqual([sample[2]])
    expect(filterBuiltinTextures(sample, 'items/apple')).toEqual([sample[3]])
  })

  it('按素材种类过滤，方块 / 物品互不串台', () => {
    expect(filterBuiltinTextures(sample, '', '全部', 10, 'item')).toEqual([sample[3], sample[4]])
    expect(filterBuiltinTextures(sample, '钻石', '全部', 10, 'block')).toEqual([sample[1]])
    expect(countBuiltinTextures(sample, '', '全部', 'item')).toBe(2)
  })

  it('分组过滤与条数上限生效，计数按全量算', () => {
    expect(filterBuiltinTextures(sample, '', '自然')).toEqual([sample[0], sample[2]])
    expect(filterBuiltinTextures(sample, '', '全部', 2)).toHaveLength(2)
    expect(countBuiltinTextures(sample, '', '全部')).toBe(5)
    expect(countBuiltinTextures(sample, '不存在')).toBe(0)
  })

  it('真实清单里能按种类与分组搜到物品图标', () => {
    const apples = filterBuiltinTextures(BUILTIN_TEXTURES, '苹果', '全部', 20, 'item')
    expect(apples.some((t) => t.tex === 'items/apple')).toBe(true)
    expect(apples.every((t) => t.kind === 'item')).toBe(true)
    expect(countBuiltinTextures(BUILTIN_TEXTURES, '', 'A', 'item')).toBeGreaterThan(10)
  })

  it('URL 由贴图名直接拼出，不查表', () => {
    // 素材目录里没有的名字也会给出路径：是否存在由清单单测查文件系统保证，
    // 运行时交给 <img> 的 onerror 兜底
    expect(textureUrl('nope_not_here')).toMatch(/\/textures\/nope_not_here\.png$/)
    expect(textureUrl('items/apple')).toMatch(/\/textures\/items\/apple\.png$/)
  })
})
