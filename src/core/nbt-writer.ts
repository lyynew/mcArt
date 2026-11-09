/**
 * 大端序 NBT 写入器。
 *
 * 结构文件（core/nbt.ts）和地图数据（tools/map-art/map-dat.ts）都要写 NBT，
 * 共用一个写入器，避免两边各实现一遍字节拼接。标签编号直接复用解析侧的
 * nbt-read.ts，读写两侧不会出现两套常量。
 */
export { TAG } from './nbt-read'

export class NbtWriter {
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

  /** Litematica 的 BlockStates 是 long array，位运算必须用 BigInt 才不会丢符号位 */
  i64(v: bigint): this {
    let u = BigInt.asUintN(64, v)
    for (let i = 7; i >= 0; i--) {
      this.buf.push(Number(u & 255n))
      u >>= 8n
    }
    return this
  }

  /** 字符串按 UTF-8 编码，长度是 i16（超长字符串不该出现在这类文件里） */
  str(s: string): this {
    const bytes = new TextEncoder().encode(s)
    this.i16(bytes.length)
    for (let i = 0; i < bytes.length; i++) this.buf.push(bytes[i]!)
    return this
  }

  /** 原样追加一段字节：TAG_Byte_Array / TAG_Int_Array 的载荷 */
  raw(bytes: ArrayLike<number>): this {
    for (let i = 0; i < bytes.length; i++) this.buf.push(bytes[i]! & 255)
    return this
  }

  bytes(): Uint8Array {
    return new Uint8Array(this.buf)
  }
}
