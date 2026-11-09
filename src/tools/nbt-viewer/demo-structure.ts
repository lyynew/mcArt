import { BLOCKS_BY_ID } from '@/core/blocks'
import type { ParsedStructure, ParsedStructureBlock } from '@/core/nbt-read'
import type { LoadedStructure } from './read-structure-file'

/**
 * 示例结构。
 *
 * 查看器没有文件时是一张白纸，光靠一句「把 .nbt 拖进来」很难让人相信它有用。
 * 这里直接给一份能看的东西：32×32、16 层的阶梯金字塔，每四层换一种石头。
 * 做成空心壳而不是实心：实心金字塔每层都是一整块实心方，切层看不出变化；
 * 空心壳每层是一圈方框，拖动滑杆能立刻看出「一层一层往里收」。
 *
 * 不走文件读写：直接拼 ParsedStructure，省掉一次编码再解析，逻辑也更清楚。
 */

/** 每四层一种石头，层数变化时颜色跟着变，滑杆的效果一眼可见 */
const BANDS = ['stone', 'cobblestone', 'smooth_stone', 'sandstone'] as const

const SIZE = 32
const LEVELS = 16
/** 每层向内收一格，正好 16 层收到 2×2 */
const BANDS_PER_STEP = LEVELS / BANDS.length

export function demoStructure(): LoadedStructure {
  const palette = BANDS.map((id) => {
    if (!BLOCKS_BY_ID.has(id)) throw new Error(`示例结构引用了不存在的方块：${id}`)
    return `minecraft:${id}`
  })

  const blocks: ParsedStructureBlock[] = []
  for (let y = 0; y < LEVELS; y++) {
    const state = Math.floor(y / BANDS_PER_STEP)
    const from = y
    const to = SIZE - y - 1
    for (let z = from; z <= to; z++) {
      for (let x = from; x <= to; x++) {
        // 只留最外一圈，里面是空的
        if (x !== from && x !== to && z !== from && z !== to) continue
        blocks.push({ pos: [x, y, z], state })
      }
    }
  }

  const structure: ParsedStructure = {
    size: [SIZE, LEVELS, SIZE],
    palette,
    blocks,
    dataVersion: 3953,
  }

  return { name: '示例 · 阶梯金字塔', fileSize: 0, structure, demo: true }
}
