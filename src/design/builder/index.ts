/* 首页施工动画：对外只暴露一个工厂 + 类型，内部结构见各文件头注释 */

export { createPageBuilder } from './engine'
export type { PageBuilder, PageBuilderOptions } from './engine'
export type { CursorSpec } from './types'
export { COMPACT_CURSORS, HOME_CURSORS } from './presets'
