/**
 * 一次性迁移脚本：把老单文件里的 BLOCK_DEFS 抽成带类型的 TS 模块。
 *
 * 手抄 142 条数据必然出错，所以直接解析 legacy 里的数组字面量。
 * 生成结果 src/core/blocks.ts 之后即为唯一数据源，
 * 改方块请改那个文件（或用 .build/ 里的 Python 脚本重算平均色）。
 *
 * 用法：node scripts/migrate-blocks.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const source = await readFile(join(root, 'public/legacy/index.html'), 'utf8')

const start = source.indexOf('const BLOCK_DEFS = [')
if (start < 0) throw new Error('没找到 BLOCK_DEFS')

const end = source.indexOf('\n];', start)
if (end < 0) throw new Error('没找到 BLOCK_DEFS 结尾')

const literal = source.slice(start + 'const BLOCK_DEFS = '.length, end + 2)
/** 数组字面量来自我们自己的仓库，用 Function 求值是安全的 */
const rows = new Function(`"use strict"; return ${literal}`)()

if (!Array.isArray(rows) || rows.length === 0) throw new Error('解析结果为空')

const bad = rows.find((r) => !Array.isArray(r) || r.length !== 6)
if (bad) throw new Error(`数据形状不对：${JSON.stringify(bad)}`)

const families = []
for (const r of rows) if (!families.includes(r[4])) families.push(r[4])

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

const body = rows
  .map(
    ([zh, en, hex, id, fam, tex]) =>
      `  { zh: ${q(zh)}, en: ${q(en)}, hex: ${q(hex)}, id: ${q(id)}, fam: ${q(fam)}, tex: ${q(tex)} },`,
  )
  .join('\n')

const out = `/**
 * 方块总表 —— 全站唯一数据源。
 *
 * 每条对应一种可用方块：中文名、英文名、平均色、方块 ID、分组、贴图文件名。
 * 平均色取自 \`原版材质/\` 里对应 PNG 的实测均值（见 .build/png_avg.py），
 * 转换算法用它做 CIEDE2000 匹配；贴图文件名是 \`原版材质/<tex>.png\` 的主名。
 *
 * 由 scripts/migrate-blocks.mjs 从旧版单文件迁移而来，共 ${rows.length} 种。
 */

export interface BlockDef {
  /** 中文名，界面与材料清单用 */
  zh: string
  /** 英文名，搜索用 */
  en: string
  /** 平均色，#RRGGBB */
  hex: string
  /** 方块 ID，不含命名空间，例如 white_concrete */
  id: string
  /** 分组：混凝土 / 羊毛 / 陶瓦 / 石材 / 砂土 / 木质 / 金属宝石 / 彩色 */
  fam: string
  /** 贴图主名，对应 \`原版材质/<tex>.png\` */
  tex: string
}

export const BLOCKS: readonly BlockDef[] = [
${body}
]

/** 分组顺序按首次出现排列，与旧版一致 */
export const FAMILIES: readonly string[] = ${JSON.stringify(families)}

/** 带命名空间的完整 ID，命令与结构文件里用这个 */
export function fullId(block: BlockDef): string {
  return \`minecraft:\${block.id}\`
}

/** 按方块 ID 反查，O(1)；贴图覆盖、结构加载都要用 */
export const BLOCKS_BY_ID: ReadonlyMap<string, BlockDef> = new Map(
  BLOCKS.map((b) => [b.id, b]),
)
`

await writeFile(join(root, 'src/core/blocks.ts'), out, 'utf8')
console.log(`已生成 src/core/blocks.ts：${rows.length} 种方块，${families.length} 个分组`)
console.log(`分组顺序：${families.join(' / ')}`)
