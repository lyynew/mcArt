/* ============================================================
   首页施工动画引擎
   ------------------------------------------------------------
   把页面当成一块工地：若干个像素光标在页面上走来走去，把标题、
   段落、卡片一块块「建」出来。只依赖 DOM 与 canvas，不引 Vue，
   主题层通过 createPageBuilder() 拿走一个可 start/skip/destroy
   的句柄。

   几处刻意的设计：
   - 内容默认在 CSS 里是可见的，只有首屏脚本加了 mc-armed 才先
     隐藏；引擎一旦就绪就把这个类摘掉，改由内联样式接管，JS 挂
     掉也不会留下白页。
   - destroy() 会把 DOM 完整还原（innerHTML / 内联样式），所以
     「关掉动效」等价于回到静态站，而不是留下半成品。
   - 光标位置由进度算出来，快进只要把所有块置满即可。
   ============================================================ */

import { readCssColor as readColor, withAlpha } from '@/shared/color'
import { clamp01, easeInOutCubic, lerp } from './math'
import { createRenderer, type RenderTheme, type RipplePaint } from './renderer'
import { pickIdleSpot, pickNearest, type Pickable } from './scheduler'
import { clearSpriteCache } from './sprites'
import { blockDuration, exposeOf, poseOf, travelDuration, typedOf } from './timeline'
import { isBuildKind, type BuildKind, type CursorSpec, type CursorTool, type Pose, type Rect } from './types'

declare global {
  interface Window {
    /** 首屏脚本据此判断引擎是否已接管，避免把内容一直藏着（见 head-script.ts） */
    __mcBuilderReady?: boolean
  }
}

export interface PageBuilderOptions {
  /** 内容容器，里面的 [data-build] 会被施工 */
  readonly surface: HTMLElement
  /** 全屏 fixed 画布 */
  readonly canvas: HTMLCanvasElement
  readonly cursors: readonly CursorSpec[]
  /** 整体速度倍率，默认 1.35（原来的手工会偏慢） */
  readonly speed?: number
  /** 页面底纹的网格尺寸，光标会吸附到格子上，默认 22 */
  readonly grid?: number
  /** 全部建完之后回调（用于展示「重播」入口） */
  readonly onFinish?: () => void
}

export interface PageBuilder {
  start(): void
  skip(): void
  pause(): void
  resume(): void
  /** 运行中改速度：进度按秒推进，改完立刻生效，不会重启动画 */
  setSpeed(speed: number): void
  destroy(): void
}

interface Block {
  el: HTMLElement
  kind: BuildKind
  index: number
  rect: Rect
  duration: number
  time: number
  done: boolean
  owner: Cursor | null
  /** 打字块：每个字一个 span，以及各自的落点 */
  chars: HTMLElement[]
  carets: Rect[]
  caretEl: HTMLElement | null
  typed: number
  html: string | null
  sizeText: string
}

interface Cursor {
  spec: CursorSpec
  color: string
  x: number
  y: number
  tool: CursorTool
  down: boolean
  alpha: number
  label: number
  /** 已选定、正在飞过去的块 */
  target: Block | null
  /** 正在施工的块 */
  job: Block | null
  travel: { from: Pose; to: Pose; t: number; d: number } | null
  idle: { x: number; y: number } | null
}

const RIPPLE_LIFE = 0.3
/** 建完之后空闲漂浮的帧预算：约 28fps 就够顺，省电 */
const IDLE_FRAME = 1000 / 28
const IDLE_SPEED = 1.4

