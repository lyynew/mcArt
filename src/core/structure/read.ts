/**
 * 多格式结构读取：把 .nbt / .litematic / .schem 归一成 ParsedStructure。
 *
 * 三种格式是「同一堆方块的三种容器」（见 voxels.ts 的注释），查看器不该
 * 为每种格式各写一套投影与统计。这里按 NBT 的形状识别格式、解出稀疏方块表，
 * 形状识别比扩展名可靠——用户会改名，工具自己导出的文件名也不统一。
 *
 * 读取是写入（litematic.ts / schem.ts / nbt.ts）的逆运算，两边配对做往返测试，
 * 保证「本工具导出的文件本工具一定读得回」。
 */
import {
  parseNbt,
  structureFromRoot,
  type NbtValue,
  type ParsedStructure,
  type ParsedStructureBlock,
} from '../nbt-read'
import { unpackBlockStates } from './litematic'
import { readVarint } from './schem'

export type StructureFormat = 'nbt' | 'litematic' | 'schem'

export interface ParsedStructureFile extends ParsedStructure {
  format: StructureFormat
}

/** 格式名，界面显示用 */
export const FORMAT_LABEL: Record<StructureFormat, string> = {
  nbt: 'Java 结构 .nbt',
  litematic: 'Litematica .litematic',
  schem: 'Sponge .schem',
}

export function parseStructureBytes(bytes: Uint8Array): ParsedStructureFile {
  const root = parseNbt(bytes)

  // Java 结构：size/palette/blocks 三件套
  if (Array.isArray(root['size']) && Array.isArray(root['palette']) && Array.isArray(root['blocks'])) {
    return { format: 'nbt', ...structureFromRoot(root) }
  }
  if (root['Regions']) return { format: 'litematic', ...fromLitematic(root) }
  if (root['BlockData'] && root['Palette'] && !Array.isArray(root['Palette'])) {
    return { format: 'schem', ...fromSchem(root) }
  }
  if (root['Version'] === 1 && root['Blocks']) {
    throw new Error('这是 .schem v1（MCEdit 时代的老格式），请用 WorldEdit 另存为 v2 再拖进来')
  }

  throw new Error('没认出这个文件：支持 .nbt / .litematic / .schem 结构文件')
}

/* ---------------- .litematic ---------------- */

/** Litematica 的 Size 分量可为负（往负方向延伸），统一成「最小角 + 绝对尺寸」 */
interface RegionBox {
  lo: [number, number, number]
  size: [number, number, number]
  palette: string[]
  entries: Uint16Array
}

