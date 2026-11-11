/* ============================================================
   首页「施工动画」公共类型
   ------------------------------------------------------------
   这里只放与 DOM 无关的几何/姿态描述，纯逻辑模块（timeline、
   scheduler）和 DOM 层（engine）都依赖它们，但互不依赖。
   ============================================================ */

/** 可被施工的块类型，对应元素上的 data-build="…" */
export type BuildKind = 'head' | 'text' | 'card' | 'rule'

/** 光标形态：箭头 / 十字（画框）/ 文本竖线 */
export type CursorTool = 'arrow' | 'cross' | 'ibeam'

/** 页面坐标系（相对内容容器左上角）下的矩形 */
export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** 光标某一时刻的姿态；tool / down 决定画哪张精灵 */
export interface Pose {
  readonly x: number
  readonly y: number
  readonly tool: CursorTool
  readonly down: boolean
}

/** 一个光标的身份：名字与颜色，颜色同时用于名牌、选框与点击涟漪 */
export interface CursorSpec {
  readonly name: string
  /** CSS 变量名（如 --green）：引擎自己解析成实色，深浅色切换时无需重建 */
  readonly colorVar: string
}

/** 打字光标落点，由引擎量出后传给时间轴 */
export interface Caret {
  readonly x: number
  readonly y: number
  readonly h: number
}

export const BUILD_KINDS: readonly BuildKind[] = ['head', 'text', 'card', 'rule']

/** 元素上的 data-build 是否是我们认识的类型 */
export function isBuildKind(value: string | undefined): value is BuildKind {
  return value === 'head' || value === 'text' || value === 'card' || value === 'rule'
}
