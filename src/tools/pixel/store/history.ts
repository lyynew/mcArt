import { computed, ref } from 'vue'
import { HISTORY_LIMIT } from '../types'
import { buffers, markDirty } from './buffers'

/**
 * 撤销 / 重做。
 *
 * 快照式：每步存一份 idx + 人工标记的副本。50 步 × 160² 的数据约 11MB，
 * 对浏览器来说可以接受；换成差分记录会复杂得多，收益不大。
 *
 * 约定：调用方在**修改之前**调用 record()，这样撤销回到的是修改前的状态。
 */

interface Snapshot {
  n: number
  idx: Int16Array
  manual: Uint8Array
  manualBlock: Int16Array
}

const past: Snapshot[] = []
const future: Snapshot[] = []

/** 供界面绑定按钮禁用态 */
export const undoDepth = ref(0)
export const redoDepth = ref(0)

export const canUndo = computed(() => undoDepth.value > 0)
export const canRedo = computed(() => redoDepth.value > 0)

function syncDepth(): void {
  undoDepth.value = past.length
  redoDepth.value = future.length
}

function snapshot(): Snapshot {
  return {
    n: buffers.n,
    idx: Int16Array.from(buffers.idx),
    manual: Uint8Array.from(buffers.manual),
    manualBlock: Int16Array.from(buffers.manualBlock),
  }
}

function restore(s: Snapshot): void {
  buffers.n = s.n
  buffers.idx.set(s.idx)
  buffers.manual.set(s.manual)
  buffers.manualBlock.set(s.manualBlock)
  markDirty()
}

/** 记录修改前的状态；新操作会清掉重做栈 */
export function record(): void {
  past.push(snapshot())
  if (past.length > HISTORY_LIMIT) past.shift()
  future.length = 0
  syncDepth()
}

export function undo(): boolean {
  const s = past.pop()
  if (!s) return false
  future.push(snapshot())
  restore(s)
  syncDepth()
  return true
}

export function redo(): boolean {
  const s = future.pop()
  if (!s) return false
  past.push(snapshot())
  restore(s)
  syncDepth()
  return true
}

/** 撤销栈里丢掉最近一条：操作用了 record() 但实际没改动时用 */
export function discard(): void {
  past.pop()
  syncDepth()
}

/** 换画幅、载入新图这类整体替换时清空历史 */
export function resetHistory(): void {
  past.length = 0
  future.length = 0
  syncDepth()
}

export function useHistory() {
  return { canUndo, canRedo, undo, redo, record, resetHistory }
}
