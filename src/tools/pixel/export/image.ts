import type { PaletteBlock } from '@/core/palettes'

/**
 * 导出用的图片渲染。
 *
 * 与画布预览刻意分成两套：
 * 预览要贴图、斜面、网格，导出必须是纯色——
 * 施工图是拿去照着铺的，颜色越干净越容易对照。
 */
export interface ExportImageOptions {
  idx: Int16Array
  blocks: readonly PaletteBlock[]
  n: number
  /** true 输出施工图：带每 8 格的坐标与网格 */
  withAxis: boolean
}

export function renderExportCanvas(o: ExportImageOptions): HTMLCanvasElement {
  const { idx, blocks, n, withAxis } = o
  const px = withAxis ? 24 : 16
  const margin = withAxis ? 30 : 0
  const size = n * px + margin

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  if (withAxis) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
  }

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const k = idx[y * n + x]!
      const dx = margin + x * px
      const dy = margin + y * px
      if (k < 0) {
        // 纯像素图里空格保持透明，施工图里给个浅底，方便看出边界
        if (withAxis) {
          ctx.fillStyle = '#f4f4f2'
          ctx.fillRect(dx, dy, px, px)
        }
        continue
      }
      ctx.fillStyle = blocks[k]?.hex ?? '#ffffff'
      ctx.fillRect(dx, dy, px, px)
    }
  }

  if (withAxis) drawAxis(ctx, n, px, margin, size)

  return canvas
}

/** 网格 + 每 8 格的坐标标注 */
function drawAxis(
  ctx: CanvasRenderingContext2D,
  n: number,
  px: number,
  margin: number,
  size: number,
): void {
  ctx.lineWidth = 1

  ctx.strokeStyle = 'rgba(0,0,0,0.13)'
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const v = margin + i * px + 0.5
    ctx.moveTo(v, margin)
    ctx.lineTo(v, size)
    ctx.moveTo(margin, v)
    ctx.lineTo(size, v)
  }
  ctx.stroke()

  ctx.strokeStyle = 'rgba(0,0,0,0.34)'
  ctx.beginPath()
  for (let i = 0; i <= n; i += 8) {
    const v = margin + i * px + 0.5
    ctx.moveTo(v, margin)
    ctx.lineTo(v, size)
    ctx.moveTo(margin, v)
    ctx.lineTo(size, v)
  }
  ctx.stroke()

  ctx.fillStyle = '#666677'
  ctx.font = '11px ui-monospace, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < n; i += 8) {
    ctx.fillText(String(i), margin + i * px + px / 2, margin / 2)
    ctx.fillText(String(i), margin / 2, margin + i * px + px / 2)
  }
}
