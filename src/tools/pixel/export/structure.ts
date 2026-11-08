import type { BlockDef } from '@/core/blocks'
import { buildStructure, STRUCT_MAX } from '@/core/nbt'
import { gzipBytes, zipStored, type ZipEntry } from '@/core/archive'
import { safeName } from '@/core/naming'

/**
 * 结构文件导出。
 *
 * 结构方块一次最多装 48×48，更大的画幅要切成若干块、分别导出，
 * 再把它们和一份「载入说明」打进 zip——说明里写好每块的相对位置，
 * 否则用户面对一堆 .nbt 根本不知道该摆在哪。
 */
export interface StructureExportInput {
  n: number
  idx: Int16Array
  blocks: readonly BlockDef[]
  /** 用户填的文件名，会被收敛成安全字符 */
  name: string
  useAir: boolean
  wall: boolean
}

export interface StructureExportResult {
  fileName: string
  blob: Blob
  /** 实际导出的 .nbt 个数 */
  fileCount: number
  tiled: boolean
}

interface Piece {
  name: string
  w: number
  h: number
  /** 相对位置 [西东, 上下, 南北] */
  at: [number, number, number]
}

export async function buildStructureExport(
  input: StructureExportInput,
): Promise<StructureExportResult> {
  const { n, idx, blocks, useAir, wall } = input
  const base = safeName(input.name)
  const tiles = Math.ceil(n / STRUCT_MAX)

  const files: ZipEntry[] = []
  const pieces: Piece[] = []

  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const ox = tx * STRUCT_MAX
      const oy = ty * STRUCT_MAX
      const w = Math.min(STRUCT_MAX, n - ox)
      const h = Math.min(STRUCT_MAX, n - oy)

      const raw = buildStructure({ n, cells: idx, blocks, ox, oy, w, h, useAir, wall })
      const data = await gzipBytes(raw)

      const name = tiles <= 1 ? `${base}.nbt` : `${base}_x${ox}${wall ? '_y' : '_z'}${oy}.nbt`

      // 立面时纵向要对齐到最高处，让第一块贴住顶部；平铺则直接往南排
      const atY = wall ? n - oy - h : 0
      pieces.push({ name, w, h, at: [ox, atY, wall ? 0 : oy] })
      files.push({ name, data })
    }
  }

  if (files.length === 1) {
    return {
      fileName: files[0]!.name,
      blob: new Blob([files[0]!.data as BlobPart], { type: 'application/octet-stream' }),
      fileCount: 1,
      tiled: false,
    }
  }

  files.push({ name: '载入说明.txt', data: buildTilesNote(base, n, wall, pieces) })

  return {
    fileName: `${base}.zip`,
    blob: new Blob([zipStored(files) as BlobPart], { type: 'application/zip' }),
    fileCount: pieces.length,
    tiled: true,
  }
}

/** 写给人看的摆放说明：每块叫什么、放在哪个相对位置、多大 */
export function buildTilesNote(
  base: string,
  n: number,
  wall: boolean,
  pieces: readonly Piece[],
): Uint8Array {
  const L: string[] = []
  L.push('方块像素画 · Java 版结构')
  L.push(`画幅 ${n}x${n}，形态：${wall ? '立面（站在墙前看）' : '平铺地面（从上往下看）'}`)
  L.push(`共 ${pieces.length} 个文件，每块都是完整的长方体，用结构方块的「相对位置」拼起来`)
  L.push('')
  L.push('载入步骤：')
  L.push('1. .nbt 放进 存档目录/.minecraft/saves/存档名/generated/minecraft/structures/')
  L.push('   没有 structures 文件夹就自己新建')
  L.push('2. 游戏里 /give @s structure_block')
  L.push('3. 放下结构方块，模式切到「加载」，结构名称填文件名（不带 .nbt）')
  L.push('4. 相对位置按下面这张表填，再点「加载」')
  L.push('')
  L.push('文件                                相对位置(西东/上下/南北)  尺寸')
  L.push('----------------------------------  ----------------------  -------')

  for (const p of pieces) {
    const name = (p.name + ' '.repeat(34)).slice(0, 34)
    const at = (`${p.at[0]} ${p.at[1]} ${p.at[2]}` + ' '.repeat(22)).slice(0, 22)
    const size = wall ? `${p.w}x${p.h}x1` : `${p.w}x1x${p.h}`
    L.push(`${name}  ${at}  ${size}`)
  }

  L.push('')
  L.push(wall ? '图案顶行在每块的最高处，越靠北的块要放得越高。' : '图案顶行在北侧，站在南边看是正的。')

  // 说明文件名里带 base，方便用户对照下载包
  L.unshift(`结构名：${base}`)

  return new TextEncoder().encode(L.join('\r\n'))
}
