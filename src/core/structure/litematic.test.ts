import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { parseNbt, type NbtValue } from '../nbt-read'
import { buildLitematic, packBlockStates } from './litematic'
import { voxelFullId, type VoxelLayout } from './voxels'

/** 按 Litematica 的规则把 long array 解回下标，用于验证写入端的位打包 */
function unpack(words: BigInt64Array, bits: number, count: number): number[] {
  const mask = (1n << BigInt(bits)) - 1n
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const start = i * bits
    const w = Math.floor(start / 64)
    const offset = start % 64
    let v = (BigInt.asUintN(64, words[w]!) >> BigInt(offset)) & mask
    const spill = bits - (64 - offset)
    if (spill > 0) {
      v |= (BigInt.asUintN(64, words[w + 1]!) << BigInt(64 - offset)) & mask
    }
    out.push(Number(v))
  }
  return out
}

/** 小型三维布局：两种方块 + 空气，能覆盖调色板与位打包 */
const W = 5
const H = 3
const D = 4
function checkerboard(x: number, y: number, z: number): string | null {
  if (y > 1) return null // 顶层留空气
  return (x + y + z) % 3 === 0 ? 'white_wool' : (x + z) % 2 === 0 ? 'stone' : null
}
const grid: VoxelLayout = {
  sizeX: W,
  sizeY: H,
  sizeZ: D,
  blockAt: checkerboard,
}

describe('packBlockStates', () => {
  it('条目跨 64 位边界时仍能逐项解回（bits=2 / 5 / 7）', () => {
    for (const bits of [2, 5, 7]) {
      const entries = Uint16Array.from({ length: 97 }, (_, i) => (i * 7) % (1 << bits))
      const words = packBlockStates(entries, bits)
      expect(words).toHaveLength(Math.ceil((entries.length * bits) / 64))
      expect(words.every((w) => w >= -(1n << 63n) && w < (1n << 63n))).toBe(true)
      const back = unpack(BigInt64Array.from(words), bits, entries.length)
      expect(back).toEqual(Array.from(entries))
    }
  })
})

describe('buildLitematic', () => {
  it('根结构、Metadata 与 Region 符合 Version 6，体素逐格可解回', async () => {
    const bytes = await buildLitematic(grid, {
      name: 'test-art',
      dataVersion: 3953,
      description: '单元测试',
      regionName: 'art',
    })
    expect(bytes[0]).toBe(0x1f)
    expect(bytes[1]).toBe(0x8b)

    const root = parseNbt(new Uint8Array(gunzipSync(bytes)))
    expect(root['Version']).toBe(6)
    expect(root['MinecraftDataVersion']).toBe(3953)
    const meta = root['Metadata'] as Record<string, NbtValue>
    expect(meta['Name']).toBe('test-art')
    expect(meta['RegionCount']).toBe(1)
    expect(meta['TotalVolume']).toBe(W * H * D)
    expect((meta['EnclosingSize'] as Record<string, NbtValue>)['y']).toBe(H)

    const region = (root['Regions'] as Record<string, NbtValue>)['art'] as Record<string, NbtValue>
    expect(region['Size']).toEqual({ x: W, y: H, z: D })

    const palette = region['BlockStatePalette'] as Record<string, NbtValue>[]
    expect(palette[0]!['Name']).toBe('minecraft:air')
    const words = region['BlockStates'] as BigInt64Array
    const bits = Math.max(2, Math.ceil(Math.log2(palette.length)))
    expect(words).toHaveLength(Math.ceil((W * H * D * bits) / 64))

    const entries = unpack(words, bits, W * H * D)
    let p = 0
    let total = 0
    for (let y = 0; y < H; y++) {
      for (let z = 0; z < D; z++) {
        for (let x = 0; x < W; x++, p++) {
          const name = (palette[entries[p]!]!['Name'] as string) ?? ''
          expect(name).toBe(voxelFullId(checkerboard(x, y, z)))
          if (checkerboard(x, y, z) !== null) total++
        }
      }
    }
    expect(meta['TotalBlocks']).toBe(total)
    expect(entries.every((v) => v < palette.length)).toBe(true)
  })
})
