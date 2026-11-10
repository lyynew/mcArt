import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { buildStructure } from '../nbt'
import type { BlockDef } from '../blocks'
import { TAG, NbtWriter } from '../nbt-writer'
import { buildLitematic } from './litematic'
import { buildSchem, pushVarint } from './schem'
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

/**
 * 真实世界的 .schem 变体（crepper-farm.schem 之类的外部文件踩过）：
 *   - 规范 / WorldEdit 把 schema 包在根复合体的 Schematic 子标签里；
 *   - Sponge v3 把 Palette/Data 收进 Blocks 复合体。
 * 用 NbtWriter 手搓这两种形态，锁住识别逻辑。
 */
describe('外部 .schem 变体', () => {
  /** 3×2×2 的已知内容：底层棋盘，顶层空气 */
  function variantContent(): { data: number[]; names: string[] } {
    const names = ['minecraft:air', 'minecraft:stone_bricks', 'minecraft:chest[facing=north,type=left]']
    const data: number[] = []
    for (let y = 0; y < 2; y++) {
      for (let z = 0; z < 2; z++) {
        for (let x = 0; x < 3; x++) {
          pushVarint(data, y === 0 ? ((x + z) % 2 === 0 ? 1 : 2) : 0)
        }
      }
    }
    return { data, names }
  }

  function writePalette(wr: NbtWriter, names: string[]): void {
    wr.u8(TAG.Compound).str('Palette')
    for (let i = 0; i < names.length; i++) wr.u8(TAG.Int).str(names[i]!).i32(i)
    wr.u8(TAG.End)
  }

  it('规范嵌套（根无名 + Schematic 子复合体）也能认出来', () => {
    const { data, names } = variantContent()
    const wr = new NbtWriter()
    wr.u8(TAG.Compound).str('') // 无名根
    wr.u8(TAG.Compound).str('Schematic')
    wr.u8(TAG.Int).str('Version').i32(2)
    wr.u8(TAG.Int).str('DataVersion').i32(4440)
    wr.u8(TAG.Short).str('Width').i16(3)
    wr.u8(TAG.Short).str('Height').i16(2)
    wr.u8(TAG.Short).str('Length').i16(2)
    writePalette(wr, names)
    wr.u8(TAG.Int).str('PaletteMax').i32(names.length)
    wr.u8(TAG.ByteArray).str('BlockData').i32(data.length).raw(data)
    wr.u8(TAG.End) // Schematic
    wr.u8(TAG.End) // root

    const parsed = parseStructureBytes(wr.bytes())
    expect(parsed.format).toBe('schem')
    expect(parsed.size).toEqual([3, 2, 2])
    expect(parsed.dataVersion).toBe(4440)
    const map = actualMap(parsed)
    expect(map.get('0,0,0')).toBe('minecraft:stone_bricks')
    expect(map.get('1,0,0')).toBe('minecraft:chest[facing=north,type=left]')
    expect(map.get('0,0,1')).toBe('minecraft:chest[facing=north,type=left]')
    expect(map.get('1,0,1')).toBe('minecraft:stone_bricks')
    expect(map.size).toBe(6) // 顶层全是空气
  })

  it('Sponge v3（Blocks{Palette, Data}）逐格读回，[状态] 调色板原样保留', () => {
    const { data, names } = variantContent()
    const wr = new NbtWriter()
    wr.u8(TAG.Compound).str('')
    wr.u8(TAG.Compound).str('Schematic')
    wr.u8(TAG.Int).str('Version').i32(3)
    wr.u8(TAG.Int).str('DataVersion').i32(5023)
    wr.u8(TAG.Short).str('Width').i16(3)
    wr.u8(TAG.Short).str('Height').i16(2)
    wr.u8(TAG.Short).str('Length').i16(2)
    wr.u8(TAG.Compound).str('Metadata')
    wr.u8(TAG.String).str('Name').str('variant')
    wr.u8(TAG.String).str('Software').str('test')
    wr.u8(TAG.End)
    wr.u8(TAG.Compound).str('Blocks')
    writePalette(wr, names)
    wr.u8(TAG.ByteArray).str('Data').i32(data.length).raw(data)
    wr.u8(TAG.List).str('BlockEntities').u8(TAG.Compound).i32(0)
    wr.u8(TAG.End) // Blocks
    wr.u8(TAG.End) // Schematic
    wr.u8(TAG.End) // root

    const parsed = parseStructureBytes(wr.bytes())
    expect(parsed.format).toBe('schem')
    expect(parsed.size).toEqual([3, 2, 2])
    expect(parsed.dataVersion).toBe(5023)
    const map = actualMap(parsed)
    expect(map.get('1,0,0')).toBe('minecraft:chest[facing=north,type=left]')
    expect(map.get('1,1,0')).toBeUndefined() // 空气不进方块表
    expect(map.size).toBe(6)
  })

  it('MCEdit 老 .schematic 给出明确的「另存为」提示', () => {
    const wr = new NbtWriter()
    wr.u8(TAG.Compound).str('Schematic')
    wr.u8(TAG.Short).str('Width').i16(1)
    wr.u8(TAG.Short).str('Height').i16(1)
    wr.u8(TAG.Short).str('Length').i16(1)
    wr.u8(TAG.String).str('Materials').str('Alpha')
    wr.u8(TAG.ByteArray).str('Blocks').i32(1).raw([1])
    wr.u8(TAG.ByteArray).str('Data').i32(1).raw([0])
    wr.u8(TAG.End)

    expect(() => parseStructureBytes(wr.bytes())).toThrow(/MCEdit|\.schematic/)
  })
})
