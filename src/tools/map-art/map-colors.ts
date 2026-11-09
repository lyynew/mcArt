/**
 * Minecraft 地图色表。
 *
 * 地图上的一个像素不是 RGB，而是一个字节：
 *   色号 = 基础色 ID × 4 + 明暗档位
 * 基础色 0 是「未探索」，四档全是透明，不能用来作画；
 * 剩下 61 种基础色 × 4 档 = 244 个可用颜色（色号 4 ~ 247）。
 *
 * 基础色 RGB 与四档系数来自 Minecraft Wiki「Map item format」，
 * 属于游戏公开数据；这里只做展开与 Lab 预计算，不含任何第三方实现。
 * 系数顺序不是从亮到暗：档 3（135）才是最暗的。
 */
import { rgbToLab, type ColorPoint, type Lab, type RGB } from '@/core/color'
import { COLOR_TRANSPARENT } from './model'

/** 四档明暗的乘数，游戏里按 floor(base × m / 255) 取整 */
export const SHADE_MULTIPLIERS = [180, 220, 255, 135] as const
export const SHADE_LABELS = ['暗', '次暗', '原色', '深'] as const

export interface BaseColor {
  id: number
  /** 中文简称，仅用于界面悬浮信息 */
  zh: string
  /** 游戏内部常量名 */
  key: string
  rgb: RGB
}

/** [id, 中文, 常量名, R, G, B] —— 按色号顺序，不要重排 */
const BASE_ROWS: readonly (readonly [number, string, string, number, number, number])[] = [
  [1, '草', 'GRASS', 127, 178, 56],
  [2, '沙', 'SAND', 247, 233, 163],
  [3, '羊毛', 'WOOL', 199, 199, 199],
  [4, '火', 'FIRE', 255, 0, 0],
  [5, '冰', 'ICE', 160, 160, 255],
  [6, '金属', 'METAL', 167, 167, 167],
  [7, '植物', 'PLANT', 0, 124, 0],
  [8, '雪', 'SNOW', 255, 255, 255],
  [9, '黏土', 'CLAY', 164, 168, 184],
  [10, '泥土', 'DIRT', 151, 109, 77],
  [11, '石头', 'STONE', 112, 112, 112],
  [12, '水', 'WATER', 64, 64, 255],
  [13, '木头', 'WOOD', 143, 119, 72],
  [14, '石英', 'QUARTZ', 255, 252, 245],
  [15, '橙', 'COLOR_ORANGE', 216, 127, 51],
  [16, '品红', 'COLOR_MAGENTA', 178, 76, 216],
  [17, '淡蓝', 'COLOR_LIGHT_BLUE', 102, 153, 216],
  [18, '黄', 'COLOR_YELLOW', 229, 229, 51],
  [19, '黄绿', 'COLOR_LIGHT_GREEN', 127, 204, 25],
  [20, '粉', 'COLOR_PINK', 242, 127, 165],
  [21, '灰', 'COLOR_GRAY', 76, 76, 76],
  [22, '淡灰', 'COLOR_LIGHT_GRAY', 153, 153, 153],
  [23, '青', 'COLOR_CYAN', 76, 127, 153],
  [24, '紫', 'COLOR_PURPLE', 127, 63, 178],
  [25, '蓝', 'COLOR_BLUE', 51, 76, 178],
  [26, '棕', 'COLOR_BROWN', 102, 76, 51],
  [27, '绿', 'COLOR_GREEN', 102, 127, 51],
  [28, '红', 'COLOR_RED', 153, 51, 51],
  [29, '黑', 'COLOR_BLACK', 25, 25, 25],
  [30, '金', 'GOLD', 250, 238, 77],
  [31, '钻石', 'DIAMOND', 92, 219, 213],
  [32, '青金石', 'LAPIS', 74, 128, 255],
  [33, '绿宝石', 'EMERALD', 0, 217, 58],
  [34, '灰化土', 'PODZOL', 129, 86, 49],
  [35, '下界岩', 'NETHER', 112, 2, 0],
  [36, '白陶瓦', 'TERRACOTTA_WHITE', 209, 177, 161],
  [37, '橙陶瓦', 'TERRACOTTA_ORANGE', 159, 82, 36],
  [38, '品红陶瓦', 'TERRACOTTA_MAGENTA', 149, 87, 108],
  [39, '淡蓝陶瓦', 'TERRACOTTA_LIGHT_BLUE', 112, 108, 138],
  [40, '黄陶瓦', 'TERRACOTTA_YELLOW', 186, 133, 36],
  [41, '黄绿陶瓦', 'TERRACOTTA_LIGHT_GREEN', 103, 117, 53],
  [42, '粉陶瓦', 'TERRACOTTA_PINK', 160, 77, 78],
  [43, '灰陶瓦', 'TERRACOTTA_GRAY', 57, 41, 35],
  [44, '淡灰陶瓦', 'TERRACOTTA_LIGHT_GRAY', 135, 107, 98],
  [45, '青陶瓦', 'TERRACOTTA_CYAN', 87, 92, 92],
  [46, '紫陶瓦', 'TERRACOTTA_PURPLE', 122, 73, 88],
  [47, '蓝陶瓦', 'TERRACOTTA_BLUE', 76, 62, 92],
  [48, '棕陶瓦', 'TERRACOTTA_BROWN', 76, 50, 35],
  [49, '绿陶瓦', 'TERRACOTTA_GREEN', 76, 82, 42],
  [50, '红陶瓦', 'TERRACOTTA_RED', 142, 60, 46],
  [51, '黑陶瓦', 'TERRACOTTA_BLACK', 37, 22, 16],
  [52, '绯红菌岩', 'CRIMSON_NYLIUM', 189, 48, 49],
  [53, '绯红菌柄', 'CRIMSON_STEM', 148, 63, 97],
  [54, '绯红菌核', 'CRIMSON_HYPHAE', 92, 25, 29],
  [55, '诡异菌岩', 'WARPED_NYLIUM', 22, 126, 134],
  [56, '诡异菌柄', 'WARPED_STEM', 58, 142, 140],
  [57, '诡异菌核', 'WARPED_HYPHAE', 86, 44, 62],
  [58, '诡异疣块', 'WARPED_WART_BLOCK', 20, 180, 133],
  [59, '深板岩', 'DEEPSLATE', 100, 100, 100],
  [60, '粗铁', 'RAW_IRON', 216, 175, 147],
  [61, '发光地衣', 'GLOW_LICHEN', 127, 167, 150],
]

