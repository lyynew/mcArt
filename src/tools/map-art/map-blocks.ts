/**
 * 地图基础色 → 一个能真正摆出来的方块。
 *
 * 数据来源：plonck/palette（MIT）从 Minecraft Java 1.21.11 客户端导出的
 * `blocks.csv`，逐条核对过「该方块的默认状态确实属于这个基础色」。
 * 选块原则：实心整方块、无重力、不会自行融化或枯萎、生存模式拿得到；
 * 同一个颜色能用便宜方块替代时，不选钻石 / 绿宝石 / 金块一类贵重方块
 * （例如 31 号 DIAMOND 色用海晶石砖，效果完全一样）。
 *
 * 只有两种基础色摆不出来：7 号 PLANT 只有树叶与花草（实心度不够、
 * 树叶还会枯萎），12 号 WATER 只有水与水下植物。它们为 null，
 * 摆方块的色板里直接排除，避免生成一张游戏里根本做不出的图。
 */
export const BLOCK_OF_BASE: Readonly<Record<number, string | null>> = {
  1: 'grass_block',
  2: 'sandstone',
  3: 'mushroom_stem',
  4: 'redstone_block',
  5: 'packed_ice',
  6: 'iron_block',
  7: null,
  8: 'white_concrete',
  9: 'clay',
  10: 'dirt',
  11: 'stone',
  12: null,
  13: 'oak_planks',
  14: 'quartz_block',
  15: 'orange_concrete',
  16: 'magenta_concrete',
  17: 'light_blue_concrete',
  18: 'yellow_concrete',
  19: 'lime_concrete',
  20: 'pink_concrete',
  21: 'gray_concrete',
  22: 'light_gray_concrete',
  23: 'cyan_concrete',
  24: 'purple_concrete',
  25: 'blue_concrete',
  26: 'brown_concrete',
  27: 'green_concrete',
  28: 'red_concrete',
  29: 'black_concrete',
  30: 'gold_block',
  31: 'prismarine_bricks',
  32: 'lapis_block',
  33: 'emerald_block',
  34: 'spruce_planks',
  35: 'netherrack',
  36: 'white_terracotta',
  37: 'orange_terracotta',
  38: 'magenta_terracotta',
  39: 'light_blue_terracotta',
  40: 'yellow_terracotta',
  41: 'lime_terracotta',
  42: 'pink_terracotta',
  43: 'gray_terracotta',
  44: 'light_gray_terracotta',
  45: 'cyan_terracotta',
  46: 'purple_terracotta',
  47: 'blue_terracotta',
  48: 'brown_terracotta',
  49: 'green_terracotta',
  50: 'red_terracotta',
  51: 'black_terracotta',
  52: 'crimson_nylium',
  53: 'crimson_planks',
  54: 'crimson_hyphae',
  55: 'oxidized_copper',
  56: 'warped_planks',
  57: 'warped_hyphae',
  58: 'warped_wart_block',
  59: 'deepslate',
  60: 'raw_iron_block',
  61: 'verdant_froglight',
}

/** 摆方块时可用的基础色，按色号升序 */
export const BUILDABLE_BASES: readonly number[] = Object.entries(BLOCK_OF_BASE)
  .filter(([, block]) => block !== null)
  .map(([id]) => Number(id))
  .sort((a, b) => a - b)

/** 色号 → 该格顶层该摆的方块 ID；透明与不可建色返回 null */
export function blockOfColor(colorId: number): string | null {
  if (colorId <= 0) return null
  return BLOCK_OF_BASE[colorId >>> 2] ?? null
}
