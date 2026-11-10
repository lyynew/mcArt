import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { parseNbt, type NbtValue } from '../nbt-read'
import { buildSchem, pushVarint, readVarint } from './schem'
import { voxelFullId, type VoxelLayout } from './voxels'

const W = 6
const H = 2
const D = 4

function cell(x: number, y: number, z: number): string | null {
  return (x + z) % 2 === 0 ? 'red_concrete' : y === 0 ? 'sand' : null
}

const grid: VoxelLayout = {
  sizeX: W,
  sizeY: H,
  sizeZ: D,
  blockAt: cell,
}

describe('varint', () => {
  it('0 与多位值连写都能逐个解回', () => {
    const values = [0, 1, 127, 128, 300, 2 ** 20 + 5]
    const bytes: number[] = []
    for (const v of values) pushVarint(bytes, v)
    let pos = 0
    for (const v of values) {
      const r = readVarint(bytes, pos)
      expect(r.value).toBe(v)
      pos = r.next
    }
    expect(pos).toBe(bytes.length)
    // 0 是单字节 0x00；128 / 300 / 2^20+5 各占 2、2、3 字节
    expect(bytes[0]).toBe(0x00)
    expect(bytes).toHaveLength(1 + 1 + 1 + 2 + 2 + 3)
  })
})

describe('buildSchem', () => {
  it('v2 根结构与调色板正确，BlockData 逐格可解回', async () => {
    const bytes = await buildSchem(grid, {
      name: 'test-schem',
      dataVersion: 3953,
      dateCreated: 1_700_000_000_000,
    })
    expect(bytes[0]).toBe(0x1f)
    expect(bytes[1]).toBe(0x8b)

    const root = parseNbt(new Uint8Array(gunzipSync(bytes)))
    expect(root['Version']).toBe(2)
    expect(root['DataVersion']).toBe(3953)
    expect(root['Width']).toBe(W)
    expect(root['Height']).toBe(H)
    expect(root['Length']).toBe(D)
    expect(root['PaletteMax']).toBeGreaterThan(1)

    const meta = root['Metadata'] as Record<string, NbtValue>
    expect(meta['Name']).toBe('test-schem')
    expect(meta['Date']).toBe(1_700_000_000_000)

    const palette = root['Palette'] as Record<string, NbtValue>
    const byIndex = new Map<number, string>()
    for (const [key, value] of Object.entries(palette)) byIndex.set(value as number, key)
    expect(byIndex.get(0)).toBe('minecraft:air')

    const data = root['BlockData'] as Uint8Array
    // 逐格解 varint，按 x + z*W + y*W*L 的顺序比对
    let pos = 0
    for (let y = 0; y < H; y++) {
      for (let z = 0; z < D; z++) {
        for (let x = 0; x < W; x++) {
          const { value, next } = readVarint(data, pos)
          pos = next
          expect(byIndex.get(value)).toBe(voxelFullId(cell(x, y, z)))
        }
      }
    }
    expect(pos).toBe(data.length)

    expect((root['Entities'] as NbtValue[]).length).toBe(0)
    expect((root['BlockEntities'] as NbtValue[]).length).toBe(0)
  })
})
