/**
 * 施工体素的统一视图。
 *
 * .nbt / .litematic / .schem（以及将来的 .mcstructure）是四种容器，
 * 里面装的是同一堆方块。「某坐标摆什么」只定义一次，各格式写入器
 * 都从这里读，避免出现「结构文件对了、投影文件差一格」这类
 * 只对得上一半的 bug。
 *
 * 体素的来源不限：地图画的高度图、像素画的平面网格，包一层就是 VoxelLayout。
 */
export interface VoxelLayout {
  sizeX: number
  sizeY: number
  sizeZ: number
  /** null = 空气；其余是方块 ID（不含命名空间，例如 white_concrete） */
  blockAt: (x: number, y: number, z: number) => string | null
}

/** 调色板条目的完整 ID：写入各格式时统一带上命名空间 */
export function voxelFullId(id: string | null): string {
  return id === null ? 'minecraft:air' : `minecraft:${id}`
}
