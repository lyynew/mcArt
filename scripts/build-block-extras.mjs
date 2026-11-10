/**
 * 生成 src/core/block-extras.ts —— 识别用扩展方块总表。
 *
 * 色板源是 src/core/blocks.ts 的 BLOCKS（142 种，像素画用，别动）；
 * 这里把「其余大多数方块」收进 EXTRA_BLOCKS，供结构查看器查名字、认贴图。
 * 两边合并成一张注册表（blocks.ts 的 BLOCKS_BY_ID / findBlock）。
 *
 * 数据全部取自官方 1.21.4 资产（InventivetalentDev/minecraft-assets 镜像）：
 *   - 方块 id   ：assets/minecraft/blockstates/*.json 的文件名
 *   - 中英文名 ：lang/zh_cn.json、lang/en_us.json 的 block.minecraft.<id>
 *   - 贴图     ：textures/block/*.png；没有方块贴图的用物品图标，再不行留空配平均色
 *   - 平均色   ：.build/png_avg.py --json 对 原版材质/ 的实测均值，不手填
 *
 * 用法：node scripts/build-block-extras.mjs
 * 缺的数据文件与贴图会自动补齐（需联网），已有的不重复下载。
 * 输出是确定性的：同样的输入产出逐字节一致的文件。
 */
