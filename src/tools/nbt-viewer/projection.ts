import { normalizeBlockId } from '@/core/blocks'
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

/**
 * 画面里的格子下标 → 结构坐标，也就是 `cellsOf` 的逆运算。
 *
 * 点击画布要靠它把「第几列第几行」翻回 x/y/z 给用户看。
 * 三种投影的行列朝向各不相同，翻错了会给出错坐标，所以和 cellsOf 放在一起维护。
 */
export function coordOf(
  index: number,
  layer: number,
  projection: Projection,
): [number, number, number] {
  const { kind, cols, rows } = projection
  const col = index % cols
  const row = Math.floor(index / cols)

  if (kind === 'facade') return [col, rows - 1 - row, layer]
  if (kind === 'side') return [layer, col, rows - 1 - row]
  return [col, layer, row]
}

/** 画布上点中的一格：结构坐标 + 该格的原始方块串（可能带 [状态]） */
export interface PickedCell {
  index: number
  id: string
  pos: [number, number, number]
}

/** 统计每种方块的用量（不含空气），从多到少 */
export function materialCounts(structure: ParsedStructure): { id: string; count: number }[] {
  const tally = new Map<string, number>()
  for (const b of structure.blocks) {
    const raw = structure.palette[b.state]
    if (!raw) continue
    // 归一后再计数：chest[facing=north] 与 chest[facing=south] 是同一种材料
    const id = normalizeBlockId(raw)
    if (id === 'air' || id === 'cave_air' || id === 'void_air' || id === 'structure_void') continue
    tally.set(id, (tally.get(id) ?? 0) + 1)
  }
  return [...tally.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * 方块最多的一层。
 *
 * 打开文件默认停在第 0 层往往是一片空白（地基之上、屋顶之下），
 * 让人误以为文件坏了。直接跳到内容最密的一层，第一眼就是有效信息。
 */
export function denseLayerOf(structure: ParsedStructure, projection: Projection): number {
  const axis = projection.axis
  const total = structure.size[axis]
  if (total <= 0) return 0

  const counts = new Array<number>(total).fill(0)
  for (const b of structure.blocks) {
    const at = b.pos[axis]
    if (at >= 0 && at < total) counts[at]! += 1
  }

  let best = 0
  for (let i = 1; i < total; i++) {
    if (counts[i]! > counts[best]!) best = i
  }
  return best
}
