import type { PaletteBlock } from '@/core/palettes'

/**
 * 材料清单 CSV。
 *
 * 列与旧版完全一致（方块,英文名,方块ID,类别,数量,占比），按数量从多到少排。
 * 带 BOM，否则 Excel 打开中文会乱码——这是国内用户最常踩的坑。
 */
export function buildMaterialCsv(
  n: number,
  blocks: readonly PaletteBlock[],
  counts: Int32Array,
): string {
  const total = n * n
  const rows: string[] = ['方块,英文名,方块ID,类别,数量,占比']

  const order: number[] = []
  for (let i = 0; i < blocks.length; i++) if ((counts[i] ?? 0) > 0) order.push(i)
  order.sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))

  let empty = total
  for (const i of order) {
    const b = blocks[i]!
    const c = counts[i] ?? 0
    empty -= c
    rows.push([b.zh, b.en, b.id, b.fam, String(c), `${((c / total) * 100).toFixed(1)}%`].join(','))
  }

  if (empty > 0) {
    rows.push(
      ['留空', 'Air', 'minecraft:air', '-', String(empty), `${((empty / total) * 100).toFixed(1)}%`].join(
        ',',
      ),
    )
  }

  return '\ufeff' + rows.join('\r\n')
}
