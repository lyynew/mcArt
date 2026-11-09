import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { parseNbt, type NbtValue } from '@/core/nbt-read'
import {
  buildDatBytes,
  buildZipBytes,
  giveCommand,
  instructions,
  mapFileName,
  mapFilePath,
} from './export'
import { buildMapNbt, type MapDatFields } from './map-dat'
import { DEFAULT_MAP_OPTIONS, MAP_PIXELS, type MapOptions } from './model'

const fields: MapDatFields = {
  dimension: 'minecraft:overworld',
  xCenter: 0,
  zCenter: 0,
  locked: true,
  trackingPosition: true,
  dataVersion: 4189,
}

function sampleColors(): Uint8Array {
  const c = new Uint8Array(MAP_PIXELS)
  for (let i = 0; i < c.length; i++) c[i] = i % 248
  return c
}

function options(overrides: Partial<MapOptions> = {}): MapOptions {
  return { ...DEFAULT_MAP_OPTIONS, ...overrides }
}

describe('buildMapNbt', () => {
  it('字节能被通用 NBT 解析器完整读回', () => {
    const colors = sampleColors()
    const root = parseNbt(buildMapNbt(colors, fields))
    const data = root['data'] as Record<string, NbtValue>

    expect(data['scale']).toBe(0)
    expect(data['dimension']).toBe('minecraft:overworld')
    expect(data['locked']).toBe(1)
    expect(data['trackingPosition']).toBe(1)
    expect(data['unlimitedTracking']).toBe(0)
    expect(data['xCenter']).toBe(0)
    expect(data['zCenter']).toBe(0)
    expect(data['banners']).toEqual([])
    expect(data['frames']).toEqual([])
    expect(Array.from(data['colors'] as Uint8Array)).toEqual(Array.from(colors))
    expect(root['DataVersion']).toBe(4189)
  })

  it('colors 不是 16384 字节时拒绝生成', () => {
    expect(() => buildMapNbt(new Uint8Array(10), fields)).toThrow('16384')
  })
})

describe('导出链路', () => {
  it('gzip 之后仍是同一份 NBT', async () => {
    const colors = sampleColors()
    const bytes = await buildDatBytes(colors, options({ version: '1.21.4' }))
    expect(bytes[0]).toBe(0x1f)
    expect(bytes[1]).toBe(0x8b)
    const back = parseNbt(new Uint8Array(gunzipSync(bytes)))
    expect(back['DataVersion']).toBe(4189)
    expect(Array.from((back['data'] as Record<string, NbtValue>)['colors'] as Uint8Array)).toEqual(
      Array.from(colors),
    )
  })

  it('ZIP 里有地图文件与说明，且目录记录为两条', async () => {
    const z = await buildZipBytes(sampleColors(), options())
    const text = new TextDecoder().decode(z)
    const view = new DataView(z.buffer, z.byteOffset, z.byteLength)
    expect(view.getUint32(0, true)).toBe(0x04034b50) // 局部文件头
    expect(text).toContain('map_0.dat')
    expect(text).toContain('使用说明.txt')
    // EOCD 在最后 22 字节，条目数写在偏移 8 / 10
    expect(view.getUint32(z.length - 22, true)).toBe(0x06054b50)
    expect(view.getUint16(z.length - 22 + 8, true)).toBe(2)
    expect(view.getUint16(z.length - 22 + 10, true)).toBe(2)
  })

  it('give 指令按版本切换 NBT / 组件写法', () => {
    expect(giveCommand(options({ version: '1.20.4', id: 7 }))).toBe(
      '/give @p minecraft:filled_map{map:7} 1',
    )
    expect(giveCommand(options({ version: '1.21.11', id: 7 }))).toBe(
      '/give @p minecraft:filled_map[minecraft:map_id=7] 1',
    )
  })

  it('26.1 起换目录与文件名，说明里也换成 last_id.dat', () => {
    const legacy = options({ version: '1.21.11', id: 3 })
    const modern = options({ version: '26.1', id: 3 })
    expect(mapFileName(legacy)).toBe('map_3.dat')
    expect(mapFilePath(legacy)).toBe('存档/data/map_3.dat')
    expect(instructions(legacy)).toContain('idcounts.dat')

    expect(mapFileName(modern)).toBe('3.dat')
    expect(mapFilePath(modern)).toBe('存档/data/minecraft/maps/3.dat')
    expect(instructions(modern)).toContain('存档/data/minecraft/maps/last_id.dat')
    expect(instructions(modern)).toContain('map_id=3')
  })
})
