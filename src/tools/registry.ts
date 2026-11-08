import type { BlockDef } from '@/core/blocks'
import { BLOCKS, BLOCKS_BY_ID } from '@/core/blocks'

/**
 * 工具注册表 —— 首页卡片、顶栏导航、页面标题都从这里取。
 * 新增工具只改这一处 + 路由表，不散落在各个页面里。
 */

export type ToolStatus = 'ready' | 'migrating' | 'planned'

export interface ToolMeta {
  /** 路由名 */
  id: string
  path: string
  name: string
  /** 一句话定位，卡片副标题 */
  tagline: string
  /** 展开说明，列表里用 */
  detail: string
  status: ToolStatus
  /** 卡片缩略图的取材方块，用真实平均色拼一块小马赛克 */
  preview: BlockDef[]
}

export const STATUS_TEXT: Record<ToolStatus, string> = {
  ready: '可用',
  migrating: '迁移中',
  planned: '规划中',
}

function pick(...ids: string[]): BlockDef[] {
  return ids.map((id) => {
    const found = BLOCKS_BY_ID.get(id)
    if (!found) throw new Error(`工具缩略图引用了不存在的方块：${id}`)
    return found
  })
}

export const TOOLS: readonly ToolMeta[] = [
  {
    id: 'pixel',
    path: '/pixel',
    name: '方块像素画生成器',
    tagline: '图片一键转方块画，能改能画，导出结构文件直接进游戏',
    detail:
      'CIEDE2000 色差匹配、六档画幅、画笔与填充、九格物品栏、施工图与材料清单，最后导出 Java 版 .nbt。',
    status: 'migrating',
    preview: pick('light_blue_wool', 'white_wool', 'sand', 'oak_planks', 'dirt', 'black_concrete'),
  },
  {
    id: 'atlas',
    path: '/atlas',
    name: '方块图鉴',
    tagline: '142 种方块的原版贴图、平均色与命令，随手复制',
    detail:
      '按分组浏览、搜中英文名与 ID、放大看贴图、一键复制 minecraft:xxx 与 give 命令。',
    status: 'planned',
    preview: pick('red_concrete', 'orange_concrete', 'yellow_concrete', 'lime_concrete', 'cyan_wool', 'blue_concrete'),  },
  {
    id: 'nbt',
    path: '/nbt',
    name: '结构文件查看器',
    tagline: '拖入 .nbt，分层看结构、算材料，是导出的逆运算',
    detail:
      '解析结构方块文件，按层浏览方块分布，统计方块的种类与数量，检查尺寸是否超出 48×48 上限。',
    status: 'planned',
    preview: pick('black_concrete', 'smooth_stone', 'white_wool', 'quartz_block', 'iron_block', 'oak_planks'),
  },
]

export const BLOCK_TOTAL = BLOCKS.length
