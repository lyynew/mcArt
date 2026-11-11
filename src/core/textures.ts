/**
 * 贴图注册表：方块贴图名 → 构建产物里的 URL。
 *
 * 贴图本身由 `scripts/sync-textures.mjs` 在 dev/build 前从 `原版材质/` 同步到
 * `src/assets/textures/`，再由下面这个 glob 交给 Vite：
 * 每张图独立成文件、带内容哈希，能单独缓存，也不会有 143 张 base64 挤进 JS 的问题。
 *
 * glob 是 eager 的：映射表（约 142 条路径）进主包，但图片文件本身仍是按需请求。
 */

const modules = import.meta.glob('../assets/textures/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

function stem(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(/\.png$/i, '')
}

/** 键是贴图名（等同 `BlockDef.tex`），值是 URL */
export const TEXTURES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [stem(path), url]),
)

/** 可用贴图数量，用来跟方块总数做校验 */
export const TEXTURE_COUNT = Object.keys(TEXTURES).length

/** 取贴图 URL；没有对应贴图时返回 undefined，调用方退回平均色 */
export function textureUrl(tex: string | undefined): string | undefined {
  return tex ? TEXTURES[tex] : undefined
}

/**
 * 以窄边为边长，取图片左上角的一块正方形。
 *
 * 原版有 21 张贴图不是单个 16×16 方块，而是把动画帧 / 多个面纵向堆成
 * 16×N（water_still 是 16×512，magma 是 16×48）。整张画进方格里会被压扁，
 * 所以只取最开始那一帧——这也是游戏里方块的初始外观。
 * `.build/png_avg.py` 算平均色时取的是同一块区域，配色与显示才对得上。
 *
 * 返回 0 表示图片还没解码（或尺寸非法），调用方应退回平均色。
 */
export function squareSide(width: number, height: number): number {
  const side = Math.min(width, height)
  return Number.isFinite(side) && side > 0 ? side : 0
}

/**
 * 把贴图按左上角方形画进目标方格。
 *
 * 方形贴图等价于普通的 drawImage(img, x, y, size, size)；
 * 堆叠贴图只画第一帧，不再把整条压成 1:1。
 * 内置贴图和用户自选的材质包都走这里，规则只有一份。
 */
export function drawTexture(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
): void {
  const side = squareSide(img.naturalWidth || img.width, img.naturalHeight || img.height)
  if (!side) return
  ctx.drawImage(img, 0, 0, side, side, x, y, size, size)
}

/**
 * 画布绘制用的图片缓存。
 * 同一张图只解码一次，142 张全部加载也就是一次 Promise 数组。
 */
const imageCache = new Map<string, Promise<HTMLImageElement>>()

export function textureImage(tex: string | undefined): Promise<HTMLImageElement> | undefined {
  const url = textureUrl(tex)
  if (!url || typeof Image === 'undefined') return undefined

  const cached = imageCache.get(url)
  if (cached) return cached

  const loading = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`贴图加载失败：${tex}`))
    img.src = url
  })

  imageCache.set(url, loading)
  return loading
}

/** 批量预载，失败的不阻断其余（缺一张不该让整张画布打不开） */
export async function preloadTextures(texs: readonly string[]): Promise<Map<string, HTMLImageElement>> {
  const out = new Map<string, HTMLImageElement>()
  await Promise.all(
    texs.map(async (tex) => {
      try {
        const img = await textureImage(tex)
        if (img) out.set(tex, img)
      } catch {
        /* 单张失败，保留平均色兜底 */
      }
    }),
  )
  return out
}
