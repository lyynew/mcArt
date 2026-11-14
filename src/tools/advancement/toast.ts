/**
 * 进度提示图的纯算法：文字排版与文件名。
 *
 * 不 import vue、不碰 DOM，所以能在 Node 里单测。文字测量通过可注入的
 * measure 回调传入——渲染时用 canvas 的 measureText，单测里用假尺子，
 * 这样「超长截断」的规则本身是确定的、可验证的。
 */
import { TEXT_MAX_WIDTH } from './model'

export interface FitResult {
  text: string
  truncated: boolean
  width: number
}

export type TextMeasurer = (text: string) => number

const ELLIPSIS = '…'

/**
 * 把一行文字裁到可用宽度内。
 *
 * 像素字体不能靠缩小字号来救（非整数倍会把方块字糊掉），所以宁可整字截断。
 * 用 Array.from 按码点切，避免把 emoji / 生僻字的代理对劈成两半。
 * 二分找最长前缀，保证加省略号后仍然放得下。
 */
export function fitText(text: string, maxWidth: number, measure: TextMeasurer): FitResult {
  const fullWidth = measure(text)
  if (!text || fullWidth <= maxWidth) {
    return { text, truncated: false, width: fullWidth }
  }

  const chars = Array.from(text)
  const tailWidth = measure(ELLIPSIS)
  if (tailWidth > maxWidth) {
    return { text: '', truncated: true, width: 0 }
  }

  let lo = 0
  let hi = chars.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (measure(chars.slice(0, mid).join('')) + tailWidth <= maxWidth) lo = mid
    else hi = mid - 1
  }

  const fitted = chars.slice(0, lo).join('') + ELLIPSIS
  return { text: fitted, truncated: true, width: measure(fitted) }
}

/** 两行一起算，方便渲染层一次拿到结果 */
export function fitLines(
  title: string,
  description: string,
  measure: TextMeasurer,
  maxWidth = TEXT_MAX_WIDTH,
): { title: FitResult; description: FitResult } {
  return {
    title: fitText(title, maxWidth, measure),
    description: fitText(description, maxWidth, measure),
  }
}

/** 文件名只留安全字符，中文保留（用户看得懂比纯 ASCII 重要） */
export function toastFileName(title: string): string {
  const safe = title
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40)
  return `${safe || '进度'}.png`
}

/** 判断两行里有没有被截断的，UI 用它决定提示文案 */
export function truncationNote(lines: { title: FitResult; description: FitResult }): string {
  const n = [lines.title, lines.description].filter((l) => l.truncated).length
  if (n === 0) return ''
  return n === 2 ? '标题与描述过长，已按整字截断' : '有一行文字过长，已按整字截断'
}
