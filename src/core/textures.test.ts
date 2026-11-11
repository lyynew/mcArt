import { describe, expect, it } from 'vitest'
import { ALL_BLOCK_DEFS, BLOCKS } from './blocks'
import { TEXTURES, TEXTURE_COUNT, drawTexture, squareSide, textureUrl } from './textures'

/**
 * 贴图与方块表的对应关系必须严格一一对应：
 * 少一张 → 那个方块静默退回平均色，界面上看不出错但配色就偏了；
 * 多一张 → 说明 `原版材质/` 里堆了没人用的文件。
 *
 * 少数方块（箱子、头颅）是实体模型渲染，没有方块贴图，tex 为空、只留平均色，
 * 这类条目不参与贴图校验。
 */
const usedTextures = () => new Set(ALL_BLOCK_DEFS.map((b) => b.tex).filter(Boolean))

describe('贴图注册表', () => {
  it('每种方块都能找到贴图', () => {
    const missing = [...usedTextures()].filter((tex) => !textureUrl(tex))
    expect(missing).toEqual([])
  })

  it('贴图总数与方块表引用一致', () => {
    expect(TEXTURE_COUNT).toBe(usedTextures().size)
    // 色板源 142 种每种一张贴图
    expect(new Set(BLOCKS.map((b) => b.tex)).size).toBe(BLOCKS.length)
  })

  it('没有未被任何方块引用的贴图', () => {
    const used = usedTextures()
    expect(Object.keys(TEXTURES).filter((name) => !used.has(name))).toEqual([])
  })

  it('查不到时返回 undefined，交给调用方退回平均色', () => {
    expect(textureUrl('definitely_not_a_block')).toBeUndefined()
    expect(textureUrl(undefined)).toBeUndefined()
    expect(textureUrl('')).toBeUndefined()
  })
})

describe('堆叠贴图只取第一帧', () => {
  it.each([
    [16, 16, 16], // 普通方块贴图
    [16, 512, 16], // 纵向动画帧（water_still）
    [16, 48, 16], // 多帧（magma）
    [32, 64, 32], // 高清材质包里的方形帧
    [512, 16, 16], // 假设的横向图集，取最左边一块
  ])('%i×%i 的窄边是 %i', (w, h, side) => {
    expect(squareSide(w, h)).toBe(side)
  })

  it('未解码或非法尺寸返回 0', () => {
    expect(squareSide(0, 0)).toBe(0)
    expect(squareSide(Number.NaN, 16)).toBe(0)
    expect(squareSide(-16, 16)).toBe(0)
  })

  it('画进方格时只截左上角那一块', () => {
    const calls: unknown[][] = []
    const ctx = {
      drawImage: (...args: unknown[]) => calls.push(args),
    } as unknown as CanvasRenderingContext2D
    const img = { naturalWidth: 16, naturalHeight: 512, width: 16, height: 512 } as HTMLImageElement

    drawTexture(ctx, img, 10, 20, 32)

    expect(calls).toEqual([[img, 0, 0, 16, 16, 10, 20, 32, 32]])
  })

  it('方形贴图仍等价于整张绘制', () => {
    const calls: unknown[][] = []
    const ctx = {
      drawImage: (...args: unknown[]) => calls.push(args),
    } as unknown as CanvasRenderingContext2D
    const img = { naturalWidth: 32, naturalHeight: 32, width: 32, height: 32 } as HTMLImageElement

    drawTexture(ctx, img, 0, 0, 48)

    expect(calls[0]).toEqual([img, 0, 0, 32, 32, 0, 0, 48, 48])
  })

  it('图片还没解码时不绘制，留给平均色兜底', () => {
    const calls: unknown[][] = []
    const ctx = {
      drawImage: (...args: unknown[]) => calls.push(args),
    } as unknown as CanvasRenderingContext2D
    const img = { naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 } as HTMLImageElement

    drawTexture(ctx, img, 0, 0, 16)

    expect(calls).toEqual([])
  })
})
