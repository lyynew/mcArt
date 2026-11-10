/**
 * 方块总表 —— 像素画色板源。
 *
 * 每条对应一种可用方块：中文名、英文名、平均色、方块 ID、分组、贴图文件名。
 * 平均色取自 `原版材质/` 里对应 PNG 的实测均值（见 .build/png_avg.py），
 * 转换算法用它做 CIEDE2000 匹配；贴图文件名是 `原版材质/<tex>.png` 的主名。
 *
 * 由 scripts/migrate-blocks.mjs 从旧版单文件迁移而来，共 142 种。
 * 这 142 种是像素画色板的唯一来源（palettes.ts 只从这里推导），别随手加条目；
 * 识别用的其余大多数方块在 block-extras.ts（由 scripts/build-block-extras.mjs 生成），
 * 查表走本文件的 BLOCKS_BY_ID / findBlock，两边自动合并。
 */
import { EXTRA_BLOCKS } from './block-extras'

export interface BlockDef {
  /** 中文名，界面与材料清单用 */
  zh: string
  /** 英文名，搜索用 */
  en: string
  /** 平均色，#RRGGBB */
  hex: string
  /** 方块 ID，不含命名空间，例如 white_concrete */
  id: string
  /** 分组：混凝土 / 羊毛 / 陶瓦 / 石材 / 砂土 / 木质 / 金属宝石 / 彩色 */
  fam: string
  /** 贴图主名，对应 `原版材质/<tex>.png` */
  tex: string
}

