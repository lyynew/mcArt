<script setup lang="ts">
/**
 * 工具容器。
 *
 * 工具页面原本由独立应用的外壳（#app，100dvh 的纵向 flex）撑开，
 * 内嵌到文档站后由这里接替那个职责：吃掉导航栏以下的全部高度，
 * 并把工具放进 .mc-scope 里，让像素风样式不外溢到文档页。
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
  overflow: hidden;
}
</style>
