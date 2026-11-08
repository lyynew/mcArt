import { describe, expect, it } from 'vitest'
import { anchorScrollDelta } from './gesture'

describe('anchorScrollDelta', () => {
  it('不缩放也不移动时不需要滚动', () => {
    // 画布左缘 100，中点 300，锚点格 10（格宽 20）→ 100 + 10*20 = 300，正好对准
    expect(anchorScrollDelta(100, 300, 10, 20)).toBe(0)
  })

  it('手指左移 120px，滚动量正好跟着减 120', () => {
    // 中点从 300 移到 180，锚点格不变
    expect(anchorScrollDelta(100, 180, 10, 20)).toBe(120)
  })

  it('手指右移则往反方向滚', () => {
    expect(anchorScrollDelta(100, 420, 10, 20)).toBe(-120)
  })

  it('以中点为锚放大时，滚动量等于锚点格跑远的距离', () => {
    // 格宽 6 → 12，锚点格 25：内容坐标 150 → 300，画布左缘在 0、中点在 150
    // 要让这一格仍然落在中点，画布得往左移 150
    expect(anchorScrollDelta(0, 150, 25, 12)).toBe(150)
  })

  it('放大时锚点不在中点，按比例修正', () => {
    // 画布左缘 0、中点 300、格宽 6 → 锚点格 50；格宽变 12 后该格在 600
    // 要让它仍落在 300，画布需右移 300
    expect(anchorScrollDelta(0, 300, 50, 12)).toBe(300)
  })

  it('中点落在画布左侧留白时给出负值（由滚动容器自行夹到 0）', () => {
    // 锚点格为负，说明捏在留白上；结果交给浏览器 clamp
    expect(anchorScrollDelta(100, 300, -2, 20)).toBeLessThan(0)
  })
})
