/**
 * 多格式结构读取：把 .nbt / .litematic / .schem 归一成 ParsedStructure。
 *
 * 三种格式是「同一堆方块的三种容器」（见 voxels.ts 的注释），查看器不该
 * 为每种格式各写一套投影与统计。这里按 NBT 的形状识别格式、解出稀疏方块表，
 * 形状识别比扩展名可靠——用户会改名，工具自己导出的文件名也不统一。
 *
 * .schem 有两个真实的变体坑（都遇到过）：
 *   1. 规范要求 schema 嵌在根复合体的 Schematic 子标签里（WorldEdit 导出如此），
 *      也有工具把字段直接放根上——两层都要探；
 *   2. Sponge v1/v2 把 Palette/BlockData 放根上，v3 收进 Blocks 复合体（Data 仍是
 *      varint 字节流，索引序不变）。识别按字段形状分流，不按 Version 数字硬拦。
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

/** 空气与「留空不覆盖」的方块：查看时都算空格 */
function isAirish(name: string | undefined): boolean {
  return (
    !name ||
    name === 'minecraft:air' ||
    name.endsWith(':cave_air') ||
    name.endsWith(':void_air') ||
    name.endsWith(':structure_void')
  )
}

function isRecord(v: NbtValue | undefined): v is Record<string, NbtValue> {
  return (
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    !(v instanceof Uint8Array) &&
    !(v instanceof Int32Array) &&
    !(v instanceof BigInt64Array)
  )
}

/** 根里套一层 Schematic（WorldEdit / 规范写法）就两层都探，否则只探根本身 */
function schemaCandidates(raw: Record<string, NbtValue>): Record<string, NbtValue>[] {
  return isRecord(raw['Schematic']) ? [raw, raw['Schematic']] : [raw]
}

function parseKnownFormat(root: Record<string, NbtValue>): ParsedStructureFile | null {
  // Java 结构：size/palette/blocks 三件套
  if (Array.isArray(root['size']) && Array.isArray(root['palette']) && Array.isArray(root['blocks'])) {
    return { format: 'nbt', ...structureFromRoot(root) }
  }
  if (root['Regions']) return { format: 'litematic', ...fromLitematic(root) }
  if (isSchemShaped(root)) return { format: 'schem', ...fromSchem(root) }
  return null
}

export function parseStructureBytes(bytes: Uint8Array): ParsedStructureFile {
  const raw = parseNbt(bytes)

  for (const root of schemaCandidates(raw)) {
    const hit = parseKnownFormat(root)
    if (hit) return hit
  }

  // MCEdit 老 .schematic：数字 ID 的 Blocks/Data 字节数组，不是 Sponge .schem
  for (const root of schemaCandidates(raw)) {
    if (root['Materials'] && root['Blocks'] instanceof Uint8Array) {
      throw new Error('这是 MCEdit 老式 .schematic（数字 ID 老格式），请用 WorldEdit 另存为 .schem 再拖进来')
    }
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
  if (!isRecord(regionsRaw)) throw new Error('.litematic 缺少 Regions')

  const boxes: RegionBox[] = []
  for (const region of Object.values(regionsRaw)) {
    if (!isRecord(region)) continue
    const pos = region['Position']
    const size = region['Size']
    if (!isRecord(pos) || !isRecord(size)) throw new Error('.litematic 的 Region 缺少 Position / Size')

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

    const paletteRaw = region['BlockStatePalette']
    if (!Array.isArray(paletteRaw)) throw new Error('.litematic 的 Region 缺少 BlockStatePalette')
    const palette = paletteRaw.map((entry) => (isRecord(entry) ? (entry['Name'] as string) : ''))

    const volume = abs[0] * abs[1] * abs[2]
    const words = region['BlockStates']
    const len = words instanceof BigInt64Array ? words.length : 0
    const bits = Math.max(2, Math.ceil(Math.log2(Math.max(palette.length, 2))))
    const entries = len > 0 ? unpackBlockStates(words as BigInt64Array, bits, volume) : new Uint16Array(volume)

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
          if (isAirish(name)) continue
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

/* ---------------- .schem（Sponge v1 / v2 / v3） ---------------- */

/** v1/v2：根上 Palette + BlockData；v3：Blocks{Palette, Data}。按形状识别，不看 Version 数字 */
function isSchemShaped(root: Record<string, NbtValue>): boolean {
  if (isRecord(root['Palette']) && root['BlockData']) return true
  const blocks = root['Blocks']
  if (!isRecord(blocks)) return false
  return isRecord(blocks['Palette'] ?? blocks['BlockPalette'])
}

function fromSchem(root: Record<string, NbtValue>): ParsedStructure {
  // v3 收进 Blocks；v1/v2 就在根上。Data/BlockData 两种键名都认（v3 叫 Data）
  const container = isRecord(root['Blocks']) ? root['Blocks'] : root
  const paletteRaw = container['Palette'] ?? container['BlockPalette']
  const dataRaw = container['Data'] ?? container['BlockData']
  if (!isRecord(paletteRaw)) throw new Error('.schem 缺少调色板')

  // short 是无符号，负数说明写入时超过 32767（结构文件不该这么大）
  const w = (root['Width'] as number) & 0xffff
  const h = (root['Height'] as number) & 0xffff
  const d = (root['Length'] as number) & 0xffff

  // key 是方块状态串（可能带 [状态]），value 是下标
  const byIndex: string[] = []
  for (const [state, index] of Object.entries(paletteRaw)) {
    byIndex[index as number] = state
  }
  const palette = byIndex.map((s) => s ?? 'minecraft:air')

  const volume = w * h * d
  const blocks: ParsedStructureBlock[] = []
  const emit = (p: number, idx: number): void => {
    const name = byIndex[idx]
    if (isAirish(name)) return
    const x = p % w
    const z = Math.floor(p / w) % d
    const y = Math.floor(p / (w * d))
    blocks.push({ pos: [x, y, z], state: idx })
  }

  if (dataRaw instanceof Uint8Array) {
    // varint 字节流；尾部缺省视作空气（个别写入器会截掉末尾的空气段）
    let pos = 0
    let p = 0
    while (p < volume && pos < dataRaw.length) {
      const r = readVarint(dataRaw, pos)
      pos = r.next
      emit(p, r.value)
      p++
    }
  } else if (Array.isArray(dataRaw) || dataRaw instanceof Int32Array) {
    const arr = dataRaw as ArrayLike<number>
    for (let p = 0; p < volume && p < arr.length; p++) emit(p, arr[p]!)
  } else {
    throw new Error('.schem 缺少方块数据')
  }

  const dataVersion = root['DataVersion']
  return {
    size: [w, h, d],
    palette,
    blocks,
    dataVersion: typeof dataVersion === 'number' ? dataVersion : 0,
  }
}
