import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEXTURE_CATALOG, type TextureCatalogEntry } from './texture-catalog'
import { textureUrl } from './textures'

/**
 * 清单是生成物，素材升级后忘了重跑脚本，这里要第一时间拦下来：
 * 目录里每一张 PNG 都必须有条目，条目也不能指向不存在的文件。
 */
const pngStems = (dir: string): string[] =>
  readdirSync(join(process.cwd(), dir))
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((f) => f.slice(0, -4))

describe('内置素材清单与磁盘一致', () => {
  it('方块贴图恰好覆盖 原版材质/，物品图标恰好覆盖 原版材质-items/', () => {
    const blocks = TEXTURE_CATALOG.filter((e) => e.kind === 'block').map((e) => e.tex).sort()
    const items = TEXTURE_CATALOG.filter((e) => e.kind === 'item')
      .map((e) => e.tex.replace(/^items\//, ''))
      .sort()

    expect(blocks).toEqual(pngStems('原版材质').sort())
    expect(items).toEqual(pngStems('原版材质-items').sort())
  })

  it('每条都唯一，且 kind 与贴图命名空间一致', () => {
    expect(new Set(TEXTURE_CATALOG.map((e) => e.tex)).size).toBe(TEXTURE_CATALOG.length)
    for (const e of TEXTURE_CATALOG) {
      expect(e.tex.startsWith('items/')).toBe(e.kind === 'item')
      expect(textureUrl(e.tex)).toMatch(/\.png$/)
    }
  })

  it('分组与名字都可用：方块中文分组，物品 A–Z / #', () => {
    for (const e of TEXTURE_CATALOG) {
      expect(e.label).toBeTruthy()
      expect(e.en).toBeTruthy()
      if (e.kind === 'item') expect(e.family).toMatch(/^[A-Z#]$/)
      else expect(e.family.length).toBeGreaterThan(0)
    }
  })

  it('官方中文名反查到位，含别名与共用贴图的通用条目', () => {
    const find = (tex: string): TextureCatalogEntry | undefined =>
      TEXTURE_CATALOG.find((e) => e.tex === tex)
    expect(find('dirt')?.label).toBe('泥土')
    expect(find('items/apple')?.label).toBe('苹果')
    // 26.3 改名：方块表仍写 chain，实际文件是 iron_chain
    expect(find('iron_chain')?.label).toBe('锁链')
    // 各类地图共用 items/map，应挑通用名而不是「废弃营地地图」
    expect(find('items/map')?.label).toBe('空地图')
  })

  it('有官方中文名的排在纯文件名条目之前', () => {
    let seenUnnamed = false
    for (const e of TEXTURE_CATALOG) {
      if (!e.named) seenUnnamed = true
      else expect(seenUnnamed).toBe(false)
    }
    expect(TEXTURE_CATALOG.some((e) => e.named)).toBe(true)
    expect(TEXTURE_CATALOG.some((e) => !e.named)).toBe(true)
  })
})
