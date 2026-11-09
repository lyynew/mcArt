<script setup lang="ts">
/**
 * 工具页标准外壳：左「参数」/ 中「舞台」/ 右「信息」三栏。
 *
 * 新增工具统一用这个，别再各写一遍 flex:1 / min-height:0 / 窄屏滚动：
 * 宽屏时工具自己内部滚动（画布按容器高度计算，整块必须锁死），
 * 窄屏时改成按内容撑高，滚动交回 ToolFrame —— 手机上才滑得动。
 *
 * 少一个槽就少一栏，自动占位，两栏工具也能直接用。
 */
withDefaults(
  defineProps<{
    controlsWidth?: string
    asideWidth?: string
    maxWidth?: string
    /** 窄屏单列时把舞台排在最前：先看结果，再往下调参数 */
    mobileStageFirst?: boolean
  }>(),
  { controlsWidth: '280px', asideWidth: '300px', maxWidth: '1440px', mobileStageFirst: false },
)
</script>

<template>
  <div
    class="tool-shell"
    :class="{ 'tool-shell--stage-first': mobileStageFirst }"
    :style="{
      '--col-controls': controlsWidth,
      '--col-aside': asideWidth,
      '--max': maxWidth,
    }"
  >
    <div v-if="$slots.controls" class="tool-shell__controls"><slot name="controls" /></div>
    <div v-if="$slots.stage" class="tool-shell__stage"><slot name="stage" /></div>
    <div v-if="$slots.aside" class="tool-shell__aside"><slot name="aside" /></div>
  </div>
</template>

<style scoped>
.tool-shell {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: var(--col-controls) minmax(0, 1fr) var(--col-aside);
  gap: var(--sp-5);
  align-content: stretch;
  padding: var(--sp-5) 14px 14px;
  width: 100%;
  max-width: var(--max);
  margin: 0 auto;
}

.tool-shell > div {
  min-width: 0; /* 不给这一条，一长串文字会把整行撑出屏幕 */
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.tool-shell__controls,
.tool-shell__aside {
  overflow-y: auto;
}

.tool-shell__controls > *,
.tool-shell__aside > * {
  flex: 0 0 auto;
}

.tool-shell__stage > * {
  flex: 1 1 auto;
  min-height: 0;
}

/* 中等宽度：右栏挪到下面整行，别让三栏一起被挤扁 */
@media (max-width: 1200px) {
  .tool-shell {
    grid-template-columns: var(--col-controls) minmax(0, 1fr);
    grid-auto-rows: minmax(0, auto);
  }

  .tool-shell__aside {
    grid-column: 1 / -1;
    overflow: visible;
  }
}

/* 窄屏：单列、按内容撑高，滚动交给外层容器 */
@media (max-width: 900px) {
  .tool-shell {
    grid-template-columns: minmax(0, 1fr);
    flex: 0 0 auto;
    height: auto;
    grid-auto-rows: max-content;
    align-content: start;
  }

  .tool-shell__controls,
  .tool-shell__aside,
  .tool-shell__stage {
    overflow: visible;
  }

  .tool-shell__stage {
    min-height: 70svh;
  }

  .tool-shell__aside {
    grid-column: auto;
  }

  /* grid 的自动布局也认 order，把预览提到参数前面 */
  .tool-shell--stage-first .tool-shell__stage {
    order: -1;
  }
}
</style>
