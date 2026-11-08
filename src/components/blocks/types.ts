import type { PaletteBlock } from '@/core/palettes'

/** 色板网格的一项：方块 + 可选角标 + 选中态 */
export interface BlockGridItem {
  block: PaletteBlock
  /** 当前画面用了多少块 */
  count?: number
  selected: boolean
  /** 不在当前色板里（物品栏可能出现），压暗显示 */
  muted?: boolean
}

export interface BlockGridGroup {
  key: string
  label: string
  items: BlockGridItem[]
}

/** 物品栏一格：方块可能不在当前色板里 */
export interface HotbarItem {
  block: PaletteBlock
  inPalette: boolean
}
