/**
 * 立体地图画 → Java 版结构文件（.nbt）分块。
 *
 * 结构方块一次最多 48×48×48，而一幅图是 128×128×(maxHeight+1)，
 * 所以按 48 切块，每块都是完整的长方体、局部坐标从 0 开始，
 * 摆放的相对位置写进包内的说明文件。
 *
 * 每根柱子从基准面往上填支撑方块，最顶上那一格才是决定地图色的方块；
 * 北侧边界外多一行 noobline，让第一行的明暗档有确定的参照。
 * 支撑方块可以任意（地图只看最顶上那格），默认用最便宜的泥土。
 */
import { gzipBytes } from '@/core/archive'
import { TAG, NbtWriter } from '@/core/nbt-writer'
import { STRUCT_CHUNK } from './model'
import { createVoxelLayout } from './voxels'

export interface BuildInput {
  colors: Uint8Array
  heights: Int16Array
  noobline: Int16Array
  maxHeight: number
  supportBlock: string
  withNoobline: boolean
  dataVersion: number
}

export interface StructureChunk {
  name: string
  /** gzip 压缩后的 NBT */
  data: Uint8Array
  /** 相对整幅图的摆放位置 */
  ox: number
  oy: number
  oz: number
  w: number
  h: number
  d: number
}

/** 一块结构的 NBT（未压缩），字段与 core/nbt.ts 的结构文件一致，只是尺寸是三维的 */
function buildVoxelNbt(
  w: number,
  h: number,
  d: number,
  blocks: readonly (readonly [number, number, number, number])[],
  palette: readonly string[],
  dataVersion: number,
): Uint8Array {
  const wr = new NbtWriter()
  wr.u8(TAG.Compound).str('')

  wr.u8(TAG.List).str('size').u8(TAG.Int).i32(3).i32(w).i32(h).i32(d)

  wr.u8(TAG.List).str('palette').u8(TAG.Compound).i32(palette.length)
  for (const id of palette) {
    wr.u8(TAG.String).str('Name').str(`minecraft:${id}`).u8(TAG.End)
  }

  wr.u8(TAG.List).str('blocks').u8(TAG.Compound).i32(blocks.length)
  for (const [x, y, z, state] of blocks) {
    wr.u8(TAG.List).str('pos').u8(TAG.Int).i32(3).i32(x).i32(y).i32(z)
    wr.u8(TAG.Int).str('state').i32(state)
    wr.u8(TAG.End)
  }

  wr.u8(TAG.List).str('entities').u8(TAG.Compound).i32(0)
  wr.u8(TAG.Int).str('DataVersion').i32(dataVersion)
  wr.u8(TAG.End)
  return wr.bytes()
}

export async function buildStructureChunks(input: BuildInput): Promise<StructureChunk[]> {
  const { dataVersion } = input
  const layout = createVoxelLayout(input)
  const { sizeX, sizeY, sizeZ } = layout
  const out: StructureChunk[] = []

  for (let cy = 0; cy < Math.ceil(sizeY / STRUCT_CHUNK); cy++) {
    for (let cz = 0; cz < Math.ceil(sizeZ / STRUCT_CHUNK); cz++) {
      for (let cx = 0; cx < Math.ceil(sizeX / STRUCT_CHUNK); cx++) {
        const ox = cx * STRUCT_CHUNK
        const oy = cy * STRUCT_CHUNK
        const oz = cz * STRUCT_CHUNK
        const w = Math.min(STRUCT_CHUNK, sizeX - ox)
        const h = Math.min(STRUCT_CHUNK, sizeY - oy)
        const d = Math.min(STRUCT_CHUNK, sizeZ - oz)

        const palette: string[] = []
        const stateOf = new Map<string, number>()
        const blocks: [number, number, number, number][] = []
        const emit = (lx: number, ly: number, lz: number, id: string) => {
          let state = stateOf.get(id)
          if (state === undefined) {
            state = palette.length
            palette.push(id)
            stateOf.set(id, state)
          }
          blocks.push([lx, ly, lz, state])
        }

        for (let ly = 0; ly < h; ly++) {
          for (let lz = 0; lz < d; lz++) {
            for (let lx = 0; lx < w; lx++) {
              const id = layout.blockAt(ox + lx, oy + ly, oz + lz)
              if (id === null) continue
              emit(lx, ly, lz, id)
            }
          }
        }

        if (blocks.length === 0) continue
        const name = `mapart_x${ox}_y${oy}_z${oz}.nbt`
        out.push({
          name,
          data: await gzipBytes(buildVoxelNbt(w, h, d, blocks, palette, dataVersion)),
          ox,
          oy,
          oz,
          w,
          h,
          d,
        })
      }
    }
  }

  return out
}

/** 写给人看的摆放说明：每块叫什么、放在哪个相对位置、多大 */
export function buildPlacementNote(
  chunks: readonly StructureChunk[],
  input: BuildInput,
  height: { maxHeight: number; totalBlocks: number; supportBlocks: number },
): Uint8Array {
  const lines: string[] = [
    'mcArt · 立体地图画 · Java 版结构分块',
    '========================================',
    `画幅 128 × 128，高度 ${height.maxHeight + 1} 层，共 ${chunks.length} 个 .nbt`,
    `总方块 ${height.totalBlocks.toLocaleString('zh-CN')} 个（其中支撑方块 ${height.supportBlocks.toLocaleString('zh-CN')} 个）`,
    `支撑方块：minecraft:${input.supportBlock}；北侧边界${input.withNoobline ? '已生成 noobline 行' : '未生成 noobline，第一行明暗档取决于原地地形'}`,
    '',
    '载入步骤：',
    '1. 把全部 .nbt 放进 存档/generated/minecraft/structures/（26.1 起是 structure，单数）',
    '2. 游戏里 /give @s structure_block，模式切到「加载」',
    '3. 每个文件填「结构名称」= 文件名去掉 .nbt，再按下表填相对位置，点加载',
    '',
    '文件                              相对位置(西东/上下/南北)  尺寸',
  ]
  for (const c of chunks) {
    lines.push(
      `${c.name.padEnd(34)}  ${`${c.ox} ${c.oy} ${c.oz}`.padEnd(22)}  ${c.w}x${c.h}x${c.d}`,
    )
  }
  lines.push(
    '',
    '图案顶行（北侧）在最靠北的块；noobline 在图案外侧再往北一行。',
    '支撑方块可以换成任意廉价实心方块，地图只看每根柱子最顶上那一格。',
    '地图数据（map_#.dat）与 give 指令在页面另存；施工完成后游戏会自行绘制地图。',
  )
  return new TextEncoder().encode(lines.join('\r\n'))
}
