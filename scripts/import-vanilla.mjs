/**
 * 从本机 Minecraft 客户端 jar 导入原版素材。
 *
 * 为什么要有这一步：站点需要的贴图（方块 + 物品）和语言文件都躺在客户端 jar 里，
 * 而且它们跟版本强绑定。手抄文件名迟早对不上，所以统一走这个脚本：
 *
 *   node scripts/import-vanilla.mjs                 # 自动找本机 26.3
 *   node scripts/import-vanilla.mjs --jar <路径>    # 指定 jar
 *
 * 产出：
 *   原版材质/            方块贴图（textures/block）
 *   原版材质-items/      物品贴图（textures/item）
 *   .build/lang/*.json   中英文语言文件
 *   .build/textures-manifest.json  版本号、张数、动画贴图清单
 *
 * 方块与物品分开两个目录，是因为两边有 72 个同名贴图（告示牌、蜡烛、酿造台…），
 * 平铺到一个目录会互相覆盖，图鉴里的物品图标就会变成方块贴图。
 *
 * 幂等：逐张比对大小，一致就跳过，可以反复跑。
 */
import { execFileSync } from 'node:child_process'
import { mkdir, open, readdir, readFile, rm, copyFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const args = process.argv.slice(2)
const argOf = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

/** 目标版本。换版本时改这里，或传 --version */
const VERSION = argOf('--version') ?? '26.3'

/** 找 jar：显式参数 > 环境变量 > 本机常见位置 */
function findJar() {
  const explicit = argOf('--jar') ?? process.env.MC_JAR
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`指定的 jar 不存在：${explicit}`)
    return explicit
  }

  const appdata = process.env.APPDATA ?? ''
  const candidates = [
    join(appdata, '.minecraft', 'versions', VERSION, `${VERSION}.jar`),
    // 启动器常把客户端先下到临时目录，或用户手动下过一份
    join(tmpdir(), `mc${VERSION.replace(/\./g, '')}-client.jar`),
    join(appdata, '.minecraft', 'versions', VERSION, 'client.jar'),
  ]
  for (const p of candidates) if (existsSync(p)) return p

  throw new Error(
    `没找到 ${VERSION} 的客户端 jar。请用 --jar 指定，例如：\n` +
      `  node scripts/import-vanilla.mjs --jar "C:/path/to/${VERSION}.jar"`,
  )
}

const ensureDir = (p) => mkdir(p, { recursive: true })

