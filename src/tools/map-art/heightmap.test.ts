import { describe, expect, it } from 'vitest'
import { MAP_PIXELS, MAP_SIZE, shadeToStep } from './model'
import { buildHeightMap } from './heightmap'

const SNOW = 8 * 4

function uniform(shade: number): Uint8Array {
  return new Uint8Array(MAP_PIXELS).fill(SNOW + shade)
}

function alternating(): Uint8Array {
  const c = new Uint8Array(MAP_PIXELS)
  for (let i = 0; i < MAP_PIXELS; i++) c[i] = SNOW + (i % 2 === 0 ? 0 : 2)
  return c
}

/** 前 64 列先降 30 格，后 64 列先升 30 格，其余同高 */
function splitColumns(): Uint8Array {
  const c = new Uint8Array(MAP_PIXELS)
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const shade = z < 30 ? (x < 64 ? 0 : 2) : 1
      c[z * MAP_SIZE + x] = SNOW + shade
    }
  }
  return c
}

/** 每一格的高度差符号必须等于它色号里的明暗档 */
function expectShadesMatch(colors: Uint8Array, compress: boolean): void {
  const m = buildHeightMap(colors, { compress, noobline: true })
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let z = 0; z < MAP_SIZE; z++) {
      const i = z * MAP_SIZE + x
      const north = z === 0 ? m.noobline[x]! : m.heights[i - MAP_SIZE]!
      const sign = Math.sign(m.heights[i]! - north)
      expect(sign).toBe(shadeToStep(colors[i]! & 3))
    }
  }
}

describe('buildHeightMap', () => {
  it('平铺：所有格子同高，不需要支撑方块', () => {
    const m = buildHeightMap(uniform(1), { compress: true, noobline: true })
    expect(m.heights.every((h) => h === 0)).toBe(true)
    expect(m.noobline.every((h) => h === 0)).toBe(true)
    expect(m.maxHeight).toBe(0)
    expect(m.supportBlocks).toBe(0)
    expect(m.topBlocks).toBe(MAP_PIXELS + MAP_SIZE)
    expect(m.totalBlocks).toBe(MAP_PIXELS + MAP_SIZE)
  })

  it('逐格上升：高度按行 +1，noobline 保持北侧参照', () => {
    const m = buildHeightMap(uniform(2), { compress: false, noobline: true })
    for (let z = 0; z < MAP_SIZE; z++) {
      expect(m.heights[z * MAP_SIZE]!).toBe(z + 1)
    }
    expect(m.maxHeight).toBe(MAP_SIZE)
    expect(m.noobline[0]).toBe(0)
  })

  it('压缩与否都保持明暗档', () => {
    expectShadesMatch(alternating(), false)
    expectShadesMatch(alternating(), true)
    expectShadesMatch(splitColumns(), false)
    expectShadesMatch(splitColumns(), true)
  })

  it('逐列对齐基准能明显压低支撑方块', () => {
    // 前半列先一路下降、后半列先一路上升；共用基准会把上升的列整体抬高
    const colors = splitColumns()
    const classic = buildHeightMap(colors, { compress: false, noobline: true })
    const compressed = buildHeightMap(colors, { compress: true, noobline: true })
    expect(compressed.maxHeight).toBeLessThan(classic.maxHeight)
    expect(compressed.supportBlocks).toBeLessThan(classic.supportBlocks)
  })

  it('归一化后高度非负，关闭 noobline 时少 128 个顶层方块', () => {
    const m = buildHeightMap(alternating(), { compress: true, noobline: true })
    expect(m.heights.every((h) => h >= 0)).toBe(true)
    expect(m.noobline.every((h) => h >= 0)).toBe(true)
    const without = buildHeightMap(alternating(), { compress: true, noobline: false })
    expect(without.topBlocks).toBe(m.topBlocks - MAP_SIZE)
  })

  it('色号长度不对时直接报错', () => {
    expect(() => buildHeightMap(new Uint8Array(8), { compress: true, noobline: true })).toThrow(
      '128×128',
    )
  })
})
