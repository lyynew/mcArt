/**
 * 生成方块「顶面 / 侧面」映射表 → src/core/block-faces.ts。
 *
 * 素材目录里 156 张 `*_top.png` 不都是方块的顶面（门、床、地板也混在里面），
 * 手工维护一张表既容易漏也会随版本漂移。这里只认一条规则：
 *
 *   把 <name>_top / <name>_side 的后缀剥掉得到 stem，
 *   stem 至少有一张独立的顶 / 侧面贴图 → 它是一个「多面方块」。
 *
 * 草方块尤其要注意：26.3 里只有 grass_block_side / grass_block_top，
 * **没有 grass_block.png**，按「主贴图必须存在」筛会把它整个漏掉。
 * 所以表以 stem 为键，渲染时先把用户选中的 tex 剥后缀再查表。
 *
 * 没有多面贴图的一律不进表，渲染时三面都用主贴图，省掉 1300 条无用数据。
 *
 * 用法：node scripts/build-block-faces.mjs
 */
import { readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, '原版材质')

const names = new Set(
  (await readdir(dir)).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)),
)

/** 少数方块的侧面不跟自己同名，规则推不出来 */
const OVERRIDES = {
  farmland: { top: 'farmland', side: 'dirt' },
  farmland_moist: { top: 'farmland_moist', side: 'dirt' },
  carved_pumpkin: { top: 'pumpkin_top', side: 'pumpkin_side' },
}

const stems = new Set()
for (const name of names) {
  stems.add(name)
  stems.add(name.replace(/_(top|side)$/, ''))
}

const faces = {}
for (const stem of [...stems].sort()) {
  const top = `${stem}_top`
  const side = `${stem}_side`
  if (!names.has(top) && !names.has(side)) continue

  const base = names.has(stem) ? stem : names.has(side) ? side : top
  const pair = {
    top: names.has(top) ? top : base,
    side: names.has(side) ? side : base,
  }
  if (pair.top === pair.side) continue
  faces[stem] = pair
}

// 覆盖项只在源文件真的存在时写进去，避免换版本后指向空气
for (const [name, pair] of Object.entries(OVERRIDES)) {
  if (!names.has(pair.top) || !names.has(pair.side)) continue
  faces[name] = pair
}

const entries = Object.entries(faces)
const body = entries
  .map(([name, p]) => `  '${name}': { top: '${p.top}', side: '${p.side}' },`)
  .join('\n')

const out = `/**
 * 方块多面贴图映射 —— 由 scripts/build-block-faces.mjs 生成，勿手改。
 *
 * 只收录「顶面或侧面和主贴图不同」的方块（${entries.length} 种）。键是剥掉
 * _top / _side 后缀后的 stem，查表前要先剥后缀（见 tools/advancement/cube.ts）。
 * 表里没有的方块三面共用主贴图。
 *
 * 为什么不是运行时探测：贴图放在静态目录，浏览器没法列目录；
 * 构建时扫一次素材目录比维护 1300 条判断可靠得多。
 */

export interface BlockFaces {
  /** 顶面贴图键 */
  top: string
  /** 侧面贴图键，左右两面共用 */
  side: string
}

export const BLOCK_FACES: Readonly<Record<string, BlockFaces>> = {
${body}
}
`

await writeFile(join(root, 'src', 'core', 'block-faces.ts'), out, 'utf8')
console.log(`生成 src/core/block-faces.ts：${entries.length} 种多面方块`)
