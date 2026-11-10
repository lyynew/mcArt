import type { BlockDef } from '@/core/blocks'

/**
 * 网格与物品栏只承诺 BlockDef 提供的东西（名字、ID、贴图、平均色）。
 *
 * 方块类型做成泛型：色板传 PaletteBlock，选中回调就能直接拿到它带的
 * `i` / `all` 下标；图鉴传 BlockDef，因为 800 多种识别方块没有色板下标。
 */

/** 网格的一项：方块 + 可选角标 + 选中态 */
export interface BlockGridItem<T extends BlockDef = BlockDef> {
  block: T
  /** 当前画面用了多少块 */
  count?: number
  selected: boolean
  /** 不在当前色板里（物品栏可能出现），压暗显示 */
  muted?: boolean
}

export interface BlockGridGroup<T extends BlockDef = BlockDef> {
  key: string
  label: string
  items: BlockGridItem<T>[]
}

/** 物品栏一格：方块可能不在当前色板里 */
export interface HotbarItem<T extends BlockDef = BlockDef> {
  block: T
  inPalette: boolean
}
