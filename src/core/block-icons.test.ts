import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BLOCK_ICON_BY_TEX, BLOCK_ICON_IDS, blockIconId } from './block-icons'

/**
 * 立体方块图标是离线生成后入库的静态资源，渲染时只是贴图。
 * 生成脚本漏跑、映射被覆盖、PNG 尺寸不对，界面上都只会表现为「图标不对」，
 * 不会报错，所以钉在这里查文件本身。
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const iconDir = join(root, '原版材质-icons')

const pngSize = (id: string): [number, number] | null => {
  const p = join(iconDir, `${id}.png`)
  if (!existsSync(p)) return null
  const b = readFileSync(p)
  if (b.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

describe('立体方块图标索引', () => {
  it('多个方块共用一张贴图时，挑最典型的基础方块', () => {
    // 木板 / 楼梯 / 栅栏共用 *_planks，不能让后者覆盖成楼梯图标
    expect(blockIconId('acacia_planks')).toBe('acacia_planks')
    expect(blockIconId('oak_planks')).toBe('oak_planks')
    expect(blockIconId('acacia_log')).toBe('acacia_log')
    expect(blockIconId('yellow_wool')).toBe('yellow_wool')
  })

  it('顶面 / 侧面贴图能归到同一个方块', () => {
    expect(blockIconId('grass_block_side')).toBe('grass_block')
    expect(blockIconId('grass_block_top')).toBe('grass_block')
  })

  it('物品键与未知贴图不会误命中', () => {
    expect(blockIconId('items/diamond_sword')).toBeNull()
    expect(blockIconId('not_a_real_block')).toBeNull()
  })

  it('索引里的 id 不重复，且都指向同一个有图标的方块', () => {
    expect(new Set(BLOCK_ICON_IDS).size).toBe(BLOCK_ICON_IDS.length)
    expect(BLOCK_ICON_IDS.length).toBeGreaterThan(900)
    for (const id of [...new Set(Object.values(BLOCK_ICON_BY_TEX))]) {
      expect(BLOCK_ICON_IDS).toContain(id)
    }
  })

  it('每个索引 id 都有 32×32 的 PNG', () => {
    const bad = BLOCK_ICON_IDS.filter((id) => {
      const size = pngSize(id)
      return !size || size[0] !== 32 || size[1] !== 32
    })
    expect(bad).toEqual([])
  })

  it('参考图里那些非立方体方块确实有立体图标', () => {
    for (const id of ['grass_block', 'brewing_stand', 'oak_stairs', 'glass', 'torch', 'dandelion']) {
      expect(pngSize(id), id).toEqual([32, 32])
    }
  })
})
