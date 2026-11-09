/**
 * map_<#>.dat 的 NBT 字节流（未压缩）。
 *
 * 结构按 Minecraft Wiki「Map item format」：
 *   根 compound → data compound（地图参数 + 16384 字节 colors）+ DataVersion
 * gzip 由 core/archive.ts 负责，ZIP 打包在 export.ts，这里只管字节正确性。
 *
 * 地图画必须 1:1，所以 scale 固定 0；颜色分辨率永远是 128×128，
 * 放大 scale 只会让一个像素覆盖更多方块，反而把画抹掉。
 * unlimitedTracking 与 banners / frames 都写成固定空值，避免游戏缺字段。
 */
import { TAG, NbtWriter } from '@/core/nbt-writer'
import { MAP_PIXELS } from './model'

export interface MapDatFields {
  dimension: string
  xCenter: number
  zCenter: number
  locked: boolean
  trackingPosition: boolean
  dataVersion: number
}

export function buildMapNbt(colors: Uint8Array, f: MapDatFields): Uint8Array {
  if (colors.length !== MAP_PIXELS) {
    throw new Error(`colors 必须是 ${MAP_PIXELS} 字节，实际 ${colors.length}`)
  }

  const w = new NbtWriter()

  w.u8(TAG.Compound).str('')
  w.u8(TAG.Compound).str('data')

  w.u8(TAG.Byte).str('scale').u8(0)
  w.u8(TAG.String).str('dimension').str(f.dimension)
  w.u8(TAG.Byte).str('trackingPosition').u8(f.trackingPosition ? 1 : 0)
  w.u8(TAG.Byte).str('unlimitedTracking').u8(0)
  w.u8(TAG.Byte).str('locked').u8(f.locked ? 1 : 0)
  w.u8(TAG.Int).str('xCenter').i32(f.xCenter)
  w.u8(TAG.Int).str('zCenter').i32(f.zCenter)

  // 两个标记列表必须存在，空列表写成「元素类型 + 长度 0」
  w.u8(TAG.List).str('banners').u8(TAG.Compound).i32(0)
  w.u8(TAG.List).str('frames').u8(TAG.Compound).i32(0)

  w.u8(TAG.ByteArray).str('colors').i32(MAP_PIXELS).raw(colors)
  w.u8(TAG.End) // data 结束

  w.u8(TAG.Int).str('DataVersion').i32(f.dataVersion)
  w.u8(TAG.End) // 根结束

  return w.bytes()
}
