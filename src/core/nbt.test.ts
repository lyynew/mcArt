import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BLOCKS_BY_ID } from './blocks'
import { buildStructure, DATA_VERSION, STRUCT_MAX, tileCount } from './nbt'
import { parseStructure } from './nbt-read'

interface Meta {
  nbt: {
    n: number
    size: number[]
    blocks: string[]
    variants: { name: string; useAir: boolean; wall: boolean }[]
  }
  sub: { ox: number; oy: number; w: number; h: number }
}

const meta: Meta = JSON.parse(
  readFileSync(new URL('../../tests/fixtures/meta.json', import.meta.url), 'utf8'),
)

const n = meta.nbt.n
const cells = Int16Array.from(meta.nbt.size)
const blocks = meta.nbt.blocks.map((id) => {
  const b = BLOCKS_BY_ID.get(id)
  if (!b) throw new Error(`fixture 引用了不存在的方块：${id}`)
  return b
})

function describeDiff(actual: Uint8Array, expected: Uint8Array): string | null {
  if (actual.length !== expected.length) {
    return `长度不一致：实际 ${actual.length}，基准 ${expected.length}`
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      return `第 ${i} 字节不一致：实际 0x${actual[i]!.toString(16)}，基准 0x${expected[i]!.toString(16)}`
    }
  }
  return null
}

describe('buildStructure', () => {
  /**
   * 最重要的四条断言。
   * .nbt 的字段顺序、标签类型、整数编码只要错一处，游戏就会拒绝加载，
   * 而「导出了个文件」这件事本身看不出问题——所以必须逐字节比。
   */
  for (const v of meta.nbt.variants) {
    it(`与旧版字节一致：${v.name}`, () => {
      const actual = buildStructure({
        n,
        cells,
        blocks,
        ox: 0,
        oy: 0,
        w: n,
        h: n,
        useAir: v.useAir,
        wall: v.wall,
      })
      const expected = readFileSync(
        new URL(`../../tests/fixtures/nbt/${v.name}.nbt`, import.meta.url),
      )
      expect(describeDiff(actual, expected)).toBeNull()
    })
  }

  it('分块时使用块内局部坐标与偏移，与旧版一致', () => {
    const { ox, oy, w, h } = meta.sub
    const actual = buildStructure({ n, cells, blocks, ox, oy, w, h, useAir: true, wall: false })
    const expected = readFileSync(new URL('../../tests/fixtures/nbt/sub-5x3.nbt', import.meta.url))
    expect(describeDiff(actual, expected)).toBeNull()
  })

  it('不填空气时，空格不产生方块条目', () => {
    const withAir = buildStructure({
      n,
      cells,
      blocks,
      ox: 0,
      oy: 0,
      w: n,
      h: n,
      useAir: true,
      wall: false,
    })
    const withoutAir = buildStructure({
      n,
      cells,
      blocks,
      ox: 0,
      oy: 0,
      w: n,
      h: n,
      useAir: false,
      wall: false,
    })
    expect(withoutAir.length).toBeLessThan(withAir.length)
  })

  it('根节点是 compound，且带 DataVersion', () => {
    const bytes = buildStructure({
      n,
      cells,
      blocks,
      ox: 0,
      oy: 0,
      w: 4,
      h: 4,
      useAir: true,
      wall: false,
    })
    expect(bytes[0]).toBe(10) // TAG_Compound
    expect(new TextDecoder().decode(bytes)).toContain('DataVersion')
    expect(actualDataVersion(bytes)).toBe(DATA_VERSION)
  })

  it('立方体尺寸按朝向摆放', () => {
    const flat = buildStructure({
      n,
      cells,
      blocks,
      ox: 0,
      oy: 0,
      w: 5,
      h: 3,
      useAir: true,
      wall: false,
    })
    const wall = buildStructure({
      n,
      cells,
      blocks,
      ox: 0,
      oy: 0,
      w: 5,
      h: 3,
      useAir: true,
      wall: true,
    })
    // 平铺：5×1×3；立面：5×3×1 —— 长度相同，字节不同
    expect(wall.length).toBe(flat.length)
    expect(describeDiff(wall, flat)).not.toBeNull()
  })
})

/**
 * 从字节里把 DataVersion 的值读出来。
 * 按字节找名字而不是先解码成字符串——中文路径/名字下字符下标和字节下标会错位。
 */
const DATA_VERSION_NAME = [...new TextEncoder().encode('DataVersion')]

