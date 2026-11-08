import { describe, expect, it } from 'vitest'
import { buildMaterialCsv } from './csv'
import { ALL_BLOCKS } from '@/core/palettes'

/**
 * 材料清单是拿去备料的，格式错一个字符就会在 Excel 里变成乱码或错列。
 */
describe('buildMaterialCsv', () => {
  const palette = ALL_BLOCKS.filter((b) => b.fam === '混凝土').slice(0, 3)
  const counts = new Int32Array(palette.length)
  counts[0] = 10
  counts[1] = 30
  counts[2] = 0

  it('带 BOM，Excel 打开中文不乱码', () => {
    expect(buildMaterialCsv(8, palette, counts).charCodeAt(0)).toBe(0xfeff)
  })

  it('表头与旧版一致', () => {
    const first = buildMaterialCsv(8, palette, counts).replace('\ufeff', '').split('\r\n')[0]
    expect(first).toBe('方块,英文名,方块ID,类别,数量,占比')
  })

  it('按数量从多到少排，没用到的不出现', () => {
    const rows = buildMaterialCsv(8, palette, counts).replace('\ufeff', '').split('\r\n')
    // 第 0 行表头，第 1 行是 30 块的那个
    expect(rows[1]).toContain(String(palette[1]!.zh))
    expect(rows[2]).toContain(String(palette[0]!.zh))
    // 注意：「灰色混凝土」是「淡灰色混凝土」的子串，所以按行首判断而不是 includes
    expect(rows.some((r) => r.startsWith(palette[2]!.zh + ','))).toBe(false)
    // 表头 + 两种方块 + 留空
    expect(rows).toHaveLength(4)
  })

  it('占比按整幅图算，空格单独一行', () => {
    // 8×8=64 格，用了 40 格，剩 24 格空
    const rows = buildMaterialCsv(8, palette, counts).replace('\ufeff', '').split('\r\n')
    expect(rows[1]).toContain(`${((30 / 64) * 100).toFixed(1)}%`)
    const last = rows[rows.length - 1]!
    expect(last).toContain('留空')
    expect(last).toContain('24')
    expect(last).toContain(`${((24 / 64) * 100).toFixed(1)}%`)
  })

  it('画满时没有留空行', () => {
    const full = new Int32Array(palette.length)
    full[0] = 64
    const rows = buildMaterialCsv(8, palette, full).replace('\ufeff', '').split('\r\n')
    expect(rows.some((r) => r.includes('留空'))).toBe(false)
  })
})
