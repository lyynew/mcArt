/**
 * 抖动算法的共享内核：Bayer 矩阵与误差扩散的邻居偏移。
 *
 * 像素画（core/convert.ts）与地图画（tools/map-art/quantize.ts）用的是
 * 同三套公开算法，常量只留一份；两者的扫描循环与色彩空间不同，
 * 不必强行共用循环代码。
 */

/** 抖动算法：关 / Floyd–Steinberg / Atkinson / Bayer 4×4 / Bayer 8×8 */
export type DitherMode = 'none' | 'floyd' | 'atkinson' | 'bayer' | 'bayer8'

/** 全部算法，UI 选项与持久化校验共用 */
export const DITHER_MODES = ['none', 'floyd', 'atkinson', 'bayer', 'bayer8'] as const

/** Bayer 4×4 有序抖动矩阵，值越大概得越亮 */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const

/** Bayer 8×8 有序抖动矩阵 */
export const BAYER8 = [
  0, 48, 12, 60, 3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
] as const

/** Atkinson 只把 6/8 的误差散到 6 个邻居，比 Floyd 更克制、纯色区更干净 */
export const ATKINSON: readonly (readonly [number, number])[] = [
  [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2],
]

/** 有序抖动的扰动幅度（满强度时），约等于半个色阶 */
export const BAYER_AMPLITUDE = 26
