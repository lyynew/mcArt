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

/**
 * 舞台底栏的一句临时反馈（例如「已替换 128 格」）。
 *
 * 光靠状态数字变化不足以让用户意识到「这次操作改了多少」——
 * 替换这类批量操作尤其需要一句明确回执，否则很容易误以为程序乱改。
 */
export const notice = ref('')

let noticeTimer: ReturnType<typeof setTimeout> | null = null

export function notify(text: string, ms = 2600): void {
  notice.value = text
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    notice.value = ''
    noticeTimer = null
  }, ms)
}

/** 是否处于可编辑控件里，快捷键要避开 */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}
