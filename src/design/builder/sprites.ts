/* ============================================================
   光标精灵：用位图掩码画像素箭头，离屏缓存后逐帧只做 drawImage
   ------------------------------------------------------------
   每个格子正好 1 个 CSS 像素，所以任何缩放比下都是硬边方块，
   不会像矢量路径那样在斜边上出现抗锯齿灰边——这是「像素感」
   的关键：宁可阶梯，不要模糊。
   ============================================================ */

import type { CursorTool } from './types'

const ARROW = [
  '#...........',
  '##..........',
  '###.........',
  '####........',
  '#####.......',
  '######......',
  '#######.....',
  '########....',
  '#########...',
  '##########..',
  '###########.',
  '############',
  '############',
  '#####..#####',
  '####....####',
  '###......###',
  '##........##',
  '#..........#',
] as const

const CROSS = [
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '###########',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
] as const

const IBEAM = [
  '#######',
  '...#...',
  '...#...',
  '...#...',
  '...#...',
  '...#...',
  '...#...',
  '...#...',
  '...#...',
  '...#...',
  '...#...',
  '...#...',
  '...#...',
  '...#...',
  '#######',
] as const

const MASKS: Record<CursorTool, readonly string[]> = {
  arrow: ARROW,
  cross: CROSS,
  ibeam: IBEAM,
}

/** 硬投影的偏移量，和站点其它地方的 box-shadow 一个方向 */
const SHADOW_OFFSET = 2

export interface Sprite {
  readonly canvas: HTMLCanvasElement
  readonly w: number
  readonly h: number
}

export interface SpriteTheme {
  readonly fill: string
  readonly shadow: string
}

const cache = new Map<string, Sprite>()

/** 切换深浅色后旧的精灵不再命中，直接清掉免得缓存越积越多 */
export function clearSpriteCache(): void {
  cache.clear()
}

function paint(canvas: HTMLCanvasElement, mask: readonly string[], fill: string, scale: number): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(scale, scale)
  ctx.fillStyle = fill
  for (let row = 0; row < mask.length; row += 1) {
    const line = mask[row]
    for (let col = 0; col < line.length; col += 1) {
      if (line[col] === '#') ctx.fillRect(col, row, 1, 1)
    }
  }
}

/** 光标精灵：主体 + 右下偏移的硬投影，一次生成、反复贴图 */
export function cursorSprite(tool: CursorTool, theme: SpriteTheme, scale: number): Sprite {
  const key = `${tool}|${theme.fill}|${theme.shadow}`
  const hit = cache.get(key)
  if (hit) return hit

  const mask = MASKS[tool]
  const cols = mask.reduce((max, line) => Math.max(max, line.length), 0)
  const w = cols + SHADOW_OFFSET
  const h = mask.length + SHADOW_OFFSET

  const shadowLayer = document.createElement('canvas')
  shadowLayer.width = Math.round(w * scale)
  shadowLayer.height = Math.round(h * scale)
  paint(shadowLayer, mask, theme.shadow, scale)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(shadowLayer, SHADOW_OFFSET * scale, SHADOW_OFFSET * scale)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    paint(canvas, mask, theme.fill, scale)
  }

  const sprite: Sprite = { canvas, w, h }
  cache.set(key, sprite)
  return sprite
}

/** 名字标签：实心色块 + 像素字体，同样按「名字 + 颜色」缓存 */
export function nameTag(name: string, fill: string, textColor: string, scale: number): Sprite {
  const key = `tag|${name}|${fill}|${textColor}`
  const hit = cache.get(key)
  if (hit) return hit

  // 方舟像素是 12px 设计的字体，非 12 的整数倍会糊，canvas 上同样如此
  const font = '12px "Ark Pixel", ui-monospace, monospace'
  const probe = document.createElement('canvas').getContext('2d')
  // 像素字体没加载完时 measureText 会退化成等宽估算，宁可先给个保守宽度
  let textWidth = name.length * 7
  if (probe) {
    probe.font = font
    textWidth = Math.ceil(probe.measureText(name).width)
  }
  const w = textWidth + 8
  const h = 17

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * scale)
  canvas.height = Math.ceil(h * scale)
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(scale, scale)
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = textColor
    ctx.font = font
    ctx.textBaseline = 'middle'
    ctx.fillText(name, 4, h / 2 + 0.5)
  }

  const sprite: Sprite = { canvas, w, h }
  cache.set(key, sprite)
  return sprite
}
