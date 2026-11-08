import type { ParsedStructure } from '@/core/nbt-read'

/**
 * 结构文件的投影规则。
 *
 * 抽成独立模块是因为「该沿哪一轴翻页」这件事，
 * 画布和页面的层数滑杆都要用——两边各写一遍必然会不一致。
 */
export type ProjectionKind = 'facade' | 'side' | 'top'

export interface Projection {
  kind: ProjectionKind
  /** 画面列数 */
  cols: number
  /** 画面行数 */
  rows: number
  /** 翻页用的轴：0=x 1=y 2=z */
  axis: 0 | 1 | 2
  title: string
}

export function projectionOf(size: readonly [number, number, number]): Projection {
  const [sx, sy, sz] = size
  if (sz <= 1) return { kind: 'facade', cols: sx, rows: sy, axis: 2, title: '立面（x–y）' }
  if (sx <= 1) return { kind: 'side', cols: sy, rows: sz, axis: 0, title: '侧视（y–z）' }
  return { kind: 'top', cols: sx, rows: sz, axis: 1, title: '俯视（x–z）' }
}

/** 某一层里每一格的方块 ID；null 表示空 */
export function cellsOf(
  structure: ParsedStructure,
  layer: number,
  projection: Projection,
): (string | null)[] {
  const { kind, cols, rows } = projection
  const grid = new Array<string | null>(cols * rows).fill(null)

  for (const b of structure.blocks) {
    const [x, y, z] = b.pos
    let index = -1

    if (kind === 'facade') {
      if (z !== layer) continue
      // 行号自上而下，y 越大越靠上
      index = x + (rows - 1 - y) * cols
    } else if (kind === 'side') {
      if (x !== layer) continue
      index = y + (rows - 1 - z) * cols
    } else {
      if (y !== layer) continue
      index = x + z * cols
    }

    if (index < 0 || index >= grid.length) continue
    const id = structure.palette[b.state]
    if (id) grid[index] = id
  }

  return grid
}

/** 统计每种方块的用量（不含空气），从多到少 */
export function materialCounts(structure: ParsedStructure): { id: string; count: number }[] {
  const tally = new Map<string, number>()
  for (const b of structure.blocks) {
    const id = structure.palette[b.state]
    if (!id || id === 'minecraft:air') continue
    tally.set(id, (tally.get(id) ?? 0) + 1)
  }
  return [...tally.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
}
