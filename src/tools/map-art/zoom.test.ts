import { describe, expect, it } from 'vitest'
import { MAP_ZOOM_MAX, MAP_ZOOM_MIN, clampMapZoom, mapZoomLabel, mapZoomStep } from './zoom'

describe('地图画预览缩放', () => {
  it('夹在上下限内，非法值回落到 1×', () => {
    expect(clampMapZoom(0.1)).toBe(MAP_ZOOM_MIN)
    expect(clampMapZoom(99)).toBe(MAP_ZOOM_MAX)
    expect(clampMapZoom(Number.NaN)).toBe(1)
    expect(clampMapZoom(1.237)).toBe(1.24)
  })

  it('每档按 1.25 倍推进，且能一路缩回下限', () => {
    expect(mapZoomStep(1, 1)).toBe(1.25)
    expect(mapZoomStep(1.25, -1)).toBe(1)
    let z = MAP_ZOOM_MAX
    for (let i = 0; i < 40; i++) z = mapZoomStep(z, -1)
    expect(z).toBe(MAP_ZOOM_MIN)
  })

  it('标签是整数百分比', () => {
    expect(mapZoomLabel(1)).toBe('100%')
    expect(mapZoomLabel(1.25)).toBe('125%')
    expect(mapZoomLabel(99)).toBe('800%')
  })
})
