/**
 * 施工体素：把地图画的色号与高度图包成 core/structure 的 VoxelLayout。
 *
 * .nbt 分块与 .litematic 是两种容器，里面装的是同一堆方块；
 * 「某坐标摆什么」只在这里算一次，两个导出器共用，避免各写一遍柱子逻辑后
 * 出现「结构文件对了、投影文件差一格」这类只对得上一半的 bug。
 */
import type { VoxelLayout } from '@/core/structure/voxels'
import { MAP_SIZE } from './model'
import { blockOfColor } from './map-blocks'

export type { VoxelLayout }

export interface VoxelInput {
  colors: Uint8Array
  heights: Int16Array
  noobline: Int16Array
  maxHeight: number
  supportBlock: string
  withNoobline: boolean
}

export function createVoxelLayout(input: VoxelInput): VoxelLayout {
  const zOffset = input.withNoobline ? 1 : 0

  return {
    sizeX: MAP_SIZE,
    sizeY: input.maxHeight + 1,
    sizeZ: MAP_SIZE + zOffset,
    blockAt(x, y, z) {
      const isNoobline = z < zOffset
      const top = isNoobline
        ? input.noobline[x]!
        : input.heights[(z - zOffset) * MAP_SIZE + x]!
      if (y > top) return null
      if (y < top) return input.supportBlock
      return isNoobline
        ? input.supportBlock
        : blockOfColor(input.colors[(z - zOffset) * MAP_SIZE + x]!) ?? input.supportBlock
    },
  }
}
