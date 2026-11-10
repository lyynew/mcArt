import { describe, expect, it } from 'vitest'
import {
  ALL_BLOCK_DEFS,
  BLOCKS,
  BLOCKS_BY_ID,
  FAMILIES,
  FAMILY_CATALOG,
  FAMILY_LABELS,
  PALETTE_IDS,
  findBlock,
  normalizeBlockId,
} from './blocks'

describe('normalizeBlockId', () => {
  it('剥掉命名空间与 [状态] 后缀', () => {
    expect(normalizeBlockId('minecraft:stone_bricks')).toBe('stone_bricks')
    expect(normalizeBlockId('stone_bricks')).toBe('stone_bricks')
    expect(normalizeBlockId('minecraft:chest[facing=north,type=single]')).toBe('chest')
    expect(normalizeBlockId('oak_log[axis=y]')).toBe('oak_log')
    expect(normalizeBlockId('  minecraft:hopper[enabled=true]  ')).toBe('hopper')
  })

  it('墙上形态归一到落地方块', () => {
    expect(normalizeBlockId('minecraft:oak_wall_sign[facing=east]')).toBe('oak_sign')
    expect(normalizeBlockId('oak_wall_hanging_sign')).toBe('oak_hanging_sign')
    expect(normalizeBlockId('white_wall_banner')).toBe('white_banner')
    expect(normalizeBlockId('skeleton_wall_skull')).toBe('skeleton_skull')
    expect(normalizeBlockId('creeper_wall_head[powered=false]')).toBe('creeper_head')
    expect(normalizeBlockId('wall_torch')).toBe('torch')
    expect(normalizeBlockId('soul_wall_torch')).toBe('soul_torch')
    expect(normalizeBlockId('redstone_wall_torch[lit=true]')).toBe('redstone_torch')
  })
})

describe('findBlock', () => {
  it('带状态的完整串也能查中', () => {
    expect(findBlock('minecraft:oak_log[axis=y]')?.id).toBe('oak_log')
    expect(findBlock('minecraft:hay_block[value=2]')?.id).toBe('hay_block')
    expect(findBlock('minecraft:chest[facing=west,half=left]')?.id).toBe('chest')
    expect(findBlock('minecraft:hopper[enabled=true]')?.id).toBe('hopper')
    expect(findBlock('minecraft:crafting_table')?.id).toBe('crafting_table')
    expect(findBlock('minecraft:spruce_fence[east=true]')?.id).toBe('spruce_fence')
  })

  it('墙上形态查到的是落地方块', () => {
    expect(findBlock('minecraft:oak_wall_sign[facing=north]')?.id).toBe('oak_sign')
  })

  it('查不到返回 undefined，不抛错', () => {
    expect(findBlock('minecraft:totally_not_a_block')).toBeUndefined()
    expect(findBlock('othermod:fancy_block')).toBeUndefined()
  })

  it('注册表键全部是裸 ID，色板源与扩展不重不漏', () => {
    for (const key of BLOCKS_BY_ID.keys()) {
      expect(key).toBe(normalizeBlockId(key))
    }
    expect(BLOCKS_BY_ID.size).toBe(ALL_BLOCK_DEFS.length)
    expect(ALL_BLOCK_DEFS.length).toBeGreaterThan(BLOCKS.length)
  })
})

describe('分组目录', () => {
  it('覆盖注册表里出现的每个分组，图鉴不会漏方块', () => {
    const catalog = new Set(FAMILY_CATALOG.map((f) => f.id))
    const used = new Set(ALL_BLOCK_DEFS.map((b) => b.fam))
    expect([...used].filter((f) => !catalog.has(f))).toEqual([])
  })

  it('色板源的 8 个分组都在目录里，顺序仍是老顺序', () => {
    for (const fam of FAMILIES) {
      expect(FAMILY_CATALOG.some((f) => f.id === fam)).toBe(true)
    }
    const inCatalog = FAMILY_CATALOG.map((f) => f.id)
    const positions = FAMILIES.map((f) => inCatalog.indexOf(f))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('每个分组都有显示名，且没有重复项', () => {
    for (const f of FAMILY_CATALOG) expect(FAMILY_LABELS[f.id]).toBeTruthy()
    expect(new Set(FAMILY_CATALOG.map((f) => f.id)).size).toBe(FAMILY_CATALOG.length)
  })
})

describe('PALETTE_IDS', () => {
  it('正好是色板源那 142 种，且都在注册表里', () => {
    expect(PALETTE_IDS.size).toBe(BLOCKS.length)
    for (const id of PALETTE_IDS) expect(BLOCKS_BY_ID.has(id)).toBe(true)
  })
})

