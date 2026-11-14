/**
 * 导出层：只出 PNG。
 *
 * 用户明确要求「纯图片生成，只出 PNG」——不生成进度 JSON、不给 give 命令、
 * 不做进度树数据。导出函数只返回 Blob，触发下载/复制交给 UI 层。
 */
import { canvasToBlob } from '@/shared/download'
import { toastFileName as toastFileNameFromTitle } from './toast'
import { createToastCanvas, type ToastAssets } from './render'
import type { ToastSpec } from './model'

export async function toastPngBlob(spec: ToastSpec, assets: ToastAssets): Promise<Blob> {
  // 导出永远用 spec.scale 指定的倍率；预览那边用 1× 也不会影响产物尺寸
  return canvasToBlob(createToastCanvas(spec, assets))
}

export function toastFileName(spec: ToastSpec): string {
  return toastFileNameFromTitle(spec.title)
}

/**
 * 复制图片到剪贴板。浏览器要 HTTPS + 权限，失败时把原因交回 UI，
 * 不让一个灰色按钮静默什么都不做。
 */
export async function copyToastImage(spec: ToastSpec, assets: ToastAssets): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('当前浏览器不支持复制图片，请改用下载 PNG')
  }
  const blob = await toastPngBlob(spec, assets)
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
