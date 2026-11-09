/**
 * 读图：把任意图片居中裁成正方形，并缩到可处理的大小。
 *
 * 与工具无关的基础能力，方块画生成器与地图画生成器共用。
 * 这里只负责「拿到像素」，配色与量化都在各自的算法层，
 * 所以核心算法不需要认识 canvas，可以直接单测。
 */

export interface SquareImage {
  /** size × size 的 RGBA 数据 */
  pixels: Uint8ClampedArray
  size: number
  name: string
}

/** 采样上限：再大对结果没意义，只会拖慢 */
const MAX_SIDE = 1024

async function toBitmap(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(source)
    } catch {
      /* 某些格式（如部分 SVG）不支持，退回 <img> */
    }
  }
  const url = URL.createObjectURL(source)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('图片解码失败'))
      img.src = url
    })
  } finally {
    // 交给浏览器在解码完成后回收
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

function dimensions(src: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  return src instanceof HTMLImageElement
    ? { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height }
    : { w: src.width, h: src.height }
}

/**
 * 居中裁成方形并缩放。
 * 用 canvas 的高质量插值做一次平滑，后面按网格聚合时才不会出现硬台阶。
 */
export async function readSquareImage(source: Blob, name = ''): Promise<SquareImage> {
  const bmp = await toBitmap(source)
  const { w, h } = dimensions(bmp)
  if (!w || !h) throw new Error('图片尺寸为 0')

  const side = Math.min(w, h)
  const size = Math.max(1, Math.min(MAX_SIDE, Math.round(side)))

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('无法创建画布上下文')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size)

  const pixels = ctx.getImageData(0, 0, size, size).data

  if ('close' in bmp && typeof bmp.close === 'function') bmp.close()

  return { pixels, size, name }
}
