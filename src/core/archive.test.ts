import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { crc32, gzipBytes, gzipStored, zipStored } from './archive'
import { BLOCKS_BY_ID } from './blocks'
import { buildStructure } from './nbt'

interface Meta {
  nbt: { n: number; size: number[]; blocks: string[] }
  gzip: { payload: number[] }
  zip: { entries: { name: string; length: number }[] }
}

const meta: Meta = JSON.parse(
  readFileSync(new URL('../../tests/fixtures/meta.json', import.meta.url), 'utf8'),
)

const enc = new TextEncoder()

function diff(actual: Uint8Array, expected: Uint8Array): string | null {
  if (actual.length !== expected.length) {
    return `长度不一致：实际 ${actual.length}，基准 ${expected.length}`
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) return `第 ${i} 字节不一致`
  }
  return null
}

describe('crc32', () => {
  it('对得上标准测试向量', () => {
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926)
  })

  it('空数据为 0', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })
})

describe('gzipStored', () => {
  const payload = Uint8Array.from(meta.gzip.payload)

  it('与旧版字节一致', () => {
    const expected = readFileSync(new URL('../../tests/fixtures/gzip-stored.bin', import.meta.url))
    expect(diff(gzipStored(payload), expected)).toBeNull()
  })

  it('产出的 gzip 能被标准解压器读回', () => {
    const restored = gunzipSync(gzipStored(payload))
    expect(Array.from(restored)).toEqual(Array.from(payload))
  })

  it('空输入也能正确往返', () => {
    const gz = gzipStored(new Uint8Array(0))
    expect(gunzipSync(gz).length).toBe(0)
  })
})

describe('gzipBytes', () => {
  it('无论走原生压缩还是兜底实现，解压回来都要一致', async () => {
    const payload = Uint8Array.from(meta.gzip.payload)
    const restored = gunzipSync(await gzipBytes(payload))
    expect(Array.from(restored)).toEqual(Array.from(payload))
  })
})

describe('zipStored', () => {
  const n = meta.nbt.n
  const cells = Int16Array.from(meta.nbt.size)
  const blocks = meta.nbt.blocks.map((id) => {
    const b = BLOCKS_BY_ID.get(id)
    if (!b) throw new Error(`fixture 引用了不存在的方块：${id}`)
    return b
  })

  const entries = [
    { name: 'a.nbt', data: buildStructure({ n, cells, blocks, ox: 0, oy: 0, w: 4, h: 4, useAir: true, wall: false }) },
    { name: '载入说明.txt', data: enc.encode('第一块 放在 (0,0)') },
  ]

  it('与旧版字节一致（含中文文件名）', () => {
    const expected = readFileSync(new URL('../../tests/fixtures/zip-stored.bin', import.meta.url))
    expect(diff(zipStored(entries), expected)).toBeNull()
  })

  it('结尾有中央目录结束标记，条目数正确', () => {
    const zip = zipStored(entries)
    const end = zip.length - 22
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 8, true)).toBe(entries.length)
    expect(view.getUint16(end + 10, true)).toBe(entries.length)
  })

  it('每个条目都能按偏移找到局部头', () => {
    const zip = zipStored(entries)
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
  })
})
