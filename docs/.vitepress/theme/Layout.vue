<script setup lang="ts">
/**
 * 在默认主题的骨架里挂三个插槽：
 *   nav-bar-content-after —— 导航栏右侧的显示开关（桌面/移动都可见，
 *   位置在汉堡按钮之前）
 *   layout-bottom         —— 底部严正声明。挂在最外层插槽，显示与否由
 *   custom.css 按页面类控制（只在首页与关于页显示，其余页不显示）。
 *
 * 主题其余部分完全沿用 VitePress 默认实现，这里只做「加插槽」，
 * 不再另起一套布局，避免以后升级默认主题时跟着改版式。
 */
import DefaultTheme from 'vitepress/theme-without-fonts'
import SiteControls from './SiteControls.vue'
import SiteDisclaimer from './SiteDisclaimer.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <SiteControls />
    </template>
    <template #layout-bottom>
      <SiteDisclaimer />
    </template>
  </Layout>
</template>
