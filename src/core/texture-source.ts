/**
 * 把内置的原版素材当成「源图」。
 *
 * 26.3 之后素材目录里有 1303 张方块贴图 + 831 张物品图标，二者都能直接
 * 丢进像素画 / 地图画生成器：挑一张草方块、一把钻石剑，就生成一张放大的
 * 像素图案。物品图标带透明背景，生成器已有对应语义（像素画留空格、
 * 地图画按「背景」设置填白/填黑/留未探索），这里原样保留 alpha，不合成底色。
 *
 * 这里负责三件事：
 *   1. 从生成好的总表列出全部内置素材，带中文名 / 英文名 / 分组（纯数据，可单测）；
 *   2. 把选中的贴图画到离屏 canvas，产出通用的 SquareImage；
 *   3. 长条贴图（16×N 的动画帧堆叠）只取左上角第一帧——
 *      规则复用 textures.ts 的 squareSide/drawTexture，和方块图鉴、
 *      画布显示、平均色取样完全一致，不另写一份。
 *
 * 清单来自 texture-catalog.ts（由 scripts/build-texture-catalog.mjs 生成），
 * 以素材目录里的 PNG 为准，方块表 / 物品表只负责反查名字。
 * 色板仍然只认 blocks.ts 的 BLOCKS，物品不参与配色推导。
 */
import {
  TEXTURE_CATALOG,
  type TextureCatalogEntry,
  type TextureKind,
} from './texture-catalog'
import type { SquareImage } from './image'
import { drawTexture, squareSide, textureImage } from './textures'

export type { TextureKind } from './texture-catalog'

export type BuiltinTexture = TextureCatalogEntry

/** 同一类素材的分组：方块是中文方块分组，物品是英文名首字母桶 */
export type TextureFilterKind = TextureKind | 'all'

export const BUILTIN_TEXTURES: readonly BuiltinTexture[] = TEXTURE_CATALOG

const familiesOf = (kind: TextureKind): readonly string[] =>
  [...new Set(TEXTURE_CATALOG.filter((e) => e.kind === kind).map((e) => e.family))].sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  )

export const BUILTIN_FAMILIES = familiesOf('block')
export const BUILTIN_ITEM_GROUPS = familiesOf('item')

export function familiesFor(kind: TextureFilterKind): readonly string[] {
  if (kind === 'block') return BUILTIN_FAMILIES
  if (kind === 'item') return BUILTIN_ITEM_GROUPS
  return [...new Set([...BUILTIN_FAMILIES, ...BUILTIN_ITEM_GROUPS])]
}

/**
 * 按关键字、分组与素材种类过滤，并限制返回条数。
 * 两千多张贴图全渲染进 DOM 会卡，弹层只画前 limit 条，滚到底再加载更多。
 */
export function filterBuiltinTextures(
  list: readonly BuiltinTexture[],
  query: string,
  family = '全部',
  limit = 120,
  kind: TextureFilterKind = 'all',
): readonly BuiltinTexture[] {
  const q = query.trim().toLowerCase()
  const out: BuiltinTexture[] = []
  for (const item of list) {
    if (kind !== 'all' && item.kind !== kind) continue
    if (family !== '全部' && item.family !== family) continue
    if (q && !`${item.label} ${item.en} ${item.tex}`.toLowerCase().includes(q)) continue
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

/** 某次筛选共有多少条匹配（不受 limit 影响，纯函数） */
export function countBuiltinTextures(
  list: readonly BuiltinTexture[],
  query: string,
  family = '全部',
  kind: TextureFilterKind = 'all',
): number {
  const q = query.trim().toLowerCase()
  return list.reduce((n, item) => {
    if (kind !== 'all' && item.kind !== kind) return n
    if (family !== '全部' && item.family !== family) return n
    if (q && !`${item.label} ${item.en} ${item.tex}`.toLowerCase().includes(q)) return n
    return n + 1
  }, 0)
}

/**
 * 把内置素材读成源图。
 *
 * 输出尺寸就是贴图第一帧的原始边长（原版材质一般是 16），
 * 不做平滑放大：贴图本身是像素画，插值会糊掉硬边；
 * 后面生成器按网格采样时会自己放大到画布尺寸。
 * 物品图标的透明像素原样保留，交给各自的算法层决定留空还是填背景。
 */
export async function loadBuiltinTexture(item: BuiltinTexture): Promise<SquareImage> {
  const loading = textureImage(item.tex)
  if (!loading) throw new Error('找不到这张内置贴图')
  const img = await loading
  const side = squareSide(img.naturalWidth || img.width, img.naturalHeight || img.height)
  if (!side) throw new Error('贴图还没解码完成')

  const size = Math.min(1024, side)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('无法创建画布上下文')
  ctx.imageSmoothingEnabled = false
  drawTexture(ctx, img, 0, 0, size)

  return {
    pixels: ctx.getImageData(0, 0, size, size).data,
    size,
    name: `${item.label}（内置${item.kind === 'item' ? '物品图标' : '方块材质'}）`,
  }
}
