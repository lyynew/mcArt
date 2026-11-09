/**
 * 地图画的示例图。
 *
 * 空画布劝退，方块画生成器那边也是开页就给一张。这里特意画了大面积
 * 渐变（天空、水面）加硬边山峰：开默认抖动时能一眼看出误差扩散的效果，
 * 换成「无抖动」或 Bayer 也能立刻看出区别。
 */
import type { SquareImage } from '@/core/image'

export function createDemoImage(): SquareImage {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('无法创建画布上下文')

  const sky = ctx.createLinearGradient(0, 0, 0, 170)
  sky.addColorStop(0, '#1b2a63')
  sky.addColorStop(0.45, '#8a4a86')
  sky.addColorStop(0.78, '#e9774f')
  sky.addColorStop(1, '#ffc978')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, size, 170)

  // 太阳与几片像素云
  ctx.fillStyle = '#ffe9a8'
  ctx.beginPath()
  ctx.arc(176, 118, 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 226, 163, 0.35)'
  ctx.beginPath()
  ctx.arc(176, 118, 42, 0, Math.PI * 2)
  ctx.fill()
  for (const [x, y, w, h] of [
    [24, 38, 52, 7],
    [40, 30, 28, 8],
    [92, 62, 44, 6],
    [204, 46, 40, 7],
  ] as const) {
    ctx.fillStyle = 'rgba(255, 236, 214, 0.55)'
    ctx.fillRect(x, y, w, h)
  }

  // 远山 / 近山，两层都是硬边
  ctx.fillStyle = '#4b3766'
  ctx.beginPath()
  ctx.moveTo(0, 170)
  ctx.lineTo(0, 126)
  ctx.lineTo(48, 92)
  ctx.lineTo(96, 134)
  ctx.lineTo(140, 100)
  ctx.lineTo(196, 142)
  ctx.lineTo(240, 112)
  ctx.lineTo(256, 130)
  ctx.lineTo(256, 170)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#264a4a'
  ctx.beginPath()
  ctx.moveTo(0, 170)
  ctx.lineTo(0, 150)
  ctx.lineTo(64, 158)
  ctx.lineTo(120, 138)
  ctx.lineTo(180, 162)
  ctx.lineTo(232, 146)
  ctx.lineTo(256, 156)
  ctx.lineTo(256, 170)
  ctx.closePath()
  ctx.fill()

  const water = ctx.createLinearGradient(0, 170, 0, size)
  water.addColorStop(0, '#d78a5c')
  water.addColorStop(0.28, '#4a6f95')
  water.addColorStop(1, '#122c48')
  ctx.fillStyle = water
  ctx.fillRect(0, 170, size, size - 170)

  // 水面反光：越往下越稀，给抖动一点可发挥的层次
  for (let y = 174; y < size; y += 6) {
    const span = 18 + ((y * 7) % 46)
    ctx.fillStyle = `rgba(255, 205, 138, ${0.34 - (y - 174) / 900})`
    ctx.fillRect(150 - span / 2 + ((y * 3) % 24), y, span, 2)
  }

  return { pixels: ctx.getImageData(0, 0, size, size).data, size, name: '示例 · 日落' }
}
