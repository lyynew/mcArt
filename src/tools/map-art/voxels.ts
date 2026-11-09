/**
 * 施工体素的统一取块函数。
 *
 * .nbt 分块与 .litematic 是两种容器，里面装的是同一堆方块；
 * 把「某坐标摆什么」抽出来，两个导出器共用，避免各写一遍柱子逻辑后
 * 出现「结构文件对了、投影文件差一格」这类只对得上一半的 bug。
 */
import { MAP_SIZE } from './model'
import { blockOfColor } from './map-blocks'

export interface VoxelInput {
  colors: Uint8Array
  heights: Int16Array
  noobline: Int16Array
  maxHeight: number
  supportBlock: string
  withNoobline: boolean
}

export interface VoxelLayout {
  sizeX: number
  sizeY: number
  sizeZ: number
  /** null = 空气；其余是方块 ID（不含命名空间） */
  blockAt: (x: number, y: number, z: number) => string | null
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
