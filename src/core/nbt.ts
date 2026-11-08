/**
 * Java 版结构文件（.nbt）写入。
 *
 * 完全按 NBT 规范手工序列化：不使用第三方库，也不做多余字段，
 * 只写结构方块加载时真正需要的 size / palette / blocks / entities / DataVersion。
 *
 * 这份字节流的正确性靠 nbt.test.ts 与旧版实现产出的 fixture 逐字节比对来保证——
 * 这类代码最怕「看起来一样、进游戏加载不出来」。
 */
import { fullId, type BlockDef } from './blocks'

/** 结构方块单次加载的上限：48×48×48 */
export const STRUCT_MAX = 48

/** Java 1.21.4 的 DataVersion，写错会导致游戏拒绝加载 */
export const DATA_VERSION = 3953

/** NBT 标签类型 */
const TAG_END = 0
const TAG_INT = 3
const TAG_STRING = 8
const TAG_LIST = 9
const TAG_COMPOUND = 10

/** 大端序写入器，只实现结构文件需要的几个类型 */
class NbtWriter {
  private readonly buf: number[] = []

  u8(v: number): this {
    this.buf.push(v & 255)
    return this
  }

  i16(v: number): this {
    this.buf.push((v >> 8) & 255, v & 255)
    return this
  }

  i32(v: number): this {
    this.buf.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255)
    return this
  }

  /** 字符串按 UTF-8 编码，长度是 i16（所以超长字符串本来就不该出现在这里） */
  str(s: string): this {
    const bytes = new TextEncoder().encode(s)
    this.i16(bytes.length)
    for (let i = 0; i < bytes.length; i++) this.buf.push(bytes[i]!)
    return this
  }

  bytes(): Uint8Array {
    return new Uint8Array(this.buf)
  }
}

export interface StructureBuildOptions {
  /** 整幅图的边长格数 */
  n: number
  /** n×n 的方块下标，-1 为空 */
  cells: ArrayLike<number>
  /** 索引对应的色板方块，顺序即 cells 的取值范围 */
  blocks: readonly BlockDef[]
  /** 本块在整幅图中的左上角格坐标 */
  ox: number
  oy: number
  /** 本块的宽高（分块时小于 n） */
  w: number
  h: number
  /** 空格是否写成空气方块；false 时空格直接不生成，结构更小 */
  useAir: boolean
  /** true 为立面（贴墙），false 为平铺地面 */
  wall: boolean
}

/**
 * 生成一块结构文件。
 *
 * 坐标一律用块内局部坐标：每块本身都是 w×h 的完整长方体，
 * 整幅图靠结构方块摆放时的相对位置拼起来，位置信息写在包内的说明文件里。
 */
export function buildStructure(o: StructureBuildOptions): Uint8Array {
  const { n, cells, blocks, ox, oy, w, h, useAir, wall } = o

  const palette: string[] = []
  const seen = new Map<string, number>()
  const idxOf = (id: string): number => {
    const hit = seen.get(id)
    if (hit !== undefined) return hit
    const i = palette.length
    palette.push(id)
    seen.set(id, i)
    return i
  }

  let airIdx = -1
  if (useAir) airIdx = idxOf('minecraft:air')

  type Cell = readonly [number, number, number, number]
  const pos: Cell[] = []

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = cells[(oy + y) * n + (ox + x)]!
      const state = k < 0 ? (useAir ? airIdx : -2) : idxOf(fullId(blocks[k]!))
      if (state === -2) continue
      if (wall) pos.push([x, h - 1 - y, 0, state])
      else pos.push([x, 0, y, state])
    }
  }

  const wr = new NbtWriter()

  // 根节点：无名 compound
  wr.u8(TAG_COMPOUND)
  wr.str('')

  // size: [w, h, 1] 或 [w, 1, h]
  wr.u8(TAG_LIST)
  wr.str('size')
  wr.u8(TAG_INT)
  wr.i32(3)
  wr.i32(w)
  wr.i32(wall ? h : 1)
  wr.i32(wall ? 1 : h)

  // palette: [{ Name: "minecraft:xxx" }, ...]，下标即 block 的 state
  wr.u8(TAG_LIST)
  wr.str('palette')
  wr.u8(TAG_COMPOUND)
  wr.i32(palette.length)
  for (let i = 0; i < palette.length; i++) {
    wr.u8(TAG_STRING)
    wr.str('Name')
    wr.str(palette[i]!)
    wr.u8(TAG_END)
  }

  // blocks: [{ pos: [x,y,z], state: int }, ...]
  wr.u8(TAG_LIST)
  wr.str('blocks')
  wr.u8(TAG_COMPOUND)
  wr.i32(pos.length)
  for (let i = 0; i < pos.length; i++) {
    const c = pos[i]!
    wr.u8(TAG_LIST)
    wr.str('pos')
    wr.u8(TAG_INT)
    wr.i32(3)
    wr.i32(c[0])
    wr.i32(c[1])
    wr.i32(c[2])
    wr.u8(TAG_INT)
    wr.str('state')
    wr.i32(c[3])
    wr.u8(TAG_END)
  }

  // entities: 空列表，结构方块要求字段存在
  wr.u8(TAG_LIST)
  wr.str('entities')
  wr.u8(TAG_COMPOUND)
  wr.i32(0)

  wr.u8(TAG_INT)
  wr.str('DataVersion')
  wr.i32(DATA_VERSION)

  // 根节点结束
  wr.u8(TAG_END)

  return wr.bytes()
}

/** 整幅图超过 48 格时需要的分块数（每块最多 48×48） */
export function tileCount(n: number): { cols: number; rows: number } {
  const cols = Math.ceil(n / STRUCT_MAX)
  return { cols, rows: cols }
}
