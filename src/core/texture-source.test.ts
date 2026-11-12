import { describe, expect, it } from 'vitest'
import { ALL_BLOCK_DEFS, BLOCKS } from './blocks'
import { textureUrl } from './textures'
import {
  BUILTIN_FAMILIES,
  BUILTIN_TEXTURES,
  countBuiltinTextures,
  filterBuiltinTextures,
} from './texture-source'

describe('内置材质源图清单', () => {
  it('只列方块用到的贴图，且每条都能反查到名字', () => {
    const blockTextures = new Set(ALL_BLOCK_DEFS.map((b) => b.tex).filter(Boolean))
    expect(BUILTIN_TEXTURES).toHaveLength(blockTextures.size)
    for (const item of BUILTIN_TEXTURES) {
      expect(item.label).toBeTruthy()
      expect(item.tex).toBeTruthy()
      expect(item.tex.startsWith('items/')).toBe(false)
    }
    expect(BUILTIN_TEXTURES.length).toBeGreaterThan(100)
  })

  it('色板里的方块优先用它们自己的中文名', () => {
    const grass = BUILTIN_TEXTURES.find((t) => t.tex === BLOCKS[0]!.tex)
    expect(grass?.label).toBe(BLOCKS[0]!.zh)
  })

  it('分组列表可用，且不含空项', () => {
    expect(BUILTIN_FAMILIES.length).toBeGreaterThan(2)
    expect(BUILTIN_FAMILIES.every(Boolean)).toBe(true)
    expect(new Set(BUILTIN_FAMILIES).size).toBe(BUILTIN_FAMILIES.length)
  })
})

describe('内置材质搜索', () => {
  const sample = [
    { tex: 'grass_block_side', label: '草方块', en: 'Grass Block', family: '自然' },
    { tex: 'diamond_block', label: '钻石块', en: 'Diamond Block', family: '金属宝石' },
    { tex: 'water_still', label: '水', en: 'Water', family: '自然' },
  ] as const

  it('中文、英文、贴图名都能搜到', () => {
    expect(filterBuiltinTextures(sample, '钻石')).toEqual([sample[1]])
    expect(filterBuiltinTextures(sample, 'DIAMOND')).toEqual([sample[1]])
    expect(filterBuiltinTextures(sample, 'still')).toEqual([sample[2]])
  })

  it('分组过滤与条数上限生效，计数按全量算', () => {
    expect(filterBuiltinTextures(sample, '', '自然')).toEqual([sample[0], sample[2]])
    expect(filterBuiltinTextures(sample, '', '全部', 2)).toHaveLength(2)
    expect(countBuiltinTextures(sample, '', '全部')).toBe(3)
    expect(countBuiltinTextures(sample, '不存在')).toBe(0)
  })

  it('URL 由贴图名直接拼出，不查表', () => {
    // 素材目录里没有的名字也会给出路径：是否存在由单测查文件系统保证，
    // 运行时交给 <img> 的 onerror 兜底
    expect(textureUrl('nope_not_here')).toMatch(/\/textures\/nope_not_here\.png$/)
  })
})
