<script setup lang="ts">
/**
 * 工具容器。
 *
 * 工具页面原本由独立应用的外壳（#app，100dvh 的纵向 flex）撑开，
 * 内嵌到文档站后由这里接替那个职责：吃掉导航栏以下的全部高度，
 * 并把工具放进 .mc-scope 里，让像素风样式不外溢到文档页。
 *
 * 这里同时扮演独立应用里 `.site-main` 的角色——它才是滚动容器。
 * 宽屏下工具自己内部滚动（画布要算容器高度，必须整块锁死），
 * 窄屏下工具改为按内容撑高，滚动就落回这一层。
 * 所以纵向必须是 auto 而不是 hidden，否则手机上整页滑不动。
 */
</script>

<template>
  <div class="tool-frame mc-scope">
    <slot />
  </div>
</template>

<style scoped>
.tool-frame {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  /* 滚到边界后不要把滚动传给页面本身，手机上不会出现「滑到底继续弹」 */
  overscroll-behavior: contain;
  /* Home 指示条（iOS）在布局之外，会压住滚动区最后一行 */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/*
 * 手机上浏览器底部导航栏是「悬浮层」：不缩水 dvh、也不报 safe-area-inset
 * （微信 / 小米浏览器 / QQ 浏览器都这样），光靠 env() 挡不住——滚到底
 * 最后一行仍被压在栏下。窄屏再留一段固定余量，让内容能滚出遮挡区。
 * 桌面端没有这种栏，多留一截只会把工作台压矮，所以只在窄屏加。
 */
@media (max-width: 900px) {
  .tool-frame {
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 56px);
  }
}
</style>
