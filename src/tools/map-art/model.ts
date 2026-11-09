/**
 * 地图画工具的规格与选项。
 *
 * 一份文件里放齐所有「用户能改的量」和游戏侧的常量表，
 * 组件不写死 128、不写死版本号，算法层也不认识 UI。
 * 数据来源：Minecraft Wiki「Map item format / Data version / Java Edition level format」
 * 与 plonck/palette（MIT）从 1.21.11 客户端导出的 blocks.csv。
 */

/** 一张地图固定 128×128，colors 数组必须正好这么长 */
export const MAP_SIZE = 128
export const MAP_PIXELS = MAP_SIZE * MAP_SIZE

/** 色号 0 表示未探索（透明），不能拿它当颜色用 */
export const COLOR_TRANSPARENT = 0

/** 结构方块单次加载上限，施工文件按这个尺寸切块 */
export const STRUCT_CHUNK = 48

export type SamplingMode = 'smooth' | 'pixel'
export type DitherMode = 'none' | 'floyd' | 'atkinson' | 'bayer' | 'bayer8'
export type BackgroundMode = 'transparent' | 'white' | 'black'

/**
 * 三种产出路线。
 *  data      —— 直接把 244 色写进 map_#.dat，四档明暗都能用，不用摆方块
 *  flat      —— 平铺摆方块；同高只出 220 档，59 种基础色
 *  staircase —— 立体阶梯；高度差出前三档，59 × 3 = 177 色，需要施工图
 */
export type BuildMode = 'data' | 'flat' | 'staircase'

export interface ImageOptions {
  /** 平滑适合照片，像素适合像素画与像素字 */
  sampling: SamplingMode
  /** -60 ~ 60，以 128 为中心拉伸 */
  contrast: number
  /** -60 ~ 60 */
  saturation: number
  /** 半透明/透明像素怎么处理；摆方块时透明会被强制填实 */
  background: BackgroundMode
}

export interface ColorOptions {
  dither: DitherMode
  /** 误差扩散强度，0 ~ 100 */
  strength: number
  /** 抖动后把孤立且感知色差很小的格子并回邻色 */
  despeckle: boolean
}

export interface BuildOptions {
  mode: BuildMode
  /**
   * 高度压缩：逐列把最低点对齐到 0（noobline 逐列可不同高），支撑方块最少。
   * 关掉则全图共用一个基准，回到社区里常见的经典阶梯。
   */
  compress: boolean
  /** 支撑方块与 noobline 用的廉价实心方块 ID */
  supportBlock: string
  /** 北边界外多铺一行，固定第一行的明暗档 */
  noobline: boolean
}

export const DIMENSIONS = [
  { id: 'minecraft:overworld', label: '主世界' },
  { id: 'minecraft:the_nether', label: '下界' },
  { id: 'minecraft:the_end', label: '末地' },
] as const

export type DimensionId = (typeof DIMENSIONS)[number]['id']

export interface GameVersion {
  id: string
  dataVersion: number
  /** 26.1 起存档目录改成带命名空间，地图文件名也去掉 map_ 前缀 */
  layout: 'legacy' | 'namespaced'
  /** 1.20.5 起 give 用物品组件语法，之前是 NBT */
  itemFormat: 'nbt' | 'component'
}

export const GAME_VERSIONS = [
  { id: '1.20.4', dataVersion: 3700, layout: 'legacy', itemFormat: 'nbt' },
  { id: '1.21', dataVersion: 3953, layout: 'legacy', itemFormat: 'component' },
  { id: '1.21.4', dataVersion: 4189, layout: 'legacy', itemFormat: 'component' },
  { id: '1.21.11', dataVersion: 4671, layout: 'legacy', itemFormat: 'component' },
  { id: '26.1', dataVersion: 4786, layout: 'namespaced', itemFormat: 'component' },
  { id: '26.3', dataVersion: 5023, layout: 'namespaced', itemFormat: 'component' },
] as const satisfies readonly GameVersion[]

export type GameVersionId = (typeof GAME_VERSIONS)[number]['id']

export function versionOf(id: string): (typeof GAME_VERSIONS)[number] {
  return GAME_VERSIONS.find((v) => v.id === id) ?? GAME_VERSIONS[3]!
}

export interface MapOptions {
  /** map_<id>.dat 的编号，也是 give 指令里的 map_id */
  id: number
  version: GameVersionId
  dimension: DimensionId
  /** 地图中心坐标；只影响玩家指针与探索，不影响画面 */
  xCenter: number
  zCenter: number
  /** 锁定后游戏不会按地形重绘覆盖掉画 */
  locked: boolean
  /** 是否显示玩家位置指针 */
  tracking: boolean
}

export const DEFAULT_IMAGE_OPTIONS: ImageOptions = {
  sampling: 'smooth',
  contrast: 0,
  saturation: 0,
  background: 'transparent',
}

export const DEFAULT_COLOR_OPTIONS: ColorOptions = {
  dither: 'floyd',
  strength: 70,
  despeckle: false,
}

export const DEFAULT_BUILD_OPTIONS: BuildOptions = {
  mode: 'data',
  compress: true,
  supportBlock: 'dirt',
  noobline: true,
}

export const DEFAULT_MAP_OPTIONS: MapOptions = {
  id: 0,
  version: '1.21.11',
  dimension: 'minecraft:overworld',
  xCenter: 0,
  zCenter: 0,
  locked: true,
  tracking: true,
}

/** 地图编号是非负整数，写进 NBT 的是 i32 */
export function clampMapId(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(2147483647, Math.max(0, Math.trunc(value)))
}

export function clampCenter(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(2147483647, Math.max(-2147483648, Math.trunc(value)))
}

/**
 * 明暗档 → 当前格相对北侧格的高度差符号。
 * 中文 Minecraft Wiki 的例子：同高乘 220，高于北侧乘 255，低于北侧乘 180；
 * 第 4 档（135）只在深水处出现，摆方块拿不到。
 */
export function shadeToStep(shade: number): -1 | 0 | 1 {
  if (shade === 0) return -1
  if (shade === 2) return 1
  return 0
}
