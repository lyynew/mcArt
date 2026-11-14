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
 * 工具页是 100dvh 整屏工作台，由 CSS 切成紧凑条，避免把画布区域挤矮。
 * 素材来源与许可的完整版在关于页。
 */
import { useData } from 'vitepress'

const { site } = useData()

// base 在本地是 /、Pages 上是 /mcArt/。工具页位于 /tools/ 下，
// 用相对路径会跳错，所以一律从站点配置拼绝对路径。
const aboutHref = `${site.value.base}about.html`
const guidelines = 'https://www.minecraft.net/en-us/usage-guidelines'
const issues = 'https://github.com/lyynew/mcArt/issues'
</script>

<template>
  <aside class="legal" aria-label="版权与免责声明">
    <div class="legal__inner">
      <!-- 文档页 / 首页：完整版 -->
      <div class="legal__full">
        <div class="legal__head">
          <span class="legal__tag">严正声明</span>
          <span class="legal__tag-en">DISCLAIMER</span>
          <a class="legal__link" :href="aboutHref">素材来源与许可的完整说明 →</a>
        </div>

        <p class="legal__lead">
          NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
        </p>
        <p class="legal__zh">
          本站是<strong>非官方、非商业</strong>的 Minecraft 粉丝工具，与 Mojang Studios、Microsoft
          无任何关联，亦未获其认可、授权或支持。「Minecraft」及相关商标归其权利人所有。
        </p>

        <ul class="legal__list">
          <li>
            站内方块 / 物品贴图、GUI 底图、点阵字表、方块模型与 blockstates 等游戏素材，
            版权归 <strong>Mojang Studios</strong> 所有，依据
            <a :href="guidelines" target="_blank" rel="noopener noreferrer">Minecraft Usage Guidelines</a>
            在本站使用；<strong>不包含在 MIT 代码许可范围内</strong>，请勿单独提取、再分发或用于商业目的。
            进度提示图中的立体方块图标由本站依据官方模型与贴图离线渲染，未使用第三方图片素材。
          </li>
          <li>
            本站代码以 MIT 许可发布。所有处理都在浏览器本地完成，上传的图片不会离开设备、不会上传服务器。
          </li>
          <li>
            使用本站生成的图片、结构文件或命令时，请自行遵守 Minecraft Usage Guidelines，
            并自行承担相应责任。若认为本站内容侵犯您的合法权益，请通过
            <a :href="issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a>
            联系我们，我们会及时处理。
          </li>
        </ul>
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
  gap: 10px;
  margin-bottom: 12px;
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

.legal__tag-en {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--ink-3);
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

.legal__lead {
  margin: 0 0 8px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.7;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.legal__zh {
  margin: 0 0 12px;
  font-size: 12.5px;
  line-height: 1.8;
}

.legal__list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.legal__list li {
  padding-left: 12px;
  border-left: 2px solid var(--line-strong);
  font-size: 12px;
  line-height: 1.8;
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
    padding: 16px 18px 20px;
  }

  .legal__lead {
    font-size: 10.5px;
  }

  .legal__zh,
  .legal__list li {
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
