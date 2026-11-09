import { describe, expect, it } from 'vitest'
import {
  BASE_COLORS,
  COLOR_BY_ID,
  DATA_COLORS,
  FLAT_COLORS,
  MAP_COLORS,
  SHADE_MULTIPLIERS,
  STAIRCASE_COLORS,
  describeColor,
  paletteOf,
} from './map-colors'
import { BUILDABLE_BASES, BLOCK_OF_BASE, blockOfColor } from './map-blocks'

describe('地图色表', () => {
  it('61 个基础色 × 4 档 = 244 色，色号连续且唯一', () => {
    expect(BASE_COLORS).toHaveLength(61)
    expect(MAP_COLORS).toHaveLength(244)
    expect(new Set(MAP_COLORS.map((c) => c.id)).size).toBe(244)
    expect(MAP_COLORS[0]!.id).toBe(4)
    expect(MAP_COLORS.at(-1)!.id).toBe(61 * 4 + 3)
    expect(COLOR_BY_ID.size).toBe(244)
  })

  it('明暗档按 floor(base × 系数 / 255) 展开，档 3 最暗', () => {
    const grass = MAP_COLORS.filter((c) => c.baseId === 1)
    expect(SHADE_MULTIPLIERS).toEqual([180, 220, 255, 135])
    expect(grass.map((c) => c.rgb)).toEqual([
      [89, 125, 39],
      [109, 153, 48],
      [127, 178, 56],
      [67, 94, 29],
    ])
    expect(grass[3]!.rgb[0]).toBeLessThan(grass[0]!.rgb[0])
  })

  it('平铺用 220 档（同高），并排除两种摆不出来的基础色', () => {
    expect(BUILDABLE_BASES).toHaveLength(59)
    expect(FLAT_COLORS).toHaveLength(59)
    expect(FLAT_COLORS.every((c) => c.shade === 1 && c.id % 4 === 1)).toBe(true)
    expect(paletteOf('data')).toBe(DATA_COLORS)
    expect(paletteOf('flat')).toBe(FLAT_COLORS)
  })

  it('立体阶梯只用自然可得的前三档', () => {
    expect(STAIRCASE_COLORS).toHaveLength(59 * 3)
    expect(STAIRCASE_COLORS.every((c) => c.shade !== 3)).toBe(true)
    expect(paletteOf('staircase')).toBe(STAIRCASE_COLORS)
  })

  it('方块表与基础色一一对应，两种不可建色为 null', () => {
    expect(Object.keys(BLOCK_OF_BASE)).toHaveLength(61)
    expect(BLOCK_OF_BASE[7]).toBeNull() // PLANT：只有树叶与花草
    expect(BLOCK_OF_BASE[12]).toBeNull() // WATER：只有水与水生植物
    expect(blockOfColor(0)).toBeNull()
    expect(blockOfColor(8 * 4 + 1)).toBe('white_concrete')
    expect(blockOfColor(31 * 4 + 2)).toBe('prismarine_bricks')
  })

  it('色号 0 是透明，描述里能读出色名与档位', () => {
    expect(describeColor(0)).toContain('透明')
    expect(describeColor(34)).toContain('雪') // 8 × 4 + 2，纯白
  })
})
