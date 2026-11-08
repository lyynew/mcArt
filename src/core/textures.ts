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
