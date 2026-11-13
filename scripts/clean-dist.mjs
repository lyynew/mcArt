/**
 * 构建前把上一份 `docs/.vitepress/dist` 挪开。
 *
 * Vite 构建前会清空 outDir，而本机的安全删除对一次删几十个文件会直接中止，
 * 于是每次「第二次构建」都失败。rename 是瞬时的、不经过删除，挪到
 * `.build/.trash/` 就算完事——那里不进版本库，攒多了手动清一下即可。
 *
 * dev 服务开着时，VitePress 的 watcher 会握住 dist 目录句柄，
 * Windows 上 rename 会 EPERM（连里面的条目也挪不动）。这种情况没法
 * 自动绕过——本机 safe-delete 又拦着 node 的递归删除——只能提示先停 dev，
 * 别让后面 Vite 抛一堆看不懂的清空错误。
 *
 * CI（GitHub Pages）上 dist 本来就不存在，这一步是空操作。
 */
import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const dist = join(root, 'docs', '.vitepress', 'dist')

if (!existsSync(dist)) process.exit(0)

const trash = join(root, '.build', '.trash')
mkdirSync(trash, { recursive: true })

const stamp = new Date().toISOString().replace(/[:.]/g, '-')

try {
  renameSync(dist, join(trash, `dist-${stamp}`))
} catch (err) {
  const code = err?.code
  if (code !== 'EPERM' && code !== 'EACCES' && code !== 'ENOTEMPTY') throw err
  console.error('dist 正被占用（通常是 npm run dev 还开着），先停掉它再构建')
  process.exit(1)
}
