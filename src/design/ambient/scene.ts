/* 场景调度：图案生成、占用、错峰轮换和尺寸变化。纯逻辑，不持有 DOM/rAF。 */
import { resolveAmbientConfig, type AmbientConfig, type AmbientOptions } from './config'
import { elementBudget, overlaps, pickSpot, type Rect } from './grid'
import { lifeSpan, stageOf, type LifeWindow } from './life'
import type { Drift } from './motion'
import { PATTERNS, type Pattern } from './patterns'
import { PatternPool } from './pool'

export interface AmbientElement {
  readonly id: number
  readonly pattern: Pattern
  /** 为完整轨迹预留的包络矩形，含淡出元素。 */
  box: Rect
  readonly born: number
  readonly life: LifeWindow
  readonly drift: Drift
  readonly seed: number
}

export class AmbientScene {
  readonly config: AmbientConfig
  private readonly random: () => number
  private readonly pool: PatternPool
  private live: AmbientElement[] = []
  private cols = 0
  private rows = 0
  private budget = 0
  private serial = 0
  private clock = 0
  private spawnAt = 0

  constructor(options: AmbientOptions = {}) {
    this.config = resolveAmbientConfig(options)
    this.random = options.random ?? Math.random
    this.pool = new PatternPool(options.patterns ?? PATTERNS, this.random)
  }

  get elements(): readonly AmbientElement[] { return this.live }
  get time(): number { return this.clock }
  get occupiedCount(): number { return this.pool.size }
  get target(): number { return this.budget }
  get reserve(): number { return Math.ceil(this.config.driftCells) }

  resize(cols: number, rows: number, compact = false): void {
    const oldCols = this.cols
    const oldRows = this.rows
    this.cols = Number.isFinite(cols) ? Math.max(0, Math.floor(cols)) : 0
    this.rows = Number.isFinite(rows) ? Math.max(0, Math.floor(rows)) : 0
    this.budget = Math.min(this.config.maxElements, compact ? this.config.compactCount : elementBudget(this.cols, this.rows))
    const previous = this.live
    this.live = []
    for (const element of previous) {
      const { w, h } = element.box
      const x = Math.max(1, Math.min(this.cols - w - 1, Math.round(element.box.x * this.cols / Math.max(1, oldCols))))
      const y = Math.max(1, Math.min(this.rows - h - 1, Math.round(element.box.y * this.rows / Math.max(1, oldRows))))
      const box = { x, y, w, h }
      const taken = this.live.map((item) => item.box)
      const fits = x + w <= this.cols - 1 && y + h <= this.rows - 1 && taken.every((other) => !overlaps(box, other, this.config.spacing))
      const spot = fits ? box : pickSpot({ cols: this.cols, rows: this.rows, w, h, taken, rand: this.random, pad: this.config.spacing })
      if (!spot || this.live.length >= this.budget) {
        this.pool.release(element.pattern)
        continue
      }
      element.box = { ...spot, w, h }
      this.live.push(element)
    }
    this.spawnAt = this.clock
  }

  private spawn(): boolean {
    let box: Rect | null = null
    const taken = this.live.map((element) => element.box)
    const pattern = this.pool.acquire((candidate) => {
      const w = candidate.cols + this.reserve * 2
      const h = candidate.rows + this.reserve * 2
      const spot = pickSpot({ cols: this.cols, rows: this.rows, w, h, taken, rand: this.random, pad: this.config.spacing })
      if (!spot) return false
      box = { ...spot, w, h }
      return true
    })
    if (!pattern || !box) return false
    const range = (values: readonly [number, number]): number => values[0] + this.random() * (values[1] - values[0])
    this.live.push({
      id: this.serial++, pattern, box, born: this.clock,
      life: { fadeIn: this.config.fadeIn, hold: range(this.config.hold), fadeOut: this.config.fadeOut },
      drift: { phase: this.random() * Math.PI * 2, period: range(this.config.driftPeriod), amplitude: this.config.driftCells },
      seed: this.random(),
    })
    return true
  }

  step(delta: number): void {
    if (!Number.isFinite(delta) || delta < 0) return
    this.clock += delta
    this.live = this.live.filter((element) => {
      if (this.clock - element.born < lifeSpan(element.life)) return true
      this.pool.release(element.pattern)
      return false
    })
    const present = this.live.filter((element) => stageOf(this.clock - element.born, element.life).stage !== 'out').length
    if (present >= this.budget || this.live.length >= this.budget + this.config.maxTransitions || this.clock < this.spawnAt) return
    // 每轮最多尝试一次；失败等候，而不是每帧自旋或重复使用仍在淡出的图案。
    this.spawnAt = this.clock + (this.spawn() ? this.config.spawnInterval : this.config.retryInterval)
  }

  clear(): void {
    this.live = []
    this.pool.clear()
    this.clock = 0
    this.serial = 0
    this.spawnAt = 0
  }
}
