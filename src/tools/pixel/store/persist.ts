import type { Orientation, ToolId } from '../types'
import type { PaletteId } from '@/core/palettes'

/**
 * 本地偏好持久化。
 *
 * 只存「重新打开还希望保留」的东西：色系、自定义勾选、物品栏、结构文件名等。
 * 图画本身不进 localStorage（几 MB 会撑爆配额），草稿另见 draft.ts 的 IndexedDB 方案。
 *
 * 键名带 v2：新版与旧版的存储结构不同，直接沿用会导致读到不兼容数据。
 */
const KEY = 'mcArt.editor.v2'

export interface PersistedState {
  customIds: string[]
  paletteId: PaletteId
  hotbar: (number | null)[]
  tool: ToolId
  brush: number
  mirror: boolean
  structName: string
  orient: Orientation
  useAir: boolean
  showGrid: boolean
  blockShading: boolean
  focusSelected: boolean
  realTexture: boolean
  dither: boolean
  despeckle: boolean
  n: number
}

export function loadPersisted(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Partial<PersistedState>) : null
  } catch {
    return null
  }
}

export function savePersisted(state: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // 隐私模式 / 配额满：存不上就算了，不影响本次使用
  }
}
