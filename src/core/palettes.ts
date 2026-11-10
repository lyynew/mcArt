/**
 * 色板与方案。
 *
 * 10 套方案全部由方块总表推导，不额外维护数据：
 * 「基本」是八个分组去重后的通用套装，其余按分组取，最后加一个自定义。
 */
import { BLOCKS, type BlockDef } from './blocks'
import { hexToRgb, labDist, rgbToLab, type Lab, type RGB } from './color'

/** 参与匹配的方块：原始数据 + 预计算的颜色信息 */
export interface PaletteBlock extends BlockDef {
  readonly rgb: RGB
  readonly lab: Lab
  /** 在全表中的下标，手动编辑记的是这个，不受换方案影响 */
  readonly all: number
  /** 在当前方案中的下标 */
  readonly i: number
}

/** 全表，顺序与 `BLOCKS` 一致；rgb/lab 只算一次 */
export const ALL_BLOCKS: readonly PaletteBlock[] = BLOCKS.map((b, all) => ({
  ...b,
  rgb: hexToRgb(b.hex),
  lab: rgbToLab(...hexToRgb(b.hex)),
  all,
  i: -1,
}))

export function blocksOfFamily(fam: string): PaletteBlock[] {
  return ALL_BLOCKS.filter((b) => b.fam === fam)
}

/**
 * 按分组取方块。
 * `thr > 0` 时丢弃与已收录方块颜色过于接近的（先到先得），
 * 用来把「基本」套装从 142 种压到 102 种，避免色板上出现肉眼难分的重复项。
 */
export function collect(fams: readonly string[], thr = 0): PaletteBlock[] {
  const out: PaletteBlock[] = []
  for (const fam of fams) {
    for (const b of blocksOfFamily(fam)) {
      if (!thr) {
        out.push(b)
        continue
      }
      let min = Infinity
      for (const kept of out) {
        const d = labDist(b.lab, kept.lab)
        if (d < min) min = d
      }
      if (min > thr) out.push(b)
    }
  }
  return out
}

/** 每个方案拿独立副本，把 i 固化成方案内下标 */
function makePal(list: readonly PaletteBlock[]): PaletteBlock[] {
  return list.map((b, i) => ({ ...b, i }))
}

/** 「基本」套装的分组顺序：影响去重时谁先被保留，不要随意调整 */
const BASIC_ORDER = ['混凝土', '羊毛', '石材', '砂土', '木质', '金属宝石', '彩色', '陶瓦']
/** 基本套装的去重阈值（Lab 距离） */
const BASIC_THR = 6

export type PaletteId =
  | 'basic'
  | 'concrete'
  | 'wool'
  | 'terracotta'
  | 'stone'
  | 'wood'
  | 'metal'
  | 'vivid'
  | 'all'
  | 'custom'

export interface Palette {
  readonly id: PaletteId
  readonly label: string
  readonly desc: string
  readonly blocks: readonly PaletteBlock[]
  /** 自定义方案：方块由用户挑，其他方案由数据推导 */
  readonly custom?: true
}

export const PALETTES: Readonly<Record<PaletteId, Palette>> = {
  basic: {
    id: 'basic',
    label: '基本',
    desc: '八个分组去重后的通用套装，几乎不丢颜色',
    blocks: makePal(collect(BASIC_ORDER, BASIC_THR)),
  },
  concrete: {
    id: 'concrete',
    label: '混凝土',
    desc: '纯色块最干净，单一材料最省事',
    blocks: makePal(collect(['混凝土'])),
  },
  wool: {
    id: 'wool',
    label: '羊毛',
    desc: '哑光、色偏柔和，老派地图画首选',
    blocks: makePal(collect(['羊毛'])),
  },
  terracotta: {
    id: 'terracotta',
    label: '陶瓦',
    desc: '整体偏暗偏灰，像素风更厚重',
    blocks: makePal(collect(['陶瓦'])),
  },
  stone: {
    id: 'stone',
    label: '石材',
    desc: '石、土、砂岩，冷灰到暖棕，适合建筑风',
    blocks: makePal(collect(['石材', '砂土'])),
  },
  wood: {
    id: 'wood',
    label: '木质',
    desc: '木板与原木，暖调木头色',
    blocks: makePal(collect(['木质'])),
  },
  metal: {
    id: 'metal',
    label: '金属',
    desc: '铁金铜与宝石块，饱和度高、对比强',
    blocks: makePal(collect(['金属宝石'])),
  },
  vivid: {
    id: 'vivid',
    label: '彩色',
    desc: '荧光、菌光、蛙明灯这类特殊彩色方块',
    blocks: makePal(collect(['彩色'])),
  },
  all: {
    id: 'all',
    label: '全部',
    desc: '所有内置方块，选项最多但材料也最杂',
    blocks: makePal(ALL_BLOCKS),
  },
  custom: {
    id: 'custom',
    label: '自定义',
    desc: '自己挑方块，想用几种用几种',
    blocks: [],
    custom: true,
  },
}

/** 界面上的排列顺序 */
export const PALETTE_ORDER: readonly PaletteId[] = [
  'basic',
  'concrete',
  'wool',
  'terracotta',
  'stone',
  'wood',
  'metal',
  'vivid',
  'all',
  'custom',
]

/** 按方块 ID 集合构造自定义方案，顺序跟随全表 */
export function buildCustomPalette(ids: Iterable<string>): PaletteBlock[] {
  const set = new Set(ids)
  return makePal(ALL_BLOCKS.filter((b) => set.has(b.id)))
}
