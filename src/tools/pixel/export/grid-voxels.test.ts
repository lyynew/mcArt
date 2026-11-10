import { describe, expect, it } from 'vitest'
import { createGridVoxelLayout } from './grid-voxels'
import type { BlockDef } from '@/core/blocks'

const blocks: readonly BlockDef[] = [
  { zh: '白', en: 'White', hex: '#fff', id: 'white_wool', fam: '羊毛', tex: 'white_wool' },
  { zh: '红', en: 'Red', hex: '#f00', id: 'red_wool', fam: '羊毛', tex: 'red_wool' },
]

// 2×2 图像：上行 [白, 红]，下行 [红, 空]
const idx = Int16Array.from([0, 1, 1, -1])

describe('createGridVoxelLayout', () => {
  it('平铺：图像行映射到 z，顶层 y=0', () => {
    const l = createGridVoxelLayout({ n: 2, idx, blocks, wall: false })
    expect([l.sizeX, l.sizeY, l.sizeZ]).toEqual([2, 1, 2])
    expect(l.blockAt(0, 0, 0)).toBe('white_wool') // 图 (0,0)
    expect(l.blockAt(1, 0, 0)).toBe('red_wool') // 图 (1,0)
    expect(l.blockAt(0, 0, 1)).toBe('red_wool') // 图 (0,1)
    expect(l.blockAt(1, 0, 1)).toBeNull() // 图 (1,1) 空
  })

  it('立面：图像顶行映射到高处（y 翻转），厚度为 1', () => {
    const l = createGridVoxelLayout({ n: 2, idx, blocks, wall: true })
    expect([l.sizeX, l.sizeY, l.sizeZ]).toEqual([2, 2, 1])
    expect(l.blockAt(0, 1, 0)).toBe('white_wool') // 图 (0,0) 在最高处
    expect(l.blockAt(1, 1, 0)).toBe('red_wool')
    expect(l.blockAt(0, 0, 0)).toBe('red_wool') // 图 (0,1) 在低处
    expect(l.blockAt(1, 0, 0)).toBeNull()
  })
})
