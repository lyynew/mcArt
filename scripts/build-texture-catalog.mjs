/**
 * 生成内置素材总表 src/core/texture-catalog.ts。
 *
 * 「使用内置素材」要能挑到素材目录里的每一张图，而不是只有方块表引用过的
 * 那 618 张。26.3 之后有 1303 张方块贴图 + 831 张物品图标，其中不少是门的
 * 各部件、点亮态、多面贴图，方块表/物品表都没有对应条目。这里以**源目录**
 * 为准列出全部文件，再从三张数据表反查中文名，查不到的就用文件名兜底。
 *
 * 数据源：原版材质/、原版材质-items/（都在仓库里，不依赖同步产物）、
 *   src/core/blocks.ts、block-extras.ts、items.ts、textures.ts 的 TEXTURE_ALIAS。
 *
 * 生成物**提交进仓库**：这样 typecheck / IDE 不需要先跑同步脚本，
 * 和 block-extras.ts 一个待遇。素材升级后重跑本脚本即可；
 * texture-catalog.test.ts 会校验清单与目录是否仍然一致。
 *
 * 用法：node scripts/build-texture-catalog.mjs
 */
import { spawn } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const OUT = join(root, 'src', 'core', 'texture-catalog.ts')

/** node 写文本会被本机 E-SafeNet 透明加密，生成物统一借 python 落盘 */
async function writeTextPlain(path, text) {
  const code =
    'import sys; open(sys.argv[1], "w", encoding="utf-8", newline="\\n").write(sys.stdin.read())'
  await new Promise((resolve, reject) => {
    const child = spawn('python', ['-c', code, path], { stdio: ['pipe', 'ignore', 'pipe'] })
    child.stdin.end(text)
    child.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`写文件失败：${path}`))))
    child.on('error', reject)
  })
  const head = (await readFile(path)).subarray(0, 64).toString('latin1')
  if (head.includes('E-SafeNe')) throw new Error(`${path} 被加密代理改写了，检查本机 DLP 设置`)
}

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/** 逐行读 `{ zh:'…', en:'…', id:'…', fam?:'…', tex:'…' }` 形式的数据表条目 */
function parseEntries(text) {
  const out = []
  for (const line of text.split('\n')) {
    if (!line.includes("tex: '")) continue
    const field = (name) => line.match(new RegExp(`${name}: '([^']*)'`))?.[1] ?? ''
    const tex = field('tex')
    if (!tex) continue
    out.push({ zh: field('zh'), en: field('en'), id: field('id'), fam: field('fam'), tex })
  }
  return out
}

