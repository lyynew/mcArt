/**
 * 生成算法基准样本（fixture）。
 *
 * 做法：把旧版单文件里那几个关键函数原样抽出来，在 Node 里跑一遍，
 * 把输出冻结成 fixture。新实现必须逐字节/逐值对上，否则测试失败。
 *
 * 这是这次重构最重要的安全网——尤其是 .nbt 的字节流，
 * 「看起来能导出」和「进游戏能加载」之间隔着几十个字段的精确度。
 *
 * 用法：node scripts/make-fixtures.mjs
 * 只在需要重新基准时运行；结果提交进仓库，日常测试不依赖本脚本。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const outDir = join(root, 'tests/fixtures')

const html = await readFile(join(root, 'public/legacy/index.html'), 'utf8')

function region(from, to) {
  const a = html.indexOf(from)
  const b = html.indexOf(to, a)
  if (a < 0) throw new Error(`找不到起始标记：${from}`)
  if (b < 0) throw new Error(`找不到结束标记：${to}`)
  return html.slice(a, b)
}

const legacySource = [
  region('function hexToRgb(', '/* ---------- 全部方块 ---------- */'),
  region('function ciede2000(', '/* ================= 渲染 ================= */'),
  region('const STRUCT_MAX = 48;', 'function NB()'),
  region('function NB()', 'let CRC_TABLE'),
  region('let CRC_TABLE = null;', 'async function gzipBytes'),
  region('function zipStored(', 'function safeName'),
  region('function safeName(', 'function tilesNote'),
  `return { hexToRgb, rgbToLab, labDist, ciede2000, findNearest, computeIdx,
            applyManual, buildStructure, crc32, gzipStored, zipStored, safeName }`,
].join('\n')

/** 旧版函数依赖的全局量通过参数注入；每次调用绑定一组新状态 */
function createLegacyApi(state, palettes, allBlocks) {
  return new Function('state', 'PALETTES', 'ALL_BLOCKS', legacySource)(state, palettes, allBlocks)
}

/* ---------- 方块总表：从 src/core/blocks.ts 解析，保证与站点一致 ---------- */
const blocksSrc = await readFile(join(root, 'src/core/blocks.ts'), 'utf8')
const re = /\{ zh: '([^']*)', en: '([^']*)', hex: '(#[0-9A-Fa-f]{6})', id: '([a-z_]+)', fam: '([^']*)', tex: '([a-z_]+)' \}/g

const rawBlocks = [...blocksSrc.matchAll(re)].map((m) => ({
  zh: m[1],
  en: m[2],
  hex: m[3],
  id: m[4],
  fam: m[5],
  tex: m[6],
}))
if (rawBlocks.length !== 142) throw new Error(`解析到 ${rawBlocks.length} 种方块，应为 142`)

/* ---------- 构造旧版所需的 ALL_BLOCKS ---------- */
// ciede2000 只依赖 lab，但 findNearest 依赖 blocks[i].lab / .rgb
const probe = createLegacyApi({}, {}, [])

const ALL_BLOCKS = rawBlocks.map((b, all) => {
  const rgb = probe.hexToRgb(b.hex)
  return {
    ...b,
    id: `minecraft:${b.id}`,
    rgb,
    lab: probe.rgbToLab(rgb[0], rgb[1], rgb[2]),
    i: -1,
    all,
  }
})

/** 固定取一组方块做基准，避免依赖「基本」套装的去重结果 */
function pickBlocks(fam, count) {
  return ALL_BLOCKS.filter((b) => b.fam === fam)
    .slice(0, count)
    .map((b, i) => ({ ...b, i }))
}

const CONCRETE_16 = pickBlocks('混凝土', 16)
const MIXED_12 = [
  ...ALL_BLOCKS.filter((b) => b.fam === '混凝土').slice(0, 4),
  ...ALL_BLOCKS.filter((b) => b.fam === '木质').slice(0, 4),
  ...ALL_BLOCKS.filter((b) => b.fam === '石材').slice(0, 4),
].map((b, i) => ({ ...b, i }))

await mkdir(join(outDir, 'nbt'), { recursive: true })

/* ---------- 1. 颜色基准 ---------- */
// 伪随机但确定：线性同余，避免依赖 Math.random
let seed = 20261108
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

const colorCases = []
for (let i = 0; i < 240; i++) {
  const p = [
    rnd() * 100,
    rnd() * 200 - 100,
    rnd() * 200 - 100,
  ]
  const q = [
    rnd() * 100,
    rnd() * 200 - 100,
    rnd() * 200 - 100,
  ]
  colorCases.push({ p, q, d: probe.ciede2000(p[0], p[1], p[2], q[0], q[1], q[2]) })
}

