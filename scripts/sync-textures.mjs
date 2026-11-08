/**
 * 把 `原版材质/` 的贴图同步到 `src/assets/textures/`。
 *
 * 为什么要复制这一份，而不是直接引用原目录：
 *   1. 原目录是 .build/ 里 Python 脚本的输入，属于「数据源」，路径带中文；
 *      Vite 的资源管线处理中文目录容易出编码问题，也不该让构建依赖它的存在形式。
 *   2. src/assets 下的文件才能享受 Vite 的内容哈希与长缓存。
 *
 * 同步是增量的：只拷贝新增或内容有变化的文件，dev 启动时几乎无感。
 * 目标目录在 .gitignore 里，不会进仓库。
 *
 * 用法：node scripts/sync-textures.mjs
 */
import { readdir, stat, mkdir, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const from = join(root, '原版材质')
const to = join(root, 'src/assets/textures')

await mkdir(to, { recursive: true })

const files = (await readdir(from)).filter((f) => f.toLowerCase().endsWith('.png'))
if (files.length === 0) throw new Error('原版材质/ 里没有 PNG，检查一下目录')

let copied = 0
let skipped = 0

for (const name of files) {
  const src = join(from, name)
  const dst = join(to, name)

  let needCopy = true
  try {
    const [a, b] = await Promise.all([stat(src), stat(dst)])
    needCopy = a.size !== b.size || a.mtimeMs > b.mtimeMs
  } catch {
    // 目标不存在，直接拷
  }

  if (needCopy) {
    await copyFile(src, dst)
    copied++
  } else {
    skipped++
  }
}

console.log(`贴图同步：${files.length} 张，拷贝 ${copied}，跳过 ${skipped}`)
