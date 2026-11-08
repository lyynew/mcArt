import type { PaletteBlock } from '@/core/palettes'

/**
 * 画布绘制。
 *
 * 纯函数：给一个 canvas 和一份数据，画出来，不读任何全局状态。
 * 这样渲染逻辑可以单独看、单独改，也不会和 Vue 的更新时机缠在一起。
 *
 * 逐格绘制的顺序与旧版一致：空格 → 方块贴图/平均色 → 质感 → 聚焦压暗 → 网格。
 */
export interface BoardPaintOptions {
  n: number
  idx: Int16Array
  blocks: readonly PaletteBlock[]
  /** 单格像素 */
  cell: number
  devicePixelRatio: number
  showGrid: boolean
  /** 方块质感：上左提亮、下右压暗 */
  shading: boolean
  /** 用真实贴图，否则画平均色 */
  realTextures: boolean
  /** 聚焦的色板下标，-1 表示不聚焦 */
  focusIndex: number
  /** 贴图名 → 已解码的图片 */
  textures: ReadonlyMap<string, HTMLImageElement>
}

const EMPTY_BG = '#f2f2ee'
const EMPTY_CHECK = '#e2e2dc'

/**
 * 设定画布的显示尺寸与位图尺寸，随后由 paintBoard 重绘。
 *
 * 尺寸没变时不碰位图——重设 canvas.width 会清空画面。
 */
export function applyCanvasSize(canvas: HTMLCanvasElement, size: number, dpr: number): void {
  const bitmap = Math.round(size * dpr)
  if (canvas.width !== bitmap || canvas.height !== bitmap) {
    canvas.width = bitmap
    canvas.height = bitmap
  }
  applyCssSize(canvas, size)
}

/**
 * 只改显示尺寸，保留位图内容。
 *
 * 触摸手势要在「改缩放」和「写滚动位置」之间同步跑完这一步：
 * 尺寸若等下一帧重绘才更新，手势写 scrollLeft 会被旧的内容尺寸夹住——
 * 表现就是双指拖动看着没反应，或者拖 120px 只滚 90px。
 * 只改 CSS 尺寸不会清空画面，最多模糊一帧，下一帧重绘就清晰了。
 */
export function applyCssSize(canvas: HTMLCanvasElement, size: number): void {
  const px = `${size}px`
  if (canvas.style.width === px && canvas.style.height === px) return
  canvas.style.width = px
  canvas.style.height = px
}

export function paintBoard(canvas: HTMLCanvasElement, o: BoardPaintOptions): void {
  const { n, idx, blocks, cell, showGrid, shading, realTextures, focusIndex, textures } = o
  const size = n * cell
  const dpr = o.devicePixelRatio || 1

  applyCanvasSize(canvas, size, dpr)

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = false

  // 像素太小时斜面和描边会糊成一片，按格大小关掉
  const bevel = shading && cell >= 9
  const dim = focusIndex >= 0

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const k = idx[y * n + x]!
      const px = x * cell
      const py = y * cell

      if (k < 0) {
        ctx.fillStyle = EMPTY_BG
        ctx.fillRect(px, py, cell, cell)
        // 棋盘格，让人一眼看出这是「空」而不是白色方块
        if (cell >= 6) {
          const half = cell / 2
          ctx.fillStyle = EMPTY_CHECK
          ctx.fillRect(px, py, half, half)
          ctx.fillRect(px + half, py + half, half, half)
        }
      } else {
        const b = blocks[k]
        const img = realTextures && b ? textures.get(b.tex) : undefined
        if (img) {
          ctx.drawImage(img, px, py, cell, cell)
        } else if (b) {
          ctx.fillStyle = b.hex
          ctx.fillRect(px, py, cell, cell)
        }

        if (bevel) {
          const t = cell >= 40 ? 2 : 1
          ctx.fillStyle = 'rgba(255,255,255,0.24)'
          ctx.fillRect(px, py, cell, t)
          ctx.fillStyle = 'rgba(255,255,255,0.13)'
          ctx.fillRect(px, py, t, cell)
          ctx.fillStyle = 'rgba(0,0,0,0.17)'
          ctx.fillRect(px + cell - t, py, t, cell)
          ctx.fillStyle = 'rgba(0,0,0,0.28)'
          ctx.fillRect(px, py + cell - t, cell, t)
        }
      }

      if (dim && k !== focusIndex) {
        ctx.fillStyle = 'rgba(12,14,10,0.55)'
        ctx.fillRect(px, py, cell, cell)
      }
    }
  }

  if (showGrid && cell >= 4) {
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const v = i * cell + 0.5
      ctx.moveTo(v, 0)
      ctx.lineTo(v, size)
      ctx.moveTo(0, v)
      ctx.lineTo(size, v)
    }
    ctx.stroke()

    // 每 8 格一条深线，照着铺的时候不容易数错
    if (n > 16) {
      ctx.strokeStyle = 'rgba(0,0,0,0.26)'
      ctx.beginPath()
      for (let i = 0; i <= n; i += 8) {
        const v = i * cell + 0.5
        ctx.moveTo(v, 0)
        ctx.lineTo(v, size)
        ctx.moveTo(0, v)
        ctx.lineTo(size, v)
      }
      ctx.stroke()
    }
  }
}

/** 导出纯净像素图用：一格一个纯色块，不带质感与网格 */
export function paintFlat(
  canvas: HTMLCanvasElement,
  idx: Int16Array,
  blocks: readonly PaletteBlock[],
  n: number,
  cell: number,
): void {
  const size = n * cell
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const k = idx[y * n + x]!
      ctx.fillStyle = k < 0 ? '#ffffff' : (blocks[k]?.hex ?? '#ffffff')
      ctx.fillRect(x * cell, y * cell, cell, cell)
    }
  }
}
