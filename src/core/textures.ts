/**
 * 贴图注册表：贴图名 → 站点上的图片 URL。
 *
 * 为什么贴图放在 `docs/public/textures/` 而不是 `src/assets/`：
 *   26.3 有 2100 多张 16×16 小图。走 Vite 资源管线意味着每张图都要单独
 *   生成哈希名、登记进产物——实测构建时间从 28 秒涨到 13 分钟，完全不可接受。
 *   放进静态目录则只是一次文件复制，构建开销接近于零。
 *
 * 代价是没有内容哈希，缓存可能滞后一个 CDN 周期（GitHub Pages 约 10 分钟）；
 * 对这类素材可以接受，换素材时文件名通常也会跟着变。
 *
 * 键名规则：
 *   方块贴图  dirt            → textures/dirt.png
 *   物品贴图  items/diamond   → textures/items/diamond.png
 * 两个命名空间分开，是因为方块与物品有 72 个同名贴图，合并会互相覆盖。
 *
 * 懒加载由使用方负责：组件用 `<img loading="lazy">`，画布按需解码（textureImage）。
 * 这里只拼路径，不预先请求任何图片。
 */

const BASE = `${import.meta.env.BASE_URL}textures/`

/**
 * 旧名 → 26.3 的实际文件名。
 *
 * 26.3 把锁链拆成了铁链/铜链系列，柱状方块改成了 _side/_top 分离。
 * 方块的 tex 字段沿用旧名（历史数据与自定义方案都可能引用），
 * 在这里统一转换，比改数据安全——改数据会让旧引用直接断掉。
 */
export const TEXTURE_ALIAS: Readonly<Record<string, string>> = {
  chain: 'iron_chain',
  purpur_pillar: 'purpur_pillar_side',
  quartz_pillar: 'quartz_pillar_side',
}

/** 解析后的贴图名（别名转到实际文件） */
export function resolveTextureName(tex: string): string {
  return TEXTURE_ALIAS[tex] ?? tex
}

/**
 * 取贴图 URL。
 *
 * 纯字符串拼装，同步返回；文件不存在时由 <img> 的 onerror 兜底，
 * 画布侧则退回平均色。素材完整性由单测在构建前校验，不靠运行时判断。
 */
export function textureUrl(tex: string | undefined): string | undefined {
  if (!tex) return undefined
  return `${BASE}${resolveTextureName(tex)}.png`
}

/**
 * 以窄边为边长，取图片左上角的一块正方形。
 *
 * 原版有 52 张贴图不是单个 16×16 方块，而是把动画帧 / 多个面纵向堆成
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
 * 画布绘制用的图片缓存：同一张图只解码一次。
 * 画布不看 loading="lazy"，所以由调用方决定什么时候要——按需来。
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
