/* 环境层生命周期：唯一 rAF、尺寸合并、后台暂停、主题和系统减少动效偏好。 */
import type { AmbientOptions } from './config'
import { AmbientRenderer, type AmbientViewport } from './renderer'
import { AmbientScene } from './scene'

export type { AmbientOptions } from './config'

export interface AmbientField {
  start(): void
  stop(): void
  destroy(): void
}

export function createAmbientField(canvas: HTMLCanvasElement, options: AmbientOptions = {}): AmbientField {
  const scene = new AmbientScene(options)
  const renderer = new AmbientRenderer(canvas)
  const config = scene.config
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const cleanups: Array<() => void> = []
  let viewport: AmbientViewport
  let frame: number | null = null
  let enabled = false
  let destroyed = false
  let resized = false
  let reduced = config.honorReducedMotion && media.matches
  let last: number | null = null
  let renderedAt: number | null = null

  function layout(): void {
    // 用 clientWidth 而不是 innerWidth：后者含滚动条那 15px，
    // canvas 会横向溢出，靠右的元素就被切掉了
    const width = Math.max(1, document.documentElement.clientWidth || window.innerWidth)
    const height = Math.max(1, document.documentElement.clientHeight || window.innerHeight)
    const scale = Math.min(config.maxDpr, window.devicePixelRatio || 1, Math.sqrt(config.maxPixels / (width * height)))
    const compact = width < config.compactBreakpoint
    const pixel = Math.max(1, Math.round(config.cell * (compact ? config.compactScale : 1) * scale))
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    viewport = { width, height, scale, pixel, compact }
    scene.resize(Math.floor(canvas.width / pixel), Math.floor(canvas.height / pixel), compact)
    resized = false
    if (reduced) {
      // 少量静态图案，一次填充后不再申请 rAF 或自动轮换。
      for (let i = scene.elements.length; i < scene.target; i += 1) scene.step(config.spawnInterval)
    } else {
      scene.step(0)
    }
  }

  function draw(): void { renderer.draw(scene, viewport, reduced) }

  function cancel(): void {
    if (frame !== null) window.cancelAnimationFrame(frame)
    frame = null
    last = null
    renderedAt = null
  }

  function queue(): void {
    if (frame === null && enabled && !destroyed && !document.hidden && !reduced && renderer.available) {
      frame = window.requestAnimationFrame(tick)
    }
  }

  function tick(now: number): void {
    frame = null
    if (!enabled || destroyed || document.hidden || reduced) return
    if (resized) layout()
    const interval = 1000 / config.maxFps
    const elapsed = renderedAt === null ? interval : now - renderedAt
    if (elapsed >= interval - 0.1) {
      // 保留帧预算余数，30/45fps 配置不会退化成不规律的半速；后台不追赶。
      const delta = last === null ? 0 : Math.max(0, Math.min(config.maxDelta, (now - last) / 1000))
      last = now
      const intervals = Math.max(1, Math.floor((elapsed + 0.1) / interval))
      renderedAt = renderedAt === null ? now : renderedAt + intervals * interval
      scene.step(delta)
      draw()
    }
    queue()
  }

  function start(): void {
    if (destroyed || enabled) return
    enabled = true
    if (resized) layout()
    draw()
    queue()
  }

  function stop(): void {
    enabled = false
    cancel()
  }

  function onResize(): void {
    resized = true
    // 动画运行时合并到下一帧；静态/暂停时只响应这一事件，不另开循环。
    if (reduced || !enabled || document.hidden) {
      layout()
      draw()
    } else queue()
  }

  function onAppearance(): void {
    renderer.refreshTheme()
    draw()
  }

  function onVisibility(): void {
    cancel()
    if (!document.hidden && enabled) {
      if (resized) layout()
      draw()
      queue()
    }
  }

  function onReducedMotion(event: MediaQueryListEvent): void {
    if (!config.honorReducedMotion) return
    reduced = event.matches
    cancel()
    if (reduced) layout()
    draw()
    queue()
  }

  layout()
  draw()
  window.addEventListener('resize', onResize, { passive: true })
  document.addEventListener('mcart:appearance', onAppearance)
  document.addEventListener('visibilitychange', onVisibility)
  media.addEventListener('change', onReducedMotion)
  cleanups.push(
    () => window.removeEventListener('resize', onResize),
    () => document.removeEventListener('mcart:appearance', onAppearance),
    () => document.removeEventListener('visibilitychange', onVisibility),
    () => media.removeEventListener('change', onReducedMotion),
  )

  return {
    start, stop,
    destroy() {
      if (destroyed) return
      destroyed = true
      stop()
      for (const off of cleanups.splice(0)) off()
      scene.clear()
      renderer.destroy()
    },
  }
}