export const BLOCKS: readonly BlockDef[] = [
  { zh: '白色混凝土', en: 'White Concrete', hex: '#CFD5D6', id: 'white_concrete', fam: '混凝土', tex: 'white_concrete' },
  { zh: '淡灰色混凝土', en: 'Light Gray Concrete', hex: '#7D7D73', id: 'light_gray_concrete', fam: '混凝土', tex: 'light_gray_concrete' },
  { zh: '灰色混凝土', en: 'Gray Concrete', hex: '#373A3E', id: 'gray_concrete', fam: '混凝土', tex: 'gray_concrete' },
  { zh: '黑色混凝土', en: 'Black Concrete', hex: '#080A0F', id: 'black_concrete', fam: '混凝土', tex: 'black_concrete' },
  { zh: '红色混凝土', en: 'Red Concrete', hex: '#8E2121', id: 'red_concrete', fam: '混凝土', tex: 'red_concrete' },
  { zh: '橙色混凝土', en: 'Orange Concrete', hex: '#E06101', id: 'orange_concrete', fam: '混凝土', tex: 'orange_concrete' },
  { zh: '黄色混凝土', en: 'Yellow Concrete', hex: '#F1AF15', id: 'yellow_concrete', fam: '混凝土', tex: 'yellow_concrete' },
  { zh: '黄绿色混凝土', en: 'Lime Concrete', hex: '#5EA918', id: 'lime_concrete', fam: '混凝土', tex: 'lime_concrete' },
  { zh: '绿色混凝土', en: 'Green Concrete', hex: '#495B24', id: 'green_concrete', fam: '混凝土', tex: 'green_concrete' },
  { zh: '青色混凝土', en: 'Cyan Concrete', hex: '#157788', id: 'cyan_concrete', fam: '混凝土', tex: 'cyan_concrete' },
  { zh: '淡蓝色混凝土', en: 'Light Blue Concrete', hex: '#2489C7', id: 'light_blue_concrete', fam: '混凝土', tex: 'light_blue_concrete' },
  { zh: '蓝色混凝土', en: 'Blue Concrete', hex: '#2D2F8F', id: 'blue_concrete', fam: '混凝土', tex: 'blue_concrete' },
  { zh: '紫色混凝土', en: 'Purple Concrete', hex: '#64209C', id: 'purple_concrete', fam: '混凝土', tex: 'purple_concrete' },
  { zh: '品红色混凝土', en: 'Magenta Concrete', hex: '#A9309F', id: 'magenta_concrete', fam: '混凝土', tex: 'magenta_concrete' },
  { zh: '粉红色混凝土', en: 'Pink Concrete', hex: '#D6658F', id: 'pink_concrete', fam: '混凝土', tex: 'pink_concrete' },
  { zh: '棕色混凝土', en: 'Brown Concrete', hex: '#603C20', id: 'brown_concrete', fam: '混凝土', tex: 'brown_concrete' },
  { zh: '白色羊毛', en: 'White Wool', hex: '#EAECED', id: 'white_wool', fam: '羊毛', tex: 'white_wool' },
  { zh: '淡灰色羊毛', en: 'Light Gray Wool', hex: '#8E8E87', id: 'light_gray_wool', fam: '羊毛', tex: 'light_gray_wool' },
  { zh: '灰色羊毛', en: 'Gray Wool', hex: '#3F4448', id: 'gray_wool', fam: '羊毛', tex: 'gray_wool' },
  { zh: '黑色羊毛', en: 'Black Wool', hex: '#15151A', id: 'black_wool', fam: '羊毛', tex: 'black_wool' },
  { zh: '红色羊毛', en: 'Red Wool', hex: '#A12723', id: 'red_wool', fam: '羊毛', tex: 'red_wool' },
  { zh: '橙色羊毛', en: 'Orange Wool', hex: '#F17614', id: 'orange_wool', fam: '羊毛', tex: 'orange_wool' },
  { zh: '黄色羊毛', en: 'Yellow Wool', hex: '#F9C628', id: 'yellow_wool', fam: '羊毛', tex: 'yellow_wool' },
  { zh: '黄绿色羊毛', en: 'Lime Wool', hex: '#70B91A', id: 'lime_wool', fam: '羊毛', tex: 'lime_wool' },
  { zh: '绿色羊毛', en: 'Green Wool', hex: '#556E1C', id: 'green_wool', fam: '羊毛', tex: 'green_wool' },
  { zh: '青色羊毛', en: 'Cyan Wool', hex: '#158A91', id: 'cyan_wool', fam: '羊毛', tex: 'cyan_wool' },
  { zh: '淡蓝色羊毛', en: 'Light Blue Wool', hex: '#3AAFD9', id: 'light_blue_wool', fam: '羊毛', tex: 'light_blue_wool' },
  { zh: '蓝色羊毛', en: 'Blue Wool', hex: '#35399D', id: 'blue_wool', fam: '羊毛', tex: 'blue_wool' },
  { zh: '紫色羊毛', en: 'Purple Wool', hex: '#7A2AAD', id: 'purple_wool', fam: '羊毛', tex: 'purple_wool' },
  { zh: '品红色羊毛', en: 'Magenta Wool', hex: '#BE45B4', id: 'magenta_wool', fam: '羊毛', tex: 'magenta_wool' },
  { zh: '粉红色羊毛', en: 'Pink Wool', hex: '#EE8DAC', id: 'pink_wool', fam: '羊毛', tex: 'pink_wool' },
  { zh: '棕色羊毛', en: 'Brown Wool', hex: '#724829', id: 'brown_wool', fam: '羊毛', tex: 'brown_wool' },
  { zh: '白色陶瓦', en: 'White Terracotta', hex: '#D2B2A1', id: 'white_terracotta', fam: '陶瓦', tex: 'white_terracotta' },
  { zh: '淡灰色陶瓦', en: 'Light Gray Terracotta', hex: '#876B62', id: 'light_gray_terracotta', fam: '陶瓦', tex: 'light_gray_terracotta' },
  { zh: '灰色陶瓦', en: 'Gray Terracotta', hex: '#3A2A24', id: 'gray_terracotta', fam: '陶瓦', tex: 'gray_terracotta' },
  { zh: '黑色陶瓦', en: 'Black Terracotta', hex: '#251710', id: 'black_terracotta', fam: '陶瓦', tex: 'black_terracotta' },
  { zh: '红色陶瓦', en: 'Red Terracotta', hex: '#8F3D2F', id: 'red_terracotta', fam: '陶瓦', tex: 'red_terracotta' },
  { zh: '橙色陶瓦', en: 'Orange Terracotta', hex: '#A25426', id: 'orange_terracotta', fam: '陶瓦', tex: 'orange_terracotta' },
  { zh: '黄色陶瓦', en: 'Yellow Terracotta', hex: '#BA8523', id: 'yellow_terracotta', fam: '陶瓦', tex: 'yellow_terracotta' },
  { zh: '黄绿色陶瓦', en: 'Lime Terracotta', hex: '#687635', id: 'lime_terracotta', fam: '陶瓦', tex: 'lime_terracotta' },
  { zh: '绿色陶瓦', en: 'Green Terracotta', hex: '#4C532A', id: 'green_terracotta', fam: '陶瓦', tex: 'green_terracotta' },
  { zh: '青色陶瓦', en: 'Cyan Terracotta', hex: '#575B5B', id: 'cyan_terracotta', fam: '陶瓦', tex: 'cyan_terracotta' },
  { zh: '淡蓝色陶瓦', en: 'Light Blue Terracotta', hex: '#716D8A', id: 'light_blue_terracotta', fam: '陶瓦', tex: 'light_blue_terracotta' },
  { zh: '蓝色陶瓦', en: 'Blue Terracotta', hex: '#4A3C5B', id: 'blue_terracotta', fam: '陶瓦', tex: 'blue_terracotta' },
  { zh: '紫色陶瓦', en: 'Purple Terracotta', hex: '#764656', id: 'purple_terracotta', fam: '陶瓦', tex: 'purple_terracotta' },
  { zh: '品红色陶瓦', en: 'Magenta Terracotta', hex: '#96586D', id: 'magenta_terracotta', fam: '陶瓦', tex: 'magenta_terracotta' },
  { zh: '粉红色陶瓦', en: 'Pink Terracotta', hex: '#A24E4F', id: 'pink_terracotta', fam: '陶瓦', tex: 'pink_terracotta' },
  { zh: '棕色陶瓦', en: 'Brown Terracotta', hex: '#4D3324', id: 'brown_terracotta', fam: '陶瓦', tex: 'brown_terracotta' },
  { zh: '石头', en: 'Stone', hex: '#7E7E7E', id: 'stone', fam: '石材', tex: 'stone' },
  { zh: '平滑石头', en: 'Smooth Stone', hex: '#9F9F9F', id: 'smooth_stone', fam: '石材', tex: 'smooth_stone' },
  { zh: '圆石', en: 'Cobblestone', hex: '#807F80', id: 'cobblestone', fam: '石材', tex: 'cobblestone' },
  { zh: '苔石', en: 'Mossy Cobblestone', hex: '#6E765F', id: 'mossy_cobblestone', fam: '石材', tex: 'mossy_cobblestone' },
  { zh: '花岗岩', en: 'Granite', hex: '#956756', id: 'granite', fam: '石材', tex: 'granite' },
  { zh: '磨制花岗岩', en: 'Polished Granite', hex: '#9A6B59', id: 'polished_granite', fam: '石材', tex: 'polished_granite' },
  { zh: '闪长岩', en: 'Diorite', hex: '#BDBCBD', id: 'diorite', fam: '石材', tex: 'diorite' },
  { zh: '磨制闪长岩', en: 'Polished Diorite', hex: '#C1C1C3', id: 'polished_diorite', fam: '石材', tex: 'polished_diorite' },
  { zh: '安山岩', en: 'Andesite', hex: '#888889', id: 'andesite', fam: '石材', tex: 'andesite' },
  { zh: '磨制安山岩', en: 'Polished Andesite', hex: '#848786', id: 'polished_andesite', fam: '石材', tex: 'polished_andesite' },
  { zh: '深板岩', en: 'Deepslate', hex: '#505053', id: 'deepslate', fam: '石材', tex: 'deepslate' },
  { zh: '磨制深板岩', en: 'Polished Deepslate', hex: '#484949', id: 'polished_deepslate', fam: '石材', tex: 'polished_deepslate' },
  { zh: '凝灰岩', en: 'Tuff', hex: '#6C6D67', id: 'tuff', fam: '石材', tex: 'tuff' },
  { zh: '磨制凝灰岩', en: 'Polished Tuff', hex: '#626864', id: 'polished_tuff', fam: '石材', tex: 'polished_tuff' },
  { zh: '方解石', en: 'Calcite', hex: '#DFE0DD', id: 'calcite', fam: '石材', tex: 'calcite' },
  { zh: '滴水石', en: 'Dripstone Block', hex: '#866C5D', id: 'dripstone_block', fam: '石材', tex: 'dripstone_block' },
  { zh: '黑石', en: 'Blackstone', hex: '#2A2429', id: 'blackstone', fam: '石材', tex: 'blackstone' },
  { zh: '玄武岩', en: 'Basalt', hex: '#49494E', id: 'basalt', fam: '石材', tex: 'basalt_side' },
  { zh: '平滑玄武岩', en: 'Smooth Basalt', hex: '#49484E', id: 'smooth_basalt', fam: '石材', tex: 'smooth_basalt' },
  { zh: '下界岩', en: 'Netherrack', hex: '#622626', id: 'netherrack', fam: '石材', tex: 'netherrack' },
  { zh: '末地石', en: 'End Stone', hex: '#DCDF9E', id: 'end_stone', fam: '石材', tex: 'end_stone' },
  { zh: '下界砖块', en: 'Nether Bricks', hex: '#2C161A', id: 'nether_bricks', fam: '石材', tex: 'nether_bricks' },
  { zh: '红色下界砖块', en: 'Red Nether Bricks', hex: '#460709', id: 'red_nether_bricks', fam: '石材', tex: 'red_nether_bricks' },
  { zh: '紫珀块', en: 'Purpur Block', hex: '#AA7EAA', id: 'purpur_block', fam: '石材', tex: 'purpur_block' },
  { zh: '黑曜石', en: 'Obsidian', hex: '#0F0B19', id: 'obsidian', fam: '石材', tex: 'obsidian' },
  { zh: '基岩', en: 'Bedrock', hex: '#555555', id: 'bedrock', fam: '石材', tex: 'bedrock' },
  { zh: '海晶石', en: 'Prismarine', hex: '#62A292', id: 'prismarine', fam: '石材', tex: 'prismarine' },
  { zh: '暗海晶石', en: 'Dark Prismarine', hex: '#345C4C', id: 'dark_prismarine', fam: '石材', tex: 'dark_prismarine' },
  { zh: '海晶石砖', en: 'Prismarine Bricks', hex: '#63AC9E', id: 'prismarine_bricks', fam: '石材', tex: 'prismarine_bricks' },
  { zh: '泥土', en: 'Dirt', hex: '#866043', id: 'dirt', fam: '砂土', tex: 'dirt' },
  { zh: '砂土', en: 'Coarse Dirt', hex: '#77563B', id: 'coarse_dirt', fam: '砂土', tex: 'coarse_dirt' },
  { zh: '缠根泥土', en: 'Rooted Dirt', hex: '#90684D', id: 'rooted_dirt', fam: '砂土', tex: 'rooted_dirt' },
  { zh: '泥巴', en: 'Mud', hex: '#3C393D', id: 'mud', fam: '砂土', tex: 'mud' },
  { zh: '压实泥巴', en: 'Packed Mud', hex: '#8E6B50', id: 'packed_mud', fam: '砂土', tex: 'packed_mud' },
  { zh: '沙子', en: 'Sand', hex: '#DBCFA3', id: 'sand', fam: '砂土', tex: 'sand' },
  { zh: '红沙', en: 'Red Sand', hex: '#BF6721', id: 'red_sand', fam: '砂土', tex: 'red_sand' },
  { zh: '沙砾', en: 'Gravel', hex: '#847F7F', id: 'gravel', fam: '砂土', tex: 'gravel' },
  { zh: '黏土', en: 'Clay', hex: '#A1A6B3', id: 'clay', fam: '砂土', tex: 'clay' },
  { zh: '雪块', en: 'Snow Block', hex: '#F9FEFE', id: 'snow_block', fam: '砂土', tex: 'snow' },
  { zh: '砂岩', en: 'Sandstone', hex: '#D8CB9C', id: 'sandstone', fam: '砂土', tex: 'sandstone' },
  { zh: '红砂岩', en: 'Red Sandstone', hex: '#BB631D', id: 'red_sandstone', fam: '砂土', tex: 'red_sandstone' },
  { zh: '切制砂岩', en: 'Cut Sandstone', hex: '#DACEA0', id: 'cut_sandstone', fam: '砂土', tex: 'cut_sandstone' },
  { zh: '橡木木板', en: 'Oak Planks', hex: '#A2834F', id: 'oak_planks', fam: '木质', tex: 'oak_planks' },
  { zh: '云杉木板', en: 'Spruce Planks', hex: '#735531', id: 'spruce_planks', fam: '木质', tex: 'spruce_planks' },
  { zh: '白桦木板', en: 'Birch Planks', hex: '#C0AF79', id: 'birch_planks', fam: '木质', tex: 'birch_planks' },
  { zh: '丛林木板', en: 'Jungle Planks', hex: '#A07351', id: 'jungle_planks', fam: '木质', tex: 'jungle_planks' },
  { zh: '金合欢木板', en: 'Acacia Planks', hex: '#A85A32', id: 'acacia_planks', fam: '木质', tex: 'acacia_planks' },
  { zh: '深色橡木木板', en: 'Dark Oak Planks', hex: '#432B14', id: 'dark_oak_planks', fam: '木质', tex: 'dark_oak_planks' },
  { zh: '红树木板', en: 'Mangrove Planks', hex: '#763631', id: 'mangrove_planks', fam: '木质', tex: 'mangrove_planks' },
  { zh: '樱花木板', en: 'Cherry Planks', hex: '#E3B3AD', id: 'cherry_planks', fam: '木质', tex: 'cherry_planks' },
  { zh: '竹木板', en: 'Bamboo Planks', hex: '#C1AD50', id: 'bamboo_planks', fam: '木质', tex: 'bamboo_planks' },
  { zh: '绯红木板', en: 'Crimson Planks', hex: '#653147', id: 'crimson_planks', fam: '木质', tex: 'crimson_planks' },
  { zh: '诡异木板', en: 'Warped Planks', hex: '#2B6963', id: 'warped_planks', fam: '木质', tex: 'warped_planks' },
  { zh: '橡木原木', en: 'Oak Log', hex: '#6D5533', id: 'oak_log', fam: '木质', tex: 'oak_log' },
  { zh: '云杉原木', en: 'Spruce Log', hex: '#3B2611', id: 'spruce_log', fam: '木质', tex: 'spruce_log' },
  { zh: '深色橡木原木', en: 'Dark Oak Log', hex: '#3C2F1A', id: 'dark_oak_log', fam: '木质', tex: 'dark_oak_log' },
  { zh: '去皮橡木原木', en: 'Stripped Oak Log', hex: '#B19056', id: 'stripped_oak_log', fam: '木质', tex: 'stripped_oak_log' },
  { zh: '去皮白桦原木', en: 'Stripped Birch Log', hex: '#C5B076', id: 'stripped_birch_log', fam: '木质', tex: 'stripped_birch_log' },
  { zh: '铁块', en: 'Block of Iron', hex: '#DCDCDC', id: 'iron_block', fam: '金属宝石', tex: 'iron_block' },
  { zh: '金块', en: 'Block of Gold', hex: '#F6D03E', id: 'gold_block', fam: '金属宝石', tex: 'gold_block' },
  { zh: '钻石块', en: 'Block of Diamond', hex: '#62EDE4', id: 'diamond_block', fam: '金属宝石', tex: 'diamond_block' },
  { zh: '绿宝石块', en: 'Block of Emerald', hex: '#2ACB58', id: 'emerald_block', fam: '金属宝石', tex: 'emerald_block' },
  { zh: '青金石块', en: 'Block of Lapis Lazuli', hex: '#1F438C', id: 'lapis_block', fam: '金属宝石', tex: 'lapis_block' },
  { zh: '红石块', en: 'Block of Redstone', hex: '#B01905', id: 'redstone_block', fam: '金属宝石', tex: 'redstone_block' },
  { zh: '煤炭块', en: 'Block of Coal', hex: '#101010', id: 'coal_block', fam: '金属宝石', tex: 'coal_block' },
  { zh: '下界合金块', en: 'Block of Netherite', hex: '#433D40', id: 'netherite_block', fam: '金属宝石', tex: 'netherite_block' },
  { zh: '铜块', en: 'Block of Copper', hex: '#C06C50', id: 'copper_block', fam: '金属宝石', tex: 'copper_block' },
  { zh: '斑驳的铜块', en: 'Exposed Copper', hex: '#A17E68', id: 'exposed_copper', fam: '金属宝石', tex: 'exposed_copper' },
  { zh: '锈蚀的铜块', en: 'Weathered Copper', hex: '#6C996E', id: 'weathered_copper', fam: '金属宝石', tex: 'weathered_copper' },
  { zh: '氧化铜块', en: 'Oxidized Copper', hex: '#52A385', id: 'oxidized_copper', fam: '金属宝石', tex: 'oxidized_copper' },
  { zh: '紫水晶块', en: 'Block of Amethyst', hex: '#8662BF', id: 'amethyst_block', fam: '金属宝石', tex: 'amethyst_block' },
  { zh: '石英块', en: 'Block of Quartz', hex: '#ECE6DF', id: 'quartz_block', fam: '金属宝石', tex: 'quartz_block_side' },
  { zh: '平滑石英块', en: 'Smooth Quartz Block', hex: '#EDE6E0', id: 'smooth_quartz', fam: '金属宝石', tex: 'quartz_block_bottom' },
  { zh: '砖块', en: 'Bricks', hex: '#976253', id: 'bricks', fam: '金属宝石', tex: 'bricks' },
  { zh: '泥砖', en: 'Mud Bricks', hex: '#89684F', id: 'mud_bricks', fam: '金属宝石', tex: 'mud_bricks' },
  { zh: '下界疣块', en: 'Nether Wart Block', hex: '#730302', id: 'nether_wart_block', fam: '彩色', tex: 'nether_wart_block' },
  { zh: '诡异疣块', en: 'Warped Wart Block', hex: '#177879', id: 'warped_wart_block', fam: '彩色', tex: 'warped_wart_block' },
  { zh: '菌光体', en: 'Shroomlight', hex: '#F19347', id: 'shroomlight', fam: '彩色', tex: 'shroomlight' },
  { zh: '岩浆块', en: 'Magma Block', hex: '#8E3F1F', id: 'magma_block', fam: '彩色', tex: 'magma' },
  { zh: '灵魂沙', en: 'Soul Sand', hex: '#513E33', id: 'soul_sand', fam: '彩色', tex: 'soul_sand' },
  { zh: '蜜脾块', en: 'Honeycomb Block', hex: '#E5941E', id: 'honeycomb_block', fam: '彩色', tex: 'honeycomb_block' },
  { zh: '干草捆', en: 'Hay Bale', hex: '#A68826', id: 'hay_block', fam: '彩色', tex: 'hay_block_side' },
  { zh: '苔藓块', en: 'Moss Block', hex: '#596E2D', id: 'moss_block', fam: '彩色', tex: 'moss_block' },
  { zh: '南瓜', en: 'Pumpkin', hex: '#C47318', id: 'pumpkin', fam: '彩色', tex: 'pumpkin_side' },
  { zh: '海绵', en: 'Sponge', hex: '#C4C04B', id: 'sponge', fam: '彩色', tex: 'sponge' },
  { zh: '赭黄蛙明灯', en: 'Ochre Froglight', hex: '#F5E9B6', id: 'ochre_froglight', fam: '彩色', tex: 'ochre_froglight_side' },
  { zh: '青翠蛙明灯', en: 'Verdant Froglight', hex: '#D3EBD0', id: 'verdant_froglight', fam: '彩色', tex: 'verdant_froglight_side' },
  { zh: '珠光蛙明灯', en: 'Pearlescent Froglight', hex: '#ECE1E5', id: 'pearlescent_froglight', fam: '彩色', tex: 'pearlescent_froglight_side' },
  { zh: '幽匿块', en: 'Sculk', hex: '#0D1C22', id: 'sculk', fam: '彩色', tex: 'sculk' },
  { zh: '干海带块', en: 'Dried Kelp Block', hex: '#26311E', id: 'dried_kelp_block', fam: '彩色', tex: 'dried_kelp_side' },
  { zh: '骨块', en: 'Bone Block', hex: '#E5E2D0', id: 'bone_block', fam: '彩色', tex: 'bone_block_side' },
  { zh: '萤石', en: 'Glowstone', hex: '#AC8354', id: 'glowstone', fam: '彩色', tex: 'glowstone' },
  { zh: '海晶灯', en: 'Sea Lantern', hex: '#ACC8BF', id: 'sea_lantern', fam: '彩色', tex: 'sea_lantern' },
  { zh: '哭泣的黑曜石', en: 'Crying Obsidian', hex: '#210A3C', id: 'crying_obsidian', fam: '彩色', tex: 'crying_obsidian' },
]