export function createPageBuilder(options: PageBuilderOptions): PageBuilder {
  const { surface, canvas, cursors: cursorSpecs, onFinish } = options
  let speed = options.speed ?? 1.35
  const grid = options.grid ?? 22
  const doc = document
  const root = doc.documentElement
  const renderer = createRenderer(canvas)

  let blocks: Block[] = []
  let cursors: Cursor[] = []
  let ripples: RipplePaint[] = []
  let frame = 0
  let last = 0
  let running = false
  let destroyed = false
  let finished = false
  let scrollY = 0
  let theme: RenderTheme = readTheme()

  function readTheme(): RenderTheme {
    const green = readColor('--green', '#4d7a2a')
    return {
      fill: green,
      shadow: withAlpha('#000000', 0.16),
      accent: green,
      badge: green,
      badgeInk: readColor('--green-ink', '#ffffff'),
      cell: withAlpha(green, 0.07),
    }
  }

  /* —— 扫描与准备 —— */

  function rectOf(el: Element): Rect {
    const r = el.getBoundingClientRect()
    return {
      x: r.left + window.scrollX,
      y: r.top + window.scrollY,
      w: r.width,
      h: r.height,
    }
  }

  /** 把块里的文字拆成逐字 span；拆之前先留一份原始 HTML 以便还原 */
  function splitChars(el: HTMLElement): HTMLElement[] {
    const spans: HTMLElement[] = []
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const texts: Text[] = []
    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      if (node.textContent && node.textContent.trim()) texts.push(node)
    }
    for (const node of texts) {
      const frag = doc.createDocumentFragment()
      for (const ch of Array.from(node.textContent ?? '')) {
        const span = doc.createElement('span')
        span.className = 'bt-ch'
        span.textContent = ch
        frag.append(span)
        spans.push(span)
      }
      node.replaceWith(frag)
    }
    return spans
  }

  function prepare(): void {
    const nodes = Array.from(surface.querySelectorAll<HTMLElement>('[data-build]'))
    blocks = []
    nodes.forEach((el, index) => {
      const raw = el.dataset.build
      if (!isBuildKind(raw)) return
      const kind = raw
      const html = kind === 'head' ? el.innerHTML : null
      const chars = kind === 'head' ? splitChars(el) : []
      const caretEl = kind === 'head' ? doc.createElement('span') : null
      if (caretEl) {
        caretEl.className = 'bt-caret'
        el.append(caretEl)
      }
      blocks.push({
        el,
        kind,
        index,
        rect: rectOf(el),
        duration: blockDuration(kind, (el.textContent ?? '').trim().length),
        time: 0,
        done: false,
        owner: null,
        chars,
        carets: [],
        caretEl,
        typed: 0,
        html,
        sizeText: '',
      })
    })
    measureCarets()
    // 接管显示：先按 0 进度铺一遍内联样式，再摘掉首屏脚本挂的隐藏类
    for (const block of blocks) {
      block.el.style.opacity = block.kind === 'text' || block.kind === 'card' || block.kind === 'rule' ? '0' : ''
      block.sizeText = `${Math.round(block.rect.w)} × ${Math.round(block.rect.h)}`
      applyBlock(block, 0)
    }
    root.classList.remove('mc-armed')
    root.classList.add('mc-building')
    surface.dataset.building = 'true'
    window.__mcBuilderReady = true
  }

  function measureCarets(): void {
    for (const block of blocks) {
      if (block.kind !== 'head' || block.chars.length === 0) continue
      const origin = block.rect
      block.carets = block.chars.map((span) => {
        const r = span.getBoundingClientRect()
        return {
          x: r.left + window.scrollX - origin.x,
          y: r.top + window.scrollY - origin.y,
          w: r.width,
          h: r.height,
        }
      })
    }
  }

  /** 重排/滚动后坐标会变，重新量一遍；不重建字符 */
  function remeasure(): void {
    for (const block of blocks) {
      block.rect = rectOf(block.el)
      block.sizeText = `${Math.round(block.rect.w)} × ${Math.round(block.rect.h)}`
    }
    measureCarets()
  }

  /* —— 应用进度 —— */

  function applyBlock(block: Block, p: number): void {
    if (block.kind === 'head') {
      const n = typedOf('head', p, block.chars.length)
      if (n !== block.typed) {
        for (let i = 0; i < block.chars.length; i += 1) {
          block.chars[i].classList.toggle('is-on', i < n)
        }
        block.typed = n
      }
      if (block.caretEl) {
        const spot = block.carets[Math.min(block.typed, block.carets.length - 1)]
        // 一个字都还没打（或已经打完）时不显示光标条，否则空块上会凭空出现一根竖线
        const typing = block.typed > 0 && block.typed < block.chars.length
        block.caretEl.style.display = typing && spot ? 'block' : 'none'
        if (spot && typing) {
          block.caretEl.style.transform = `translate(${spot.x}px, ${spot.y}px)`
          block.caretEl.style.height = `${spot.h}px`
        }
      }
      block.el.style.opacity = '1'
      return
    }

    const e = exposeOf(block.kind, p)
    block.el.style.opacity = e > 0.001 ? '1' : '0'
    block.el.style.clipPath =
      e >= 0.999 ? '' : `inset(0 ${(1 - e) * 100}% 0 0)`
  }

  /* —— 光标推进 —— */

  function makeCursors(): Cursor[] {
    return cursorSpecs.map((spec) => {
      const color = readColor(spec.colorVar, theme.fill)
      return {
        spec,
        color,
        x: 0,
        y: 0,
        tool: 'arrow',
        down: false,
        alpha: 0,
        label: 0,
        target: null,
        job: null,
        travel: null,
        idle: null,
      }
    })
  }

  function spawnCursors(): void {
    const h = window.innerHeight
    cursors.forEach((cursor, i) => {
      const t = i / Math.max(1, cursors.length - 1)
      cursor.x = 90 + t * (window.innerWidth - 220)
      cursor.y = scrollY + 120 + t * h * 0.32
    })
  }

  function assign(): void {
    const pool: Pickable[] = []
    for (const block of blocks) {
      if (block.done || block.owner || !block.el.isConnected) continue
      if (cursors.some((c) => c.target === block)) continue
      pool.push({ index: block.index, x: block.rect.x + block.rect.w * 0.25, y: block.rect.y + block.rect.h * 0.5 })
    }
    if (pool.length === 0) return

    for (const cursor of cursors) {
      if (cursor.job || cursor.target || pool.length === 0) continue
      const index = pickNearest(pool, { x: cursor.x, y: cursor.y }, 3)
      if (index === null) break
      const at = pool.findIndex((item) => item.index === index)
      if (at < 0) continue
      pool.splice(at, 1)

      const block = blocks.find((b) => b.index === index)
      if (!block) continue
      const from: Pose = { x: cursor.x, y: cursor.y, tool: cursor.tool, down: false }
      const to = poseOf(block.kind, block.rect, 0, null)
      cursor.target = block
      cursor.travel = {
        from,
        to,
        t: 0,
        d: travelDuration(Math.hypot(to.x - from.x, to.y - from.y)),
      }
    }
  }

  function updateCursor(cursor: Cursor, dt: number): void {
    if (cursor.travel && cursor.target) {
      const travel = cursor.travel
      travel.t += dt * speed
      const k = clamp01(travel.t / travel.d)
      const e = easeInOutCubic(k)
      cursor.x = lerp(travel.from.x, travel.to.x, e)
      cursor.y = lerp(travel.from.y, travel.to.y, e)
      cursor.tool = k > 0.75 ? travel.to.tool : 'arrow'
      cursor.down = false
      if (k >= 1) {
        cursor.job = cursor.target
        cursor.job.owner = cursor
        cursor.job.time = 0
        cursor.target = null
        cursor.travel = null
        ripples.push({ x: cursor.x, y: cursor.y, color: cursor.color, t: 0 })
      }
      cursor.alpha = Math.min(1, cursor.alpha + dt * 4)
      cursor.label = Math.min(1, cursor.label + dt * 3)
      return
    }

    if (cursor.job) {
      const block = cursor.job
      block.time = Math.min(block.duration, block.time + dt * speed)
      const p = block.time / block.duration
      applyBlock(block, p)
      const caret = block.kind === 'head' ? caretOf(block) : null
      const pose = poseOf(block.kind, block.rect, p, caret)
      cursor.x = pose.x
      cursor.y = pose.y
      cursor.tool = pose.tool
      cursor.down = pose.down
      if (block.time >= block.duration) {
        block.done = true
        block.owner = null
        cursor.job = null
        cursor.tool = 'arrow'
        cursor.down = false
      }
      cursor.alpha = Math.min(1, cursor.alpha + dt * 4)
      cursor.label = Math.min(1, cursor.label + dt * 3)
      return
    }

    // 闲着：在可视范围里慢慢飘
    const bounds = {
      x: 40,
      y: scrollY + 90,
      w: Math.max(120, window.innerWidth - 80),
      h: Math.max(120, window.innerHeight - 200),
    }
    if (!cursor.idle || Math.hypot(cursor.idle.x - cursor.x, cursor.idle.y - cursor.y) < 8) {
      cursor.idle = pickIdleSpot(
        bounds,
        cursors.filter((c) => c !== cursor).map((c) => ({ x: c.x, y: c.y })),
      )
    }
    const k = 1 - Math.exp(-dt * IDLE_SPEED)
    cursor.x = lerp(cursor.x, cursor.idle.x, k)
    cursor.y = lerp(cursor.y, cursor.idle.y, k)
    cursor.tool = 'arrow'
    cursor.down = false
    // 空闲时略淡一点：还在，但不抢正文的注意力
    cursor.alpha = Math.min(0.9, cursor.alpha + dt * 3)
    cursor.label = Math.min(1, cursor.label + dt * 2)
  }

  /** 打字块当前光标该落在哪个字的左上角（块局部坐标 → 页面坐标） */
  function caretOf(block: Block): { x: number; y: number; h: number } | null {
    if (block.carets.length === 0) return null
    const index = Math.min(Math.max(block.typed - 1, 0), block.carets.length - 1)
    const spot = block.carets[index]
    return { x: block.rect.x + spot.x, y: block.rect.y + spot.y, h: spot.h }
  }

  /* —— 主循环 —— */

  function visible(block: Block): boolean {
    const top = block.rect.y - scrollY
    return top < window.innerHeight + 120 && top + block.rect.h > -120
  }

  function draw(): void {
    scrollY = window.scrollY
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1)
    renderer.begin(scrollY)

    for (const block of blocks) {
      if (block.done || !visible(block)) continue
      const building = block.owner !== null
      if (!building) continue
      renderer.selection(
        {
          x: block.rect.x,
          y: block.rect.y,
          w: block.rect.w,
          h: block.rect.h,
          active: true,
          sweeping: block.kind === 'text' || block.kind === 'card',
          sizeText: block.sizeText,
        },
        theme,
      )
    }

    for (const cursor of cursors) {
      // 网格格只在「按下」时画：这时才是往格子上放东西，平时画反而像渲染残影
      if (cursor.job && cursor.down) renderer.cell({ x: cursor.x, y: cursor.y }, grid, theme.cell)
    }
    for (const ripple of ripples) renderer.ripple(ripple)
    for (const cursor of cursors) {
      renderer.cursor(
        {
          x: cursor.x,
          y: cursor.y,
          tool: cursor.tool,
          down: cursor.down,
          alpha: cursor.alpha,
          label: cursor.label,
          name: cursor.spec.name,
          color: cursor.color,
        },
        theme,
      )
    }
    renderer.end()
  }

  function tick(now: number): void {
    if (!running || destroyed) return
    // 建完之后光标仍然在页面上闲逛，但没必要跑满 60fps
    if (finished && now - last < IDLE_FRAME) {
      frame = window.requestAnimationFrame(tick)
      return
    }
    const dt = last === 0 ? 0.016 : Math.min(0.05, (now - last) / 1000)
    last = now

    for (const cursor of cursors) updateCursor(cursor, dt)
    assign()

    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      const ripple = ripples[i]
      const next = { ...ripple, t: ripple.t + dt / RIPPLE_LIFE }
      if (next.t >= 1) ripples.splice(i, 1)
      else ripples[i] = next
    }

    draw()

    if (!finished && blocks.every((block) => block.done || !block.el.isConnected)) {
      finished = true
      // 收尾不清场：光标继续留着，之后走 updateCursor 里的空闲分支
      finish()
    }
    frame = window.requestAnimationFrame(tick)
  }

  function finish(): void {
    if (destroyed) return
    for (const cursor of cursors) {
      cursor.job = null
      cursor.target = null
      cursor.travel = null
    }
    root.classList.remove('mc-building')
    surface.dataset.building = 'done'
    onFinish?.()
  }

  function start(): void {
    running = true
    last = 0
    frame = window.requestAnimationFrame(tick)
  }

  function stop(): void {
    running = false
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
  }

  /* —— 生命周期 —— */

  let onResize: (() => void) | null = null
  let onScroll: (() => void) | null = null
  let onAppearance: (() => void) | null = null
  let onVisibility: (() => void) | null = null

  function mount(): void {
    prepare()
    cursors = makeCursors()
    spawnCursors()
    onResize = () => {
      remeasure()
      draw()
    }
    // 滚动只改变「往哪看」，块坐标是页面坐标，不需要重新量
    onScroll = () => {
      if (!destroyed) draw()
    }
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    if (doc.fonts) {
      void doc.fonts.ready.then(() => {
        if (destroyed) return
        clearSpriteCache()
        remeasure()
        draw()
      })
    }
    onAppearance = () => {
      theme = readTheme()
      for (const cursor of cursors) cursor.color = readColor(cursor.spec.colorVar, theme.fill)
      clearSpriteCache()
      draw()
    }
    doc.addEventListener('mcart:appearance', onAppearance)
    onVisibility = () => {
      if (doc.hidden) stop()
      else if (!destroyed) start()
    }
    doc.addEventListener('visibilitychange', onVisibility)
  }

  function restore(): void {
    for (const block of blocks) {
      block.el.style.opacity = ''
      block.el.style.clipPath = ''
      if (block.html !== null) block.el.innerHTML = block.html
      block.caretEl?.remove()
    }
    blocks = []
    cursors = []
    ripples = []
    root.classList.remove('mc-building')
    delete surface.dataset.building
  }

  mount()

  return {
    start,
    skip() {
      if (destroyed) return
      for (const block of blocks) {
        block.time = block.duration
        applyBlock(block, 1)
        block.done = true
        block.owner = null
      }
      for (const cursor of cursors) {
        cursor.job = null
        cursor.target = null
        cursor.travel = null
      }
      if (!finished) {
        finished = true
        finish()
      }
      draw()
    },
    pause: stop,
    resume() {
      if (!destroyed) start()
    },
    setSpeed(next) {
      if (Number.isFinite(next) && next > 0) speed = next
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      stop()
      if (onResize) {
        window.removeEventListener('resize', onResize)
      }
      if (onScroll) {
        window.removeEventListener('scroll', onScroll)
      }
      if (onAppearance) doc.removeEventListener('mcart:appearance', onAppearance)
      if (onVisibility) doc.removeEventListener('visibilitychange', onVisibility)
      restore()
      renderer.resize(0, 0, 1)
    },
  }
}
