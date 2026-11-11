/* Canvas 绘制：缓存原生像素精灵，整幅图案只做平移和透明度过渡。 */
import { readCssColor } from '@/shared/color'
import { stageOf } from './life'
import { driftAt, smoothstep } from './motion'
import type { Pattern, PatternTone } from './patterns'
import type { AmbientScene } from './scene'

export interface AmbientViewport {
  readonly width: number
  readonly height: number
  readonly scale: number
  /** 每个图案像素对应的整数设备像素数。 */
  readonly pixel: number
  readonly compact: boolean
}

type Palette = Readonly<Record<PatternTone, string>>


function readPalette(): Palette {
  return {
    0: readCssColor('--ink-3', '#8a877c'),
    1: readCssColor('--green', '#4d7a2a'),
    2: '#c4a14a', 3: '#b85c53', 4: '#67a9ac',
    // 轮廓始终是炭黑；暗色主题不把苦力怕的眼嘴反转成白色。
    5: '#1b1a16',
    6: '#957354', 7: '#dfdac4', 8: '#365b2d',
    9: '#417477', 10: '#6e533c', 11: '#814840',
  }
}

export class AmbientRenderer {
  private readonly ctx: CanvasRenderingContext2D | null
  private readonly sprites = new Map<Pattern, HTMLCanvasElement>()
  private palette = readPalette()
  private dim = 1

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')
    this.refreshTheme()
  }

  get available(): boolean { return this.ctx !== null }

  refreshTheme(): void {
    this.palette = readPalette()
    this.dim = document.documentElement.classList.contains('dark') ? 0.72 : 1
    this.sprites.clear()
  }

  private sprite(pattern: Pattern): HTMLCanvasElement | null {
    const cached = this.sprites.get(pattern)
    if (cached) return cached
    const image = document.createElement('canvas')
    image.width = pattern.cols
    image.height = pattern.rows
    const ctx = image.getContext('2d')
    if (!ctx) return null
    // 在原生分辨率画满像素；统一使用图例的材质色，没有字形/模糊/旋转。
    for (const cell of pattern.cells) {
      ctx.fillStyle = this.palette[cell.tone]
      ctx.fillRect(cell.x, cell.y, 1, 1)
    }
    this.sprites.set(pattern, image)
    return image
  }

  draw(scene: AmbientScene, viewport: AmbientViewport, reduced = false): void {
    const ctx = this.ctx
    if (!ctx) return
    this.clear()
    ctx.imageSmoothingEnabled = false
    const base = scene.config.opacity * this.dim * (viewport.compact ? scene.config.compactOpacity : 1)
    for (const element of scene.elements) {
      const age = scene.time - element.born
      const { stage, t } = stageOf(age, element.life)
      const visibility = reduced ? 1 : stage === 'out' ? 1 - smoothstep(t) : smoothstep(t)
      // 整体、低幅度呼吸，不逐格闪烁，也不在阶段边界跳变。
      const pulse = reduced ? 1 : 0.96 + 0.04 * Math.sin(age * 0.45 + element.seed * Math.PI * 2)
      if (visibility <= 0) continue
      const image = this.sprite(element.pattern)
      if (!image) continue
      // 减少动效时场景时钟冻结，保留当前位置而不是突然跳回轨迹起点。
      const drift = driftAt(age, element.drift)
      const x = Math.round((element.box.x + scene.reserve + drift.x) * viewport.pixel)
      const y = Math.round((element.box.y + scene.reserve + drift.y) * viewport.pixel)
      ctx.globalAlpha = base * visibility * pulse
      ctx.drawImage(image, x, y, element.pattern.cols * viewport.pixel, element.pattern.rows * viewport.pixel)
    }
    ctx.globalAlpha = 1
  }

  clear(): void {
    if (!this.ctx) return
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  destroy(): void {
    this.clear()
    this.sprites.clear()
    // 卸载/手动关动效时释放可达数 MB 的背板内存。
    this.canvas.width = 0
    this.canvas.height = 0
  }
}
