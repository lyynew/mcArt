import type { BlockDef } from '@/core/blocks'

/**
 * 网格与物品栏只承诺一份最小信息：名字、ID、贴图，可选平均色。
 *
 * 方块类型做成泛型：色板传 PaletteBlock，选中回调就能直接拿到它带的
 * `i` / `all` 下标；图鉴传 BlockDef，因为 800 多种识别方块没有色板下标。
 *
 * 平均色放成可选是为了让物品也能进同一套格子：方块贴图不透明，缺图时
 * 得用平均色兜底；物品贴图是带透明通道的平面 sprite，槽底直接露出 MC
 * 按钮灰，正好是原版物品栏的观感，不需要底色。
 */
export interface SpriteDef {
  /** 中文名 */
  zh: string
  /** 英文名，搜索用 */
  en: string
  /** 不含命名空间的 ID */
  id: string
  /** 贴图键，方块是 `dirt`，物品是 `items/diamond` */
  tex: string
  /** 平均色 #RRGGBB；物品没有 */
  hex?: string
}

/** 网格的一项：条目 + 可选角标 + 选中态 */
export interface BlockGridItem<T extends SpriteDef = BlockDef> {
  block: T
  /** 当前画面用了多少块 */
  count?: number
  selected: boolean
  /** 不在当前色板里（物品栏可能出现），压暗显示 */
  muted?: boolean
}

export interface BlockGridGroup<T extends SpriteDef = BlockDef> {
  key: string
  label: string
  items: BlockGridItem<T>[]
}

/** 物品栏一格：方块可能不在当前色板里 */
export interface HotbarItem<T extends SpriteDef = BlockDef> {
  block: T
  inPalette: boolean
}
