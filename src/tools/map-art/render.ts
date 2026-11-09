/**
 * 把色号数组画成 canvas。
 *
 * 预览与 PNG 导出共用这一个渲染函数，保证「看到的」和「下载的」逐像素一致。
 * 透明色号画成 alpha 0，底色由页面的棋盘格透出来。
 */
import { COLOR_TRANSPARENT, MAP_SIZE } from './model'
import type { MapColor } from './map-colors'

export type ColorLookup = ReadonlyMap<number, MapColor>

export function paintMap(
  canvas: HTMLCanvasElement,
  colors: Uint8Array,
  lookup: ColorLookup,
): void {
  if (canvas.width !== MAP_SIZE) canvas.width = MAP_SIZE
  if (canvas.height !== MAP_SIZE) canvas.height = MAP_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布上下文')

  const image = ctx.createImageData(MAP_SIZE, MAP_SIZE)
  const px = image.data
  for (let i = 0; i < colors.length; i++) {
    const id = colors[i]!
    const c = id === COLOR_TRANSPARENT ? null : lookup.get(id)
    const o = i * 4
    px[o] = c?.rgb[0] ?? 0
    px[o + 1] = c?.rgb[1] ?? 0
    px[o + 2] = c?.rgb[2] ?? 0
    px[o + 3] = c ? 255 : 0
  }
  ctx.putImageData(image, 0, 0)
}

export function createMapCanvas(colors: Uint8Array, lookup: ColorLookup): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  paintMap(canvas, colors, lookup)
  return canvas
}
