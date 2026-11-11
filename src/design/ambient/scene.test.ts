import { describe, expect, it } from 'vitest'
import { resolveAmbientConfig } from './config'
import { overlaps } from './grid'
import { stageOf } from './life'
import { driftAt } from './motion'
import { PATTERNS, parsePattern, type Pattern } from './patterns'
import { patternKey } from './pool'
import { AmbientScene } from './scene'

function seeded(seed = 42): () => number {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
}

const keys = new Map<Pattern, string>()
function key(pattern: Pattern): string {
  if (!keys.has(pattern)) keys.set(pattern, patternKey(pattern))
  return keys.get(pattern)!
}

function assertScene(scene: AmbientScene): void {
  const elements = scene.elements
  if (new Set(elements.map((element) => key(element.pattern))).size !== elements.length) throw new Error('图案重复，包括淡出阶段')
  if (scene.occupiedCount !== elements.length) throw new Error('占用泄漏或提前释放')
  if (elements.length > scene.target + scene.config.maxTransitions) throw new Error('过渡预算超限')
  for (let i = 0; i < elements.length; i += 1) {
    const element = elements[i]
    const drift = driftAt(scene.time - element.born, element.drift)
    if (![drift.x, drift.y, element.box.x, element.box.y].every(Number.isFinite)) throw new Error('坐标异常')
    for (const other of elements.slice(i + 1)) {
      if (overlaps(element.box, other.box, scene.config.spacing)) throw new Error('完整运动包络发生碰撞')
    }
  }
}

describe('AmbientScene', () => {
  const quick = { maxElements: 1, maxTransitions: 1, fadeIn: 1, hold: [1, 1] as const, fadeOut: 1, spawnInterval: 0.1, retryInterval: 0.1 }
  it('淡出旧图和淡入新图并存，但旧图仍占用且不能重复', () => {
    const scene = new AmbientScene({ ...quick, patterns: PATTERNS.slice(0, 2), random: seeded() })
    scene.resize(80, 60)
    scene.step(0)
    const old = scene.elements[0]
    scene.step(2)
    expect(scene.elements).toHaveLength(2)
    expect(stageOf(scene.time - old.born, old.life).stage).toBe('out')
    expect(scene.elements[1].pattern.name).not.toBe(old.pattern.name)
    expect(scene.occupiedCount).toBe(2)
    assertScene(scene)
    scene.step(1)
    expect(scene.elements).toHaveLength(1)
    expect(scene.elements[0].id).not.toBe(old.id)
  })

  it('库耗尽时宁可等候，也不提前释放淡出图案', () => {
    const scene = new AmbientScene({ ...quick, patterns: PATTERNS.slice(0, 1), random: seeded() })
    scene.resize(80, 60)
    scene.step(0)
    const old = scene.elements[0]
    scene.step(2)
    expect(scene.elements).toEqual([old])
    expect(scene.occupiedCount).toBe(1)
    scene.step(0.9)
    expect(scene.elements[0].id).toBe(old.id)
    scene.step(0.11)
    expect(scene.elements).toHaveLength(1)
    expect(scene.elements[0].id).not.toBe(old.id)
  })

  it('尺寸受限时继续尝试可放下的图案；极小视口不自旋、不占用', () => {
    const small = parsePattern('small', ['gg', 'xx'])
    const scene = new AmbientScene({ patterns: [PATTERNS[0], small], random: seeded(), maxElements: 3 })
    scene.resize(8, 8)
    scene.step(0)
    expect(scene.elements[0].pattern.name).toBe('small')
    scene.resize(1, 1)
    for (let i = 0; i < 100; i += 1) scene.step(1)
    expect(scene.elements).toHaveLength(0)
    expect(scene.occupiedCount).toBe(0)
    scene.resize(80, 60)
    scene.step(0)
    expect(scene.elements).toHaveLength(1)
  })

  it('模拟 24 小时轮换与反复缩放：所有阶段去重，数量和坐标持续有界', () => {
    const scene = new AmbientScene({ random: seeded() })
    scene.resize(120, 75)
    const seen = new Set<string>()
    let lastId = -1
    let transitions = 0
    for (let frame = 0; frame < 24 * 60 * 60 * 2; frame += 1) {
      if (frame % 2400 === 0) {
        const compact = (frame / 2400) % 2 === 1
        scene.resize(compact ? 38 : 120, compact ? 80 : 75, compact)
      }
      scene.step(0.5)
      assertScene(scene)
      for (const element of scene.elements) {
        seen.add(element.pattern.name)
        lastId = Math.max(lastId, element.id)
      }
      if (scene.elements.some((element) => stageOf(scene.time - element.born, element.life).stage === 'out')) transitions += 1
    }
    expect(seen.size).toBe(PATTERNS.length)
    expect(lastId).toBeGreaterThan(10_000)
    expect(transitions).toBeGreaterThan(10_000)
    scene.clear()
    expect(scene.elements).toHaveLength(0)
    expect(scene.occupiedCount).toBe(0)
  })

  it('非法时间不污染场景，配置边界明确报错', () => {
    const scene = new AmbientScene()
    for (const delta of [NaN, Infinity, -1]) scene.step(delta)
    expect(scene.time).toBe(0)
    expect(() => resolveAmbientConfig({ cell: 0 })).toThrow()
    expect(() => resolveAmbientConfig({ opacity: 2 })).toThrow()
    expect(() => resolveAmbientConfig({ hold: [3, 2] })).toThrow()
    expect(() => resolveAmbientConfig({ maxFps: NaN })).toThrow()
    expect(() => resolveAmbientConfig({ maxElements: 2.5 })).toThrow()
  })
})