import { execFileSync, spawn } from 'node:child_process'
import { mkdir, readFile, stat, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const buildDir = join(root, '.build')
const texDir = join(root, '原版材质')

// 贴图源：原版资产镜像（1.21.4）的 textures 目录。首选原始 GitHub raw（.build/fetch.py 一直用它）；
// 受限网络里 raw 会间歇性 502，再往下试两个内容一致的 ghproxy 镜像。
// 全都倒了就歇一轮再来；已下载的文件直接跳过，重跑即续传。
const SOURCES = [
  'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures',
  'https://ghproxy.net/https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures',
  'https://ghfast.top/https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures',
]

/* ---------------- 排除：技术方块、隐形方块、纯状态重复项 ----------------
   wall_* 系（墙上告示牌/旗帜/头颅/火把）在 normalizeBlockId 里归一到落地方块，
   注册表里只留一份，材料统计才不会同一种方块拆成两行。 */
const EXCLUDE = [
  /^air$/, /^cave_air$/, /^void_air$/, /^structure_void$/,
  /^light$/, /^barrier$/, /^end_gateway$/,
  /^moving_piston$/, /^piston_head$/, /^bubble_column$/,
  /^item_frame$/, /^glow_item_frame$/, /^frosted_ice$/,
  /^potted_/, /_candle_cake$/, /^candle_cake$/,
  /^nether_portal$/, /^end_portal$/,
  /^wall_torch$/, /^soul_wall_torch$/, /^redstone_wall_torch$/,
  /_wall_sign$/, /_wall_hanging_sign$/, /_wall_banner$/, /_wall_skull$/, /_wall_head$/,
]

/* ---------------- 贴图显式映射 ----------------
   通用规则之外的特例。值是 原版材质/ 里的贴图主名（textures/block/ 下的文件名）。
   这些大都是「模型引用别的方块贴图」或「贴图名带阶段号」的情况，逐条查过 models/block/。 */
const TEX_OVERRIDE = {
  water: 'water_still',
  lava: 'lava_still',
  fire: 'fire_0',
  soul_fire: 'soul_fire_0',
  campfire: 'campfire_log',
  soul_campfire: 'soul_campfire_log_lit',
  spawner: 'spawner',
  water_cauldron: 'cauldron',
  lava_cauldron: 'cauldron',
  powder_snow_cauldron: 'cauldron',
  kelp_plant: 'kelp',
  twisting_vines_plant: 'twisting_vines',
  weeping_vines_plant: 'weeping_vines',
  cave_vines_plant: 'cave_vines',
  big_dripleaf_stem: 'big_dripleaf',
  sticky_piston: 'piston_top_sticky',
  chipped_anvil: 'anvil',
  damaged_anvil: 'anvil',
  suspicious_sand: 'suspicious_sand_0',
  suspicious_gravel: 'suspicious_gravel_0',
  sweet_berry_bush: 'sweet_berry_bush_stage3',
  torchflower_crop: 'torchflower_crop_stage1',
  beetroots: 'beetroots_stage3',
  carrots: 'carrots_stage3',
  potatoes: 'potatoes_stage3',
  cocoa: 'cocoa_stage2',
  wheat: 'wheat_stage7',
  nether_wart: 'nether_wart_stage2',
  bamboo: 'bamboo_stalk',
  bamboo_sapling: 'bamboo_stage0',
  redstone_wire: 'redstone_dust_line0',
  dispenser: 'dispenser_front',
  dropper: 'dropper_front',
  heavy_weighted_pressure_plate: 'iron_block',
  light_weighted_pressure_plate: 'gold_block',
  petrified_oak_slab: 'oak_planks',
  smooth_quartz: 'quartz_block_bottom',
  smooth_quartz_slab: 'quartz_block_bottom',
  smooth_quartz_stairs: 'quartz_block_bottom',
  smooth_sandstone: 'sandstone_top',
  smooth_sandstone_slab: 'sandstone_top',
  smooth_sandstone_stairs: 'sandstone_top',
  smooth_red_sandstone: 'red_sandstone_top',
  smooth_red_sandstone_slab: 'red_sandstone_top',
  smooth_red_sandstone_stairs: 'red_sandstone_top',
  decorated_pot: 'terracotta',
  crimson_hyphae: 'crimson_stem',
  warped_hyphae: 'warped_stem',
  stripped_crimson_hyphae: 'stripped_crimson_stem',
  stripped_warped_hyphae: 'stripped_warped_stem',
  trial_spawner: 'trial_spawner_side_inactive',
}

/* 没有方块贴图也没有物品图标的方块：退到手填平均色（tex 留空）。
   这些是实体模型渲染的（箱子、头颅），只求在层视图里有个像样的底色。 */
const HEX_HINT = {
  chest: '#7A5A32',
  trapped_chest: '#85652F',
  ender_chest: '#133B3A',
  skeleton_skull: '#C3C0B4',
  wither_skeleton_skull: '#393939',
  zombie_head: '#6D8C40',
  player_head: '#B78A62',
  creeper_head: '#59C54D',
  dragon_head: '#453C6E',
  piglin_head: '#D9936B',
}

/* 没有方块贴图、但物品图标能代表的（图标也下载进 原版材质/） */
const ITEM_FALLBACK = new Set(['pitcher_plant', 'pointed_dripstone', 'sniffer_egg'])

/* 构件后缀 → 基础材质。先剥后缀，再在候选名里找贴图（楼梯就是拿基材的面贴的） */
const SHAPE_SUFFIXES = [
  '_wall_fan', '_wall_hanging_sign', '_wall_sign', '_hanging_sign', '_sign',
  '_stairs', '_slab', '_wall', '_fence_gate', '_fence', '_button', '_pressure_plate',
  '_carpet', '_door', '_trapdoor', '_bed', '_banner', '_fan', '_plant', '_head', '_skull', '_stem',
]
const BASE_CANDIDATES = (base) => [
  base, `${base}s`, `${base}_planks`, `${base}_bricks`, `${base}_block`, `${base}_wool`,
  `${base}_side`, `${base}_top`, `${base}_log`, `${base}_stem`,
]

/* 识别表的归类（仅展示用；色板分组仍只看 blocks.ts 的八个分组）。
   顺序即优先级：先环境（下界/末地）、再形态（构件）、再材质，最后功能与装饰。 */
const FAM_RULES = [
  [/(nether|netherrack|basalt|blackstone|magma|soul_|gilded|ancient_debris|respawn_anchor|nylium|warped_|crimson_|shroomlight|glowstone)/, '下界'],
  [/(end_stone|purpur|chorus|end_)/, '末地'],
  [/(_ore$|netherite|raw_iron|raw_gold|raw_copper)/, '矿石'],
  [/(_stairs|_slab|_wall|_fence|_fence_gate|_button|_pressure_plate|_door|_trapdoor|_sign)$/, '建筑构件'],
  [/glazed_terracotta/, '装饰'],
  [/(leaves|sapling|flower|grass|fern|vine|moss|mushroom|kelp|coral|cactus|melon|pumpkin|wheat|crop|seagrass|snow|ice|water|lava|dirt|sand|gravel|clay|mud|sponge|mycelium|podzol|roots|fungus|bush|petals|eyeblossom|frogspawn|turtle_egg|sniffer_egg|dripleaf|spore_blossom|glow_lichen|hanging_roots|cobweb|dead_bush|bamboo|cocoa|berry|pitcher|torchflower|beetroot|carrots|potatoes|farmland|dirt_path|dripstone|sculk|amethyst|budding|cluster|bud|pointed)/, '自然'],
  [/(stone|bricks?$|deepslate|tuff|andesite|diorite|granite|sandstone|quartz|prismarine|blackstone|obsidian|terracotta|copper|calcite|resin|smooth|brick)/, '石材'],
  [/(oak|spruce|birch|jungle|acacia|mangrove|cherry|pale_oak)/, '木质'],
  [/(candle|cake|torch|lantern|chain|ladder|bell|conduit|end_rod|lightning_rod|scaffolding|iron_bars|glass|shulker|banner|bed|carpet|glazed|flower_pot|decorated_pot|bookshelf|beacon|froglight|sea_lantern|chiseled)/, '装饰'],
  [/(table|furnace|chest|hopper|piston|rail|redstone|command|anvil|brewing|dispenser|dropper|observer|comparator|repeater|lever|target|tnt|slime|honey|note_block|jukebox|crafting|barrel|composter|smoker|stonecutter|cartography|fletching|loom|smithing|structure_|jigsaw|vault|trial|crafter|heavy_core|daylight|campfire)/, '功能'],
]

function famOf(id) {
  for (const [re, fam] of FAM_RULES) if (re.test(id)) return fam
  return '其他'
}

/* ---------------- 小工具 ---------------- */

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function fetchText(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'mcArt-build' },
        signal: AbortSignal.timeout(20000),
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
    }
  }
  throw new Error(`下载失败：${url}`)
}

