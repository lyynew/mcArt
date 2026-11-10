<script setup lang="ts">
import { withBase } from 'vitepress'

/**
 * 首页。
 *
 * 不用 VitePress 自带的 home 版式：那个版式的小标题 / 特性卡片排得太满，
 * 而且大段原生 HTML 写在 markdown 里会被当成缩进代码块（踩过一次）。
 * 干脆做成一个组件，版式自己控制，样式在 custom.css 里。
 */
const heroSrc = withBase('/hero-block.svg')
</script>

<template>
  <div class="home">
    <section class="home-hero">
      <div class="home-hero__copy">
        <p class="home-eyebrow">方块画 / 地图画 / 图鉴 / 结构文件</p>
        <h1>把一张图<br />变成<em>方块画</em></h1>
        <p class="home-lead">
          图片按色差匹配成方块，逐格改到满意，导出结构文件直接进游戏。<br />
          纯前端，图片不上传，断网也能用。
        </p>
        <div class="home-actions">
          <a class="home-btn home-btn--primary" href="./tools/pixel.html">
            打开生成器 <span class="home-btn__arrow">→</span>
          </a>
          <a class="home-btn" href="./guide/quick-start.html">读一遍指南</a>
        </div>
        <p class="home-stats">
          <b>142</b> 种方块 <i>·</i> <b>10</b> 套方案 <i>·</i> 多格式导出 <i>·</i> 免费
        </p>
      </div>

      <div class="home-hero__art">
        <img :src="heroSrc" alt="银白晶体切面的下界之星，周围漂浮着像素星屑" width="256" height="256" />
        <div class="home-hero__tag">下界之星 · 像素灵感</div>
      </div>
    </section>

    <section class="home-section">
      <p class="home-kicker">工具</p>
      <h2>四个工具，做完一件事</h2>
      <div class="home-cards">
        <a class="home-card" href="./tools/pixel.html">
          <span class="home-card__no">01 / GENERATE</span>
          <span class="home-card__name">方块像素画生成器</span>
          <p class="home-card__desc">
            图片转方块画，画笔、填充、九格物品栏逐格改，导出 .nbt / .litematic / .schem、施工图与材料清单。
          </p>
          <span class="home-card__foot">16–256 格 · 10 套方案 →</span>
        </a>
        <a class="home-card" href="./tools/map-art.html">
          <span class="home-card__no">02 / MAP ART</span>
          <span class="home-card__name">地图画生成器</span>
          <p class="home-card__desc">
            写地图数据、平铺或立体阶梯，导出 map_#.dat、give 指令与 .litematic 施工文件。
          </p>
          <span class="home-card__foot">128 × 128 · 立体阶梯 →</span>
        </a>
        <a class="home-card" href="./tools/atlas.html">
          <span class="home-card__no">03 / LOOK UP</span>
          <span class="home-card__name">方块图鉴</span>
          <p class="home-card__desc">
            142 种方块的原版贴图、平均色与 ID，按分组浏览，一键复制 give 命令。
          </p>
          <span class="home-card__foot">142 种 · 贴图放大 →</span>
        </a>
        <a class="home-card" href="./tools/nbt.html">
          <span class="home-card__no">04 / VERIFY</span>
          <span class="home-card__name">结构文件查看器</span>
          <p class="home-card__desc">
            拖入 .nbt / .litematic / .schem 分层看结构、统计材料、检查 48×48 上限，是导出的逆运算。
          </p>
          <span class="home-card__foot">分层查看 · 材料统计 →</span>
        </a>
      </div>
    </section>

    <section class="home-section">
      <p class="home-kicker">文章</p>
      <h2>从第一张图开始</h2>
      <div class="home-links">
        <a class="home-link" href="./guide/quick-start.html">
          <span>快速开始 · 五分钟出第一张图</span><span>01 →</span>
        </a>
        <a class="home-link" href="./guide/how-it-works.html">
          <span>生成原理 · 为什么用 CIEDE2000</span><span>02 →</span>
        </a>
        <a class="home-link" href="./guide/structure-file.html">
          <span>结构文件 · 怎么放进存档</span><span>03 →</span>
        </a>
        <a class="home-link" href="./guide/faq.html">
          <span>常见问题 · 颜色、导出与手机</span><span>04 →</span>
        </a>
      </div>
    </section>

    <footer class="home-footer">
      <span>mcArt · MIT</span>
      <span>方块贴图版权归 Mojang Studios，仅供个人制作像素画使用</span>
      <a href="./about.html">关于</a>
      <a href="https://github.com/lyynew/mcArt">GitHub</a>
    </footer>
  </div>
</template>
