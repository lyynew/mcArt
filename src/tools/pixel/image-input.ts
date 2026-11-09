/**
 * 像素画生成器的读图入口。
 *
 * 通用的方形解码已经挪到 core/image.ts（地图画生成器也要用），
 * 这里只留本工具专属的示例图，并转出原来的两个名字，
 * 免得上层组件为了换个 import 路径改一圈。
 */
export { readSquareImage } from '@/core/image'
export type { SquareImage } from '@/core/image'

import type { SquareImage } from '@/core/image'

/**
 * 打开页面时的示例图：一个方块脸。
 * 空画布对第一次来的用户太劝退，有张现成的图可以直接玩。
 */
export function createDemoImage(): SquareImage {
  const cells = [
    '........',
    '.XX..XX.',
    '.XX..XX.',
    '...XX...',
    '..XXXX..',
    '..XXXX..',
    '.XXXXXX.',
    '.X....X.',
  ]
  const unit = 16
  const size = 8 * unit
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('无法创建画布上下文')

  const greens = ['#4E8F2C', '#5CA537', '#437B26', '#63AF3D']
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const isFace = cells[y]![x] === 'X'
      ctx.fillStyle = isFace ? '#141519' : greens[(x * 3 + y * 5 + (x ^ y)) % greens.length]!
      ctx.fillRect(x * unit, y * unit, unit, unit)
      if (!isFace) {
        ctx.fillStyle = 'rgba(0,0,0,0.10)'
        ctx.fillRect(x * unit, y * unit, unit, 3)
        ctx.fillRect(x * unit, y * unit, 3, unit)
      }
    }
  }

  return {
    pixels: ctx.getImageData(0, 0, size, size).data,
    size,
    name: '示例',
  }
}
