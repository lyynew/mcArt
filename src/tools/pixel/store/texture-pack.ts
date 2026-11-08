import { ref } from 'vue'
import { BLOCKS, BLOCKS_BY_ID } from '@/core/blocks'

/**
 * 自定义材质包（覆盖内置贴图）。
 *
 * 约定与旧版一致：文件名 = 方块 ID，例如 `white_concrete.png`；
 * 也接受贴图名，例如 `quartz_block_side.png`。
 * 只做内存覆盖，不落盘——刷新就回到原版贴图，符合「临时看看效果」的用法。
 */

const VALID_TEX = new Set(BLOCKS.map((b) => b.tex))

export const overrides = ref<Map<string, HTMLImageElement>>(new Map())

export const overrideCount = ref(0)

export interface AddResult {
  added: string[]
  skipped: string[]
}

/** 文件名 → 贴图名 */
function resolveTexName(fileName: string): string | null {
  const stem = fileName.replace(/\.png$/i, '').toLowerCase()
  const byBlock = BLOCKS_BY_ID.get(stem)
  if (byBlock) return byBlock.tex
  if (VALID_TEX.has(stem)) return stem
  return null
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('贴图解码失败'))
    img.src = url
  })
}

export async function addTextureFiles(files: readonly File[]): Promise<AddResult> {
  const added: string[] = []
  const skipped: string[] = []
  const next = new Map(overrides.value)

  for (const file of files) {
    if (!/\.png$/i.test(file.name)) {
      skipped.push(file.name)
      continue
    }
    const tex = resolveTexName(file.name)
    if (!tex) {
      skipped.push(file.name)
      continue
    }
    try {
      const url = URL.createObjectURL(file)
      const img = await loadImage(url)
      next.set(tex, img)
      added.push(file.name)
      // 图片已解码进内存，URL 可以释放
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch {
      skipped.push(file.name)
    }
  }

  overrides.value = next
  overrideCount.value = next.size
  return { added, skipped }
}

export function clearOverrides(): void {
  overrides.value = new Map()
  overrideCount.value = 0
}
