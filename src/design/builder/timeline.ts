/* ============================================================
   施工时间轴：把「块进度 p」映射成「光标在哪、显出多少」
   ------------------------------------------------------------
   核心约定：光标位置是进度的纯函数，而不是反过来由光标驱动内容。
   这样任意跳帧、加速、直接置满都能得到自洽的画面（跳过动画时
   只需要把所有块的 p 置 1）。

   每种块的编排（p 为 0..1 的归一化进度）：
     head  0–.18 飞入 → .18–1 逐字打字（光标跟着字走动）
     text  0–.10 飞入 → .10–.90 从左到右擦出 → .90–1 收尾
     card  0–.30 画选框 → .30–.85 擦出 → .85–1 收尾
     rule  0–.70 划出横线 → .70–1 收尾
   ============================================================ */

import { clamp01, easeInOutCubic, easeOutCubic, lerp } from './math'
import type { BuildKind, Caret, Pose, Rect } from './types'

/** 块动画时长（秒）。字符多的标题、段落相应更久。 */
export function blockDuration(kind: BuildKind, charCount = 0): number {
  switch (kind) {
    case 'head':
      return 0.34 + charCount * 0.055 + 0.22
    case 'text':
      return 0.7 + Math.min(0.45, charCount * 0.004)
    case 'card':
      return 0.86
    case 'rule':
      return 0.42
  }
}

/** 元素本身显出的比例 0..1（打字块直接给 1，靠字符 span 控制） */
export function exposeOf(kind: BuildKind, p: number): number {
  switch (kind) {
    case 'head':
      return 1
    case 'text':
      return clamp01((p - 0.1) / 0.8)
    case 'card':
      return clamp01((p - 0.3) / 0.55)
    case 'rule':
      return clamp01(p / 0.7)
  }
}

/** 打字块当前该显出第几个字 */
export function typedOf(kind: BuildKind, p: number, charCount: number): number {
  if (kind !== 'head') return 0
  return Math.round(charCount * clamp01((p - 0.18) / 0.78))
}

/** 光标姿态。caret 只在打字块里有值。 */
export function poseOf(kind: BuildKind, rect: Rect, p: number, caret: Caret | null = null): Pose {
  const { x, y, w, h } = rect

  switch (kind) {
    case 'head': {
      if (p < 0.18) {
        const t = easeOutCubic(clamp01(p / 0.18))
        return {
          x: lerp(x + w * 0.62, x + 3, t),
          y: lerp(y - 26, y + h * 0.55, t),
          tool: 'arrow',
          down: false,
        }
      }
      if (caret) return { x: caret.x, y: caret.y + caret.h * 0.5, tool: 'ibeam', down: false }
      return { x: x + 3, y: y + h * 0.55, tool: 'ibeam', down: false }
    }

    case 'text': {
      if (p < 0.1) {
        const t = easeOutCubic(clamp01(p / 0.1))
        return {
          x: lerp(x + w * 0.55, x + 2, t),
          y: lerp(y + h + 18, y + h * 0.5, t),
          tool: 'arrow',
          down: false,
        }
      }
      const e = exposeOf(kind, p)
      return { x: x + w * e, y: y + h * 0.5, tool: 'arrow', down: p < 0.88 }
    }

    case 'card': {
      if (p < 0.3) {
        const t = easeInOutCubic(clamp01(p / 0.3))
        return { x: x + w * t, y: y + h * t, tool: 'cross', down: true }
      }
      if (p < 0.85) {
        const e = exposeOf(kind, p)
        return { x: x + w * e, y: y + h * 0.5, tool: 'arrow', down: false }
      }
      return { x: x + w - 7, y: y + h - 5, tool: 'arrow', down: false }
    }

    case 'rule': {
      const e = exposeOf(kind, p)
      return { x: x + w * e + 6, y: y + h * 0.5, tool: 'arrow', down: false }
    }
  }
}

/** 光标从当前位置飞到块起手位需要的时长：距离越远越久，但有上限 */
export function travelDuration(distance: number): number {
  return Math.min(0.42, Math.max(0.16, distance / 1600))
}
