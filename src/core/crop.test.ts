import { describe, expect, it } from 'vitest'
import { centeredCrop, clampCrop, firstFrameCrop, moveCrop, resizeCrop } from './crop'

describe('方形裁切区域', () => {
  it('默认取居中的最大正方形', () => {
    expect(centeredCrop(1920, 1080)).toEqual({ x: 420, y: 0, size: 1080 })
    expect(centeredCrop(1080, 1920)).toEqual({ x: 0, y: 420, size: 1080 })
    expect(centeredCrop(64, 64)).toEqual({ x: 0, y: 0, size: 64 })
  })

  it('内置长条贴图取左上角第一帧，不居中', () => {
    expect(firstFrameCrop(16, 512)).toEqual({ x: 0, y: 0, size: 16 })
    expect(firstFrameCrop(32, 16)).toEqual({ x: 0, y: 0, size: 16 })
  })

  it('越界的选区会被夹回图片内', () => {
    expect(clampCrop({ x: -20, y: -5, size: 100 }, 200, 150)).toEqual({ x: 0, y: 0, size: 100 })
    expect(clampCrop({ x: 190, y: 140, size: 100 }, 200, 150)).toEqual({ x: 100, y: 50, size: 100 })
    // 边长被夹到短边 150 后，水平方向仍留了 50px 余量，x 不必归零
    expect(clampCrop({ x: 10, y: 10, size: 9999 }, 200, 150)).toEqual({ x: 10, y: 0, size: 150 })
    expect(clampCrop({ x: 10.6, y: 10.4, size: 20.7 }, 200, 150)).toEqual({ x: 11, y: 10, size: 21 })
  })

  it('拖动只在图片内生效', () => {
    const rect = { x: 40, y: 30, size: 60 }
    expect(moveCrop(rect, 10, -5, 200, 150)).toEqual({ x: 50, y: 25, size: 60 })
    expect(moveCrop(rect, 1000, 1000, 200, 150)).toEqual({ x: 140, y: 90, size: 60 })
    expect(moveCrop(rect, -1000, -1000, 200, 150)).toEqual({ x: 0, y: 0, size: 60 })
  })

  it('缩放选区时默认保持中心，拖动角时保持起点', () => {
    const rect = { x: 40, y: 30, size: 60 }
    expect(resizeCrop(rect, 20, 200, 150)).toEqual({ x: 60, y: 50, size: 20 })
    expect(resizeCrop(rect, 20, 200, 150, 'start')).toEqual({ x: 40, y: 30, size: 20 })
    expect(resizeCrop(rect, 500, 200, 150)).toEqual({ x: 0, y: 0, size: 150 })
  })
})