export const BASE_COLORS: readonly BaseColor[] = BASE_ROWS.map(
  ([id, zh, key, r, g, b]) => ({ id, zh, key, rgb: [r, g, b] as RGB }),
)

export interface MapColor extends ColorPoint {
  /** 写进 colors 数组的字节 */
  id: number
  baseId: number
  shade: number
  zh: string
  key: string
  rgb: RGB
  lab: Lab
}

function expand(base: BaseColor): MapColor[] {
  return SHADE_MULTIPLIERS.map((m, shade) => {
    const rgb = [
      Math.floor((base.rgb[0] * m) / 255),
      Math.floor((base.rgb[1] * m) / 255),
      Math.floor((base.rgb[2] * m) / 255),
    ] as RGB
    return {
      id: base.id * 4 + shade,
      baseId: base.id,
      shade,
      zh: base.zh,
      key: base.key,
      rgb,
      lab: rgbToLab(rgb[0], rgb[1], rgb[2]),
    }
  })
}

/** 全部 244 色，按色号升序 */
export const MAP_COLORS: readonly MapColor[] = BASE_COLORS.flatMap(expand)

/** 只用原色档：平铺摆方块时能真实还原的 61 色 */
export const FLAT_COLORS: readonly MapColor[] = MAP_COLORS.filter((c) => c.shade === 2)

export const COLOR_BY_ID: ReadonlyMap<number, MapColor> = new Map(
  MAP_COLORS.map((c) => [c.id, c]),
)

export function paletteOf(mode: 'all' | 'flat'): readonly MapColor[] {
  return mode === 'flat' ? FLAT_COLORS : MAP_COLORS
}

export function describeColor(id: number): string {
  if (id === COLOR_TRANSPARENT) return '透明（未探索）'
  const c = COLOR_BY_ID.get(id)
  return c ? `${c.zh} · ${SHADE_LABELS[c.shade]} · #${c.id}` : `未知色号 ${id}`
}
