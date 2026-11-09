import { defineClientComponent, type Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ToolFrame from './ToolFrame.vue'

/**
 * 主题入口。
 *
 * 站点 = 文档站外壳 + 现成的工具页面组件。
 * 工具暂时保留自己的像素风外观（还没做视觉统一），因此：
 *   1. 工具样式全部挂在 .mc-scope 下，只在工具容器内生效；
 *   2. 工具组件用 defineClientComponent 挂载，构建时不做 SSR，
 *      避免把 indexedDB / canvas / window 这些浏览器 API 带进预渲染。
 */
import '@/design/tokens.css'
import '@/design/base.css'
import './custom.css'

export default {
  extends: DefaultTheme,

  enhanceApp({ app }) {
    app.component('ToolFrame', ToolFrame)
    app.component(
      'ToolPixel',
      defineClientComponent(() => import('@/tools/pixel/PixelPage.vue')),
    )
    app.component(
      'ToolAtlas',
      defineClientComponent(() => import('@/tools/atlas/AtlasPage.vue')),
    )
    app.component(
      'ToolNbt',
      defineClientComponent(() => import('@/tools/nbt-viewer/NbtViewerPage.vue')),
    )
  },
} satisfies Theme
