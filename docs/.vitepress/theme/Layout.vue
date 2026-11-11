<script setup lang="ts">
/**
 * 在默认主题的骨架里挂两个插槽：
 *   nav-bar-content-after —— 导航栏右侧的显示开关（桌面/移动都可见，
 *   位置在汉堡按钮之前）
 *
 * 主题其余部分完全沿用 VitePress 默认实现，这里只做「加一个插槽」，
 * 不再另起一套布局，避免以后升级默认主题时跟着改版式。
 */
import DefaultTheme from 'vitepress/theme-without-fonts'
import SiteControls from './SiteControls.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <SiteControls />
    </template>
  </Layout>
</template>
