/**
 * NBT 解析（只读）。
 *
 * 用途有两个：
 *   1. 导出测试里回读自己写出的结构文件，验证「字节 → 结构」这条链路自洽；
 *   2. 将来的结构文件查看器（把 .nbt 拖进来分层看）。
 *
 * 覆盖规范里的全部标签类型。TAG_Long / TAG_LongArray 用 Number 承载，
 * 超过 2^53 会丢精度——结构文件不会用到，其他用途请留意。
 */

export type NbtValue =
  | number
  | string
  | NbtValue[]
  | { [key: string]: NbtValue }
  | Uint8Array
  | Int32Array
  | BigInt64Array

export const TAG = {
  End: 0,
  Byte: 1,
  Short: 2,
  Int: 3,
  Long: 4,
  Float: 5,
  Double: 6,
  ByteArray: 7,
  String: 8,
  List: 9,
  Compound: 10,
  IntArray: 11,
  LongArray: 12,
} as const

class Reader {
  private p = 0
  private readonly view: DataView
  private readonly text = new TextDecoder()

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  get done(): boolean {
    return this.p >= this.bytes.length
  }

  u8(): number {
    return this.view.getUint8(this.p++)
  }

  i16(): number {
    const v = this.view.getInt16(this.p)
    this.p += 2
    return v
  }

  /** 无符号 16 位，用于字符串长度 */
  u16(): number {
    const v = this.view.getUint16(this.p)
    this.p += 2
    return v
  }

  i32(): number {
    const v = this.view.getInt32(this.p)
    this.p += 4
    return v
  }

  i64(): number {
    const v = this.view.getBigInt64(this.p)
    this.p += 8
    return Number(v)
  }

  f32(): number {
    const v = this.view.getFloat32(this.p)
    this.p += 4
    return v
  }

  f64(): number {
    const v = this.view.getFloat64(this.p)
    this.p += 8
    return v
  }

  str(): string {
    const len = this.u16()
    const s = this.text.decode(this.bytes.subarray(this.p, this.p + len))
    this.p += len
    return s
  }

  skip(n: number): void {
    this.p += n
  }

  /** 读标签的负载（不含类型字节与名字） */
  payload(type: number): NbtValue {
    switch (type) {
      case TAG.Byte:
        return this.u8() << 24 >> 24
      case TAG.Short:
        return this.i16()
      case TAG.Int:
        return this.i32()
      case TAG.Long:
        return this.i64()
      case TAG.Float:
        return this.f32()
      case TAG.Double:
        return this.f64()
      case TAG.ByteArray: {
        const len = this.i32()
        const out = this.bytes.slice(this.p, this.p + len)
        this.p += len
        return out
      }
      case TAG.String:
        return this.str()
      case TAG.List: {
        const elem = this.u8()
        const len = this.i32()
        const out: NbtValue[] = []
        for (let i = 0; i < len; i++) out.push(this.payload(elem))
        return out
      }
      case TAG.Compound: {
        const out: Record<string, NbtValue> = {}
        for (;;) {
          const t = this.u8()
          if (t === TAG.End) break
          const name = this.str()
          out[name] = this.payload(t)
        }
        return out
      }
      case TAG.IntArray: {
        const len = this.i32()
        const out = new Int32Array(len)
        for (let i = 0; i < len; i++) out[i] = this.i32()
        return out
      }
      case TAG.LongArray: {
        const len = this.i32()
        const out = new BigInt64Array(len)
        for (let i = 0; i < len; i++) out[i] = this.view.getBigInt64(this.p + i * 8)
        this.p += len * 8
        return out
      }
      default:
        throw new Error(`不认识的 NBT 标签类型：${type}（偏移 ${this.p}）`)
    }
  }
}

/** 读整个文档，返回根 compound */
export function parseNbt(bytes: Uint8Array): Record<string, NbtValue> {
  const r = new Reader(bytes)
  const rootType = r.u8()
  if (rootType !== TAG.Compound) throw new Error(`根标签不是 compound：${rootType}`)
  r.str() // 根名字通常为空
  const root = r.payload(TAG.Compound)
  return root as Record<string, NbtValue>
}

export interface ParsedStructureBlock {
  pos: [number, number, number]
  /** palette 里的下标 */
  state: number
}

export interface ParsedStructure {
  /** [x, y, z] */
  size: [number, number, number]
  /** 方块 ID 列表，下标即 block.state */
  palette: string[]
  blocks: ParsedStructureBlock[]
  dataVersion: number
}

/** 按结构文件的约定取出关键字段 */
export function parseStructure(bytes: Uint8Array): ParsedStructure {
  const root = parseNbt(bytes)

  const size = root['size']
  if (!Array.isArray(size) || size.length !== 3) throw new Error('结构文件缺少 size')

  const paletteRaw = root['palette']
  if (!Array.isArray(paletteRaw)) throw new Error('结构文件缺少 palette')
  const palette = paletteRaw.map((entry) => {
    const name = (entry as Record<string, NbtValue>)['Name']
    if (typeof name !== 'string') throw new Error('palette 条目缺少 Name')
    return name
  })

  const blocksRaw = root['blocks']
  const blocks: ParsedStructureBlock[] = Array.isArray(blocksRaw)
    ? blocksRaw.map((entry) => {
        const e = entry as Record<string, NbtValue>
        const pos = e['pos'] as NbtValue[]
        const state = e['state']
        if (!Array.isArray(pos) || typeof state !== 'number') {
          throw new Error('blocks 条目格式不对')
        }
        return { pos: [pos[0] as number, pos[1] as number, pos[2] as number], state }
      })
    : []

  const dataVersion = root['DataVersion']

  return {
    size: [size[0] as number, size[1] as number, size[2] as number],
    palette,
    blocks,
    dataVersion: typeof dataVersion === 'number' ? dataVersion : 0,
  }
}
