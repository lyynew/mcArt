import type { PaletteId } from '@/core/palettes'
import type { DitherMode } from '@/core/dither'

/** 编辑工具 */
export type ToolId = 'brush' | 'eraser' | 'picker' | 'fill' | 'replace' | 'pan'

/** 结构文件朝向：平铺地面 / 立到墙上 */
export type Orientation = 'flat' | 'wall'

/** 画幅范围与档位 */
export const SIZE_MIN = 16
export const SIZE_MAX = 256
export const SIZE_PRESETS = [32, 48, 64, 96, 128, 160, 192, 256] as const

/** 缩放范围（px/格） */
export const ZOOM_MIN = 2
export const ZOOM_MAX = 64

/** 物品栏格子数 */
export const HOTBAR_SIZE = 9

/** 撤销栈深度 */
export const HISTORY_LIMIT = 50

export interface EditorSettings {
  /** 边长格数 */
  n: number
  paletteId: PaletteId
  /** 对比度 -60..60 */
  contrast: number
  /** 饱和度 -60..60 */
  sat: number
  ditherMode: DitherMode
  /** 抖动强度 0–100 */
  ditherStrength: number
  despeckle: boolean
  showGrid: boolean
  /** 方块质感（给每格加明暗边，仅预览） */
  blockShading: boolean
  /** 聚焦选中方块 */
  focusSelected: boolean
  /** 画布用真实材质 */
  realTexture: boolean
  tool: ToolId
  /** 笔刷宽度，1–3 格 */
  brush: number
  /** 左右对称绘制 */
  mirror: boolean
  /** 当前选中的色板下标，-1 表示没选 */
  selected: number
  /** 当前物品栏格子 */
  hotSlot: number
  /** 缩放（px/格），0 表示自适应窗口 */
  zoomPx: number
  orient: Orientation
  useAir: boolean
  structName: string
  /** 载入的图片名，用于界面提示 */
  imageName: string
}

export function createSettings(): EditorSettings {
  return {
    n: 48,
    paletteId: 'basic',
    contrast: 0,
    sat: 0,
    ditherMode: 'none',
    ditherStrength: 50,
    despeckle: true,
    showGrid: true,
    blockShading: true,
    focusSelected: false,
    realTexture: true,
    tool: 'brush',
    brush: 1,
    mirror: false,
    selected: -1,
    hotSlot: 0,
    zoomPx: 0,
    orient: 'flat',
    useAir: true,
    structName: 'pixelart',
    imageName: '',
  }
}