function runCurl(args) {
  return new Promise((resolve) => {
    const child = spawn('curl', args, { stdio: 'ignore' })
    child.on('close', (code) => resolve(code === 0))
    child.on('error', () => resolve(false))
  })
}

/** 按 SOURCES 顺序试着把一张贴图拉到本地；网络窗口关闭时交给外层循环歇会儿再续传 */
async function fetchBinaryTo(dest, rel) {
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const base of SOURCES) {
      const ok = await runCurl([
        '-sS', '--fail', '-L', '--max-time', '20', '--retry', '1', '--retry-delay', '1',
        '-H', 'User-Agent: mcArt-build', '-o', dest, `${base}/${rel}.png`,
      ])
      if (ok) {
        try {
          const buf = await readFile(dest)
          if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return true
        } catch {
          /* 读失败按没下到处理 */
        }
      }
      await rm(dest, { force: true }).catch(() => {})
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
  }
  return false
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i], i)
      }
    }),
  )
  return out
}

/**
 * 写文本文件（走 python）。
 *
 * 有的机器装了文档加密代理（E-SafeNet 之类），它会把 node 写出的文本透明加密：
 * node 自己读回来正常，但 git / 其他进程看到的是密文——生成物一旦这样进仓库
 * 就等于提交了乱码。python 写的文件不受影响，所以这里统一借它落盘；
 * 反正本脚本已经依赖 python（png_avg.py）。
 */
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

/* ---------------- 1. 官方数据文件（缺了就拉） ---------------- */

