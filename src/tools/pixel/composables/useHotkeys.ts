import { isEditableTarget, spaceHeld } from '../store/view-state'
import { useEditor } from '../store/editor'

/**
 * 快捷键。
 *
 * 挂在 window 上全局生效，但在输入框里要让路——否则在结构文件名里打 "b" 会切成画笔。
 * 缩放相关的能力由舞台传进来，避免这里去碰 DOM。
 */
export function useHotkeys(options: { zoomBy: (factor: number) => void; fit: () => void }) {
  const editor = useEditor()
  const { settings } = editor

  function onKeyDown(e: KeyboardEvent): void {
    if (isEditableTarget(e.target)) return

    const mod = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()

    if (mod && key === 'z') {
      e.preventDefault()
      if (e.shiftKey) editor.doRedo()
      else editor.doUndo()
      return
    }

    // 其余组合键交给浏览器
    if (mod || e.altKey) return

    switch (key) {
      case ' ':
        if (!spaceHeld.value) {
          spaceHeld.value = true
          e.preventDefault()
        }
        return
      case 'b':
        editor.setTool('brush')
        return
      case 'e':
        editor.setTool('eraser')
        return
      case 'i':
        editor.setTool('picker')
        return
      case 'f':
        editor.setTool('fill')
        return
      case 'r':
        editor.setTool('replace')
        return
      case 'h':
        editor.setTool('pan')
        return
      case 'm':
        editor.toggleMirror()
        return
      case '[':
        editor.setBrush(settings.brush - 1)
        return
      case ']':
        editor.setBrush(settings.brush + 1)
        return
      case '+':
      case '=':
        options.zoomBy(1.15)
        return
      case '-':
        options.zoomBy(1 / 1.15)
        return
      case '0':
        options.fit()
        return
      default:
        if (key >= '1' && key <= '9') editor.selectHotSlot(Number(key) - 1)
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    if (e.key === ' ') spaceHeld.value = false
  }

  /** 切走窗口时可能收不到 keyup，兜底复位，否则会一直卡在抓手模式 */
  function onBlur(): void {
    spaceHeld.value = false
  }

  function attach(): void {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
  }

  function detach(): void {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
  }

  return { attach, detach }
}