/** 用 java 的 jar 格式（就是 zip）解出某个前缀下的 png，返回文件名列表 */
async function extract(jar, prefix, dest) {
  await ensureDir(dest)
  const list = execFileSync('unzip', ['-Z1', jar, `${prefix}*.png`], { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const staging = join(tmpdir(), `mcimport-${Date.now()}`)
  await ensureDir(staging)
  execFileSync('unzip', ['-j', '-q', '-o', jar, `${prefix}*.png`, '-d', staging])

  let written = 0
  let skipped = 0
  for (const entry of list) {
    const name = entry.slice(entry.lastIndexOf('/') + 1)
    const from = join(staging, name)
    const to = join(dest, name)
    let same = false
    if (existsSync(to)) {
      const [a, b] = await Promise.all([readFile(from), readFile(to)])
      same = a.length === b.length && a.equals(b)
    }
    if (same) {
      skipped++
      continue
    }
    await copyFile(from, to)
    written++
  }
  await rm(staging, { recursive: true, force: true })
  return { total: list.length, written, skipped }
}

/**
 * 图标取自物品贴图的方块。
 *
 * 这几类方块在游戏里用实体模型渲染（或只有物品形态），没有 textures/block 下的贴图。
 * block-extras.ts 的 tex 直接指向物品图标名，所以要把它们从物品目录复制一份到方块目录，
 * 否则图鉴与层视图会掉图。
 */
const BORROWED_FROM_ITEMS = ['pitcher_plant', 'pointed_dripstone', 'sniffer_egg']

/** 读 jar 里的文本文件 */
function readInside(jar, path) {
  return execFileSync('unzip', ['-p', jar, path], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

/** 从官方资源索引取语言文件（jar 里只有 en_us，中文是单独分发的） */
async function fetchLang(jar, lang) {
  const versionJson = join(process.env.APPDATA ?? '', '.minecraft', 'versions', VERSION, `${VERSION}.json`)
  if (!existsSync(versionJson)) return null

  const meta = JSON.parse(await readFile(versionJson, 'utf8'))
  const indexUrl = meta.assetIndex?.url
  if (!indexUrl) return null

  const index = await (await fetch(indexUrl)).json()
  const entry = index.objects?.[`minecraft/lang/${lang}.json`]
  if (!entry) return null

  const url = `https://resources.download.minecraft.net/${entry.hash.slice(0, 2)}/${entry.hash}`
  const res = await fetch(url)
  if (!res.ok) return null
  return await res.text()
}

/** 读 PNG 头拿宽高（只读前 24 字节，不整张读） */
async function pngSize(path) {
  const fh = await open(path, 'r')
  try {
    const buf = Buffer.alloc(24)
    await fh.read(buf, 0, 24, 0)
    // 8 字节签名 + 4 长度 + 4 类型，随后是 IHDR 的宽高，各 4 字节大端
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  } finally {
    await fh.close()
  }
}

/** 多帧动画贴图：原版把帧竖着拼成 16×16N，只取第一帧绘制 */
async function animatedTextures(dir, names) {
  const out = []
  for (const name of names) {
    const { width, height } = await pngSize(join(dir, name))
    if (width === 16 && height > 16 && height % 16 === 0) {
      out.push(`${name.slice(0, -4)}×${height / 16}`)
    }
  }
  return out
}

async function main() {
  const jar = findJar()
  console.log(`jar: ${jar}`)

  const blockDir = join(root, '原版材质')
  const itemDir = join(root, '原版材质-items')
  const langDir = join(root, '.build', 'lang')
  await ensureDir(langDir)

  console.log('导入方块贴图…')
  const blocks = await extract(jar, 'assets/minecraft/textures/block/', blockDir)
  console.log(`  共 ${blocks.total}，新写入 ${blocks.written}，未变 ${blocks.skipped}`)

  console.log('导入物品贴图…')
  const items = await extract(jar, 'assets/minecraft/textures/item/', itemDir)
  console.log(`  共 ${items.total}，新写入 ${items.written}，未变 ${items.skipped}`)

  for (const name of BORROWED_FROM_ITEMS) {
    const from = join(itemDir, `${name}.png`)
    if (existsSync(from) && !existsSync(join(blockDir, `${name}.png`))) {
      await copyFile(from, join(blockDir, `${name}.png`))
    }
  }


  console.log('导出语言文件…')
  const en = readInside(jar, 'assets/minecraft/lang/en_us.json')
  await writeFile(join(langDir, 'en_us.json'), en)

  let zh = null
  try {
    zh = await fetchLang(jar, 'zh_cn')
  } catch (err) {
    console.warn(`  中文语言文件获取失败：${err.message}`)
  }
  if (zh) {
    await writeFile(join(langDir, 'zh_cn.json'), zh)
    console.log('  en_us + zh_cn 已写入 .build/lang/')
  } else {
    console.log('  en_us 已写入；zh_cn 缺失，名字会退回英文')
  }

  const blockNames = (await readdir(blockDir)).filter((f) => f.endsWith('.png'))
  const anim = await animatedTextures(blockDir, blockNames)

  const manifest = {
    version: VERSION,
    source: 'client.jar',
    blocks: blockNames.length,
    items: (await readdir(itemDir)).filter((f) => f.endsWith('.png')).length,
    animated: anim.length,
    animatedTextures: anim,
    importedAt: new Date().toISOString().slice(0, 10),
  }
  // 清单放 .build/，别混进素材目录：那里只应有 PNG
  await writeFile(join(root, '.build', 'textures-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

  console.log(
    `\n完成：方块 ${manifest.blocks} 张，物品 ${manifest.items} 张，动画贴图 ${manifest.animated} 张`,
  )
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
