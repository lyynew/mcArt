<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { McChip } from '@/design/components'
import { TOOLS } from '@/tools/registry'
import { APP_VERSION, IS_PRERELEASE } from '@/shared/version'

/**
 * 顶栏：等距草方块标志 + 站名 + 工具导航 + 外链。
 * 下沿一道草皮，呼应游戏里的地平线，也是整站最强的品牌信号。
 */
const route = useRoute()

const github = 'https://github.com/lyynew/mcArt'
</script>

<template>
  <header class="site-header">
    <RouterLink to="/" class="brand" title="回到工具集首页">
      <span class="brand__logo">
        <svg viewBox="0 0 32 32" width="27" height="27" shape-rendering="crispEdges">
          <polygon points="16,3 29,10.5 16,18 3,10.5" fill="#86bb5e" />
          <polygon points="3,10.5 16,18 16,28 3,20.5" fill="#9c7a56" />
          <polygon points="29,10.5 29,20.5 16,28 16,18" fill="#856347" />
          <polygon points="3,10.5 16,18 16,20.3 3,12.8" fill="#6fa246" />
          <polygon points="29,10.5 29,12.8 16,20.3 16,18" fill="#5c8c3c" />
          <polygon points="12,9.6 13.4,10.3 12,11 10.6,10.3" fill="#74a94f" />
          <polygon points="20,12.4 21.2,13 20,13.6 18.8,13" fill="#74a94f" />
          <polyline points="3,10.5 16,3 29,10.5" fill="none" stroke="#14110c" stroke-width="1.2" />
          <polyline
            points="3,10.5 3,20.5 16,28 29,20.5 29,10.5"
            fill="none"
            stroke="#14110c"
            stroke-width="1.2"
          />
          <line x1="16" y1="18" x2="16" y2="28" stroke="#14110c" stroke-width="1.2" />
          <line x1="3" y1="10.5" x2="16" y2="18" stroke="#14110c" stroke-width="1.2" />
          <line x1="29" y1="10.5" x2="16" y2="18" stroke="#14110c" stroke-width="1.2" />
        </svg>
      </span>
      <span class="brand__text">
        <strong>
          mcArt
          <span
            v-if="IS_PRERELEASE"
            class="brand__tag"
            :title="`当前为测试版：${APP_VERSION}，功能与数据格式仍可能调整`"
          >
            BETA
          </span>
        </strong>
        <small>Minecraft 网页工具集</small>
      </span>
    </RouterLink>

    <nav class="site-nav" aria-label="工具导航">
      <RouterLink to="/" class="site-nav__link" :class="{ 'is-on': route.path === '/' }">
        全部工具
      </RouterLink>
      <RouterLink
        v-for="tool in TOOLS"
        :key="tool.id"
        :to="tool.path"
        class="site-nav__link"
        :class="{ 'is-on': route.path === tool.path, 'is-todo': tool.status !== 'ready' }"
      >
        {{ tool.name }}
      </RouterLink>
    </nav>

    <div class="site-header__aside">
      <McChip :href="github" title="在 GitHub 上查看源码">GitHub</McChip>
      <McChip href="legacy/index.html" title="迁移期间的旧版单文件页面">旧版</McChip>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-6);
  background: linear-gradient(var(--mc-bar-top), var(--mc-bar-bot));
  border-bottom: var(--mc-bd) solid var(--mc-edge);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 8%),
    0 4px 0 rgb(0 0 0 / 35%);
}

/* 下沿草皮 */
.site-header::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 2px;
  pointer-events: none;
  background: repeating-linear-gradient(
    90deg,
    #4a7a2e 0 5px,
    #5f9040 5px 9px,
    #3f6b28 9px 14px,
    #6fa246 14px 16px
  );
  opacity: 0.7;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  text-decoration: none;
  color: inherit;
  flex: 0 0 auto;
}

.brand:hover {
  text-decoration: none;
}

.brand__logo {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: grid;
  place-items: center;
  background: var(--mc-btn);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #d4d4d4;
}

.brand__logo svg {
  display: block;
  filter: drop-shadow(1px 1px 0 rgb(0 0 0 / 50%));
}

.brand__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.brand__text strong {
  font-size: var(--fs-head);
  letter-spacing: 0.04em;
  text-shadow:
    2px 2px 0 #191510,
    0 0 9px rgb(120 200 90 / 22%);
  /* 站名与 BETA 标签同一基线，避免标签把行高顶起来 */
  display: flex;
  align-items: baseline;
  gap: 6px;
}

/* 测试版标签：像素风小膏药，不用斜体，靠底色和描边区分 */
.brand__tag {
  padding: 0 4px;
  font-size: 10px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: 0.1em;
  color: #1b2410;
  background: var(--mc-accent);
  border: 1px solid #000;
  box-shadow:
    inset 1px 1px 0 var(--mc-accent-hi),
    inset -1px -1px 0 var(--mc-accent-lo);
  cursor: help;
}

.brand__text small {
  font-size: var(--fs-note);
  color: var(--mc-text-dim);
  letter-spacing: 0.06em;
  text-shadow: 1px 1px 0 #191510;
  white-space: nowrap;
}

.site-nav {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  margin-left: var(--sp-5);
  /* 必须允许收缩，否则窄屏下导航按 min-content 撑宽整个文档，
     把右侧外链挤出屏幕（早期版本就踩过这个坑） */
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.site-nav::-webkit-scrollbar {
  display: none;
}

.site-nav__link {
  padding: 4px var(--sp-3);
  font-size: var(--fs-sm);
  color: var(--mc-text-dim);
  border: var(--mc-bd) solid transparent;
  white-space: nowrap;
  text-decoration: none;
  transition: color var(--mc-motion) linear;
}

.site-nav__link:hover {
  color: var(--mc-text);
  background: rgb(255 255 255 / 6%);
  text-decoration: none;
}

.site-nav__link.is-on {
  color: var(--mc-accent-ink);
  background: #232019;
  border-color: #000;
  box-shadow:
    inset 1px 1px 0 #4b4638,
    inset -1px -1px 0 #14120d;
}

/* 还没做完的工具，弱化一点，别让人点进去失望 */
.site-nav__link.is-todo {
  opacity: 0.72;
}

.site-header__aside {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex: 0 0 auto;
}

@media (max-width: 760px) {
  .site-header {
    padding: var(--sp-2) var(--sp-4);
    gap: var(--sp-2);
  }

  .brand__text small {
    display: none;
  }

  .site-nav {
    margin-left: var(--sp-2);
    /* 右缘做一层渐隐，让人知道这里可以横向滑动，而不是被切断了 */
    mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 18px), transparent);
  }

  .site-header__aside :deep(.mc-chip:last-child) {
    display: none;
  }
}
</style>
