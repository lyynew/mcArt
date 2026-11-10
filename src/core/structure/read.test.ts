import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { buildStructure } from '../nbt'
import type { BlockDef } from '../blocks'
import { buildLitematic } from './litematic'
import { buildSchem } from './schem'
import { parseStructureBytes } from './read'
import type { VoxelLayout } from './voxels'

/**
 * 写 → 读往返：本工具导出的三种结构文件，读取器必须逐格读得回。
 */
const blocks: readonly BlockDef[] = [
  { zh: '白', en: 'White', hex: '#fff', id: 'white_wool', fam: '羊毛', tex: 'white_wool' },
  { zh: '红', en: 'Red', hex: '#f00', id: 'red_wool', fam: '羊毛', tex: 'red_wool' },
]

function grid(): VoxelLayout {
  return {
    sizeX: 4,
    sizeY: 3,
    sizeZ: 2,
    blockAt(x, y, z) {
      if (y === 2) return null
      return (x + y + z) % 2 === 0 ? 'white_wool' : 'red_wool'
    },
  }
}

/** 期望的稀疏方块表：pos → id（不含空气） */
function expected(): Map<string, string> {
  const l = grid()
  const out = new Map<string, string>()
  for (let y = 0; y < l.sizeY; y++) {
    for (let z = 0; z < l.sizeZ; z++) {
      for (let x = 0; x < l.sizeX; x++) {
        const id = l.blockAt(x, y, z)
        if (id) out.set(`${x},${y},${z}`, `minecraft:${id}`)
      }
    }
  }
  return out
}

function actualMap(parsed: { palette: string[]; blocks: { pos: [number, number, number]; state: number }[] }): Map<string, string> {
  const out = new Map<string, string>()
  for (const b of parsed.blocks) {
    out.set(b.pos.join(','), parsed.palette[b.state]!)
  }
  return out
}

describe('parseStructureBytes 往返', () => {
  it('.litematic：逐格读回，格式与版本正确', async () => {
    const bytes = await buildLitematic(grid(), { name: 'rt', dataVersion: 3953, regionName: 'r' })
    const parsed = parseStructureBytes(gunzipSync(bytes))
    expect(parsed.format).toBe('litematic')
    expect(parsed.size).toEqual([4, 3, 2])
    expect(parsed.dataVersion).toBe(3953)
    expect(actualMap(parsed)).toEqual(expected())
  })

  it('.schem：逐格读回，带 [状态] 的调色板条目原样保留', async () => {
    const bytes = await buildSchem(grid(), { name: 'rt', dataVersion: 3953, dateCreated: 1 })
    const parsed = parseStructureBytes(gunzipSync(bytes))
    expect(parsed.format).toBe('schem')
    expect(parsed.size).toEqual([4, 3, 2])
    expect(actualMap(parsed)).toEqual(expected())
  })

  it('.nbt：逐格读回', () => {
    // buildStructure 输出的是平面结构（w×h×1），用平铺视角验证
    const n = 3
    const idx = Int16Array.from([0, -1, 1, 1, 0, -1, -1, 1, 0])
    const raw = buildStructure({ n, cells: idx, blocks, ox: 0, oy: 0, w: n, h: n, useAir: false, wall: false })
    const parsed = parseStructureBytes(raw)
    expect(parsed.format).toBe('nbt')
    expect(parsed.size).toEqual([3, 1, 3])
    const map = actualMap(parsed)
    expect(map.get('0,0,0')).toBe('minecraft:white_wool')
    expect(map.get('1,0,0')).toBeUndefined() // useAir=false 时空格不生成
    expect(map.get('2,0,0')).toBe('minecraft:red_wool')
    expect(map.get('0,0,1')).toBe('minecraft:red_wool')
    expect(map.size).toBe(6)
  })

  it('垃圾字节给出可读的错误，不是原始异常', () => {
    expect(() => parseStructureBytes(new Uint8Array([1, 2, 3, 4]))).toThrow(/没认出|根标签/)
    expect(() => parseStructureBytes(new Uint8Array(32))).toThrow()
  })
})
