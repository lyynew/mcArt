import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { parseNbt, type NbtValue } from '@/core/nbt-read'
import { MAP_PIXELS, MAP_SIZE } from './model'
import { buildHeightMap } from './heightmap'
import { buildLitematic, packBlockStates } from './litematic'

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

function staircase() {
  const colors = new Uint8Array(MAP_PIXELS)
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const shade = z < 10 ? 2 : z < 20 ? 0 : 1
      colors[z * MAP_SIZE + x] = 8 * 4 + shade
    }
  }
  const m = buildHeightMap(colors, { compress: true, noobline: true })
  return { colors, m }
}

describe('packBlockStates', () => {
  it('条目跨 64 位边界时仍能逐项解回（bits=5 / 7）', () => {
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
  it('根结构、Metadata 与 Region 都符合 Version 6 规格', async () => {
    const { colors, m } = staircase()
    const bytes = await buildLitematic({
      colors,
      heights: m.heights,
      noobline: m.noobline,
      maxHeight: m.maxHeight,
      supportBlock: 'dirt',
      withNoobline: true,
      name: 'mcArt-map-0',
      dataVersion: 4671,
    })
    expect(bytes[0]).toBe(0x1f)
    expect(bytes[1]).toBe(0x8b)

    const root = parseNbt(new Uint8Array(gunzipSync(bytes)))
    expect(root['Version']).toBe(6)
    expect(root['MinecraftDataVersion']).toBe(4671)
    const meta = root['Metadata'] as Record<string, NbtValue>
    expect(meta['Name']).toBe('mcArt-map-0')
    expect(meta['RegionCount']).toBe(1)
    expect(meta['TotalBlocks'] as number).toBeGreaterThan(0)
    expect((meta['EnclosingSize'] as Record<string, NbtValue>)['y']).toBe(m.maxHeight + 1)

    const region = (root['Regions'] as Record<string, NbtValue>)['map-art'] as Record<string, NbtValue>
    const size = region['Size'] as Record<string, NbtValue>
    expect(size).toEqual({ x: MAP_SIZE, y: m.maxHeight + 1, z: MAP_SIZE + 1 })

    const palette = region['BlockStatePalette'] as Record<string, NbtValue>[]
    expect(palette[0]!['Name']).toBe('minecraft:air') // 下标 0 必须是 air
    const words = region['BlockStates'] as BigInt64Array
    const bits = Math.max(2, Math.ceil(Math.log2(palette.length)))
    expect(words).toHaveLength(Math.ceil((MAP_SIZE * (m.maxHeight + 1) * (MAP_SIZE + 1) * bits) / 64))

    const entries = unpack(words, bits, MAP_SIZE * (m.maxHeight + 1) * (MAP_SIZE + 1))
    expect(entries[0]).not.toBe(0) // 北侧 noobline 的顶面
    expect(entries.some((v) => v === 0)).toBe(true) // 高处留有空气
    expect(entries.every((v) => v < palette.length)).toBe(true)
  })
})
