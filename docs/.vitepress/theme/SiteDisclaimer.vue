<script setup lang="ts">
/**
 * 全站底部的严正声明。
 *
 * 挂在 Layout.vue 的 #layout-bottom 插槽上，是默认主题 .Layout flex 列的
 * 最后一项，所以文档页、首页、工具页都会出现。不能只写进 themeConfig.footer：
 * VitePress 那个 VPFooter 在有侧栏的页面会被 display:none，首页和五个工具页
 * 过去也写着 footer: false —— 靠它兜不住「每页底部都有声明」。
 *
 * 内容按 Mojang Usage Guidelines 的要求写：显著、明确非官方、不暗示关联。
 * 底部只留两行简版（官方要求的英文原句 + 一段中文），素材来源与许可的
 * 详细说明在关于页。工具页是 100dvh 整屏工作台，由 CSS 切成紧凑条。
 */
import { useData } from 'vitepress'

const { site } = useData()

// base 在本地是 /、Pages 上是 /mcArt/。工具页位于 /tools/ 下，
// 用相对路径会跳错，所以一律从站点配置拼绝对路径。
const aboutHref = `${site.value.base}about.html`
const guidelines = 'https://www.minecraft.net/en-us/usage-guidelines'
</script>

<template>
  <aside class="legal" aria-label="版权与免责声明">
    <div class="legal__inner">
      <!-- 文档页 / 首页：两行简版，详细来源与许可说明放关于页 -->
      <div class="legal__full">
        <p class="legal__head">
          <span class="legal__tag">严正声明</span>
          NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
        </p>
        <p class="legal__zh">
          本站是<strong>非官方、非商业</strong>的 Minecraft 粉丝工具，与 Mojang Studios、Microsoft
          无关联，亦未获其认可或支持。站内游戏素材版权归 <strong>Mojang Studios</strong> 所有，依据
          <a :href="guidelines" target="_blank" rel="noopener noreferrer">Minecraft Usage Guidelines</a>
          使用，<strong>不包含在 MIT 代码许可内</strong>，请勿单独提取、再分发或商用；
          生成内容的责任由使用者自行承担。
          <a class="legal__more" :href="aboutHref">素材来源与完整声明 →</a>
        </p>
      </div>

      <!-- 整屏工具页：紧凑条。完整版由全局 CSS 按 .Layout.tool-page 隐藏 -->
      <p class="legal__compact">
        <span class="legal__tag">严正声明</span>
        <span class="legal__compact-text">
          NOT AN OFFICIAL MINECRAFT PRODUCT · 与 Mojang / Microsoft 无关联 ·
          游戏素材版权归 Mojang Studios，不得单独提取或商用
        </span>
        <a class="legal__link" :href="aboutHref" target="_blank" rel="noopener noreferrer">完整声明 →</a>
      </p>
    </div>
  </aside>
</template>

<style scoped>
.legal {
  flex: 0 0 auto;
  border-top: 1px solid var(--line-strong);
  background: var(--surface);
  font-family: var(--font-body);
  color: var(--ink-2);
}

.legal__inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 28px 24px;
}

.legal__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.7;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.legal__tag {
  display: inline-block;
  flex: 0 0 auto;
  padding: 3px 8px;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-pixel);
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
}

.legal__link {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--green);
  white-space: nowrap;
  text-underline-offset: 3px;
}

.legal__link:hover {
  color: var(--green-hi);
}

.legal__zh {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
}

.legal__more {
  white-space: nowrap;
}

.legal strong {
  font-weight: 700;
  color: var(--ink);
}

.legal a {
  color: var(--green);
  text-underline-offset: 3px;
}

.legal__compact {
  display: none;
}

@media (max-width: 768px) {
  .legal__inner {
    padding: 14px 18px 16px;
  }

  .legal__head {
    font-size: 10.5px;
  }

  .legal__zh {
    font-size: 11.5px;
  }
}

/*
 * 文档页 / 首页 / 工具页三种形态的切换规则在 theme/custom.css 里。
 * 别在这里用 :global(.Layout.tool-page) 选祖先：构建时 CSS 压缩器会吞掉
 * :global() 之后的后代选择器，产物变成 .Layout.tool-page{display:none}，
 * 整个工具页会被隐藏。祖先类只能在全局样式表里写完整选择器。
 */
</style>
