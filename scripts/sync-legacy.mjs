/**
 * 把旧版单文件页面（public/legacy/index.html）复制到文档站的静态目录。
 *
 * 为什么需要这一步：旧版是单文件 HTML，直接当静态资源发布就能用，
 * 但文档站只认 docs/public，而它的源放在仓库根的 public/legacy。
 * 与其在仓库里放两份会各自漂移的副本，不如构建前复制一次——
 * 源仍然只有 public/legacy/index.html 一个。
 *
 * 用法：node scripts/sync-legacy.mjs
 */
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const from = join(root, 'public/legacy')
const to = join(root, 'docs/public/legacy')

await mkdir(to, { recursive: true })

const files = (await readdir(from)).filter((f) => f.endsWith('.html'))
if (files.length === 0) throw new Error('public/legacy 里没有 HTML，检查一下目录')

for (const file of files) {
  await copyFile(join(from, file), join(to, file))
}

console.log(`旧版页面同步：${files.length} 个文件 → docs/public/legacy/`)
