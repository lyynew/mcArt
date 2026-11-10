/**
 * 平面网格 → core/structure 的 VoxelLayout。
 *
 * 像素画是一格厚的体素：立面是 n×n×1，平铺是 n×1×n。
 * 朝向的坐标翻转只发生在这里一次，之后 .nbt / .litematic / .schem
 * 看到的是同一份体素，不会再出现「两种格式方向对不上」。
 * 坐标映射与 core/nbt.ts 的结构导出保持一致（立面翻转纵轴）。
 */
import type { BlockDef } from '@/core/blocks'
import type { VoxelLayout } from '@/core/structure/voxels'

export interface GridVoxelInput {
  /** 边长格数 */
  n: number
  /** n×n 的方块下标，-1 为空 */
  idx: Int16Array
  /** 索引对应的色板方块 */
  blocks: readonly BlockDef[]
  /** true = 立面（贴墙），false = 平铺地面 */
  wall: boolean
}

export function createGridVoxelLayout(input: GridVoxelInput): VoxelLayout {
  const { n, idx, blocks, wall } = input
  return {
    sizeX: n,
    sizeY: wall ? n : 1,
    sizeZ: wall ? 1 : n,
    blockAt(x, y, z) {
      // 立面：图像顶行在高处（y 翻转）；平铺：图像顶行在北侧（z 递增）
      const row = wall ? n - 1 - y : z
      const k = idx[row * n + x]!
      return k < 0 ? null : (blocks[k]?.id ?? null)
    },
  }
}
