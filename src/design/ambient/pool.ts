/* 图案占用池：淡入、停留、淡出都持有同一份租约；完全移除后才能释放。 */
import type { Pattern } from './patterns'

/** 不只比较名字：别名指向同一幅像素画时也不能同时显示。忽略空白边。 */
export function patternKey(pattern: Pattern): string {
  const minX = Math.min(...pattern.cells.map((cell) => cell.x))
  const minY = Math.min(...pattern.cells.map((cell) => cell.y))
  return pattern.cells
    .map((cell) => `${cell.x - minX},${cell.y - minY},${cell.tone}`)
    .sort()
    .join(';')
}

export class PatternPool {
  private readonly keys = new Map<Pattern, string>()
  private readonly occupied = new Set<string>()
  private readonly owners = new Set<Pattern>()
  private readonly lastUsed = new Map<string, number>()
  private sequence = 0

  constructor(private readonly patterns: readonly Pattern[], private readonly random: () => number) {
    const names = new Set<string>()
    for (const pattern of patterns) {
      if (!pattern.name.trim() || names.has(pattern.name) || !pattern.cells.length ||
          !Number.isInteger(pattern.cols) || !Number.isInteger(pattern.rows) || pattern.cols <= 0 || pattern.rows <= 0) {
        throw new Error(`无效或重名图案 ${pattern.name}`)
      }
      const pixels = new Set<string>()
      for (const cell of pattern.cells) {
        const coordinate = `${cell.x},${cell.y}`
        if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0 ||
            cell.x >= pattern.cols || cell.y >= pattern.rows || !Number.isInteger(cell.tone) ||
            cell.tone < 0 || cell.tone > 11 || pixels.has(coordinate)) {
          throw new Error(`图案 ${pattern.name} 包含非法或重复像素`)
        }
        pixels.add(coordinate)
      }
      names.add(pattern.name)
      this.keys.set(pattern, patternKey(pattern))
    }
  }

  get size(): number { return this.occupied.size }

  /** 先随机打散同优先级图案，再优先最久未用者；失败落点不占用图案。 */
  acquire(accept: (pattern: Pattern) => boolean): Pattern | null {
    const candidates = this.patterns.filter((pattern) => !this.occupied.has(this.keys.get(pattern)!))
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    candidates.sort((a, b) => (this.lastUsed.get(this.keys.get(a)!) ?? -1) - (this.lastUsed.get(this.keys.get(b)!) ?? -1))
    for (const pattern of candidates) {
      if (!accept(pattern)) continue
      const key = this.keys.get(pattern)!
      this.occupied.add(key)
      this.owners.add(pattern)
      this.lastUsed.set(key, this.sequence++)
      return pattern
    }
    return null
  }

  release(pattern: Pattern): void {
    // 别名不能释放另一图案的占位。
    if (!this.owners.delete(pattern)) return
    this.occupied.delete(this.keys.get(pattern)!)
  }

  clear(): void {
    this.occupied.clear()
    this.owners.clear()
    this.lastUsed.clear()
    this.sequence = 0
  }
}
