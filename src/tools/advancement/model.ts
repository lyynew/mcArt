/**
 * 进度提示图的常量、类型与预设文案。
 *
 * 尺寸全部按「基准画布 320×64」写死：这是原版 toast sprite（160×32）的
 * 2× 整数倍，也是用户给的参考图尺寸。导出倍率只整体放大这张基准画布，
 * 不改任何布局数字，预览与 PNG 因此逐像素一致。
 */
export const TOAST_WIDTH = 320
export const TOAST_HEIGHT = 64

/** 原版底图在静态贴图目录里的键 */
export const TOAST_BACKGROUND = 'gui/toast/advancement'
/** 原版 sprite 是 160×32，贴到 320×64 正好 2× */
export const BACKGROUND_SCALE = 2

export const ICON_SIZE = 32
export const ICON_X = 16
export const ICON_Y = 16

export const TEXT_X = 52
export const TITLE_Y = 17
export const DESC_Y = 37
export const TEXT_RIGHT_PADDING = 10
export const TEXT_MAX_WIDTH = TOAST_WIDTH - TEXT_X - TEXT_RIGHT_PADDING

/** Ark Pixel 是 12px 设计的像素字体，用整数倍才不会糊 */
export const FONT_SIZE = 12
export const FONT_STACK = '"Ark Pixel", ui-monospace, monospace'

/** 方舟像素字体随站点发布，绘制前必须等它加载完（见 render.ts） */
export const FONT_LOAD = `${FONT_SIZE}px "Ark Pixel"`

/** 游戏原版进度提示：黄标题 + 白描述 */
export const VANILLA_TITLE_COLOR = '#ffff55'
export const VANILLA_DESC_COLOR = '#ffffff'
/** 参考示例图的自定义配色：青蓝标题 + 黄绿描述 */
export const SAMPLE_TITLE_COLOR = '#88b8d0'
export const SAMPLE_DESC_COLOR = '#d8e0a8'

export const EXPORT_SCALES = [1, 2, 4] as const
export type ExportScale = (typeof EXPORT_SCALES)[number]

export type IconKind = 'block' | 'item' | 'upload'

/** 图标选择。upload 时图片单独存在 store 的 shallowRef 里，不放进 spec */
export interface IconChoice {
  kind: IconKind
  /** block / item 时的贴图键；upload 时留空 */
  tex: string
}

export interface ToastSpec {
  title: string
  description: string
  titleColor: string
  descColor: string
  icon: IconChoice
  scale: ExportScale
}

export interface ToastPreset {
  id: string
  title: string
  description: string
}

/**
 * 内置文案。只给中英文名与描述，不绑图标与配色——
 * 用户说不要「进度类型预设」，这里也不做类型分层，纯粹是省打字的快捷填充。
 */
export const TOAST_PRESETS: readonly ToastPreset[] = [
  { id: 'sample', title: '海底世界！', description: '有用的知识又双叒增加了，' },
  { id: 'start', title: 'Minecraft', description: '游戏开始了' },
  { id: 'stone', title: '石器时代', description: '用你的新石镐挖石头' },
  { id: 'iron', title: '这不是铁镐吗？', description: '升级你的镐子' },
  { id: 'diamond', title: '钻石！', description: '带上你的钻石装备，去下界吧' },
  { id: 'nether', title: '下界', description: '带上暖暖的羊毛' },
  { id: 'lava', title: '热腾腾的', description: '用桶装点岩浆' },
  { id: 'end', title: '结束了？', description: '击败末影龙' },
  { id: 'shelter', title: '勇往直下', description: '建造、旅行并探索一个庇护所' },
  { id: 'sky', title: '高高在上', description: '站在基岩层的顶端' },
]

export const DEFAULT_SPEC: ToastSpec = {
  title: TOAST_PRESETS[0]!.title,
  description: TOAST_PRESETS[0]!.description,
  titleColor: SAMPLE_TITLE_COLOR,
  descColor: SAMPLE_DESC_COLOR,
  icon: { kind: 'block', tex: 'grass_block' },
  scale: 2,
}
