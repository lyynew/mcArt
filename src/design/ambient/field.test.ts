import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAmbientField } from './field'
import { AmbientScene } from './scene'
import type { AmbientOptions } from './config'

/** 最小 DOM/rAF 假实现：验证资源所有权，不增加 jsdom 或动画依赖。 */
function eventHub() {
  const listeners = new Map<string, Set<(event: unknown) => void>>()
  return {
    addEventListener(type: string, listener: (event: unknown) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(listener)
    },
    removeEventListener(type: string, listener: (event: unknown) => void) { listeners.get(type)?.delete(listener) },
    emit(type: string, event: unknown = {}) { for (const listener of listeners.get(type) ?? []) listener(event) },
    get size() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0) },
  }
}

function fakeCanvas(context = true) {
  const ctx = {
    setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), drawImage: vi.fn(),
    imageSmoothingEnabled: true, globalAlpha: 1, fillStyle: '',
  }
  return { width: 0, height: 0, style: {}, getContext: () => context ? ctx : null, ctx }
}

function environment(reduced = false, context = true) {
  const frames = new Map<number, FrameRequestCallback>()
  let nextId = 0
  const mediaHub = eventHub()
  const windowHub = eventHub()
  const documentHub = eventHub()
  const media = { ...mediaHub, matches: reduced }
  const win = {
    ...windowHub, innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1.25,
    matchMedia: () => media,
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => { const id = nextId++; frames.set(id, callback); return id }),
    cancelAnimationFrame: vi.fn((id: number) => { frames.delete(id) }),
  }
  const doc = {
    ...documentHub, hidden: false,
    documentElement: { classList: { contains: () => false } },
    createElement: vi.fn(() => fakeCanvas()),
  }
  const canvas = fakeCanvas(context)
  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '' }))
  return {
    win, doc, media, frames, canvas, windowHub, documentHub, mediaHub,
    tick(now: number) {
      const callbacks = [...frames.values()]
      frames.clear()
      for (const callback of callbacks) callback(now)
    },
    field: (options: AmbientOptions = {}) => createAmbientField(canvas as unknown as HTMLCanvasElement, options),
  }
}

afterEach(() => { vi.unstubAllGlobals() })
beforeEach(() => { vi.restoreAllMocks() })

