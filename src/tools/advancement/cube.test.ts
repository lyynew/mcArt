import { describe, expect, it } from 'vitest'
import {
  LEFT_MATRIX,
  LEFT_SHADE,
  RIGHT_MATRIX,
  RIGHT_SHADE,
  TOP_MATRIX,
  TOP_SHADE,
  facesOf,
  type AffineMatrix,
} from './cube'

/** 把源贴图坐标经仿射矩阵映到 32×32 图标框里 */
function apply(m: AffineMatrix, x: number, y: number): [number, number] {
  return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]
}

describe('等轴立方体 · 仿射矩阵', () => {
  it('顶面把正方形映成菱形', () => {
    expect(apply(TOP_MATRIX, 0, 0)).toEqual([16, 0])
    expect(apply(TOP_MATRIX, 16, 0)).toEqual([32, 8])
    expect(apply(TOP_MATRIX, 0, 16)).toEqual([0, 8])
    expect(apply(TOP_MATRIX, 16, 16)).toEqual([16, 16])
  })

  it('左面与右面在中心棱上无缝拼接', () => {
    expect(apply(LEFT_MATRIX, 16, 0)).toEqual([16, 16])
    expect(apply(RIGHT_MATRIX, 0, 0)).toEqual([16, 16])
    expect(apply(LEFT_MATRIX, 16, 16)).toEqual([16, 32])
    expect(apply(RIGHT_MATRIX, 0, 16)).toEqual([16, 32])
  })

  it('三面外轮廓正好落在 32×32 边框上', () => {
    const points = [TOP_MATRIX, LEFT_MATRIX, RIGHT_MATRIX].flatMap((m) => [
      apply(m, 0, 0),
      apply(m, 16, 0),
      apply(m, 0, 16),
      apply(m, 16, 16),
    ])
    expect(Math.min(...points.map((p) => p[0]))).toBe(0)
    expect(Math.max(...points.map((p) => p[0]))).toBe(32)
    expect(Math.min(...points.map((p) => p[1]))).toBe(0)
    expect(Math.max(...points.map((p) => p[1]))).toBe(32)
  })

  it('明暗从上到下递减', () => {
    expect(TOP_SHADE).toBeGreaterThan(LEFT_SHADE)
    expect(LEFT_SHADE).toBeGreaterThan(RIGHT_SHADE)
    expect(RIGHT_SHADE).toBeGreaterThan(0)
  })
})

describe('等轴立方体 · 多面贴图解析', () => {
  it('草方块没有主贴图，选到 side 也能配上 top', () => {
    expect(facesOf('grass_block_side')).toEqual({
      top: 'grass_block_top',
      side: 'grass_block_side',
    })
    expect(facesOf('grass_block_top')).toEqual({
      top: 'grass_block_top',
      side: 'grass_block_side',
    })
  })

  it('原木只有 _top，侧面退回主贴图', () => {
    expect(facesOf('oak_log')).toEqual({ top: 'oak_log_top', side: 'oak_log' })
  })

  it('26.3 改名的柱状方块先走别名再剥后缀', () => {
    expect(facesOf('quartz_pillar')).toEqual({
      top: 'quartz_pillar_top',
      side: 'quartz_pillar_side',
    })
  })

  it('普通方块三面共用同一张贴图', () => {
    expect(facesOf('diamond_block')).toEqual({ top: 'diamond_block', side: 'diamond_block' })
    expect(facesOf('items/diamond_sword')).toEqual({
      top: 'items/diamond_sword',
      side: 'items/diamond_sword',
    })
  })

  it('覆盖项的侧面可以不是自己', () => {
    expect(facesOf('farmland')).toEqual({ top: 'farmland', side: 'dirt' })
  })
})
