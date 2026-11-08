import { describe, expect, it } from 'vitest'
import { BLOCKS } from './blocks'
import { TEXTURES, TEXTURE_COUNT, textureUrl } from './textures'

/**
 * 贴图与方块表的对应关系必须严格一一对应：
 * 少一张 → 那个方块静默退回平均色，界面上看不出错但配色就偏了；
 * 多一张 → 说明 `原版材质/` 里堆了没人用的文件。
 */
describe('贴图注册表', () => {
  it('每种方块都能找到贴图', () => {
    const missing = [...new Set(BLOCKS.map((b) => b.tex))].filter((tex) => !textureUrl(tex))
    expect(missing).toEqual([])
  })

  it('贴图总数与 142 种方块一致', () => {
    expect(TEXTURE_COUNT).toBe(142)
    expect(new Set(BLOCKS.map((b) => b.tex)).size).toBe(142)
  })

  it('没有未被任何方块引用的贴图', () => {
    const used = new Set(BLOCKS.map((b) => b.tex))
    expect(Object.keys(TEXTURES).filter((name) => !used.has(name))).toEqual([])
  })

  it('查不到时返回 undefined，交给调用方退回平均色', () => {
    expect(textureUrl('definitely_not_a_block')).toBeUndefined()
    expect(textureUrl(undefined)).toBeUndefined()
  })
})
