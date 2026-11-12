/**
 * 生成 src/core/items.ts —— 物品总表。
 *
 * 物品只服务两个场景：方块图鉴里查名字、成就生成器里当图标。
 * **不参与像素画生成**（色板只认 blocks.ts 的 142 种方块），这一点由数据结构保证：
 * 物品是独立的 ItemDef，不进 BLOCKS/EXTRA_BLOCKS，也不进色板推导。
 *
 * 数据来源：
 *   .build/lang/en_us.json / zh_cn.json  —— 名字（由 scripts/import-vanilla.mjs 导出）
 *   原版材质-items/*.png                 —— 贴图（同上）
 *
 * 用法：node scripts/build-items.mjs
 * 输出确定性：同样的输入产出逐字节一致的文件。
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const langDir = join(root, '.build', 'lang')
const itemDir = join(root, '原版材质-items')
const outFile = join(root, 'src/core/items.ts')

const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'))

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/**
 * 物品 id 与贴图文件名不一致的少数情况。
 *
 * 陶片在语言文件里叫 *_pottery_shard，贴图却还是 *_pottery_sherd（旧拼写照旧留着）；
 * 钟表、指南针是一整套状态帧，取第 0 帧就是默认外观；
 * 探险地图统一用 map.png；弩的默认外观是 crossbow_standby。
 */
function resolveTex(id, textures) {
  if (textures.has(id)) return id

  if (id.endsWith('_pottery_shard')) {
    const alt = id.replace(/_pottery_shard$/, '_pottery_sherd')
    if (textures.has(alt)) return alt
  }
  const ALIAS = {
    clock: 'clock_00',
    compass: 'compass_00',
    lodestone_compass: 'compass_00',
    recovery_compass: 'compass_00',
    crossbow: 'crossbow_standby',
    tipped_arrow: 'arrow',
    enchanted_golden_apple: 'golden_apple',
    shield: 'shield_base',
  }
  if (ALIAS[id] && textures.has(ALIAS[id])) return ALIAS[id]
  if (id.endsWith('_map') && textures.has('map')) return 'map'

  return null
}

async function main() {
  if (!existsSync(join(langDir, 'en_us.json'))) {
    throw new Error('缺 .build/lang/en_us.json，先跑 scripts/import-vanilla.mjs')
  }

  const en = await readJson(join(langDir, 'en_us.json'))
  const zh = existsSync(join(langDir, 'zh_cn.json')) ? await readJson(join(langDir, 'zh_cn.json')) : {}

  const textures = new Set(
    (await readdir(itemDir)).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)),
  )

  const rows = []
  const missingTex = []
  for (const key of Object.keys(en)) {
    if (!key.startsWith('item.minecraft.')) continue
    const id = key.slice('item.minecraft.'.length)
    // 语言文件里混着格式串与状态串（potion.effect.* / shield.white / *.desc），
    // 它们不是独立物品，带点的直接跳过
    if (id.includes('.')) continue
    const tex = resolveTex(id, textures)
    if (!tex) {
      missingTex.push(id)
      continue
    }
    rows.push({ id, en: en[key], zh: zh[key] ?? en[key], tex })
  }

  rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const body = rows
    .map(
      (r) =>
        `  { zh: ${q(r.zh)}, en: ${q(r.en)}, id: ${q(r.id)}, tex: ${q(`items/${r.tex}`)} },`,
    )
    .join('\n')

  const text = `/**
 * 物品总表 —— 图鉴与成就图标用，**不参与像素画生成**。
 *
 * 由 scripts/build-items.mjs 生成，勿手改。
 * 名字取自官方 26.3 语言文件（en_us + zh_cn），贴图对应 \`原版材质-items/<id>.png\`。
 *
 * 和方块表分开是有意的：像素画的色板只从 blocks.ts 的 142 种方块推导，
 * 物品混进去会让「用钻石剑画像素画」这种无意义组合出现在调色板里。
 *
 * 共 ${rows.length} 种。
 */

export interface ItemDef {
  /** 中文名 */
  zh: string
  /** 英文名，搜索用 */
  en: string
  /** 物品 ID，不含命名空间，例如 diamond_sword */
  id: string
  /** 贴图键，对应 \`src/assets/textures/items/<id>.png\` */
  tex: string
}

export const ITEMS: readonly ItemDef[] = [
${body}
]

export const ITEMS_BY_ID: Readonly<Record<string, ItemDef>> = Object.fromEntries(
  ITEMS.map((item) => [item.id, item]),
)

/** 按 id 或中英文名搜索，最多返回 limit 条 */
export function searchItems(query: string, limit = 120): readonly ItemDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return ITEMS.slice(0, limit)
  const out: ItemDef[] = []
  for (const item of ITEMS) {
    if (\`\${item.zh} \${item.en} \${item.id}\`.toLowerCase().includes(q)) {
      out.push(item)
      if (out.length >= limit) break
    }
  }
  return out
}
`

  await writeFile(outFile, text)
  console.log(`物品表：${rows.length} 条 → src/core/items.ts`)
  if (missingTex.length) {
    console.log(`  跳过 ${missingTex.length} 条没有贴图的条目：${missingTex.slice(0, 8).join(', ')}…`)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
