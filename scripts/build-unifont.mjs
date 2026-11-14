/**
 * 生成原版 unifont 点阵字形数据 → 原版材质-font/unifont.bin
 *
 * Minecraft 26.3 的客户端 jar 里只有 ASCII 位图字体，中文走
 * `minecraft/font/unifont.zip`（GNU Unifont 17 的 .hex 数据），由官方资源索引
 * 分发，不在 jar 里。游戏运行时按「码点查字形、逐像素画」渲染，所以进度提示
 * 里的中文是 16×16 的细笔画点阵——这就是参考示例图用的字形。
 *
 * .hex 每行形如 `6D77:0100210011FC...`：
 *   64 个 hex = 16 行 × 16 位（CJK / 全角）
 *   32 个 hex = 16 行 × 8 位（ASCII / 拉丁）
 * 统一转成「每字 32 字节、16 行 × 2 字节」的定长表，运行时按码点直接算偏移，
 * 不用解析文本、不用网络、断网也可用。
 *
 * 四个区段（顺序即二进制里的顺序，运行时段表必须一致）：
 *   U+0000–U+00FF   256 字   ASCII / 拉丁
 *   U+3000–U+30FF   256 字   CJK 标点、假名
 *   U+4E00–U+9FFF 20992 字   CJK 统一汉字
 *   U+FF00–U+FFEF   240 字   全角标点 / 全角字母
 *
 * 用法：node scripts/build-unifont.mjs
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cache = join(root, '.build', 'unifont.zip')
const destDir = join(root, '原版材质-font')

const INDEX_URL =
  'https://piston-meta.mojang.com/v1/packages/abfaa525f923f807df8b4e4d29c1b5e3a104adbe/34.json'
const OBJECT_KEY = 'minecraft/font/unifont.zip'
const HEX_ENTRY = 'unifont_all_no_pua-17.0.01.hex'

const SEGMENTS = [
  { from: 0x0000, to: 0x00ff },
  { from: 0x3000, to: 0x30ff },
  { from: 0x4e00, to: 0x9fff },
  { from: 0xff00, to: 0xffef },
]

async function ensureZip() {
  if (existsSync(cache)) return
  console.log('从官方资源索引取 unifont.zip…')
  const idx = await (await fetch(INDEX_URL)).json()
  const hash = idx.objects[OBJECT_KEY]?.hash
  if (!hash) throw new Error(`资源索引里没有 ${OBJECT_KEY}`)
  const url = `https://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  await mkdir(dirname(cache), { recursive: true })
  await writeFile(cache, buf)
}

await ensureZip()

const hexText = execFileSync('unzip', ['-p', cache, HEX_ENTRY], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
})

/** 码点 → 16 行的位模式（统一 16 位宽：ASCII 的 8 位放在高字节） */
const glyphs = new Map()
for (const line of hexText.split('\n')) {
  const i = line.indexOf(':')
  if (i < 0) continue
  const cp = Number.parseInt(line.slice(0, i), 16)
  const hex = line.slice(i + 1).trim()
  if (!Number.isFinite(cp) || !hex) continue

  const rows = new Uint8Array(32)
  if (hex.length === 64) {
    for (let r = 0; r < 16; r++) {
      rows[r * 2] = Number.parseInt(hex.slice(r * 4, r * 4 + 2), 16)
      rows[r * 2 + 1] = Number.parseInt(hex.slice(r * 4 + 2, r * 4 + 4), 16)
    }
  } else if (hex.length === 32) {
    for (let r = 0; r < 16; r++) {
      rows[r * 2] = Number.parseInt(hex.slice(r * 2, r * 2 + 2), 16)
      rows[r * 2 + 1] = 0
    }
  } else {
    continue
  }
  glyphs.set(cp, rows)
}

const chunks = []
let found = 0
for (const seg of SEGMENTS) {
  const count = seg.to - seg.from + 1
  const buf = Buffer.alloc(count * 32)
  for (let cp = seg.from; cp <= seg.to; cp++) {
    const g = glyphs.get(cp)
    if (!g) continue
    g.forEach((v, k) => {
      buf[(cp - seg.from) * 32 + k] = v
    })
    found++
  }
  chunks.push(buf)
}

await mkdir(destDir, { recursive: true })
const bin = Buffer.concat(chunks)
await writeFile(join(destDir, 'unifont.bin'), bin)
console.log(
  `生成 原版材质-font/unifont.bin：${SEGMENTS.reduce((n, s) => n + s.to - s.from + 1, 0)} 个码位，` +
    `命中 ${found} 个字形，${(bin.length / 1024).toFixed(0)} KB`,
)
