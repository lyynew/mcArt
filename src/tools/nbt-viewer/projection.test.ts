import { describe, expect, it } from 'vitest'
import type { ParsedStructure } from '@/core/nbt-read'
import { cellsOf, coordOf, denseLayerOf, materialCounts, projectionOf } from './projection'

/**
 * 结构文件的投影与取格。
 *
 * 这段逻辑决定「层看哪一面、每格对应哪个方块」，
 * 写错的话图会镜像或错位，但界面上看起来仍然像一张画——所以必须有测试盯着。
 */

function structure(
  size: [number, number, number],
  entries: { pos: [number, number, number]; name: string }[],
): ParsedStructure {
  const palette = [...new Set(entries.map((e) => e.name))]
  return {
    size,
    palette,
    blocks: entries.map((e) => ({ pos: e.pos, state: palette.indexOf(e.name) })),
    dataVersion: 3953,
  }
}

describe('projectionOf', () => {
  it('z 维为 1 时看立面', () => {
    expect(projectionOf([12, 12, 1])).toEqual({
      kind: 'facade',
      cols: 12,
      rows: 12,
      axis: 2,
      title: '立面（x–y）',
    })
  })

  it('x 维为 1 时看侧视', () => {
    expect(projectionOf([1, 10, 6]).kind).toBe('side')
  })

  it('三维都大于 1 时看俯视，沿 y 翻页', () => {
    const p = projectionOf([8, 4, 6])
    expect(p.kind).toBe('top')
    expect(p.cols).toBe(8)
    expect(p.rows).toBe(6)
    expect(p.axis).toBe(1)
  })
})

describe('cellsOf', () => {
  it('立面：y 越大越靠上，行号要翻过来', () => {
    const s = structure([4, 3, 1], [
      { pos: [0, 0, 0], name: 'minecraft:stone' },
      { pos: [0, 2, 0], name: 'minecraft:dirt' },
    ])
    const grid = cellsOf(s, 0, projectionOf(s.size))
    // 4 列 × 3 行：第 0 行是最上面那行（y=2）
    expect(grid[0]).toBe('minecraft:dirt')
    expect(grid[2 * 4]).toBe('minecraft:stone')
  })

  it('俯视：只取当前层，坐标是 x + z * cols', () => {
    const s = structure([3, 2, 3], [
      { pos: [1, 0, 0], name: 'minecraft:stone' },
      { pos: [2, 0, 2], name: 'minecraft:dirt' },
      { pos: [1, 1, 0], name: 'minecraft:gold_block' },
    ])
    const p = projectionOf(s.size)
    const layer0 = cellsOf(s, 0, p)
    expect(layer0[1]).toBe('minecraft:stone')
    expect(layer0[2 * 3 + 2]).toBe('minecraft:dirt')
    expect(layer0).not.toContain('minecraft:gold_block')

    const layer1 = cellsOf(s, 1, p)
    expect(layer1[1]).toBe('minecraft:gold_block')
  })

  it('空格保持 null，不会画出东西', () => {
    const s = structure([2, 1, 2], [{ pos: [0, 0, 0], name: 'minecraft:stone' }])
    const grid = cellsOf(s, 0, projectionOf(s.size))
    expect(grid.filter((x) => x === null)).toHaveLength(3)
  })
})

describe('coordOf', () => {
  it('俯视下一个已知格子的坐标对得上', () => {
    const s = structure([3, 2, 3], [{ pos: [2, 0, 2], name: 'minecraft:stone' }])
    const p = projectionOf(s.size)
    // 俯视索引 = x + z * cols
    expect(coordOf(2 * 3 + 2, 0, p)).toEqual([2, 0, 2])
  })

  it('是 cellsOf 的逆运算：三种投影里每一格都能翻回原坐标', () => {
    const cases: { size: [number, number, number]; cells: [number, number, number][] }[] = [
      { size: [5, 4, 1], cells: [[0, 0, 0], [4, 3, 0], [2, 1, 0]] },
      { size: [1, 4, 5], cells: [[0, 0, 0], [0, 3, 4], [0, 1, 2]] },
      { size: [5, 3, 4], cells: [[0, 0, 0], [4, 2, 3], [1, 1, 2]] },
    ]

    for (const c of cases) {
      const s = structure(
        c.size,
        c.cells.map((pos, i) => ({ pos, name: `minecraft:b${i}` })),
      )
      const p = projectionOf(c.size)
      for (let layer = 0; layer < c.size[p.axis]; layer++) {
        cellsOf(s, layer, p).forEach((id, index) => {
          if (!id) return
          // 方块名末位就是它在 c.cells 里的下标
          expect(coordOf(index, layer, p)).toEqual(c.cells[Number(id.slice(-1))])
        })
      }
    }
  })
})

describe('materialCounts', () => {
  it('统计数量并按多到少排序，忽略空气，id 归一成裸 ID', () => {
    const s = structure([4, 1, 4], [
      { pos: [0, 0, 0], name: 'minecraft:stone' },
      { pos: [1, 0, 0], name: 'minecraft:stone' },
      { pos: [2, 0, 0], name: 'minecraft:stone' },
      { pos: [3, 0, 0], name: 'minecraft:air' },
      { pos: [0, 0, 1], name: 'minecraft:dirt' },
    ])
    expect(materialCounts(s)).toEqual([
      { id: 'stone', count: 3 },
      { id: 'dirt', count: 1 },
    ])
  })

  it('全是空气时返回空数组', () => {
    const s = structure([2, 1, 2], [{ pos: [0, 0, 0], name: 'minecraft:air' }])
    expect(materialCounts(s)).toEqual([])
  })
})

describe('denseLayerOf', () => {
  it('跳过空白层，停在方块最多的那层', () => {
    const s = structure([2, 4, 2], [
      { pos: [0, 2, 0], name: 'minecraft:stone' },
      { pos: [1, 2, 0], name: 'minecraft:stone' },
      { pos: [0, 2, 1], name: 'minecraft:stone' },
      { pos: [0, 3, 0], name: 'minecraft:stone' },
    ])
    expect(denseLayerOf(s, projectionOf(s.size))).toBe(2)
  })

  it('每层一样多时取最下面那层', () => {
    const s = structure([2, 3, 2], [
      { pos: [0, 0, 0], name: 'minecraft:stone' },
      { pos: [1, 1, 0], name: 'minecraft:stone' },
      { pos: [0, 2, 0], name: 'minecraft:stone' },
    ])
    expect(denseLayerOf(s, projectionOf(s.size))).toBe(0)
  })

  it('空结构退回第 0 层', () => {
    const s = structure([2, 2, 2], [])
    expect(denseLayerOf(s, projectionOf(s.size))).toBe(0)
  })
})
