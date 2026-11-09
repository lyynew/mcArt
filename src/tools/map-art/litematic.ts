/**
 * Litematica .litematic（格式 Version 6）写入。
 *
 * 整个文件是一棵 gzip 压缩的大端 NBT：根里放 Version / MinecraftDataVersion /
 * Metadata / Regions，一个 Region 装下整幅图。格式要点参考公开的
 * Litematica 规格说明（MusicboxMC docs / litematica crate 的 format notes）：
 *
 *   - BlockStatePalette 的下标 0 必须是 minecraft:air
 *   - BlockStates 是 long array，条目连续位打包、**允许跨 64 位边界**，
 *     和原版区块的 BitArray（每 word 补齐）不一样，照抄会串位
 *   - 下标顺序是 y*(sizeX*sizeZ) + z*sizeX + x（x 最快、y 最慢）
 *   - bits = max(2, ceil(log2(palette.length)))，long 数 = ceil(体素 × bits / 64)
 *
 * 位运算全程用 BigInt：NBT 的 long 是带符号的，用 Number 会丢掉第 63 位，
 * 后面所有方块都会跟着错。
 */
import { gzipBytes } from '@/core/archive'
import { TAG, NbtWriter } from '@/core/nbt-writer'
import { createVoxelLayout, type VoxelInput } from './voxels'

export interface LitematicInput extends VoxelInput {
  name: string
  dataVersion: number
}

const MASK64 = (1n << 64n) - 1n

function vec3(wr: NbtWriter, name: string, x: number, y: number, z: number): void {
  wr.u8(TAG.Compound).str(name)
  wr.u8(TAG.Int).str('x').i32(x)
  wr.u8(TAG.Int).str('y').i32(y)
  wr.u8(TAG.Int).str('z').i32(z)
  wr.u8(TAG.End)
}

function emptyList(wr: NbtWriter, name: string): void {
  wr.u8(TAG.List).str(name).u8(TAG.Compound).i32(0)
}

/** 把调色板下标连续打包成 BigInt long 数组（带符号写法由写入器处理） */
export function packBlockStates(entries: Uint16Array, bits: number): bigint[] {
  const wordCount = Math.ceil((entries.length * bits) / 64)
  const words = new Array<bigint>(wordCount).fill(0n)
  const mask = (1n << BigInt(bits)) - 1n

  for (let i = 0; i < entries.length; i++) {
    const start = i * bits
    const startWord = Math.floor(start / 64)
    const offset = start % 64
    const value = BigInt(entries[i]!) & mask

    words[startWord] = words[startWord]! | ((value << BigInt(offset)) & MASK64)
    const spill = bits - (64 - offset)
    if (spill > 0) {
      words[startWord + 1] = words[startWord + 1]! | (value >> BigInt(64 - offset))
    }
  }

  return words.map((w) => BigInt.asIntN(64, w & MASK64))
}

export async function buildLitematic(input: LitematicInput): Promise<Uint8Array> {
  const layout = createVoxelLayout(input)
  const { sizeX, sizeY, sizeZ } = layout
  const volume = sizeX * sizeY * sizeZ

  // 先收集调色板（0 号固定为 air），同时填好每个体素的下标
  const palette = ['minecraft:air']
  const indexOf = new Map<string, number>()
  const entries = new Uint16Array(volume)
  let totalBlocks = 0
  let p = 0

  for (let y = 0; y < sizeY; y++) {
    for (let z = 0; z < sizeZ; z++) {
      for (let x = 0; x < sizeX; x++, p++) {
        const id = layout.blockAt(x, y, z)
        if (id === null) continue
        const full = `minecraft:${id}`
        let index = indexOf.get(full)
        if (index === undefined) {
          index = palette.length
          palette.push(full)
          indexOf.set(full, index)
        }
        entries[p] = index
        totalBlocks++
      }
    }
  }

  const bits = Math.max(2, Math.ceil(Math.log2(palette.length)))
  const words = packBlockStates(entries, bits)
  const wr = new NbtWriter()

  wr.u8(TAG.Compound).str('')
  wr.u8(TAG.Int).str('Version').i32(6)
  wr.u8(TAG.Int).str('SubVersion').i32(0)
  wr.u8(TAG.Int).str('MinecraftDataVersion').i32(input.dataVersion)

  wr.u8(TAG.Compound).str('Metadata')
  wr.u8(TAG.String).str('Name').str(input.name)
  wr.u8(TAG.String).str('Author').str('mcArt')
  wr.u8(TAG.String).str('Description').str('立体阶梯地图画 · 由 mcArt 生成')
  wr.u8(TAG.Int).str('RegionCount').i32(1)
  wr.u8(TAG.Int).str('TotalVolume').i32(volume)
  wr.u8(TAG.Int).str('TotalBlocks').i32(totalBlocks)
  wr.u8(TAG.Long).str('TimeCreated').i64(0n)
  wr.u8(TAG.Long).str('TimeModified').i64(0n)
  vec3(wr, 'EnclosingSize', sizeX, sizeY, sizeZ)
  wr.u8(TAG.End)

  wr.u8(TAG.Compound).str('Regions')
  wr.u8(TAG.Compound).str('map-art')
  vec3(wr, 'Position', 0, 0, 0)
  vec3(wr, 'Size', sizeX, sizeY, sizeZ)

  wr.u8(TAG.List).str('BlockStatePalette').u8(TAG.Compound).i32(palette.length)
  for (const id of palette) wr.u8(TAG.String).str('Name').str(id).u8(TAG.End)

  wr.u8(TAG.LongArray).str('BlockStates').i32(words.length)
  for (const word of words) wr.i64(word)

  emptyList(wr, 'TileEntities')
  emptyList(wr, 'Entities')
  emptyList(wr, 'PendingBlockTicks')
  emptyList(wr, 'PendingFluidTicks')
  wr.u8(TAG.End) // region
  wr.u8(TAG.End) // Regions
  wr.u8(TAG.End) // root

  return gzipBytes(wr.bytes())
}
