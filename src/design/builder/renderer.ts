/* ============================================================
   Canvas 渲染层
   ------------------------------------------------------------
   只负责「把状态画出来」，不推进任何时间、不读 DOM 布局：
   引擎算好坐标传进来，这里按页面坐标绘制，再把滚动量抵消掉。
   画布是 fixed 全屏的，所以缓冲只有一屏，不用跟着页面高度变大。
   ============================================================ */

import { cursorSprite, nameTag, type SpriteTheme } from './sprites'
import type { CursorTool } from './types'

export interface RenderTheme extends SpriteTheme {
  /** 选框与尺寸文字的绿 */
  readonly accent: string
  /** 尺寸标签底色 */
  readonly badge: string
  /** 标签文字色：浅色主题下是纸白，深色主题下是墨色 */
  readonly badgeInk: string
  /** 光标所在网格格的底色 */
  readonly cell: string
}

export interface CursorPaint {
  readonly x: number
  readonly y: number
  readonly tool: CursorTool
  readonly down: boolean
  readonly alpha: number
  readonly label: number
  readonly name: string
  readonly color: string
}

export interface BlockPaint {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** 是否正在施工（决定画不画选框） */
  readonly active: boolean
  /** 只画选框、不画尺寸文字的收尾阶段 */
  readonly sweeping: boolean
  readonly sizeText: string
}

export interface RipplePaint {
  readonly x: number
  readonly y: number
  readonly color: string
  /** 0..1 */
  readonly t: number
}

export interface Renderer {
  resize(width: number, height: number, dpr: number): void
  begin(scrollY: number): void
  /** 光标落点所在的方格：和页面底纹的 22px 网格对齐 */
  cell(paint: { x: number; y: number }, grid: number, color: string): void
  selection(paint: BlockPaint, theme: RenderTheme): void
  ripple(paint: RipplePaint): void
  cursor(paint: CursorPaint, theme: RenderTheme): void
  end(): void
}

/** dpr 上限：动画是装饰，宁可糊一点也不要把缓冲撑到 3 倍 */
const MAX_DPR = 1.6

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext('2d')
  let scale = 1
  let viewW = 0
  let viewH = 0
  /** 当前视口在页面坐标系里的上沿，用于把标签夹在屏幕内 */
  let viewTop = 0

  /** 标签一律留在屏幕里：贴边被裁掉半截比不画还难看 */
  const clampX = (value: number, width: number): number =>
    Math.max(4, Math.min(value, viewW - width - 4))
  const clampY = (value: number, height: number): number =>
    Math.max(viewTop + 4, Math.min(value, viewTop + viewH - height - 4))

  return {
    resize(width, height, dpr) {
      const next = Math.min(MAX_DPR, Math.max(1, dpr))
      viewW = width
      viewH = height
      if (next !== scale) {
        scale = next
        canvas.width = Math.round(width * scale)
        canvas.height = Math.round(height * scale)
      } else if (canvas.width !== Math.round(width * scale)) {
        canvas.width = Math.round(width * scale)
        canvas.height = Math.round(height * scale)
      }
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    },

    begin(scrollY) {
      if (!ctx) return
      viewTop = scrollY
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.clearRect(0, 0, viewW, viewH)
      ctx.save()
      ctx.translate(0, -scrollY)
    },

    cell({ x, y }, grid, color) {
      if (!ctx) return
      const gx = Math.floor(x / grid) * grid
      const gy = Math.floor(y / grid) * grid
      ctx.fillStyle = color
      ctx.fillRect(gx, gy, grid, grid)
    },

    selection(paint, theme) {
      if (!ctx) return
      const { x, y, w, h } = paint
      if (w < 2 || h < 2) return
      const left = Math.round(x) + 0.5
      const top = Math.round(y) + 0.5
      const right = Math.round(x + w) - 0.5
      const bottom = Math.round(y + h) - 0.5

      ctx.strokeStyle = theme.accent
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.strokeRect(left, top, right - left, bottom - top)
      ctx.setLineDash([])

      // 四角实心小方块，比虚线更像「选中」
      ctx.fillStyle = theme.accent
      const corners: Array<[number, number]> = [
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom],
      ]
      for (const [cx, cy] of corners) ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3)

      if (paint.sweeping && paint.sizeText) {
        ctx.font = '12px "Ark Pixel", ui-monospace, monospace'
        const boxW = Math.ceil(ctx.measureText(paint.sizeText).width) + 8
        // 贴在选框右下角内侧：光标这时正停在右下角，放外面会被名牌压住
        const tagX = clampX(Math.round(x + w) - boxW - 6, boxW)
        const tagY = clampY(Math.round(y + h) - 19 - 6, 19)
        ctx.fillStyle = theme.badge
        ctx.fillRect(tagX, tagY, boxW, 19)
        ctx.fillStyle = theme.badgeInk
        ctx.textBaseline = 'middle'
        ctx.fillText(paint.sizeText, tagX + 4, tagY + 10)
      }
    },

    ripple({ x, y, color, t }) {
      if (!ctx) return
      // 一小块实心方块向外撑开再消失，像「放下一块」；不做圆环，圆环太像加载态
      const size = 10 + t * 18
      ctx.globalAlpha = (1 - t) * 0.22
      ctx.fillStyle = color
      ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), Math.round(size), Math.round(size))
      ctx.globalAlpha = 1
    },

    cursor(paint, theme) {
      if (!ctx || paint.alpha <= 0.02) return
      const sprite = cursorSprite(paint.tool, { fill: paint.color, shadow: theme.shadow }, scale)
      // 按下时整体下沉 1px：和站点里按钮「硬投影 + 位移」的语言一致
      const press = paint.down ? 1 : 0
      ctx.globalAlpha = paint.alpha
      ctx.drawImage(sprite.canvas, paint.x - 1 + press, paint.y - 1 + press, sprite.w, sprite.h)

      if (paint.label > 0.03) {
        const tag = nameTag(paint.name, paint.color, theme.badgeInk, scale)
        ctx.globalAlpha = paint.alpha * paint.label
        const tagX = clampX(paint.x + sprite.w - 4, tag.w)
        const tagY = clampY(paint.y + sprite.h - 4, tag.h)
        ctx.drawImage(tag.canvas, tagX, tagY, tag.w, tag.h)
      }
      ctx.globalAlpha = 1
    },

    end() {
      ctx?.restore()
    },
  }
}
