<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppHeader from './AppHeader.vue'

const route = useRoute()
// 工具页要占满视口高度，页脚在那种页面里只会挤压舞台
const showFooter = computed(() => route.path === '/')
</script>

<template>
  <AppHeader />
  <main class="site-main">
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
  </main>
  <footer v-if="showFooter" class="site-footer">
    <span>mcArt · 代码 MIT</span>
    <span class="site-footer__sep">·</span>
    <span>方块贴图版权归 Mojang Studios，仅供个人制作像素画使用</span>
    <a class="site-footer__link" href="legacy/index.html">旧版页面</a>
  </footer>
</template>

<style scoped>
.site-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.site-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-6) var(--sp-6);
  font-size: var(--fs-note);
  color: var(--mc-text-mute);
}

.site-footer__sep {
  opacity: 0.6;
}

.site-footer__link {
  margin-left: auto;
  color: var(--mc-text-dim);
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
