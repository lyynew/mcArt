<script setup lang="ts">
/**
 * 工具页加载占位。
 *
 * 工具组件只在浏览器挂载后才 import，等待期间工作台不能是一片空白。
 * 这里用纯 CSS 画一圈点亮的方块，不碰任何浏览器 API，SSR 也能直接输出，
 * 因此首屏 HTML 里就有它，不用等 JS 跑起来才出现。
 */
defineProps<{ failed?: boolean }>()
const emit = defineEmits<{ retry: [] }>()

// 12 个方块沿圆周排布。坐标写死而不是运行时算三角函数，
// 保证服务端和客户端渲染出完全相同的 DOM，水合不会错位。
// 顺序是逆时针（从正上方往左），配合下面的负延迟看起来像顺时针转。
const dots = [
  [50, 10], [30, 15], [15, 30], [10, 50],
  [15, 70], [30, 85], [50, 90], [70, 85],
  [85, 70], [90, 50], [85, 30], [70, 15],
].map(([x, y], i) => ({
  key: i,
  style: {
    left: `${x}%`,
    top: `${y}%`,
    '--i': i,
  },
}))
</script>

<template>
  <div class="pixel-spinner" role="status" aria-live="polite">
    <div class="pixel-spinner__box">
      <template v-if="failed">
        <p class="pixel-spinner__msg">工具没能载入</p>
        <button class="pixel-spinner__retry" type="button" @click="emit('retry')">
          重试
        </button>
      </template>

      <template v-else>
        <div class="pixel-spinner__ring" aria-hidden="true">
          <i v-for="dot in dots" :key="dot.key" class="pixel-spinner__dot" :style="dot.style" />
        </div>
        <p class="pixel-spinner__label">加载中</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pixel-spinner {
  flex: 1 1 auto;
  display: grid;
  place-items: center;
  min-height: 220px;
  padding: 24px;
}

.pixel-spinner__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

/* 一圈 10px 的硬边方块，没有圆角也没有渐变 */
.pixel-spinner__ring {
  position: relative;
  width: 72px;
  height: 72px;
}

.pixel-spinner__dot {
  position: absolute;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  background: var(--mc-accent-ink);
  box-shadow: 2px 2px 0 rgb(0 0 0 / 55%);
  opacity: 0.26;
  animation: pixel-chase 960ms steps(1, end) infinite;
  animation-delay: calc(var(--i) * -80ms);
}

/* 同一时刻只有一格全亮，后面拖三格逐渐变暗，像一格一格跳的彗尾 */
@keyframes pixel-chase {
  0%, 8.33% { opacity: 1; }
  8.34%, 16.66% { opacity: 0.72; }
  16.67%, 24.99% { opacity: 0.46; }
  25%, 100% { opacity: 0.26; }
}

.pixel-spinner__label,
.pixel-spinner__msg {
  margin: 0;
  /* 方舟像素字体按 12 的整数倍放大才不会糊 */
  font-family: var(--font-pixel);
  font-size: 24px;
  letter-spacing: 0.06em;
  color: var(--mc-text-dim);
  text-shadow: var(--mc-ts-dark);
}

.pixel-spinner__msg {
  color: var(--mc-text);
}

.pixel-spinner__retry {
  font-family: var(--font-pixel);
  font-size: 24px;
  color: #14170d;
  background: var(--mc-accent-hi);
  border: 0;
  border-radius: 0;
  box-shadow: var(--mc-shadow-btn);
  padding: 8px 20px;
  cursor: pointer;
}

.pixel-spinner__retry:hover {
  background: var(--mc-accent-hover-hi);
}

.pixel-spinner__retry:focus-visible {
  outline: 2px solid var(--mc-focus);
  outline-offset: 2px;
}

/* 白天模式：工作台是暖白纸，浅绿方块和米白字会糊掉，换成深绿 + 墨色。
   父级 .mc-scope 的背景已经在 custom.css 里跟着主题切了，这里只管自己这圈点。 */
html:not(.dark) .pixel-spinner__dot {
  background: var(--green);
  box-shadow: 2px 2px 0 rgb(0 0 0 / 18%);
}

html:not(.dark) .pixel-spinner__label {
  color: var(--ink-2);
  text-shadow: 1px 1px 0 #fff;
}

html:not(.dark) .pixel-spinner__msg {
  color: var(--ink);
  text-shadow: 1px 1px 0 #fff;
}

@media (prefers-reduced-motion: reduce) {
  .pixel-spinner__dot {
    animation: none;
    opacity: 0.4;
  }

  .pixel-spinner__dot:first-child { opacity: 1; }
}
</style>
