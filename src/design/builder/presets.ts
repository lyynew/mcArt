/* 首页光标阵容：名字只是「有人在一起拼」的暗示，颜色一律走站点令牌 */

import type { CursorSpec } from './types'

/** 桌面端三个光标：一个主色、两个中性，保持站点「只有一种绿」的克制 */
export const HOME_CURSORS: readonly CursorSpec[] = [
  { name: 'KAI', colorVar: '--green' },
  { name: 'MO', colorVar: '--ink' },
  { name: 'RIN', colorVar: '--ink-3' },
]

/** 窄屏少一个，画面才不挤 */
export const COMPACT_CURSORS: readonly CursorSpec[] = HOME_CURSORS.slice(0, 2)
