import { describe, expect, it } from 'vitest'
import { BLOCKS_BY_ID } from '@/core/blocks'
import { demoStructure } from './demo-structure'
import { cellsOf, denseLayerOf, materialCounts, projectionOf } from './projection'

/**
 * 示例结构是空状态唯一的出口，坏了就等于把「试一试」这条路过死。
 * 这里校验三件事：尺寸对得上、每层确实是空心的、用到的方块都真实存在。
 */
describe('demoStructure', () => {
  const { structure } = demoStructure()
  const projection = projectionOf(structure.size)

  it('是 32×32×16，沿 y 轴分层', () => {
    expect(structure.size).toEqual([32, 16, 32])
    expect(projection.kind).toBe('top')
    expect(projection.axis).toBe(1)
  })

  it('每层只有最外一圈，层数越高越小', () => {
    const ring = (layer: number) => cellsOf(structure, layer, projection).filter(Boolean).length
    expect(ring(0)).toBe(4 * 32 - 4)
    expect(ring(8)).toBe(4 * 16 - 4)
    expect(ring(15)).toBe(4)
    for (let i = 1; i < 16; i++) expect(ring(i)).toBeLessThan(ring(i - 1))
  })

  it('默认停在第 0 层（方块最多的一层）', () => {
    expect(denseLayerOf(structure, projection)).toBe(0)
  })

  it('用到的方块都能在图鉴里找到', () => {
    for (const m of materialCounts(structure)) {
      expect(BLOCKS_BY_ID.has(m.id.replace(/^minecraft:/, ''))).toBe(true)
    }
    const total = materialCounts(structure).reduce((n, m) => n + m.count, 0)
    expect(total).toBe(structure.blocks.length)
  })
})
