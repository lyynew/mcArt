/* ============================================================
   颜色小工具：canvas 只吃具体色值，拿不到 CSS 变量与 color-mix
   ------------------------------------------------------------
   引擎与背景层都要「从设计令牌取色 + 加透明度」，放一份在这里，
   免得两边各写一遍再各自漂移。
   ============================================================ */

/** 读 :root 上的 CSS 变量；SSR 或取不到时退回兜底色 */
export function readCssColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return value || fallback
}

/** #rrggbb → rgb(r g b / a)；非 6 位十六进制时退回中性黑 */
export function withAlpha(color: string, alpha: number): string {
  const value = color.trim().replace('#', '')
  if (value.length !== 6) return `rgb(0 0 0 / ${alpha})`
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  if ([r, g, b].some((part) => Number.isNaN(part))) return `rgb(0 0 0 / ${alpha})`
  return `rgb(${r} ${g} ${b} / ${alpha})`
}
