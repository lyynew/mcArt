/* ============================================================
   站点偏好：深色 / 动效
   ------------------------------------------------------------
   一份状态，两处消费者：导航栏的开关、首页的施工动画。
   真正的初始值由首屏内联脚本（docs/.vitepress/head-script.ts）
   在页面绘制前写进 <html>，这里只把 DOM 上的结果读回来——
   保证「首屏不闪」只有一个实现，而不是两处各算一遍。
   ============================================================ */

import { reactive } from 'vue'

/** 动画节奏：三档，对应引擎的倍率 */
export type MotionSpeed = 'calm' | 'normal' | 'fast'

export const SPEED_ORDER: readonly MotionSpeed[] = ['calm', 'normal', 'fast']

export const SPEED_LABEL: Record<MotionSpeed, string> = {
  calm: '舒缓',
  normal: '正常',
  fast: '快速',
}

/** 引擎按这个倍率推进进度：舒缓接近原速，快速约两倍 */
export const SPEED_SCALE: Record<MotionSpeed, number> = {
  calm: 0.8,
  normal: 1.25,
  fast: 2,
}

export interface SitePrefs {
  appearance: 'light' | 'dark'
  motion: boolean
  speed: MotionSpeed
}

export const STORAGE_KEY = 'mcart:prefs'

export const prefs = reactive<SitePrefs>({
  appearance: 'light',
  motion: true,
  speed: 'normal',
})

export function isMotionSpeed(value: unknown): value is MotionSpeed {
  return value === 'calm' || value === 'normal' || value === 'fast'
}

/** DOM 上的主题类、data-motion、data-speed 才是唯一真相 */
export function initPrefs(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  prefs.appearance = root.classList.contains('dark') ? 'dark' : 'light'
  prefs.motion = root.dataset.motion !== 'off'
  const speed = root.dataset.speed
  prefs.speed = isMotionSpeed(speed) ? speed : 'normal'
}

function persist(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        appearance: prefs.appearance,
        motion: prefs.motion,
        speed: prefs.speed,
      }),
    )
  } catch {
    // 隐私模式下写不进去就算了，不影响本次会话
  }
}

export function setAppearance(next: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  prefs.appearance = next
  root.classList.toggle('dark', next === 'dark')
  root.style.colorScheme = next
  persist()
  // 动画引擎据此重算颜色、清空光标精灵缓存
  document.dispatchEvent(new CustomEvent('mcart:appearance'))
}

export function toggleAppearance(): void {
  setAppearance(prefs.appearance === 'dark' ? 'light' : 'dark')
}

export function setMotion(on: boolean): void {
  if (typeof document === 'undefined') return
  prefs.motion = on
  document.documentElement.dataset.motion = on ? 'on' : 'off'
  persist()
}

export function toggleMotion(): void {
  setMotion(!prefs.motion)
}

export function setMotionSpeed(next: MotionSpeed): void {
  if (typeof document === 'undefined') return
  prefs.speed = next
  document.documentElement.dataset.speed = next
  persist()
}

/** 恢复默认：浅色、动效开、正常速度 */
export function resetPrefs(): void {
  setAppearance('light')
  setMotion(true)
  setMotionSpeed('normal')
}

/** 系统级「减少动效」偏好：首屏脚本已据此给过默认值，用户手动开启则以其为准 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
