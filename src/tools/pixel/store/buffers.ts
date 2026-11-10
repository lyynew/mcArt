import { ref } from 'vue'
import { EMPTY } from '@/core/convert'

/**
 * 像素数据缓冲区。
 *
 * 这里的所有数组都**故意不放进响应式系统**：
 * 256×256 是 65,536 格，做成 reactive 或 ref 会被 Proxy 包住，
 * 绘制和匹配时的每次读写都要过一遍拦截器，直接卡死。
 *
 * 组件不直接依赖这些数组的内容判断变化，而是依赖 `revision`——
 * 内容改了就把版本号 +1，需要重绘或重算统计的地方 watch 它即可。
 */

export interface CellBuffers {
  /** 边长格数，与 buffers.idx 的维度保持一致 */
  n: number
  /** n×n 的色板下标，EMPTY(-1) 表示空格 */
  idx: Int16Array
  /** 是否被人工编辑过：1 表示重算时不要覆盖 */
  manual: Uint8Array
  /** 人工编辑记录的全表下标：-1 擦成空格，-2 没动过 */
  manualBlock: Int16Array
}

export const buffers: CellBuffers = {
  n: 0,
  idx: new Int16Array(0),
  manual: new Uint8Array(0),
  manualBlock: new Int16Array(0),
}

/** 原图（已居中裁成正方形），供重新采样用 */
export const sourceImage: { pixels: Uint8ClampedArray | null; size: number } = {
  pixels: null,
  size: 0,
}

/** 采样后的每格颜色，n×n×4 */
export const sampled: { pixels: Uint8ClampedArray | null } = { pixels: null }

/**
 * 原图版本号。
 *
 * sourceImage 是普通对象（几 MB 的像素不该进响应式系统），
 * 但「有没有图」这件事必须能被 computed 追踪——
 * 否则 `computed(() => sourceImage.pixels !== null)` 因为没有依赖，
 * 首次求值后就永久缓存，换图之后仍然返回旧值。
 */
export const sourceRevision = ref(0)

export function setSourceImage(pixels: Uint8ClampedArray | null, size: number): void {
  sourceImage.pixels = pixels
  sourceImage.size = size
  sourceRevision.value++
}

/** 内容版本号：凡是改动 idx / manual 的地方都要 +1 */
export const revision = ref(0)

export function markDirty(): void {
  revision.value++
}

/** 换画幅时重置画布与人工标记 */
export function resetBuffers(n: number): void {
  buffers.n = n
  buffers.idx = new Int16Array(n * n).fill(EMPTY)
  buffers.manual = new Uint8Array(n * n)
  buffers.manualBlock = new Int16Array(n * n).fill(-2)
  markDirty()
}

export function clearManual(): void {
  buffers.manual.fill(0)
  buffers.manualBlock.fill(-2)
}

/** 记录一次人工编辑；all 为全表下标，-1 表示擦成空格 */
export function markManual(index: number, all: number): void {
  buffers.manual[index] = 1
  buffers.manualBlock[index] = all
}

export function clearManualAt(index: number): void {
  buffers.manual[index] = 0
  buffers.manualBlock[index] = -2
}