function findBytes(hay: Uint8Array, needle: readonly number[]): number {
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer
    }
    return i
  }
  return -1
}

function actualDataVersion(bytes: Uint8Array): number {
  const at = findBytes(bytes, DATA_VERSION_NAME)
  if (at < 0) return -1
  // 名字之后紧跟 4 字节大端整数（TAG_Int 的值）
  const p = at + DATA_VERSION_NAME.length
  return (((bytes[p]! << 24) | (bytes[p + 1]! << 16) | (bytes[p + 2]! << 8) | bytes[p + 3]!) >>> 0)
}

/**
 * 回读验证。
 *
 * 上面对齐的是「和旧版一模一样」，这里验证的是「这份字节本身是自洽的」：
 * 把导出的文件重新解析，还原成方块网格，必须跟原始数据一致。
 * 两道关都过，才算真的没写错——只比字节的话，两边一起错是查不出来的。
 */
describe('回读验证', () => {
  const flat = buildStructure({
    n,
    cells,
    blocks,
    ox: 0,
    oy: 0,
    w: n,
    h: n,
    useAir: true,
    wall: false,
  })
  const parsed = parseStructure(flat)

  it('尺寸是 平铺 n×1×n', () => {
    expect(parsed.size).toEqual([n, 1, n])
    expect(parsed.dataVersion).toBe(DATA_VERSION)
  })

  it('palette 带命名空间，air 排在最前', () => {
    expect(parsed.palette[0]).toBe('minecraft:air')
    expect(parsed.palette.every((name) => name.startsWith('minecraft:'))).toBe(true)
  })

  it('还原出的网格与原图逐格一致', () => {
    const restored = new Int16Array(n * n).fill(-1)
    for (const b of parsed.blocks) {
      const name = parsed.palette[b.state]!
      const [x, , z] = b.pos
      restored[z * n + x] = name === 'minecraft:air' ? -1 : blocks.findIndex((blk) => `minecraft:${blk.id}` === name)
    }
    expect(Array.from(restored)).toEqual(Array.from(cells))
  })

  it('不填空气时方块条目数等于非空格子数', () => {
    const noAir = buildStructure({
      n,
      cells,
      blocks,
      ox: 0,
      oy: 0,
      w: n,
      h: n,
      useAir: false,
      wall: false,
    })
    const solid = Array.from(cells).filter((k) => k >= 0).length
    expect(parseStructure(noAir).blocks.length).toBe(solid)
  })

  it('立面朝向把行号翻到 y 轴上', () => {
    const wall = parseStructure(
      buildStructure({ n, cells, blocks, ox: 0, oy: 0, w: n, h: n, useAir: true, wall: true }),
    )
    expect(wall.size).toEqual([n, n, 1])
    for (const b of wall.blocks) expect(b.pos[2]).toBe(0)

    // 还原：y 轴 = h-1-行号
    const restored = new Int16Array(n * n).fill(-1)
    for (const b of wall.blocks) {
      const name = wall.palette[b.state]!
      const [x, y] = b.pos
      const row = n - 1 - y
      restored[row * n + x] = name === 'minecraft:air' ? -1 : blocks.findIndex((blk) => `minecraft:${blk.id}` === name)
    }
    expect(Array.from(restored)).toEqual(Array.from(cells))
  })

  it('旧版产出的 fixture 也能被解析成同一张图', () => {
    const legacy = parseStructure(
      readFileSync(new URL('../../tests/fixtures/nbt/flat-air.nbt', import.meta.url)),
    )
    expect(legacy.size).toEqual([n, 1, n])
    const restored = new Int16Array(n * n).fill(-1)
    for (const b of legacy.blocks) {
      const name = legacy.palette[b.state]!
      const [x, , z] = b.pos
      restored[z * n + x] = name === 'minecraft:air' ? -1 : blocks.findIndex((blk) => `minecraft:${blk.id}` === name)
    }
    expect(Array.from(restored)).toEqual(Array.from(cells))
  })
})

describe('tileCount', () => {
  it('48 格以内只有一块', () => {
    expect(tileCount(32)).toEqual({ cols: 1, rows: 1 })
    expect(tileCount(STRUCT_MAX)).toEqual({ cols: 1, rows: 1 })
  })

  it('超出上限按 48 起分块', () => {
    expect(tileCount(49)).toEqual({ cols: 2, rows: 2 })
    expect(tileCount(96)).toEqual({ cols: 2, rows: 2 })
    expect(tileCount(160)).toEqual({ cols: 4, rows: 4 })
  })
})
