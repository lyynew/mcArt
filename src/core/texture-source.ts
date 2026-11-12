/**
 * 把内置的原版材质当成「源图」。
 *
 * 方块图鉴里那些贴图本来是给画布当像素用的，其实也可以直接丢进
 * 像素画 / 地图画生成器当原图：挑一张草方块、钻石块，就能生成一张
 * 放大的方块图案。这里负责三件事：
 *   1. 列出全部内置贴图，并反查中文方块名（供搜索与分组）；
 *   2. 把选中的贴图画到离屏 canvas，产出通用的 SquareImage；
 *   3. 长条贴图（16×N 的动画帧堆叠）只取左上角第一帧——
 *      规则复用 textures.ts 的 squareSide/drawTexture，和方块图鉴、
 *      画布显示、平均色取样完全一致，不另写一份。
 *
 * 列表与过滤是纯数据，方便单测；只有 loadBuiltinTexture 碰 canvas。
 */
import { ALL_BLOCK_DEFS, BLOCKS, type BlockDef } from './blocks'
import type { SquareImage } from './image'
import { drawTexture, squareSide, textureImage } from './textures'

export interface BuiltinTexture {
  /** 贴图主名，也是 TEXTURES 的键 */
  tex: string
  /** 优先显示中文方块名 */
  label: string
  /** 英文方块名，搜索用 */
  en: string
  /** 分组，供筛选 */
  family: string
}

/** 一张贴图可能被多个方块共用（如木板类）：色板里的 142 种优先，名字更常用 */
const byTex = new Map<string, BlockDef>()
for (const block of [...BLOCKS, ...ALL_BLOCK_DEFS]) {
  if (block.tex && !byTex.has(block.tex)) byTex.set(block.tex, block)
}

/**
 * 列表从方块表反推：贴图名 → 方块。
 *
 * 只列方块用到的贴图（不是素材目录里的全部文件），物品不参与像素画生成，
 * 放进「内置材质」里会让人以为选一把剑就能生成方块画。
 * 用到的贴图可能被多个方块共用，按出现顺序去重。
 */
const usedTex: string[] = []
for (const block of [...BLOCKS, ...ALL_BLOCK_DEFS]) {
  if (block.tex && !usedTex.includes(block.tex)) usedTex.push(block.tex)
}

export const BUILTIN_TEXTURES: readonly BuiltinTexture[] = usedTex
  .map((tex) => {
    const block = byTex.get(tex)
    return {
      tex,
      label: block?.zh ?? tex,
      en: block?.en ?? tex,
      family: block?.fam ?? '其他',
    }
  })
  .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))

export const BUILTIN_FAMILIES: readonly string[] = [
  ...new Set(BUILTIN_TEXTURES.map((t) => t.family)),
].sort((a, b) => a.localeCompare(b, 'zh-CN'))

/**
 * 按关键字与分组过滤，并限制返回条数。
 * 六百多张贴图全渲染进 DOM 会卡，弹层里只画前 limit 条。
 */
export function filterBuiltinTextures(
  list: readonly BuiltinTexture[],
  query: string,
  family = '全部',
  limit = 120,
): readonly BuiltinTexture[] {
  const q = query.trim().toLowerCase()
  const out: BuiltinTexture[] = []
  for (const item of list) {
    if (family !== '全部' && item.family !== family) continue
    if (q && !`${item.label} ${item.en} ${item.tex}`.toLowerCase().includes(q)) continue
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

/** 某张贴图共有多少条匹配（用于「还有 N 张没显示」提示，纯函数） */
export function countBuiltinTextures(
  list: readonly BuiltinTexture[],
  query: string,
  family = '全部',
): number {
  const q = query.trim().toLowerCase()
  return list.reduce((n, item) => {
    if (family !== '全部' && item.family !== family) return n
    if (q && !`${item.label} ${item.en} ${item.tex}`.toLowerCase().includes(q)) return n
    return n + 1
  }, 0)
}

/**
 * 把内置贴图读成源图。
 *
 * 输出尺寸就是贴图第一帧的原始边长（原版材质一般是 16），
 * 不做平滑放大：贴图本身是像素画，插值会糊掉硬边；
 * 后面生成器按网格采样时会自己放大到画布尺寸。
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
    name: `${item.label}（内置材质）`,
  }
}
