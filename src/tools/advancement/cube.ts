/**
 * 等轴立方体图标：仿射矩阵、明暗、贴图键解析。
 *
 * 一个 16×16 的方块贴图画成 2:1 等轴的三个面，占 32×32。
 * 顶 / 左 / 右三面各是一张正方形贴图经仿射变换后的平行四边形；
 * 亮度按 100% / 80% / 60% 叠黑，这是原版方块图标的惯用明暗。
 *
 * 矩阵是纯数据，可以单测；绘制部分只碰 canvas，不 import vue。
 */
import { BLOCK_FACES, type BlockFaces } from '@/core/block-faces'
import { resolveTextureName } from '@/core/textures'
import { ICON_SIZE } from './model'

export interface AffineMatrix {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

/** 源贴图边长（原版都是 16×16，长条堆叠贴图由调用方先裁成方形） */
export const TEX_SIZE = 16

/**
 * 把源正方形 (0,0)-(16,16) 映到目标平行四边形。
 * 以 32×32 图标框为坐标系，四个角的对应关系见各矩阵注释。
 */
export const TOP_MATRIX: AffineMatrix = { a: 1, b: 0.5, c: -1, d: 0.5, e: 16, f: 0 }
/** (0,0)→(0,8) (16,0)→(16,16) (0,16)→(0,24) (16,16)→(16,32) */
export const LEFT_MATRIX: AffineMatrix = { a: 1, b: 0.5, c: 0, d: 1, e: 0, f: 8 }
/** (0,0)→(16,16) (16,0)→(32,8) (0,16)→(16,32) (16,16)→(32,24) */
export const RIGHT_MATRIX: AffineMatrix = { a: 1, b: -0.5, c: 0, d: 1, e: 16, f: 16 }

export const TOP_SHADE = 1
export const LEFT_SHADE = 0.8
export const RIGHT_SHADE = 0.6

/**
 * 取一个方块该用的顶 / 侧面贴图键。
 *
 * 查表前做两件事：
 *   1. resolveTextureName —— 26.3 改过名的旧贴图键（quartz_pillar 等）先转到实际文件名；
 *   2. 剥掉 _top / _side 后缀 —— 草方块没有主贴图，用户从素材目录里选到的
 *      是 grass_block_side，但它和 grass_block_top 属于同一个方块。
 *
 * 没进映射表的方块三面共用这张贴图。
 */
export function facesOf(tex: string): BlockFaces {
  const resolved = resolveTextureName(tex)
  const stem = resolved.replace(/_(top|side)$/, '')
  return BLOCK_FACES[stem] ?? { top: resolved, side: resolved }
}

type Ctx = CanvasRenderingContext2D

/** 在变换后的空间里画一个面，再按明暗叠一层黑 */
function paintFace(
  ctx: Ctx,
  img: CanvasImageSource,
  m: AffineMatrix,
  shade: number,
  side: number,
): void {
  ctx.save()
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f)
  ctx.beginPath()
  ctx.rect(0, 0, side, side)
  ctx.clip()

  // 原版有 16×N 的动画帧 / 多面堆叠贴图，整张压进方形会变成横纹。
  // 和 core/textures.ts 的 drawTexture 保持同一条规则：只取左上角第一帧。
  const dims = img as { naturalWidth?: number; naturalHeight?: number; width: number; height: number }
  const w = dims.naturalWidth || dims.width
  const h = dims.naturalHeight || dims.height
  const src = Math.min(w, h) || side
  ctx.drawImage(img, 0, 0, src, src, 0, 0, side, side)

  if (shade < 1) {
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - shade})`
    ctx.fillRect(0, 0, side, side)
  }
  ctx.restore()
}

/** 立方体外轮廓与三条棱，1px 黑线，和原版图标一样把三个面切开 */
function strokeEdges(ctx: Ctx, size: number): void {
  const h = size / 2
  const q = size / 4
  ctx.save()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(h, 0)
  ctx.lineTo(size, q)
  ctx.lineTo(size, size - q)
  ctx.lineTo(h, size)
  ctx.lineTo(0, size - q)
  ctx.lineTo(0, q)
  ctx.closePath()
  ctx.moveTo(0, q)
  ctx.lineTo(h, h)
  ctx.lineTo(size, q)
  ctx.moveTo(h, h)
  ctx.lineTo(h, size)
  ctx.stroke()
  ctx.restore()
}

/**
 * 画一个等轴方块。调用方负责把 ctx 平移到图标框左上角。
 * images 缺任意一张时退回「三面共用已有那张」，不让图标整个消失。
 */
export function paintCube(
  ctx: Ctx,
  images: { top?: CanvasImageSource; side?: CanvasImageSource },
  size = ICON_SIZE,
  texSide = TEX_SIZE,
): void {
  const top = images.top ?? images.side
  const side = images.side ?? images.top
  if (!top || !side) return

  // 矩阵以 32×32 为准，size 变化时整体等比缩放
  const k = size / ICON_SIZE
  ctx.save()
  ctx.scale(k, k)
  paintFace(ctx, top, TOP_MATRIX, TOP_SHADE, texSide)
  paintFace(ctx, side, LEFT_MATRIX, LEFT_SHADE, texSide)
  paintFace(ctx, side, RIGHT_MATRIX, RIGHT_SHADE, texSide)
  strokeEdges(ctx, ICON_SIZE)
  ctx.restore()
}
