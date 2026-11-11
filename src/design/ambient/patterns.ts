/* ============================================================
   Minecraft 背景像素图案库
   ------------------------------------------------------------
   图案是字符画：`.` 空，`#` 结构（淡灰），`g` 绿，`y` 金，`r` 红，
   `b` 钻石，`o` 泥土，`w` 高光；暗部用 l/c/t/d。像素换算交给 renderer.ts。

   主题是 Minecraft：苦力怕、生命值爱心、钻石剑、镐、草方块、火把、
   末影之眼、蘑菇、苹果。一律控制在 5–8 格，尺寸相近有两个好处：
   随机撒到整屏时密度均匀；窄屏缩小像素单元后也放得下。
   ============================================================ */

export interface PatternCell {
  readonly x: number
  readonly y: number
  /** 材质色号，由统一图例约束；不在运行时随机改变。 */
  readonly tone: PatternTone
  /** 四邻接外沿元数据；图案的明暗由像素图例定义。 */
  readonly edge: boolean
}

export interface Pattern {
  readonly name: string
  readonly cols: number
  readonly rows: number
  readonly cells: readonly PatternCell[]
}

/** 统一材质色：石、草、金、红石、钻石、轮廓、泥土、高光及其暗部。 */
export type PatternTone = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

const TONES: Readonly<Record<string, PatternTone>> = {
  '#': 0, g: 1, y: 2, r: 3, b: 4, x: 5, o: 6, w: 7,
  l: 8, c: 9, t: 10, d: 11,
}

/** 把字符画解析成格子；行宽不一致会直接抛错，图案写错时在测试里就暴露 */
export function parsePattern(name: string, art: readonly string[]): Pattern {
  const rows = art.length
  const cols = art.reduce((max, line) => Math.max(max, line.length), 0)
  if (!name.trim() || !rows || !cols) throw new Error('图案名称和像素画不能为空')
  const raw: { x: number; y: number; tone: PatternTone }[] = []

  art.forEach((line, y) => {
    if (line.length !== cols) {
      throw new Error(`图案 ${name} 第 ${y} 行宽度 ${line.length}，应为 ${cols}`)
    }
    for (let x = 0; x < line.length; x += 1) {
      const symbol = line[x]
      if (symbol === '.') continue
      const tone = TONES[symbol]
      if (tone === undefined) throw new Error(`图案 ${name} 包含未知像素 ${symbol}`)
      raw.push({ x, y, tone })
    }
  })

  if (!raw.length) throw new Error(`图案 ${name} 没有实体像素`)

  // 四邻没被填满的格子算外沿：渲染时加深一圈，形状才不散
  const filled = new Set(raw.map((cell) => `${cell.x},${cell.y}`))
  const isFilled = (x: number, y: number): boolean => filled.has(`${x},${y}`)
  const cells: PatternCell[] = raw.map((cell) => ({
    ...cell,
    edge:
      !isFilled(cell.x - 1, cell.y) ||
      !isFilled(cell.x + 1, cell.y) ||
      !isFilled(cell.x, cell.y - 1) ||
      !isFilled(cell.x, cell.y + 1),
  }))

  return { name, cols, rows, cells }
}

/** 8×8 材质式像素画：硬边、固定高光方向，不在像素内叠字或随机换色。 */
const CREEPER = [
  'gglggggl', 'lgggglgg', 'gxxggxxg', 'gxxggxxg',
  'gggxxggg', 'ggxxxxgg', 'ggxxxxgg', 'ggxggxgg',
]
const HEART = [
  '.xx.xx.', 'xrwxrrx', 'xrrrrrx', '.xrrdx.', '..xdx..', '...x...',
]
const SWORD = [
  '......xc', '.....xwb', '....xwbx', '...xwbx.',
  '.cxbcx..', '..ccx...', '.ot.c...', 'to......',
]
const PICKAXE = [
  '..xccc..', '.xwbbbc.', 'xcccobbc', '...otxbc',
  '..ot..xc', '.ot.....', 'ot......', 't.......',
]
/** 正方形草方块：草沿向土层垂落，土与石粒有明确材质层次。 */
const GRASS = [
  'ggglgglg', 'lgglgggl', 'olgolglo', 'oootoooo',
  'otooo#ot', 'oo#otooo', 'tooototo', 'tttttttt',
]
const TORCH = [
  '..y..', '.ywy.', '.ryr.', '..t..', '..o..', '..t..', '..o..', '..t..',
]
const ENDER_EYE = [
  '..ccc..', '.cgggc.', 'cgwxlgc', 'cglxlgc', 'cglxlgc', '.clllc.', '..ccc..',
]
const MUSHROOM = [
  '..rrr..', '.rwwrr.', 'rrwrrwr', 'drrwrrd', '.ddddd.', '..w#w..', '..w#w..',
]
const APPLE = [
  '...tg..', '..glg..', '.rrdrr.', 'rwwrrrr',
  'rwrrrrd', 'rrrrrdd', '.rrddd.', '..ddd..',
]

export const PATTERNS: readonly Pattern[] = [
  parsePattern('creeper', CREEPER),
  parsePattern('heart', HEART),
  parsePattern('sword', SWORD),
  parsePattern('pickaxe', PICKAXE),
  parsePattern('grass', GRASS),
  parsePattern('torch', TORCH),
  parsePattern('ender-eye', ENDER_EYE),
  parsePattern('mushroom', MUSHROOM),
  parsePattern('apple', APPLE),
]

/** 固定种子的伪随机，保证每次刷新散点形状一致、可测 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 保留供其他消费者使用，不参与主页的具象图案轮换。
 * 随机字符簇：没有具体形状，用来在具象图案之间填「呼吸」。
 * 沿对角线散，比纯随机更像在流动。彩色格刻意很少——散点一上色就成噪点。
 */
export function scatterPattern(cols: number, rows: number, seed = 7): Pattern {
  const random = mulberry32(seed)
  const cells: PatternCell[] = []
  const seen = new Set<string>()
  const count = Math.round(cols * rows * 0.2)

  for (let i = 0; i < count; i += 1) {
    const y = Math.floor(random() * rows)
    // 沿对角线铺开、再加一点横向抖动，比纯随机更像在流动
    const diagonal = y / Math.max(1, rows - 1)
    const x = Math.floor(((diagonal * 0.6 + random() * 0.5) % 1) * cols)
    const key = `${x},${y}`
    if (seen.has(key)) continue
    seen.add(key)
    const roll = random()
    // 散点没有可描的边，edge 一律 false
    cells.push({ x, y, edge: false, tone: roll > 0.96 ? 2 : roll > 0.92 ? 1 : 0 })
  }

  return { name: 'scatter', cols, rows, cells }
}
