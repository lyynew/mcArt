import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fitText } from './toast'
import {
  ASCII_WIDTH,
  CJK_WIDTH,
  FONT_BYTES_EXPECTED,
  FONT_SEGMENTS,
  GLYPH_BYTES,
  GLYPH_ROWS,
  charWidth,
  glyphLocation,
  glyphOf,
  measureUnifont,
} from './unifont'

/**
 * 点阵字表是构建时生成的二进制，最容易出的错是「段偏移算错」——
 * 界面上不会报错，只会画出另一个字。所以直接读真实文件校验。
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const bytes = new Uint8Array(readFileSync(join(root, '原版材质-font', 'unifont.bin')))

describe('原版 unifont 点阵字 · 段表', () => {
  it('二进制长度与段表推算一致', () => {
    expect(bytes.length).toBe(FONT_BYTES_EXPECTED)
    expect(bytes.length).toBe(
      FONT_SEGMENTS.reduce((n, s) => n + s.to - s.from + 1, 0) * GLYPH_BYTES,
    )
  })

  it('段偏移不重叠、按码点递增', () => {
    const a = glyphLocation(0x0041)!
    const b = glyphLocation(0x3001)!
    const c = glyphLocation(0x4e00)!
    const d = glyphLocation(0xff01)!
    expect(a.offset).toBe(0x41 * GLYPH_BYTES)
    expect(b.offset).toBeGreaterThan(a.offset)
    expect(c.offset).toBeGreaterThan(b.offset)
    expect(d.offset).toBeGreaterThan(c.offset)
    expect(d.offset + GLYPH_BYTES).toBeLessThanOrEqual(bytes.length)
  })

  it('未覆盖的码点返回 null', () => {
    expect(glyphLocation(0x2000)).toBeNull()
    expect(glyphLocation(0x1f600)).toBeNull()
  })
})

describe('原版 unifont 点阵字 · 字形解析', () => {
  it('ASCII 是 8 位宽，CJK / 全角是 16 位宽', () => {
    expect(charWidth(0x0041)).toBe(ASCII_WIDTH)
    expect(charWidth(0x6d77)).toBe(CJK_WIDTH)
    expect(charWidth(0xff01)).toBe(CJK_WIDTH)
    expect(charWidth(0x1f600)).toBe(ASCII_WIDTH)
  })

  it('16 行都读得出来，「海」的首行与官方 hex 一致', () => {
    const g = glyphOf(bytes, 0x6d77)!
    expect(g).not.toBeNull()
    expect(g.width).toBe(CJK_WIDTH)
    expect(g.rows.length).toBe(GLYPH_ROWS)
    // unifont_all_no_pua-17.0.01.hex 中 6D77 的第一行是 0100
    expect(g.rows[0]).toBe(0x0100)
    expect(g.rows[1]).toBe(0x2100)
  })

  it('空格是合法空字形，不是缺字', () => {
    const g = glyphOf(bytes, 0x0020)!
    expect(g).not.toBeNull()
    expect(Array.from(g.rows).every((r) => r === 0)).toBe(true)
  })

  it('数据缺失或越界时返回 null，不抛异常', () => {
    expect(glyphOf(null, 0x6d77)).toBeNull()
    expect(glyphOf(new Uint8Array(8), 0x6d77)).toBeNull()
  })
})

describe('原版 unifont 点阵字 · 排版', () => {
  it('ASCII 8px、汉字 16px 混合步进', () => {
    expect(measureUnifont('')).toBe(0)
    expect(measureUnifont('ABC')).toBe(24)
    expect(measureUnifont('海底')).toBe(32)
    expect(measureUnifont('A海')).toBe(24)
  })

  it('示例文案量得出来的宽度落在参考图范围内', () => {
    // 参考图标题「海底世界！」可见包围盒 x=60..131，绘制起点 x=52
    expect(measureUnifont('海底世界！')).toBe(80)
    expect(measureUnifont('有用的知识又双叒增加了，')).toBe(192)
  })

  it('超长截断按 16px 步进，不越过可用宽度', () => {
    const r = fitText('一'.repeat(30), 258, measureUnifont)
    expect(r.truncated).toBe(true)
    expect(r.width).toBeLessThanOrEqual(258)
    expect(r.text.endsWith('…')).toBe(true)
  })

  it('emoji 按一个码点算，不劈成两个代理项', () => {
    expect(measureUnifont('💎')).toBe(ASCII_WIDTH)
  })
})
