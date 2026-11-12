/**
 * 构建前把上一份 `docs/.vitepress/dist` 挪开。
 *
 * Vite 构建前会清空 outDir，而本机的安全删除对一次删几十个文件会直接中止，
 * 于是每次「第二次构建」都失败。rename 是瞬时的、不经过删除，挪到
 * `.build/.trash/` 就算完事——那里不进版本库，攒多了手动清一下即可。
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
renameSync(dist, join(trash, `dist-${stamp}`))
