import { defineClientComponent, type Theme } from 'vitepress'
// 用「无字体」入口：默认主题自带的 Inter 一套 WebFont 我们用不上，
// 反而会和像素字体抢首屏。主题组件与逻辑完全一样。
import DefaultTheme from 'vitepress/theme-without-fonts'
import ToolFrame from './ToolFrame.vue'
import HomePage from './HomePage.vue'

/**
 * 主题入口。
 *
 * 站点 = 文档站外壳 + 现成的工具页面组件。
 * 工具保留自己的 MC 面板（功能与交互验证过），因此：
 *   1. 工具样式全部挂在 .mc-scope 下，只在工具容器内生效；
 *   2. 工具组件用 defineClientComponent 挂载，构建时不做 SSR，
 *      避免把 indexedDB / canvas / window 这些浏览器 API 带进预渲染。
 */
import '@/design/tokens.css'
import '@/design/base.css'
import './fonts.css'
import './custom.css'

export default {
  extends: DefaultTheme,

  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
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
