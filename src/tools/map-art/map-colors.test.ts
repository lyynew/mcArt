import { describe, expect, it } from 'vitest'
import {
  BASE_COLORS,
  COLOR_BY_ID,
  FLAT_COLORS,
  MAP_COLORS,
  SHADE_MULTIPLIERS,
  describeColor,
  paletteOf,
} from './map-colors'

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

  it('平面色板只有原色档', () => {
    expect(FLAT_COLORS).toHaveLength(61)
    expect(FLAT_COLORS.every((c) => c.shade === 2 && c.id % 4 === 2)).toBe(true)
    expect(paletteOf('all')).toBe(MAP_COLORS)
    expect(paletteOf('flat')).toBe(FLAT_COLORS)
  })

  it('色号 0 是透明，描述里能读出色名与档位', () => {
    expect(describeColor(0)).toContain('透明')
    expect(describeColor(34)).toContain('雪') // 8 × 4 + 2，纯白
  })
})
