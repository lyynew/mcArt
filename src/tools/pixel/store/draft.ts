/**
 * 草稿自动保存（IndexedDB）。
 *
 * 为什么不用 localStorage：一张 160×160 的图连同原图要几 MB，
 * localStorage 只有 5MB 左右且只能存字符串，转 base64 还会再涨三成。
 * IndexedDB 可以直接存 ArrayBuffer，容量也大得多。
 *
 * 分两条记录存：
 *   `source` —— 原图像素，只在载入图片时写一次（几 MB）
 *   `current` —— 画布数据，每次编辑后写（几十 KB）
 * 这样连续绘制时不会反复搬运几 MB 的原图。
 */

const DB_NAME = 'mcArt'
const STORE = 'drafts'
const KEY_CURRENT = 'current'
const KEY_SOURCE = 'source'
const VERSION = 1

export interface DraftCanvas {
  n: number
  idx: ArrayBuffer
  manual: ArrayBuffer
  manualBlock: ArrayBuffer
  imageName: string
  savedAt: number
}

export interface DraftSource {
  pixels: ArrayBuffer
  size: number
  name: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持 IndexedDB'))
      return
    }
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('打开草稿库失败'))
  })
}

async function put(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('写入草稿失败'))
  })
  db.close()
}

async function get<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb()
    const value = await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null)
      req.onerror = () => reject(req.error ?? new Error('读取草稿失败'))
    })
    db.close()
    return value
  } catch {
    return null
  }
}

export function saveCanvas(draft: DraftCanvas): Promise<void> {
  return put(KEY_CURRENT, draft).catch(() => undefined)
}

export function saveSource(source: DraftSource): Promise<void> {
  return put(KEY_SOURCE, source).catch(() => undefined)
}

export function loadCanvas(): Promise<DraftCanvas | null> {
  return get<DraftCanvas>(KEY_CURRENT)
}

export function loadSource(): Promise<DraftSource | null> {
  return get<DraftSource>(KEY_SOURCE)
}

export async function clearDraft(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(KEY_CURRENT)
      tx.objectStore(STORE).delete(KEY_SOURCE)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    db.close()
  } catch {
    /* 清不掉也不影响使用 */
  }
}