/** 分组顺序按首次出现排列，与旧版一致 */
export const FAMILIES: readonly string[] = ["混凝土","羊毛","陶瓦","石材","砂土","木质","金属宝石","彩色"]

/** 带命名空间的完整 ID，命令与结构文件里用这个 */
export function fullId(block: BlockDef): string {
  return `minecraft:${block.id}`
}

/**
 * 全量识别表：色板源（BLOCKS）+ 识别扩展（EXTRA_BLOCKS）。
 * 查名字、认贴图都走合并后的注册表；像素画色板推导只看 BLOCKS。
 */
export const ALL_BLOCK_DEFS: readonly BlockDef[] = [...BLOCKS, ...EXTRA_BLOCKS]

/** 按方块 ID 反查，O(1)；贴图覆盖、结构加载、结构查看都要用 */
export const BLOCKS_BY_ID: ReadonlyMap<string, BlockDef> = new Map(
  ALL_BLOCK_DEFS.map((b) => [b.id, b]),
)

/** 墙上形态归一到落地方块：同一面墙上的告示牌不该在材料统计里拆成两行 */
const WALL_FORMS: readonly (readonly [RegExp, string])[] = [
  [/^(.*)_wall_hanging_sign$/, '$1_hanging_sign'],
  [/^(.*)_wall_sign$/, '$1_sign'],
  [/^(.*)_wall_banner$/, '$1_banner'],
  [/^(.*)_wall_skull$/, '$1_skull'],
  [/^(.*)_wall_head$/, '$1_head'],
  [/^wall_torch$/, 'torch'],
  [/^soul_wall_torch$/, 'soul_torch'],
  [/^redstone_wall_torch$/, 'redstone_torch'],
]

/**
 * 把结构文件里的原始方块串归一成裸 ID：
 * 剥掉 `minecraft:` 命名空间与 `[facing=north,...]` 状态后缀，
 * 墙上形态（墙上告示牌 / 旗帜 / 头颅 / 火把）也归到落地方块。
 *
 * 调色板条目长什么样由导出方决定——WorldEdit 的 .schem 会写
 * `minecraft:chest[facing=north,...]`，同一箱子换个朝向就是另一条调色板，
 * 不归一的话查表查不中、材料统计还会把同一种方块拆成好几行。
 */
export function normalizeBlockId(raw: string): string {
  let id = raw.trim()
  const bracket = id.indexOf('[')
  if (bracket >= 0) id = id.slice(0, bracket)
  const colon = id.indexOf(':')
  if (colon >= 0) id = id.slice(colon + 1)
  for (const [re, to] of WALL_FORMS) {
    if (re.test(id)) return id.replace(re, to)
  }
  return id
}

/** 查表：先归一再查，`minecraft:oak_log[axis=y]` 也能查到橡木原木 */
export function findBlock(raw: string): BlockDef | undefined {
  return BLOCKS_BY_ID.get(normalizeBlockId(raw))
}