function fromLitematic(root: Record<string, NbtValue>): ParsedStructure {
  const regionsRaw = root['Regions']
  if (!regionsRaw || typeof regionsRaw !== 'object' || Array.isArray(regionsRaw)) {
    throw new Error('.litematic 缺少 Regions')
  }

  const boxes: RegionBox[] = []
  for (const region of Object.values(regionsRaw as Record<string, NbtValue>)) {
    const r = region as Record<string, NbtValue>
    const pos = r['Position'] as Record<string, NbtValue> | undefined
    const size = r['Size'] as Record<string, NbtValue> | undefined
    if (!pos || !size) throw new Error('.litematic 的 Region 缺少 Position / Size')

    const abs: [number, number, number] = [
      Math.abs(size['x'] as number),
      Math.abs(size['y'] as number),
      Math.abs(size['z'] as number),
    ]
    const lo: [number, number, number] = [
      Math.min(pos['x'] as number, (pos['x'] as number) + (size['x'] as number)),
      Math.min(pos['y'] as number, (pos['y'] as number) + (size['y'] as number)),
      Math.min(pos['z'] as number, (pos['z'] as number) + (size['z'] as number)),
    ]

    const paletteRaw = r['BlockStatePalette'] as Record<string, NbtValue>[] | undefined
    if (!paletteRaw) throw new Error('.litematic 的 Region 缺少 BlockStatePalette')
    const palette = paletteRaw.map((entry) => entry['Name'] as string)

    const volume = abs[0] * abs[1] * abs[2]
    const words = (r['BlockStates'] as BigInt64Array | undefined) ?? new BigInt64Array(0)
    const bits = Math.max(2, Math.ceil(Math.log2(Math.max(palette.length, 2))))
    const entries = words.length > 0
      ? unpackBlockStates(words, bits, volume)
      : new Uint16Array(volume)

    boxes.push({ lo, size: abs, palette, entries })
  }

  if (boxes.length === 0) throw new Error('.litematic 的 Regions 是空的')

  // 多个 Region 平铺进同一张网格（本工具导出的都是单 Region）
  const lo: [number, number, number] = [
    Math.min(...boxes.map((b) => b.lo[0])),
    Math.min(...boxes.map((b) => b.lo[1])),
    Math.min(...boxes.map((b) => b.lo[2])),
  ]
  const hi: [number, number, number] = [
    Math.max(...boxes.map((b) => b.lo[0] + b.size[0])),
    Math.max(...boxes.map((b) => b.lo[1] + b.size[1])),
    Math.max(...boxes.map((b) => b.lo[2] + b.size[2])),
  ]
  const size: [number, number, number] = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]

  // palette 全局去重：每个 Region 有自己的下标空间
  const palette: string[] = []
  const paletteOf = new Map<string, number>()
  const stateOf = (name: string): number => {
    const hit = paletteOf.get(name)
    if (hit !== undefined) return hit
    const i = palette.length
    palette.push(name)
    paletteOf.set(name, i)
    return i
  }

  const blocks: ParsedStructureBlock[] = []
  for (const box of boxes) {
    const [sx, sy, sz] = box.size
    let p = 0
    for (let y = 0; y < sy; y++) {
      for (let z = 0; z < sz; z++) {
        for (let x = 0; x < sx; x++, p++) {
          const name = box.palette[box.entries[p]!]
          if (!name || name === 'minecraft:air') continue
          blocks.push({
            pos: [box.lo[0] + x - lo[0], box.lo[1] + y - lo[1], box.lo[2] + z - lo[2]],
            state: stateOf(name),
          })
        }
      }
    }
  }

  const dataVersion = root['MinecraftDataVersion']
  return {
    size,
    palette,
    blocks,
    dataVersion: typeof dataVersion === 'number' ? dataVersion : 0,
  }
}

/* ---------------- .schem（Sponge v2） ---------------- */

function fromSchem(root: Record<string, NbtValue>): ParsedStructure {
  if (root['Version'] !== 2) throw new Error(`不支持 .schem v${String(root['Version'])}，只认 v2`)

  // short 是无符号，负数说明写入时超过 32767（结构文件不该这么大）
  const w = (root['Width'] as number) & 0xffff
  const h = (root['Height'] as number) & 0xffff
  const d = (root['Length'] as number) & 0xffff

  const paletteRaw = root['Palette'] as Record<string, NbtValue>
  // key 是方块状态串（可能带 [状态]），value 是下标
  const byIndex: string[] = []
  for (const [state, index] of Object.entries(paletteRaw)) {
    byIndex[index as number] = state
  }

  const data = root['BlockData'] as Uint8Array
  const blocks: ParsedStructureBlock[] = []
  let pos = 0
  for (let y = 0; y < h; y++) {
    for (let z = 0; z < d; z++) {
      for (let x = 0; x < w; x++) {
        const r = readVarint(data, pos)
        pos = r.next
        const name = byIndex[r.value]
        if (!name || name === 'minecraft:air') continue
        blocks.push({ pos: [x, y, z], state: r.value })
      }
    }
  }

  // palette 直接按原下标摆好，空洞补 air，方便 blocks.state 直接索引
  const palette = byIndex.map((s) => s ?? 'minecraft:air')

  const dataVersion = root['DataVersion']
  return {
    size: [w, h, d],
    palette,
    blocks,
    dataVersion: typeof dataVersion === 'number' ? dataVersion : 0,
  }
}
