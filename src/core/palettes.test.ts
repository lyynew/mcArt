import { describe, expect, it } from 'vitest'
import { BLOCKS, FAMILIES } from './blocks'
import { ALL_BLOCKS, PALETTES, PALETTE_ORDER, buildCustomPalette, collect } from './palettes'
import { labDist } from './color'

/**
 * 色板是由数据推导出来的，这里把推导结果的「形状」钉死：
 * 数量错了说明分组、去重阈值或顺序被改了，用户看到的配色会整体变样。
 */
describe('分组', () => {
  it('八个分组与旧版一致', () => {
    expect(FAMILIES).toEqual(['混凝土', '羊毛', '陶瓦', '石材', '砂土', '木质', '金属宝石', '彩色'])
  })

  it('各组数量', () => {
    const counts: Record<string, number> = {}
    for (const b of BLOCKS) counts[b.fam] = (counts[b.fam] ?? 0) + 1
    expect(counts).toEqual({
      混凝土: 16,
      羊毛: 16,
      陶瓦: 16,
      石材: 29,
      砂土: 13,
      木质: 16,
      金属宝石: 17,
      彩色: 19,
    })
    expect(BLOCKS.length).toBe(142)
  })
})

describe('预设方案', () => {
  it('基本套餐去重后是 102 种', () => {
    expect(PALETTES.basic.blocks.length).toBe(102)
  })

  it('全部方案覆盖所有方块', () => {
    expect(PALETTES.all.blocks.length).toBe(142)
  })

  it('单组方案的数量与分组一致', () => {
    expect(PALETTES.concrete.blocks.length).toBe(16)
    expect(PALETTES.wool.blocks.length).toBe(16)
    expect(PALETTES.terracotta.blocks.length).toBe(16)
    expect(PALETTES.wood.blocks.length).toBe(16)
    expect(PALETTES.metal.blocks.length).toBe(17)
    expect(PALETTES.vivid.blocks.length).toBe(19)
  })

  it('石材方案是石 + 砂土两组', () => {
    expect(PALETTES.stone.blocks.length).toBe(29 + 13)
  })

  it('每套方案的 i 都是连续下标，指向自己', () => {
    for (const id of PALETTE_ORDER) {
      PALETTES[id].blocks.forEach((b, i) => expect(b.i).toBe(i))
    }
  })

  it('「基本」里没有颜色过于接近的重复项', () => {
    const blocks = PALETTES.basic.blocks
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        // 去重阈值是 6，允许极小的浮点误差
        expect(labDist(blocks[i]!.lab, blocks[j]!.lab)).toBeGreaterThan(6 - 1e-9)
      }
    }
  })

  it('界面顺序包含全部方案', () => {
    expect(PALETTE_ORDER.length).toBe(Object.keys(PALETTES).length)
    expect(PALETTE_ORDER[PALETTE_ORDER.length - 1]).toBe('custom')
  })
})

describe('自定义方案', () => {
  it('按全表顺序生成，与勾选顺序无关', () => {
    const picked = ['stone', 'white_concrete', 'dirt']
    const palette = buildCustomPalette(picked)
    expect(palette.map((b) => b.id)).toEqual(['white_concrete', 'stone', 'dirt'])
    palette.forEach((b, i) => expect(b.i).toBe(i))
  })

  it('空集合得到空方案', () => {
    expect(buildCustomPalette([])).toEqual([])
  })
})

describe('collect', () => {
  it('不做阈值时按分组顺序全收', () => {
    expect(collect(['混凝土']).length).toBe(16)
  })

  it('阈值越大留下的越少', () => {
    const loose = collect(['石材', '砂土'], 0)
    const strict = collect(['石材', '砂土'], 6)
    expect(strict.length).toBeLessThan(loose.length)
  })

  it('全表每项都带 rgb 与 lab', () => {
    for (const b of ALL_BLOCKS) {
      expect(b.rgb).toHaveLength(3)
      expect(b.lab).toHaveLength(3)
      expect(Number.isFinite(b.lab[0])).toBe(true)
    }
  })
})
