import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ALL_BLOCK_DEFS, BLOCKS } from './blocks'
import { ITEMS } from './items'
import { TEXTURE_ALIAS, drawTexture, resolveTextureName, squareSide, textureUrl } from './textures'

/**
 * 贴图与数据表的对应关系必须在构建前就查清楚：
 * 少一张 → 那个方块静默退回平均色，界面上看不出错但配色就偏了。
 *
 * 贴图现在放在静态目录（不走 Vite 资源管线），所以这里直接查文件系统，
 * 比之前「查 glob 映射表」更接近真相。vitest 跑在 Node 里，能用 fs。
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const blockDir = join(root, '原版材质')
const itemDir = join(root, '原版材质-items')

const hasFile = (tex: string): boolean => {
  const name = resolveTextureName(tex)
  return existsSync(join(blockDir, `${name}.png`)) || existsSync(join(itemDir, `${name}.png`))
}

describe('贴图注册表', () => {
  it('每种方块都能找到贴图（别名算命中）', () => {
    const missing = [...new Set(ALL_BLOCK_DEFS.map((b) => b.tex).filter(Boolean))].filter(
      (tex) => !hasFile(tex),
    )
    expect(missing).toEqual([])
  })

  it('每种物品都能找到贴图', () => {
    const missing = ITEMS.filter((item) => !existsSync(join(itemDir, `${item.tex.replace(/^items\//, '')}.png`)))
    expect(missing.map((i) => i.id)).toEqual([])
  })

  it('进度提示的原版 GUI 底图在素材目录里', () => {
    // 它由 import-vanilla.mjs 从 jar 的 gui/sprites/toast/ 单独抽出。
    // 漏抽不会让构建失败，只会让成就图静默丢掉框体，所以钉在这里。
    const file = join(root, '原版材质-gui', 'toast', 'advancement.png')
    expect(existsSync(file)).toBe(true)
    expect(textureUrl('gui/toast/advancement')).toMatch(
      /\/textures\/gui\/toast\/advancement\.png$/,
    )
  })

  it('26.3 改名的贴图靠别名接上', () => {
    expect(TEXTURE_ALIAS.chain).toBe('iron_chain')
    expect(existsSync(join(blockDir, 'iron_chain.png'))).toBe(true)
    expect(hasFile('purpur_pillar')).toBe(true)
    expect(hasFile('quartz_pillar')).toBe(true)
  })

  it('URL 带上站点 base，物品走 items/ 子目录', () => {
    expect(textureUrl('dirt')).toMatch(/\/textures\/dirt\.png$/)
    expect(textureUrl('items/diamond')).toMatch(/\/textures\/items\/diamond\.png$/)
    // 别名要反映在 URL 上
    expect(textureUrl('chain')).toMatch(/\/textures\/iron_chain\.png$/)
  })

  it('空值返回 undefined，交给调用方退回平均色', () => {
    expect(textureUrl(undefined)).toBeUndefined()
    expect(textureUrl('')).toBeUndefined()
  })

  it('色板源 142 种每种一张贴图', () => {
    expect(new Set(BLOCKS.map((b) => b.tex)).size).toBe(BLOCKS.length)
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
