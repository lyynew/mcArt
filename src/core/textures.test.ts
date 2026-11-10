import { describe, expect, it } from 'vitest'
import { ALL_BLOCK_DEFS, BLOCKS } from './blocks'
import { TEXTURES, TEXTURE_COUNT, textureUrl } from './textures'

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
