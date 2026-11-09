/**
 * 立体阶梯的高度图。
 *
 * 公开规则（中文 Minecraft Wiki「地图物品格式」）：一个方块在地图上的明暗档，
 * 只取决于它**北侧那一格**与它的高度差的符号——
 *   比北侧低 → 180 档（shade 0）／同高 → 220 档（shade 1）／比北侧高 → 255 档（shade 2）
 * 第 4 档 135 只在深水处出现，摆方块拿不到。
 *
 * 高度差只要符号对，绝对值取 1 就够：用更大的跳步只会把整列的高度跨度拉大，
 * 归一化后反而要填更多支撑方块（试过，别改回去）。
 *
 * 每一列（固定 x）互不干涉。真正能省方块的是**逐列独立选基准高度**：
 * 每列把自己的最低点对齐到 0，noobline 那一行逐列取不同高度；
 * 若全图共用一个基准，先下降后上升的列会被整体抬高，凭空多出一堆支撑。
 * 关闭压缩则回到社区里常见的「全图一个基准」经典阶梯。
 *
 * 最北侧那一行没有「北侧方块」，靠地图外多铺的一行（noobline）固定它的档位。
 */
import { MAP_PIXELS, MAP_SIZE, shadeToStep } from './model'

export interface HeightMap {
  /** 128×128，归一化后 ≥0：该格顶层方块相对基准面的高度 */
  heights: Int16Array
  /** 北侧边界外那一行的顶层高度，逐列可不同 */
  noobline: Int16Array
  /** 最高处的高度（总层数 = maxHeight + 1） */
  maxHeight: number
  /** 顶层方块数（含 noobline） */
  topBlocks: number
  /** 支撑方块数 */
  supportBlocks: number
  totalBlocks: number
}

export interface HeightMapOptions {
  /** 逐列对齐最低点，压掉支撑方块；关掉则全图共用一个基准 */
  compress: boolean
  /** 是否在北侧边界外生成 noobline */
  noobline: boolean
}

export function buildHeightMap(colors: Uint8Array, options: HeightMapOptions): HeightMap {
  if (colors.length !== MAP_PIXELS) throw new Error('colors 必须是 128×128')

  const heights = new Int16Array(MAP_PIXELS)
  const noobline = new Int16Array(MAP_SIZE)
  // 先按「虚拟北侧 = 0」累积 ±1，记录每列自己的最低点
  const columnMin = new Int16Array(MAP_SIZE).fill(0)
  let globalMin = 0

  for (let x = 0; x < MAP_SIZE; x++) {
    let h = 0
    for (let z = 0; z < MAP_SIZE; z++) {
      const id = colors[z * MAP_SIZE + x]!
      h += id === 0 ? 0 : shadeToStep(id & 3)
      heights[z * MAP_SIZE + x] = h
      if (h < columnMin[x]!) columnMin[x] = h
    }
    if (columnMin[x]! < globalMin) globalMin = columnMin[x]!
  }

  let maxHeight = 0
  let supports = 0

  for (let x = 0; x < MAP_SIZE; x++) {
    const lift = options.compress ? -columnMin[x]! : -globalMin
    for (let z = 0; z < MAP_SIZE; z++) {
      const i = z * MAP_SIZE + x
      const h = heights[i]! + lift
      heights[i] = h
      if (h > maxHeight) maxHeight = h
      supports += h
    }
    noobline[x] = lift
    if (options.noobline) {
      if (lift > maxHeight) maxHeight = lift
      supports += lift
    }
  }

  const topBlocks = MAP_PIXELS + (options.noobline ? MAP_SIZE : 0)
  return {
    heights,
    noobline,
    maxHeight,
    topBlocks,
    supportBlocks: supports,
    totalBlocks: topBlocks + supports,
  }
}
