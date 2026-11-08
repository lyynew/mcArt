/**
 * 读图：把任意图片居中裁成正方形，并缩到可处理的大小。
 *
 * 只负责「拿到像素」，不做任何配色或匹配——那些在 core/convert 里，
 * 这样算法层不需要认识 canvas。
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

/**
 * 打开页面时的示例图：一个方块脸。
 * 空画布对第一次来的用户太劝退，有张现成的图可以直接玩。
 */
export function createDemoImage(): SquareImage {
  const cells = [
    '........',
    '.XX..XX.',
    '.XX..XX.',
    '...XX...',
    '..XXXX..',
    '..XXXX..',
    '.XXXXXX.',
    '.X....X.',
  ]
  const unit = 16
  const size = 8 * unit
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('无法创建画布上下文')

  const greens = ['#4E8F2C', '#5CA537', '#437B26', '#63AF3D']
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const isFace = cells[y]![x] === 'X'
      ctx.fillStyle = isFace ? '#141519' : greens[(x * 3 + y * 5 + (x ^ y)) % greens.length]!
      ctx.fillRect(x * unit, y * unit, unit, unit)
      if (!isFace) {
        ctx.fillStyle = 'rgba(0,0,0,0.10)'
        ctx.fillRect(x * unit, y * unit, unit, 3)
        ctx.fillRect(x * unit, y * unit, 3, unit)
      }
    }
  }

  return {
    pixels: ctx.getImageData(0, 0, size, size).data,
    size,
    name: '示例',
  }
}
