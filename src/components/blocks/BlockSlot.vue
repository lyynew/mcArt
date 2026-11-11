<script setup lang="ts">
import { computed } from 'vue'
import type { BlockDef } from '@/core/blocks'
import { textureUrl } from '@/core/textures'

/**
 * 一个方块格子。
 *
 * 色板、物品栏、自定义方案弹窗都用它，保证三处外观与交互一致：
 * 贴图铺满、角上标数量、选中描金边、没用到时压暗。
 */
const props = withDefaults(
  defineProps<{
    block?: BlockDef | null
    /** 格子边长，px */
    size?: number
    /** 右下角角标（一般是这个方块用了多少块） */
    count?: number
    selected?: boolean
    /** 当前图里没用到，压暗 */
    muted?: boolean
    /** 左上角序号，物品栏用 */
    label?: string
    title?: string
  }>(),
  {
    block: null,
    size: 36,
    count: undefined,
    selected: false,
    muted: false,
    label: undefined,
    title: undefined,
  },
)

/** size 为 0 时交给外部 CSS 决定尺寸（物品栏要按栏宽自适应） */
const boxStyle = computed(() =>
  props.size > 0 ? { width: `${props.size}px`, height: `${props.size}px` } : undefined,
)

/**
 * 贴图地址。图鉴一屏能排出几百个格子，用 <img loading="lazy"> 让浏览器
 * 只请求滚动到附近的贴图；平均色同时铺在底层，贴图没加载完也不会露白。
 */
const faceUrl = computed(() => (props.block ? textureUrl(props.block.tex) : undefined))
</script>

<template>
  <div
    class="slot"
    :class="{ 'is-on': selected, 'is-muted': muted, 'is-empty': !block }"
    :style="boxStyle"
    :title="title ?? block?.zh"
  >
    <img
      v-if="block && faceUrl"
      class="slot__face slot__face--img"
      :src="faceUrl"
      :style="{ backgroundColor: block.hex }"
      alt=""
      loading="lazy"
      decoding="async"
      draggable="false"
    />
    <span v-else-if="block" class="slot__face" :style="{ backgroundColor: block.hex }" />
    <span v-if="label" class="slot__label">{{ label }}</span>
    <span v-if="count" class="slot__count">{{ count }}</span>
  </div>
</template>

<style scoped>
.slot {
  position: relative;
  flex: 0 0 auto;
  border: var(--mc-bd) solid #000;
  background: var(--mc-btn);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #d4d4d4;
  cursor: pointer;
}

.slot__face {
  position: absolute;
  inset: 3px;
  image-rendering: pixelated;
}

/*
 * 绝对定位的替换元素不会自动被 inset 撑开，宽高得显式给（减去两侧各 3px 的边）。
 * 原版有 16×N 的动画帧堆叠贴图，cover 默认居中会截到中间某一帧；
 * 对齐到左上角才和画布一样取第一帧（见 core/textures.ts 的 drawTexture）。
 */
.slot__face--img {
  display: block;
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  object-fit: cover;
  object-position: left top;
}

.slot__label {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  padding: 1px 2px;
  font-size: var(--fs-micro);
  line-height: 1;
  color: #fff;
  background: rgb(0 0 0 / 66%);
  text-shadow: 1px 1px 0 #000;
  pointer-events: none;
}

.slot__count {
  position: absolute;
  right: 1px;
  bottom: 1px;
  z-index: 2;
  padding: 1px 2px;
  font-size: var(--fs-micro);
  line-height: 1;
  letter-spacing: -0.02em;
  color: #fff;
  background: rgb(0 0 0 / 62%);
  pointer-events: none;
}

/* hover 用 outline 而不是阴影：阴影被 is-empty / is-on 覆盖，会让空槽看起来点不动 */
.slot:hover {
  outline: 2px solid #fff;
  outline-offset: -4px;
}

.slot:focus-visible {
  outline: 2px solid var(--mc-focus);
  outline-offset: 2px;
}

.slot.is-muted {
  opacity: 0.42;
}

.slot.is-empty {
  background: #797979;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 #9a9a9a,
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #616161;
}

/*
 * 选中态必须排在 .is-empty 之后。
 * 两者特异性相同（.slot.xxx），原先选中态写在前面，空槽一旦被选中，
 * 它的阴影就被 .is-empty 覆盖，于是「点了空格子没有任何反应」。
 * 空槽没有贴图可比，再补一圈内描边，让选中在灰底上也看得清。
 */
.slot.is-on {
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #d4d4d4,
    0 0 0 2px var(--mc-pick),
    0 0 8px var(--mc-pick);
}

.slot.is-empty.is-on {
  background: #8a8a7a;
  box-shadow:
    inset 0 0 0 2px var(--mc-pick),
    inset var(--mc-bv) var(--mc-bv) 0 #a8a8a8,
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #6b6b6b,
    0 0 0 2px var(--mc-pick),
    0 0 8px var(--mc-pick);
}
</style>
