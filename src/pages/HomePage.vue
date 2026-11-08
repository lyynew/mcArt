<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { BlockMosaic } from '@/design/components'
import { BLOCKS } from '@/core/blocks'
import { STATUS_TEXT, TOOLS } from '@/tools/registry'
</script>

<template>
  <div class="home">
    <section class="hero">
      <p class="hero__eyebrow">mcArt · Minecraft 网页工具集</p>
      <h1>用方块做点<b>正经事</b></h1>
      <p class="hero__lead">
        把图片转成方块像素画、查方块的贴图与命令、看结构文件里到底铺了什么——
        全部在浏览器里跑完，图片不上传，不用装环境。
      </p>
      <div class="hero__actions">
        <RouterLink class="cta cta--primary" to="/pixel">打开像素画生成器</RouterLink>
        <RouterLink class="cta" to="/atlas">看看方块图鉴</RouterLink>
      </div>
      <ul class="stats">
        <li><b>{{ BLOCKS.length }}</b> 种方块</li>
        <li><b>10</b> 套色系</li>
        <li><b>6</b> 档画幅</li>
        <li><b>0</b> 张图片上传</li>
      </ul>
    </section>

    <section class="tools">
      <div class="tools__head">
        <h2>工具</h2>
        <span>{{ TOOLS.length }} 个 · 陆续补齐</span>
      </div>
      <ul class="tools__grid">
        <li v-for="tool in TOOLS" :key="tool.id">
          <RouterLink
            :to="tool.path"
            class="card"
            :class="{ 'card--todo': tool.status !== 'ready' }"
          >
            <div class="card__top">
              <BlockMosaic :blocks="tool.preview" :cell="32" :cols="3" />
              <span class="card__status" :data-status="tool.status">
                {{ STATUS_TEXT[tool.status] }}
              </span>
            </div>
            <h3 class="card__name">{{ tool.name }}</h3>
            <p class="card__tagline">{{ tool.tagline }}</p>
            <p class="card__detail">{{ tool.detail }}</p>
            <span class="card__go">进入 <i aria-hidden="true">→</i></span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <section class="promise">
      <article class="promise__item">
        <h3>图片不出本机</h3>
        <p>转换、编辑、导出全在浏览器内存里完成，没有上传接口，断网也能用。</p>
      </article>
      <article class="promise__item">
        <h3>导出就能用</h3>
        <p>
          结构文件按 Java 版格式写出，放进存档目录、用结构方块加载即可，
          不需要额外的模组或转换工具。
        </p>
      </article>
      <article class="promise__item">
        <h3>配色有依据</h3>
        <p>
          内置 142 种方块的平均色取自原版贴图实测，匹配用 CIEDE2000，
          比直接比 RGB 更接近肉眼判断。
        </p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.home {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--sp-7) var(--sp-6) 0;
}

/* —— 首屏 —— */
.hero {
  padding: var(--sp-6) 0 var(--sp-7);
  border-bottom: var(--mc-bd) solid rgb(0 0 0 / 35%);
}

.hero__eyebrow {
  font-size: var(--fs-note);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mc-text-mute);
  margin-bottom: var(--sp-3);
}

.hero h1 {
  font-size: clamp(28px, 5vw, 44px);
  line-height: 1.15;
  letter-spacing: 0.02em;
  text-shadow:
    3px 3px 0 #191510,
    0 0 18px rgb(120 200 90 / 18%);
}

.hero h1 b {
  color: var(--mc-accent-ink);
  font-weight: 700;
}

.hero__lead {
  max-width: 46ch;
  margin-top: var(--sp-4);
  font-size: 13px;
  line-height: 1.7;
  color: var(--mc-text-dim);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  margin-top: var(--sp-5);
}

/* 首屏两个按钮比面板里的按钮大一档 */
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px var(--sp-6);
  font-size: 13px;
  color: #fff;
  background: var(--mc-btn);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-btn-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-btn-lo),
    3px 3px 0 rgb(0 0 0 / 45%);
  text-shadow: var(--mc-ts-dark);
  text-decoration: none;
  transition:
    background var(--mc-motion) linear,
    transform var(--mc-motion) linear;
}

.cta:hover {
  background: var(--mc-btn-hover);
  text-decoration: none;
}

.cta:active {
  transform: translate(2px, 2px);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-btn-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-btn-hi);
}

.cta--primary {
  background: var(--mc-accent);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-accent-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-accent-lo),
    3px 3px 0 rgb(0 0 0 / 45%);
}

.cta--primary:hover {
  background: var(--mc-accent-hover);
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-5);
  margin: var(--sp-6) 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-sm);
  color: var(--mc-text-mute);
}

.stats b {
  color: var(--mc-text);
  font-size: 15px;
  margin-right: 2px;
}

/* —— 工具卡片 —— */
.tools {
  padding: var(--sp-6) 0;
}

.tools__head {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
}

.tools__head h2 {
  font-size: var(--fs-title);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--mc-text);
}

.tools__head span {
  font-size: var(--fs-note);
  color: var(--mc-text-mute);
}

.tools__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--sp-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--sp-4);
  background: #2f2b23;
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset 2px 2px 0 rgb(255 255 255 / 7%),
    inset -2px -2px 0 rgb(0 0 0 / 35%),
    4px 4px 0 rgb(0 0 0 / 40%);
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--mc-motion) ease-out,
    background var(--mc-motion) linear;
}

.card:hover {
  background: #38332a;
  transform: translate(-1px, -2px);
  text-decoration: none;
}

.card--todo {
  opacity: 0.86;
}

.card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--sp-4);
}

.card__status {
  font-size: var(--fs-micro);
  letter-spacing: 0.08em;
  padding: 2px 6px;
  border: 1px solid #000;
  color: var(--mc-text-dim);
  background: #232019;
  text-shadow: 1px 1px 0 #000;
}

.card__status[data-status="ready"] {
  color: var(--mc-accent-ink);
  background: #24301c;
}

.card__name {
  font-size: 14px;
  letter-spacing: 0.02em;
  color: var(--mc-text);
  text-shadow: 1px 1px 0 #191510;
}

.card__tagline {
  margin-top: var(--sp-2);
  font-size: var(--fs-body);
  line-height: 1.55;
  color: var(--mc-text-dim);
}

.card__detail {
  margin-top: var(--sp-2);
  font-size: var(--fs-note);
  line-height: 1.6;
  color: var(--mc-text-soft);
}

.card__go {
  margin-top: auto;
  padding-top: var(--sp-4);
  font-size: var(--fs-sm);
  color: var(--mc-accent-ink);
}

.card__go i {
  font-style: normal;
  transition: transform var(--mc-motion) ease-out;
  display: inline-block;
}

.card:hover .card__go i {
  transform: translateX(3px);
}

/* —— 三条承诺 —— */
.promise {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sp-5);
  padding: var(--sp-6) 0 var(--sp-7);
  border-top: var(--mc-bd) solid rgb(0 0 0 / 35%);
}

.promise__item h3 {
  font-size: var(--fs-body);
  color: var(--mc-accent-ink);
  margin-bottom: var(--sp-2);
}

.promise__item p {
  font-size: var(--fs-note);
  line-height: 1.65;
  color: var(--mc-text-soft);
}

@media (max-width: 760px) {
  .home {
    padding: var(--sp-5) var(--sp-4) 0;
  }
}
</style>