// 另加几组 RGB → Lab 与最近方块，覆盖 hexToRgb / rgbToLab / findNearest
const rgbCases = []
for (let i = 0; i < 60; i++) {
  const r = Math.floor(rnd() * 256)
  const g = Math.floor(rnd() * 256)
  const b = Math.floor(rnd() * 256)
  const lab = probe.rgbToLab(r, g, b)
  rgbCases.push({
    r,
    g,
    b,
    lab,
    nearest: probe.findNearest(lab[0], lab[1], lab[2], MIXED_12),
  })
}

await writeFile(
  join(outDir, 'color.json'),
  JSON.stringify({ paletteIds: MIXED_12.map((b) => b.id.replace('minecraft:', '')), colorCases, rgbCases }, null, 1),
  'utf8',
)

/* ---------- 2. 转换基准（quantize + 去杂点 + 抖动） ---------- */
const N = 16
const src = new Uint8ClampedArray(N * N * 4)
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4
    // 造一块有渐变、有强色、有透明洞的图，尽量把各个分支都跑到
    src[i] = (x * 16 + y * 3) % 256
    src[i + 1] = (y * 16 + 40) % 256
    src[i + 2] = ((x ^ y) * 13 + 90) % 256
    src[i + 3] = x === 0 && y < 3 ? 0 : 255
  }
}

const PALETTES = { p: { blocks: CONCRETE_16, label: 't', desc: 't' } }

function legacyQuantize(dither, despeckle) {
  const state = { N, palette: 'p', dither, despeckle, src, manual: null, manualBlock: null, idx: null }
  const legacy = createLegacyApi(state, PALETTES, ALL_BLOCKS)
  legacy.computeIdx()
  return Array.from(state.idx)
}

const convertFixture = {
  n: N,
  paletteIds: CONCRETE_16.map((b) => b.id.replace('minecraft:', '')),
  src: Array.from(src),
  cases: {
    plain: legacyQuantize(false, false),
    dither: legacyQuantize(true, false),
    despeckle: legacyQuantize(false, true),
    ditherDespeckle: legacyQuantize(true, true),
  },
}

await writeFile(join(outDir, 'convert.json'), JSON.stringify(convertFixture), 'utf8')

/* ---------- 3. 结构文件基准 ---------- */
// 用确定性图案构造一幅 12×12 的图，含空格
const SN = 12
const cells = new Int16Array(SN * SN)
for (let y = 0; y < SN; y++) {
  for (let x = 0; x < SN; x++) {
    const t = (x * 5 + y * 3) % 17
    cells[y * SN + x] = t === 0 ? -1 : t % CONCRETE_16.length
  }
}

const nbtState = { N: SN, palette: 'p', idx: cells }
const nbtApi = createLegacyApi(nbtState, PALETTES, ALL_BLOCKS)

const variants = [
  { name: 'flat-air', useAir: true, wall: false },
  { name: 'flat-noair', useAir: false, wall: false },
  { name: 'wall-air', useAir: true, wall: true },
  { name: 'wall-noair', useAir: false, wall: true },
]

for (const v of variants) {
  const bytes = nbtApi.buildStructure(0, 0, SN, SN, v.useAir, v.wall)
  await writeFile(join(outDir, 'nbt', `${v.name}.nbt`), bytes)
}

// 分块场景：只取 5×3 的小块，验证局部坐标与偏移
const sub = nbtApi.buildStructure(2, 3, 5, 3, true, false)
await writeFile(join(outDir, 'nbt', 'sub-5x3.nbt'), sub)

/* ---------- 4. 归档基准 ---------- */
const payload = new TextEncoder().encode('mcArt structure payload · 结构文件基准')
const gz = nbtApi.gzipStored(payload)
await writeFile(join(outDir, 'gzip-stored.bin'), gz)

const zipEntries = [
  { name: 'a.nbt', data: nbtApi.buildStructure(0, 0, 4, 4, true, false) },
  { name: '载入说明.txt', data: new TextEncoder().encode('第一块 放在 (0,0)') },
]
await writeFile(join(outDir, 'zip-stored.bin'), nbtApi.zipStored(zipEntries))

const meta = {
  generatedAt: new Date().toISOString(),
  source: 'public/legacy/index.html',
  nbt: { n: SN, size: [...cells], blocks: CONCRETE_16.map((b) => b.id.replace('minecraft:', '')), variants },
  sub: { ox: 2, oy: 3, w: 5, h: 3 },
  gzip: { payload: [...payload], length: gz.length },
  zip: { entries: zipEntries.map((e) => ({ name: e.name, length: e.data.length })) },
}
await writeFile(join(outDir, 'meta.json'), JSON.stringify(meta, null, 1), 'utf8')

console.log('fixture 已生成：')
console.log(`  颜色 ${colorCases.length} 组 + RGB ${rgbCases.length} 组`)
console.log(`  转换 4 种组合（${N}×${N}）`)
console.log(`  结构文件 ${variants.length + 1} 个`)
console.log('  归档 gzip / zip 各 1 份')
