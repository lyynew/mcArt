import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { parseNbt, parseStructure, type NbtValue } from '@/core/nbt-read'
import { MAP_PIXELS } from './model'
import { buildHeightMap } from './heightmap'
import { buildPlacementNote, buildStructureChunks, type BuildInput } from './structure'

function flatInput(): BuildInput {
  const colors = new Uint8Array(MAP_PIXELS).fill(8 * 4 + 1)
  const m = buildHeightMap(colors, { compress: true, noobline: true })
  return {
    colors,
    heights: m.heights,
    noobline: m.noobline,
    maxHeight: m.maxHeight,
    supportBlock: 'dirt',
    withNoobline: true,
    dataVersion: 4671,
  }
}

describe('buildStructureChunks', () => {
  it('128×129 的平铺图切成 9 块，每块都不超过 48³', async () => {
    const chunks = await buildStructureChunks(flatInput())
    expect(chunks).toHaveLength(9)
    for (const c of chunks) {
      expect(c.w).toBeGreaterThan(0)
      expect(c.w).toBeLessThanOrEqual(48)
      expect(c.h).toBeLessThanOrEqual(48)
      expect(c.d).toBeLessThanOrEqual(48)
      expect(c.data[0]).toBe(0x1f) // gzip
      expect(c.data[1]).toBe(0x8b)
    }
  })

  it('每块都能被通用 NBT 解析器读回，字段与结构方块一致', async () => {
    const chunks = await buildStructureChunks(flatInput())
    for (const c of chunks) {
      const root = parseNbt(new Uint8Array(gunzipSync(c.data)))
      expect(root['size']).toEqual([c.w, c.h, c.d])
      expect(root['DataVersion']).toBe(4671)
      const blocks = root['blocks'] as NbtValue[]
      const palette = root['palette'] as Record<string, NbtValue>[]
      expect(blocks).toHaveLength(c.w * c.d) // 平铺只有 y=0 一层
      expect(palette.length).toBeGreaterThan(0)
      for (const b of blocks) {
        const pos = (b as Record<string, NbtValue>)['pos'] as number[]
        expect(pos).toHaveLength(3)
        expect(pos[0]).toBeLessThan(c.w)
        expect(pos[2]).toBeLessThan(c.d)
      }
    }
  })

  it('结构查看器的 parseStructure 也能读回，说明与既有格式兼容', async () => {
    const chunks = await buildStructureChunks(flatInput())
    const parsed = parseStructure(new Uint8Array(gunzipSync(chunks[0]!.data)))
    expect(parsed.size).toEqual([chunks[0]!.w, chunks[0]!.h, chunks[0]!.d])
    expect(parsed.blocks).toHaveLength(chunks[0]!.w * chunks[0]!.d)
    expect(parsed.dataVersion).toBe(4671)
  })

  it('摆放说明列出所有分块与相对位置', async () => {
    const input = flatInput()
    const chunks = await buildStructureChunks(input)
    const m = buildHeightMap(input.colors, { compress: true, noobline: true })
    const note = new TextDecoder().decode(buildPlacementNote(chunks, input, m))
    for (const c of chunks) expect(note).toContain(c.name)
    expect(note).toContain('minecraft:dirt')
  })
})
