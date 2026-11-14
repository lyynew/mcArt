import { describe, expect, it } from 'vitest'
import { TEXT_MAX_WIDTH } from './model'
import { fitLines, fitText, toastFileName, truncationNote } from './toast'

/** 假尺子：普通码点 10px、省略号 5px，规则确定，不依赖 canvas */
const measure = (s: string): number =>
  Array.from(s).reduce((n, ch) => n + (ch === '…' ? 5 : 10), 0)

describe('进度提示 · 文字排版', () => {
  it('放得下就原样返回', () => {
    expect(fitText('海底世界', TEXT_MAX_WIDTH, measure)).toEqual({
      text: '海底世界',
      truncated: false,
      width: 40,
    })
  })

  it('放不下时按整字截断并补省略号', () => {
    const r = fitText('abcdef', 35, measure)
    expect(r.text).toBe('abc…')
    expect(r.truncated).toBe(true)
    expect(r.width).toBe(35)
  })

  it('截断后的宽度一定不超过上限', () => {
    for (const max of [5, 12, 27, 50, 100, 258]) {
      const r = fitText('一二三四五六七八九十', max, measure)
      expect(r.width).toBeLessThanOrEqual(max)
    }
  })

  it('空串不截断', () => {
    expect(fitText('', 100, measure)).toEqual({ text: '', truncated: false, width: 0 })
  })

  it('连省略号都放不下时返回空，不画半个字', () => {
    const r = fitText('abcdef', 4, measure)
    expect(r.text).toBe('')
    expect(r.truncated).toBe(true)
  })

  it('按码点切，不会把 emoji 的代理对劈开', () => {
    const r = fitText('💎💎💎💎', 25, measure)
    expect(r.text).toBe('💎💎…')
    expect(Array.from(r.text).length).toBe(3)
  })

  it('两行各自独立测量', () => {
    const lines = fitLines('短标题', '一二三四五六七八九十', measure, 50)
    expect(lines.title.truncated).toBe(false)
    expect(lines.description.truncated).toBe(true)
    expect(truncationNote(lines)).toBe('有一行文字过长，已按整字截断')
  })

  it('两行都超长时提示两行', () => {
    const lines = fitLines('一二三四五六', '七八九十甲乙丙丁', measure, 20)
    expect(truncationNote(lines)).toBe('标题与描述过长，已按整字截断')
  })
})

describe('进度提示 · 文件名', () => {
  it('去掉 Windows 不允许的字符', () => {
    expect(toastFileName('钻石:最*好?')).toBe('钻石最好.png')
  })

  it('空白折叠成连字符，空标题退回默认名', () => {
    expect(toastFileName('  海底  世界  ')).toBe('海底-世界.png')
    expect(toastFileName('   ')).toBe('进度.png')
  })

  it('超长标题截断到 40 字', () => {
    expect(toastFileName('一'.repeat(80))).toBe(`${'一'.repeat(40)}.png`)
  })
})
