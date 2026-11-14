/**
 * 原版 unifont 点阵字：字形解析、宽度测量、canvas 绘制。
 *
 * Minecraft 的中文不是矢量字体，而是 GNU Unifont 的 16×16 点阵：
 * 游戏按码点查字形，逐像素画出来，所以笔画是 1px、没有抗锯齿。
 * 站点把官方 `minecraft/font/unifont.zip` 的 .hex 预先转成定长二进制
 * （见 scripts/build-unifont.mjs），这里按码点直接算偏移读取，
 * 不解析文本、不联网、断网也能用。
 *
 * 纯算法部分不依赖 DOM，可单测；只有 drawUnifontText 碰 canvas。
 */
export const GLYPH_ROWS = 16
/** 每个码位固定 32 字节：16 行 × 2 字节；ASCII 的 8 位放在高字节 */
export const GLYPH_BYTES = 32
export const CJK_WIDTH = 16
export const ASCII_WIDTH = 8

/** 段顺序必须和 build-unifont.mjs 里的 SEGMENTS 完全一致 */
export const FONT_SEGMENTS = [
  { from: 0x0000, to: 0x00ff, width: ASCII_WIDTH },
  { from: 0x3000, to: 0x30ff, width: CJK_WIDTH },
  { from: 0x4e00, to: 0x9fff, width: CJK_WIDTH },
  { from: 0xff00, to: 0xffef, width: CJK_WIDTH },
] as const

/** 每段在二进制里的起始字节 */
const SEGMENT_OFFSETS: readonly number[] = (() => {
  const out = []
  let n = 0
  for (const s of FONT_SEGMENTS) {
    out.push(n * GLYPH_BYTES)
    n += s.to - s.from + 1
  }
  return out
})()

export const FONT_BYTES_EXPECTED =
  FONT_SEGMENTS.reduce((n, s) => n + s.to - s.from + 1, 0) * GLYPH_BYTES

export interface Glyph {
  /** 步进宽度：ASCII 8px，CJK / 全角 16px */
  width: number
  /** 16 行，每行是 16 位，最高位对应最左像素 */
  rows: Uint16Array
}

export interface GlyphLocation {
  offset: number
  width: number
}

/** 码点 → 二进制偏移。不在覆盖区段里返回 null（画豆腐块） */
export function glyphLocation(cp: number): GlyphLocation | null {
  for (let i = 0; i < FONT_SEGMENTS.length; i++) {
    const s = FONT_SEGMENTS[i]!
    if (cp < s.from || cp > s.to) continue
    return {
      offset: SEGMENT_OFFSETS[i]! + (cp - s.from) * GLYPH_BYTES,
      width: s.width,
    }
  }
  return null
}

/** 读出一个字形；数据没加载或越界时返回 null，不抛异常 */
export function glyphOf(bytes: Uint8Array | null, cp: number): Glyph | null {
  if (!bytes) return null
  const loc = glyphLocation(cp)
  if (!loc || loc.offset + GLYPH_BYTES > bytes.length) return null

  const rows = new Uint16Array(GLYPH_ROWS)
  for (let r = 0; r < GLYPH_ROWS; r++) {
    rows[r] = (bytes[loc.offset + r * 2]! << 8) | bytes[loc.offset + r * 2 + 1]!
  }
  return { width: loc.width, rows }
}

/** 单个码点的步进宽度。缺字按窄字处理，画一个 8px 豆腐块 */
export function charWidth(cp: number): number {
  return glyphLocation(cp)?.width ?? ASCII_WIDTH
}

/** 按码点累加，代理对（emoji）算一个字 */
export function measureUnifont(text: string): number {
  let n = 0
  for (const ch of text) n += charWidth(ch.codePointAt(0) ?? 0)
  return n
}

/** 缺字的豆腐块：8×16 的 1px 空心方框 */
function drawTofu(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillRect(x, y, ASCII_WIDTH, 1)
  ctx.fillRect(x, y + GLYPH_ROWS - 1, ASCII_WIDTH, 1)
  ctx.fillRect(x, y, 1, GLYPH_ROWS)
  ctx.fillRect(x + ASCII_WIDTH - 1, y, 1, GLYPH_ROWS)
}

/**
 * 用原版点阵字画一行文字，返回占用的宽度。
 *
 * 逐像素 fillRect 而不是把字形贴成图：颜色是用户可选的，直接填色最省，
 * 而且和游戏一样不带任何抗锯齿，放大后仍是硬边。
 */
export function drawUnifontText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  bytes: Uint8Array | null,
): number {
  ctx.fillStyle = color
  let cx = x
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    const glyph = glyphOf(bytes, cp)
    if (!glyph) {
      drawTofu(ctx, cx, y)
      cx += ASCII_WIDTH
      continue
    }
    for (let r = 0; r < GLYPH_ROWS; r++) {
      const bits = glyph.rows[r]!
      if (!bits) continue
      for (let c = 0; c < glyph.width; c++) {
        if (bits & (1 << (15 - c))) ctx.fillRect(cx + c, y + r, 1, 1)
      }
    }
    cx += glyph.width
  }
  return cx - x
}