/** 从 textures.ts 读别名，别在这里复制第二份 */
async function readAlias() {
  const src = await readFile(join(root, 'src', 'core', 'textures.ts'), 'utf8')
  const body = src.match(/TEXTURE_ALIAS[^=]*=\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  const map = new Map()
  for (const m of body.matchAll(/(\w+):\s*'([^']+)'/g)) map.set(m[1], m[2])
  return map
}

async function pngStems(dir) {
  const files = await readdir(dir)
  return new Set(files.filter((f) => f.toLowerCase().endsWith('.png')).map((f) => f.slice(0, -4)))
}

/** 物品按英文名首字母分桶，和图鉴的物品模式一致 */
function bucket(en, fallback) {
  const first = (en || fallback).trim().toUpperCase()[0] ?? '#'
  return /[A-Z]/.test(first) ? first : '#'
}

const [blockStems, itemStems, blocksText, extrasText, itemsText, alias] = await Promise.all([
  pngStems(join(root, '原版材质')),
  pngStems(join(root, '原版材质-items')),
  readFile(join(root, 'src', 'core', 'blocks.ts'), 'utf8'),
  readFile(join(root, 'src', 'core', 'block-extras.ts'), 'utf8'),
  readFile(join(root, 'src', 'core', 'items.ts'), 'utf8'),
  readAlias(),
])

if (!blockStems.size || !itemStems.size) throw new Error('素材目录里没有 PNG，先同步素材')

/* 方块：色板 BLOCKS 优先，扩展表补漏；别名先转成 26.3 的实际文件名 */
const byBlock = new Map()
for (const entry of [...parseEntries(blocksText), ...parseEntries(extrasText)]) {
  const tex = alias.get(entry.tex) ?? entry.tex
  if (!blockStems.has(tex) || byBlock.has(tex)) continue
  byBlock.set(tex, entry)
}

/* 物品：多个物品共用一张贴图时（如各类地图都用 items/map），
   优先 id 与文件同名的通用条目，其次中文名更短的那条 */
const byItem = new Map()
for (const entry of parseEntries(itemsText)) {
  const stem = entry.tex.replace(/^items\//, '')
  if (!itemStems.has(stem) || stem === entry.tex) continue
  const tex = `items/${stem}`
  const cur = byItem.get(tex)
  if (!cur || entry.id === stem || (cur.id !== stem && entry.zh.length < cur.zh.length)) {
    byItem.set(tex, entry)
  }
}

const entries = []
for (const tex of [...blockStems].sort()) {
  const b = byBlock.get(tex)
  entries.push({
    tex,
    kind: 'block',
    label: b?.zh || tex,
    en: b?.en || tex,
    family: b?.fam || '其他方块',
    named: Boolean(b?.zh),
  })
}
for (const stem of [...itemStems].sort()) {
  const tex = `items/${stem}`
  const it = byItem.get(tex)
  const en = it?.en || stem
  entries.push({
    tex,
    kind: 'item',
    label: it?.zh || stem,
    en,
    family: bucket(en, stem),
    named: Boolean(it?.zh),
  })
}

/* 有官方中文名的排前面，纯文件名兜底的沉到后面，免得把常用素材挤到第二屏 */
entries.sort(
  (a, b) =>
    Number(b.named) - Number(a.named) ||
    a.label.localeCompare(b.label, 'zh-CN') ||
    a.kind.localeCompare(b.kind) ||
    a.tex.localeCompare(b.tex),
)

const lines = [
  '/**',
  ' * 内置素材总表 —— 由 scripts/build-texture-catalog.mjs 生成，勿手改。',
  ' *',
  ` * 方块贴图 ${blockStems.size} 张 + 物品图标 ${itemStems.size} 张，以素材目录里的 PNG 为准；`,
  ' * 名字从 blocks.ts / block-extras.ts / items.ts 反查，查不到的用文件名。',
  ' * tex 带 items/ 前缀的落在 textures/items/，方块落在 textures/ 下——',
  ' * 两边有同名贴图，必须分开存，见 scripts/sync-textures.mjs。',
  ' *',
  ' * 这是「内置素材当源图」的清单，不参与像素画色板推导；色板仍然只认 blocks.ts。',
  ' */',
  '',
  "export type TextureKind = 'block' | 'item'",
  '',
  'export interface TextureCatalogEntry {',
  '  /** 贴图键，可直接交给 textureUrl() */',
  '  tex: string',
  '  kind: TextureKind',
  '  /** 优先官方中文名，没有条目时就是文件名 */',
  '  label: string',
  '  en: string',
  '  /** 方块为中文分组，物品为英文名首字母桶（A–Z / #） */',
  '  family: string',
  '  /** 是否反查到了官方中文名 */',
  '  named: boolean',
  '}',
  '',
  '// 逐条 push 而不是写成一个 2134 项的数组字面量：后者会让 TS 去推断一个',
  '// 巨大的字面量联合类型，vue-tsc 直接报 TS2590。push 的参数有上下文类型，',
  '// 每条都按 TextureCatalogEntry 检查，反而更安全。',
  'const catalog: TextureCatalogEntry[] = []',
  ...entries.map(
    (e) =>
      `catalog.push({ tex: ${q(e.tex)}, kind: '${e.kind}', label: ${q(e.label)}, ` +
      `en: ${q(e.en)}, family: ${q(e.family)}, named: ${e.named} })`,
  ),
  '',
  'export const TEXTURE_CATALOG: readonly TextureCatalogEntry[] = catalog',
  '',
]

await writeTextPlain(OUT, lines.join('\n'))

const named = (kind) => entries.filter((e) => e.kind === kind && e.named).length
console.log(
  `内置素材清单：共 ${entries.length} 张 · 方块 ${blockStems.size}（有中文名 ${named('block')}）` +
    ` · 物品图标 ${itemStems.size}（有中文名 ${named('item')}）`,
)
