import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BLOCK_FACES } from './block-faces'

/**
 * 映射表是构建时从素材目录扫出来的，最容易出的错是「指向一张不存在的 PNG」：
 * 界面上看不出来，只是那个方块静默变成空图标。所以直接查文件系统。
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const blockDir = join(root, '原版材质')

const has = (tex: string): boolean => existsSync(join(blockDir, `${tex}.png`))

describe('方块多面贴图映射', () => {
  it('每条的顶面与侧面贴图都真实存在', () => {
    const missing = Object.entries(BLOCK_FACES).flatMap(([stem, f]) =>
      [f.top, f.side].filter((tex) => !has(tex)).map((tex) => `${stem} → ${tex}`),
    )
    expect(missing).toEqual([])
  })

  it('收录了典型的多面方块', () => {
    for (const name of ['grass_block', 'oak_log', 'mycelium', 'pumpkin', 'sandstone', 'farmland']) {
      expect(BLOCK_FACES[name], name).toBeDefined()
    }
  })

  it('收录的确实是顶/侧面不同的方块', () => {
    for (const [stem, f] of Object.entries(BLOCK_FACES)) {
      expect(f.top, stem).not.toBe(f.side)
    }
  })

  it('规模在合理区间，不会把门/床之类的贴图误收进来', () => {
    const n = Object.keys(BLOCK_FACES).length
    expect(n).toBeGreaterThan(30)
    expect(n).toBeLessThan(160)
    expect(BLOCK_FACES.acacia_door).toBeUndefined()
  })
})