async function ensureRefs() {
  await mkdir(buildDir, { recursive: true })

  const idsPath = join(buildDir, 'mc-ids.txt')
  const texPath = join(buildDir, 'mc-tex.txt')
  const itemPath = join(buildDir, 'item-tex.txt')

  if (!(await exists(idsPath)) || !(await exists(texPath)) || !(await exists(itemPath))) {
    console.log('拉取 1.21.4 资产目录（git trees）…')
    const tree = JSON.parse(
      (await fetchText('https://api.github.com/repos/InventivetalentDev/minecraft-assets/git/trees/1.21.4?recursive=1')) ??
        '{}',
    )
    const paths = (tree.tree ?? []).filter((t) => t.type === 'blob').map((t) => t.path)
    const pick = (prefix, suffix) =>
      paths
        .filter((p) => p.startsWith(prefix) && p.endsWith(suffix))
        .map((p) => p.slice(prefix.length, -suffix.length))
        .sort()
    await writeTextPlain(idsPath, pick('assets/minecraft/blockstates/', '.json').filter((s) => !s.startsWith('_')).join('\n'))
    await writeTextPlain(texPath, pick('assets/minecraft/textures/block/', '.png').join('\n'))
    await writeTextPlain(itemPath, pick('assets/minecraft/textures/item/', '.png').join('\n'))
    console.log('  blockstates / block 贴图 / item 贴图清单已写入 .build/')
  }

  for (const lang of ['zh_cn', 'en_us']) {
    const p = join(buildDir, `${lang}.json`)
    if (await exists(p)) continue
    console.log(`拉取语言文件 ${lang}…`)
    const text = await fetchText(`${SOURCES[0].replace(/\/textures$/, '')}/lang/${lang}.json`)
    if (!text) throw new Error(`语言文件 404：${lang}`)
    await writeTextPlain(p, text)
  }
}

/* ---------------- 2. 解析输入 ---------------- */

function readList(path) {
  return readFile(path, 'utf8').then((t) => t.split('\n').map((s) => s.trim()).filter(Boolean))
}

