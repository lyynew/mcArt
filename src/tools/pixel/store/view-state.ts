import { ref } from 'vue'

/**
 * 舞台的临时交互状态。
 *
 * 放在独立模块里，让「快捷键」和「指针交互」两处都能读写，
 * 又不用互相 import。
 */

/** 空格键按住：临时切成抓手 */
export const spaceHeld = ref(false)

/** 正在拖动画面 */
export const panning = ref(false)

/** 是否处于可编辑控件里，快捷键要避开 */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}
