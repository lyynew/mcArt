/**
 * 把素材目录里的贴图同步到 `src/assets/textures/`。
 *
 * 为什么复制一份而不是直接引用原目录：
 *   1. 原目录是数据源，路径带中文；Vite 的资源管线处理中文目录容易出编码问题，
 *      也不该让构建依赖它的存在形式。
 *   2. 不放进 docs/public：VitePress 复制 public 的方式在本机异常慢（2100 多张要 12 分钟，
 *      自己 cp 只要 6 秒）。这里只负责同步，站点产物由 scripts/copy-textures.mjs 复制。
 *
 * 两个来源：
 *   原版材质/       → docs/textures/                （方块，键名就是文件名）
 *   原版材质-items/ → docs/textures/items/          （物品，键名带 items/ 前缀）
 *
 * 分开目录是因为方块与物品有 72 个同名贴图（告示牌、蜡烛、酿造台…），
 * 平铺到一起会互相覆盖。
 *
 * 同步是增量的：只拷贝新增或内容有变化的文件，dev 启动时几乎无感。
 * 目标目录在 .gitignore 里，不会进仓库。
 *
 * 用法：node scripts/sync-textures.mjs
 */
import { readdir, stat, mkdir, copyFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const destRoot = join(root, 'docs/textures')

/** 把一个目录里的 PNG 增量拷到目标目录；返回 { total, copied, skipped, removed } */
async function sync(from, to, label) {
  await mkdir(to, { recursive: true })

  let files = []
  try {
    files = (await readdir(from)).filter((f) => f.toLowerCase().endsWith('.png'))
  } catch {
    console.log(`${label}：源目录不存在，跳过`)
    return { total: 0, copied: 0, skipped: 0, removed: 0 }
  }
  if (files.length === 0) throw new Error(`${label}：源目录里没有 PNG，检查一下目录`)

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

  // 源里已经没有的贴图要清掉，否则旧版本残留会一直被构建带进去
  const keep = new Set(files)
  let removed = 0
  for (const name of await readdir(to)) {
    if (!name.toLowerCase().endsWith('.png')) continue
    if (keep.has(name)) continue
    await rm(join(to, name), { force: true })
    removed++
  }

  console.log(`${label}：${files.length} 张，拷贝 ${copied}，跳过 ${skipped}，清理 ${removed}`)
  return { total: files.length, copied, skipped, removed }
}

await sync(join(root, '原版材质'), destRoot, '方块贴图')
await sync(join(root, '原版材质-items'), join(destRoot, 'items'), '物品贴图')
