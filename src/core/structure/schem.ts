/**
 * Sponge Schematic v2（.schem）写入。
 *
 * WorldEdit / FAWE 的 //paste 认这个格式。规格见
 * SpongePowered/Schematic-Specification versions/schematic-2.md：
 *
 *   - gzip 大端 NBT，根 compound 名为 Schematic
 *   - Width / Height / Length 是 short（不是 int）
 *   - Palette 是「方块状态串 → 下标」的映射；不写 [状态] 就用默认状态，
 *     与结构文件（.nbt）不写 Properties 的行为一致
 *   - BlockData 是 varint 字节流（每 7 位一组、高位是续位标志），
 *     条目数固定 Width×Height×Length，索引序 x + z*W + y*W*L（x 最快、y 最慢）
 *   - 空气就是调色板里的一条，数组是稠密的，没有「缺省即空气」的说法
 *
 * 只写 v2：WorldEdit 7.x / FAWE / Axiom 都认，v3 多出的群系与 Offset
 * 数据对施工文件没有收益。
 */
import { gzipBytes } from '../archive'
import { TAG, NbtWriter } from '../nbt-writer'
import { voxelFullId, type VoxelLayout } from './voxels'

export interface SchemMeta {
  /** Metadata.Name，存档里显示的图纸名 */
  name: string
  dataVersion: number
  author?: string
  /** 毫秒时间戳，默认当前时间 */
  dateCreated?: number
}

/** 无符号 varint：低 7 位有效，最高位是「后面还有」的续位标志 */
export function pushVarint(out: number[], value: number): void {
  let v = value >>> 0
  while (v > 0x7f) {
    out.push((v & 0x7f) | 0x80)
    v >>>= 7
  }
  out.push(v)
}

/** 逆运算，回读测试用 */
export function readVarint(bytes: ArrayLike<number>, pos: number): { value: number; next: number } {
  let value = 0
  let shift = 0
  let p = pos
  for (;;) {
    const b = bytes[p++]!
    value |= (b & 0x7f) << shift
    if ((b & 0x80) === 0) return { value, next: p }
    shift += 7
  }
}

export async function buildSchem(layout: VoxelLayout, meta: SchemMeta): Promise<Uint8Array> {
  const { sizeX: w, sizeY: h, sizeZ: d } = layout

  // 调色板：0 号固定 air，其余按出现顺序编号
  const palette = ['minecraft:air']
  const indexOf = new Map<string, number>([['minecraft:air', 0]])
  const data: number[] = []

  for (let y = 0; y < h; y++) {
    for (let z = 0; z < d; z++) {
      for (let x = 0; x < w; x++) {
        const full = voxelFullId(layout.blockAt(x, y, z))
        let idx = indexOf.get(full)
        if (idx === undefined) {
          idx = palette.length
          palette.push(full)
          indexOf.set(full, idx)
        }
        pushVarint(data, idx)
      }
    }
  }

  const wr = new NbtWriter()

  wr.u8(TAG.Compound).str('Schematic')
  wr.u8(TAG.Int).str('Version').i32(2)
  wr.u8(TAG.Int).str('DataVersion').i32(meta.dataVersion)

  wr.u8(TAG.Compound).str('Metadata')
  wr.u8(TAG.String).str('Name').str(meta.name)
  wr.u8(TAG.String).str('Author').str(meta.author ?? 'mcArt')
  wr.u8(TAG.Long).str('Date').i64(BigInt(meta.dateCreated ?? Date.now()))
  wr.u8(TAG.End)

  wr.u8(TAG.Short).str('Width').i16(w)
  wr.u8(TAG.Short).str('Height').i16(h)
  wr.u8(TAG.Short).str('Length').i16(d)

  // Offset 是 int 列表：贴着选区最小角放，留 [0,0,0] 最直观
  wr.u8(TAG.List).str('Offset').u8(TAG.Int).i32(3).i32(0).i32(0).i32(0)

  wr.u8(TAG.Int).str('PaletteMax').i32(palette.length)
  wr.u8(TAG.Compound).str('Palette')
  for (let i = 0; i < palette.length; i++) wr.u8(TAG.Int).str(palette[i]!).i32(i)
  wr.u8(TAG.End)

  wr.u8(TAG.ByteArray).str('BlockData').i32(data.length).raw(data)

  wr.u8(TAG.List).str('BlockEntities').u8(TAG.Compound).i32(0)
  wr.u8(TAG.List).str('Entities').u8(TAG.Compound).i32(0)
  wr.u8(TAG.End) // root

  return gzipBytes(wr.bytes())
}
