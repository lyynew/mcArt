/**
 * 进度提示图的 canvas 渲染。
 *
 * 预览与 PNG 导出共用这一个 paint 函数，保证「看到的」和「下载的」逐像素一致。
 * 基准画布固定 320×64，导出倍率只改 canvas 尺寸 + 一次整体 scale，
 * 所有布局数字、贴图缩放、字号都不跟着变。
 */
import {
  BACKGROUND_SCALE,
  DESC_Y,
  FONT_LOAD,
  FONT_SIZE,
  FONT_STACK,
  ICON_SIZE,
  ICON_X,
  ICON_Y,
  TEXT_X,
  TITLE_Y,
  TOAST_HEIGHT,
  TOAST_WIDTH,
  type ToastSpec,
} from './model'
import { fitLines, truncationNote, type FitResult } from './toast'
import { paintCube } from './cube'

export interface ToastAssets {
  /** 原版 toast sprite（160×32） */
  background: CanvasImageSource | null
  /** 方块的顶面 / 侧面贴图 */
  top: CanvasImageSource | null
  side: CanvasImageSource | null
  /** 物品平面图标 */
  flat: CanvasImageSource | null
  /** 用户上传的图 */
  upload: CanvasImageSource | null
}

export interface PaintResult {
  title: FitResult
  description: FitResult
  note: string
}

/**
 * 等像素字体就绪。
 *
 * Ark Pixel 按 unicode-range 拆成 Latin 与简中两片，FontFace.load 不传文本
 * 时只加载空格的字形——中文会静默掉回系统字体，而且首屏那张图已经导出错了。
 * 所以传一段同时含中英文的探针，把两片都拉下来。
 */
let fontPromise: Promise<void> | null = null

export function ensureFont(): Promise<void> {
  if (fontPromise) return fontPromise
  fontPromise = (async () => {
    if (typeof document === 'undefined' || !document.fonts) return
    const probe =
      '进度海底世界有用的知识又双叒增加了游戏开始了' +
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789，。！？'
    await document.fonts.load(FONT_LOAD, probe)
  })()
  return fontPromise
}

/**
 * 底图没加载出来时的兜底框体。
 * 三层圆角矩形正好复刻原版 sprite 的结构（灰外框 / 黑内框 / #212121 主体），
 * 缺素材也不会给用户一张白板。
 */
function paintFallbackFrame(ctx: CanvasRenderingContext2D): void {
  const r = 4 * BACKGROUND_SCALE
  const fill = (inset: number, color: string): void => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(inset, inset, TOAST_WIDTH - inset * 2, TOAST_HEIGHT - inset * 2, r - inset)
    ctx.fill()
  }
  fill(0, '#555555')
  fill(BACKGROUND_SCALE, '#000000')
  fill(BACKGROUND_SCALE * 2, '#212121')
}

/** 上传图按 cover 居中裁成方形，不拉伸变形 */
function paintUpload(ctx: CanvasRenderingContext2D, img: CanvasImageSource, size: number): void {
  const dims = img as { naturalWidth?: number; naturalHeight?: number; width: number; height: number }
  const w = dims.naturalWidth || dims.width
  const h = dims.naturalHeight || dims.height
  const src = Math.min(w, h)
  if (!src) return
  ctx.drawImage(img, (w - src) / 2, (h - src) / 2, src, src, 0, 0, size, size)
}

/**
 * 把一张提示图画进 canvas。
 *
 * 返回两行的排版结果，UI 拿它显示「文字过长已截断」；
 * 导出时忽略这个返回值即可，绘制行为完全一样。
 */
export function paintToast(
  canvas: HTMLCanvasElement,
  spec: ToastSpec,
  assets: ToastAssets,
): PaintResult {
  const w = TOAST_WIDTH * spec.scale
  const h = TOAST_HEIGHT * spec.scale
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布上下文')

  ctx.setTransform(spec.scale, 0, 0, spec.scale, 0, 0)
  ctx.clearRect(0, 0, TOAST_WIDTH, TOAST_HEIGHT)
  // 贴图都是 16×16 的小图，放大必须保持硬边
  ctx.imageSmoothingEnabled = false

  if (assets.background) {
    ctx.drawImage(assets.background, 0, 0, TOAST_WIDTH, TOAST_HEIGHT)
  } else {
    paintFallbackFrame(ctx)
  }

  ctx.save()
  ctx.translate(ICON_X, ICON_Y)
  if (spec.icon.kind === 'block') {
    paintCube(ctx, { top: assets.top ?? undefined, side: assets.side ?? undefined }, ICON_SIZE)
  } else {
    const img = spec.icon.kind === 'upload' ? assets.upload : assets.flat
    if (img) {
      if (spec.icon.kind === 'upload') paintUpload(ctx, img, ICON_SIZE)
      else ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE)
    }
  }
  ctx.restore()

  ctx.font = `${FONT_SIZE}px ${FONT_STACK}`
  ctx.textBaseline = 'top'
  const measure = (s: string): number => ctx.measureText(s).width
  const lines = fitLines(spec.title, spec.description, measure)

  ctx.fillStyle = spec.titleColor
  ctx.fillText(lines.title.text, TEXT_X, TITLE_Y)
  ctx.fillStyle = spec.descColor
  ctx.fillText(lines.description.text, TEXT_X, DESC_Y)

  return { ...lines, note: truncationNote(lines) }
}

/** 导出用：造一张离屏 canvas，不进 DOM */
export function createToastCanvas(spec: ToastSpec, assets: ToastAssets): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  paintToast(canvas, spec, assets)
  return canvas
}