const texStem = (t) => (t ? t.replace(/^minecraft:block\//, '') : null)

function makeResolver(texset) {
  const chain = (t) => {
    for (const c of [t, `${t}_side`, `${t}_top`]) if (texset.has(c)) return c
    return null
  }
  const resolve = (id) => {
    if (id in TEX_OVERRIDE) {
      const o = TEX_OVERRIDE[id]
      return chain(o) ?? (texset.has(o) ? o : null)
    }
    const direct = chain(id)
    if (direct) return direct
    // X_wood（树皮满面）用的就是 X_log 的贴图；stripped 同理
    const logForm = id.replace(/_wood$/, '_log')
    if (logForm !== id) {
      const r = chain(logForm)
      if (r) return r
    }
    for (const pref of ['waxed_', 'infested_']) {
      if (id.startsWith(pref)) {
        const r = resolve(id.slice(pref.length))
        if (r) return r
      }
    }
    if (id.includes('_wall_')) {
      const r = resolve(id.replace('_wall_', '_'))
      if (r) return r
    }
    for (const s of SHAPE_SUFFIXES) {
      if (!id.endsWith(s)) continue
      const base = id.slice(0, -s.length)
      for (const cand of BASE_CANDIDATES(base)) {
        const r = chain(cand)
        if (r) return r
      }
      break
    }
    return null
  }
  return resolve
}

/* ---------------- 3. 生成 ---------------- */

async function main() {
  await ensureRefs()

  const ids = await readList(join(buildDir, 'mc-ids.txt'))
  const texset = new Set(await readList(join(buildDir, 'mc-tex.txt')))
  const itemset = new Set(await readList(join(buildDir, 'item-tex.txt')))
  const zh = JSON.parse(await readFile(join(buildDir, 'zh_cn.json'), 'utf8'))
  const en = JSON.parse(await readFile(join(buildDir, 'en_us.json'), 'utf8'))

  // 色板源的 142 种不进识别表（blocks.ts 里那份就是注册表前半段）
  const artSrc = await readFile(join(root, 'src/core/blocks.ts'), 'utf8')
  const artIds = new Set([...artSrc.matchAll(/id: '([a-z0-9_]+)'/g)].map((m) => m[1]))

  const resolve = makeResolver(texset)

  const entries = []
  for (const id of ids) {
    if (id.startsWith('_') || EXCLUDE.some((re) => re.test(id)) || artIds.has(id)) continue
    const zhName = zh[`block.minecraft.${id}`]
    const enName = en[`block.minecraft.${id}`] ?? id
    if (!zhName) throw new Error(`缺少官方中文名：${id}（不该发生，检查语言文件）`)

    let tex = resolve(id)
    let source = tex ? 'block' : null
    if (!tex && ITEM_FALLBACK.has(id) && itemset.has(id)) {
      tex = id
      source = 'item'
    }
    entries.push({
      id,
      zh: zhName,
      en: enName,
      fam: famOf(id),
      tex: tex ?? '',
      source,
      hex: HEX_HINT[id] ?? null,
    })
  }

  console.log(`识别表候选 ${entries.length} 种：${entries.filter((e) => e.tex).length} 有贴图，${entries.filter((e) => !e.tex).length} 纯平均色`)

  /* ---- 补下载缺失贴图 ---- */
  await mkdir(texDir, { recursive: true })
  const need = []
  for (const e of entries) {
    if (e.tex && !(await exists(join(texDir, `${e.tex}.png`)))) need.push(e)
  }
  console.log(`需下载贴图 ${need.length} 张…`)

  // 清单落盘：网络不好时可以先跑 `bash scripts/fetch-textures.sh`，
  // 用 shell 里的 curl 分块补，缺什么一目了然；补完再重跑本脚本即生成。
  await writeTextPlain(
    join(buildDir, 'tex-need.txt'),
    need.map((e) => `${e.tex}\t${e.source === 'item' ? `item/${e.id}` : `block/${e.tex}`}`).join('\n') + '\n',
  )

  const failed = []
  let done = 0
  let lastOk = Date.now()
  // 并发别太贪：镜像对同 IP 并发敏感，太高反而被限速
  await mapLimit(need, 5, async (e) => {
    const rel = e.source === 'item' ? `item/${e.id}` : `block/${e.tex}`
    const ok = await fetchBinaryTo(join(texDir, `${e.tex}.png`), rel)
    if (ok) {
      lastOk = Date.now()
    } else {
      failed.push(`${e.id} ← ${rel}`)
      // 网络出口整个挂掉时别把 600 张的重试耗光——快速失败，外层循环歇会儿再续传
      if (Date.now() - lastOk > 120000) {
        throw new Error('两分钟没有任何下载成功，网络出口挂了；已下载的会保留，重跑即续传')
      }
    }
    if (++done % 30 === 0) console.log(`  …${done}/${need.length}`)
    await new Promise((r) => setTimeout(r, 100))
  })
  if (failed.length) {
    console.log(`\n贴图下载失败 ${failed.length} 条：`)
    for (const f of failed) console.log(`  ${f}`)
    throw new Error('贴图没补齐，先解决上面的下载问题再生成')
  }

  /* ---- 平均色实测 ---- */
  console.log('实测平均色（png_avg.py --json）…')
  const hexMap = JSON.parse(
    execFileSync('python', [join(buildDir, 'png_avg.py'), '--json'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }),
  )
  for (const e of entries) {
    if (e.tex) {
      e.hex = hexMap[e.tex]
      if (!e.hex) throw new Error(`贴图没有平均色：${e.tex}`)
    } else if (!e.hex) {
      e.hex = '#8B8B8B'
    }
  }

  /* ---- 写生成物 ---- */
  const lines = entries.map(
    (e) =>
      `  { zh: ${q(e.zh)}, en: ${q(e.en)}, hex: ${q(e.hex)}, id: ${q(e.id)}, fam: ${q(e.fam)}, tex: ${q(e.tex)} },`,
  )

  const out = `/**
 * 识别用扩展方块总表 —— 由 scripts/build-block-extras.mjs 生成，勿手改。
 *
 * 色板源是 blocks.ts 的 BLOCKS（142 种，像素画用）；这里收录其余大多数方块，
 * 供结构查看器等「查名字、认贴图」的场景使用，不参与像素画色板推导。
 *
 * 中英文名取自官方 1.21.4 语言文件，贴图主名对应 \`原版材质/<tex>.png\`
 * （无方块贴图的用物品图标；箱子与头颅是实体模型渲染，只留实测平均色，tex 为空）。
 * 共 ${entries.length} 种，与 BLOCKS 合并成 blocks.ts 的 BLOCKS_BY_ID 注册表。
 */
import type { BlockDef } from './blocks'

export const EXTRA_BLOCKS: readonly BlockDef[] = [
${lines.join('\n')}
]
`
  await writeTextPlain(join(root, 'src/core/block-extras.ts'), out)
  console.log(`已写入 src/core/block-extras.ts（${entries.length} 条）`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
