/**
 * 进度提示图的 canvas 渲染。
 *
 * 预览与 PNG 导出共用这一个 paint 函数，保证「看到的」和「下载的」逐像素一致。
 * 基准画布固定 320×64，导出倍率只改 canvas 尺寸 + 一次整体 scale，
 * 所有布局数字、贴图缩放、点阵字大小都不跟着变。
 *
 * 文字用游戏原版的 unifont 16×16 点阵逐像素绘制（见 unifont.ts），
 * 不是矢量字体：这样才有和游戏里一样的 1px 笔画、无抗锯齿硬边。
 */
import {
  BACKGROUND_SCALE,
  DESC_Y,
  FALLBACK_FONT,
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
import { drawUnifontText, measureUnifont } from './unifont'

export interface ToastAssets {
  /** 原版 toast sprite（160×32） */
  background: CanvasImageSource | null
  /**
   * 离线渲染好的 32×32 立体方块图标。
   * 原版 jar 里没有这种 PNG（游戏里是运行时按模型渲染的），由
   * scripts/build-block-icons.mjs 依据官方模型批量生成后放进静态目录。
   */
  block: CanvasImageSource | null
  /** 物品平面图标 */
  flat: CanvasImageSource | null
  /** 用户上传的图 */
  upload: CanvasImageSource | null
  /** 原版 unifont 点阵字表（定长二进制，见 scripts/build-unifont.mjs） */
  font: Uint8Array | null
}

export interface PaintResult {
  title: FitResult
  description: FitResult
  note: string
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
    // 预渲染图本身就是 32×32，1:1 贴进图标框；运行时不再拼三面
    if (assets.block) ctx.drawImage(assets.block, 0, 0, ICON_SIZE, ICON_SIZE)
  } else {
    const img = spec.icon.kind === 'upload' ? assets.upload : assets.flat
    if (img) {
      if (spec.icon.kind === 'upload') paintUpload(ctx, img, ICON_SIZE)
      else ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE)
    }
  }
  ctx.restore()

  // 点阵字宽度是固定步进，测量不依赖 canvas；预览、导出、单测同一套规则
  const lines = fitLines(spec.title, spec.description, measureUnifont)
  if (assets.font) {
    drawUnifontText(ctx, lines.title.text, TEXT_X, TITLE_Y, spec.titleColor, assets.font)
    drawUnifontText(ctx, lines.description.text, TEXT_X, DESC_Y, spec.descColor, assets.font)
  } else {
    // 字表还在加载（或加载失败）时用系统字顶一下，别让文字整块消失
    ctx.font = FALLBACK_FONT
    ctx.textBaseline = 'top'
    ctx.fillStyle = spec.titleColor
    ctx.fillText(lines.title.text, TEXT_X, TITLE_Y)
    ctx.fillStyle = spec.descColor
    ctx.fillText(lines.description.text, TEXT_X, DESC_Y)
  }

  return { ...lines, note: truncationNote(lines) }
}

/** 导出用：造一张离屏 canvas，不进 DOM */
export function createToastCanvas(spec: ToastSpec, assets: ToastAssets): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  paintToast(canvas, spec, assets)
  return canvas
}