describe('AmbientField lifecycle', () => {
  it('重复 start 只有一个循环，rAF id 为零也能取消，卸载释放全部资源', () => {
    const env = environment()
    const field = env.field()
    field.start()
    field.start()
    expect(env.frames.size).toBe(1)
    field.stop()
    expect(env.frames.size).toBe(0)
    expect(env.win.cancelAnimationFrame).toHaveBeenCalledWith(0)
    field.start()
    env.tick(0)
    env.tick(20)
    expect(env.frames.size).toBe(1)
    field.destroy()
    field.destroy()
    field.start()
    expect(env.frames.size).toBe(0)
    expect(env.windowHub.size + env.documentHub.size + env.mediaHub.size).toBe(0)
    expect(env.canvas.width).toBe(0)
    expect(env.canvas.height).toBe(0)
  })

  it('后台暂停，返回后不追赶；显式 stop 不被可见性事件意外重启', () => {
    const env = environment()
    const step = vi.spyOn(AmbientScene.prototype, 'step')
    const field = env.field()
    field.start()
    env.tick(0)
    env.tick(20)
    const calls = env.canvas.ctx.drawImage.mock.calls.length
    env.doc.hidden = true
    env.documentHub.emit('visibilitychange')
    expect(env.frames.size).toBe(0)
    env.doc.hidden = false
    env.documentHub.emit('visibilitychange')
    expect(env.frames.size).toBe(1)
    env.tick(86_400_000)
    expect(step.mock.lastCall).toEqual([0])
    env.tick(86_401_000)
    expect(step.mock.lastCall).toEqual([0.1])
    expect(env.canvas.ctx.drawImage.mock.calls.length).toBeGreaterThan(calls)
    field.stop()
    env.documentHub.emit('visibilitychange')
    expect(env.frames.size).toBe(0)
    field.destroy()
  })

  it('系统减少动态效果时无循环，实时切换时正确停止和恢复', () => {
    const env = environment(true)
    const field = env.field()
    field.start()
    expect(env.frames.size).toBe(0)
    expect(env.canvas.ctx.drawImage).toHaveBeenCalled()
    env.mediaHub.emit('change', { matches: false })
    expect(env.frames.size).toBe(1)
    env.tick(0)
    env.mediaHub.emit('change', { matches: true })
    expect(env.frames.size).toBe(0)
    field.destroy()

    // 站点明确开启时，系统减少动效只作为初始默认，不覆盖用户选择。
    const override = env.field({ honorReducedMotion: false })
    override.start()
    expect(env.frames.size).toBe(1)
    override.destroy()
    expect(env.mediaHub.size).toBe(0)
  })

  it('合并连续 resize，渲染设备像素坐标和尺寸为整数且关闭平滑插值', () => {
    const env = environment()
    const field = env.field()
    field.start()
    env.win.innerWidth = 375
    env.win.innerHeight = 812
    for (let i = 0; i < 100; i += 1) env.windowHub.emit('resize')
    expect(env.frames.size).toBe(1)
    for (let now = 0; now < 5000; now += 20) env.tick(now)
    expect(env.canvas.width).toBe(Math.round(375 * 1.25))
    expect(env.canvas.ctx.imageSmoothingEnabled).toBe(false)
    expect(env.canvas.ctx.drawImage).toHaveBeenCalled()
    for (const args of env.canvas.ctx.drawImage.mock.calls as unknown as Array<[unknown, number, number, number, number]>) {
      expect(args.slice(1).every(Number.isInteger)).toBe(true)
    }
    field.destroy()
  })

  it('可配置帧率保留预算余数，不因为 rAF 间隔退化为半速', () => {
    const env = environment()
    const step = vi.spyOn(AmbientScene.prototype, 'step')
    const field = env.field({ maxFps: 30 })
    field.start()
    step.mockClear()
    for (let frame = 0; frame <= 120; frame += 1) env.tick(frame * 1000 / 60)
    expect(step.mock.calls.length).toBeGreaterThanOrEqual(59)
    expect(step.mock.calls.length).toBeLessThanOrEqual(62)
    field.destroy()
  })

  it('连续绘制复用精灵缓存，主题改变时重新取色', () => {
    const env = environment()
    const field = env.field()
    field.start()
    for (let now = 0; now < 10_000; now += 20) env.tick(now)
    const created = env.doc.createElement.mock.calls.length
    expect(created).toBeLessThanOrEqual(7)
    expect(env.canvas.ctx.drawImage.mock.calls.length).toBeGreaterThan(100)
    env.documentHub.emit('mcart:appearance')
    expect(env.doc.createElement.mock.calls.length).toBeGreaterThan(created)
    field.destroy()
  })

  it('背板像素预算有界，无可用 Canvas context 时不空转', () => {
    const env = environment(false, false)
    env.win.innerWidth = 7680
    env.win.innerHeight = 4320
    env.win.devicePixelRatio = 4
    const field = env.field()
    field.start()
    expect(env.frames.size).toBe(0)
    expect(env.canvas.width * env.canvas.height).toBeLessThanOrEqual(8_010_000)
    field.destroy()
  })

  it('多次挂载/卸载不会累积监听器或动画', () => {
    const env = environment()
    for (let i = 0; i < 100; i += 1) {
      const field = env.field()
      field.start()
      env.tick(i * 20)
      field.destroy()
      expect(env.frames.size).toBe(0)
      expect(env.windowHub.size + env.documentHub.size + env.mediaHub.size).toBe(0)
    }
  })
})
