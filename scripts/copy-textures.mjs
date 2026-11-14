/**
 * 把 `docs/textures/` 复制进构建产物，构建后自动执行（postbuild）。
 *
 * 为什么不放在 `docs/public/` 让 VitePress 自己拷：
 *   VitePress 复制 public 目录的方式在本机慢得不正常 —— 2134 张 16×16 小图要 12 分钟，
 *   而同样的文件用 fs.cp 只要 6 秒。贴图占了 public 里 99% 的文件数，
 *   搬出 public 后构建从 740 秒回到 16 秒，再靠这一步补拷。
 *
 * 幂等：目标里多出来的旧文件会被清掉，避免换素材后残留。
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const from = join(root, 'docs', 'textures')
const dist = join(root, 'docs', '.vitepress', 'dist')
const to = join(dist, 'textures')

if (!existsSync(dist)) {
  console.error('找不到构建产物目录，先跑 npm run build')
  process.exit(1)
}
if (!existsSync(from)) {
  console.error('找不到 docs/textures，先跑 npm run sync:textures')
  process.exit(1)
}

mkdirSync(to, { recursive: true })

// 先清掉旧的一层：素材更名后残留会让产物里挂着一堆没人引用的图
for (const name of readdirSync(to)) {
  rmSync(join(to, name), { recursive: true, force: true })
}

cpSync(from, to, { recursive: true })

const count = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png')).length : 0
console.log(
  `贴图入产物：方块 ${count(to)} 张，物品 ${count(join(to, 'items'))} 张，` +
    `GUI 底图 ${count(join(to, 'gui', 'toast'))} 张`,
)
