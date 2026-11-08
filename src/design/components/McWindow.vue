<script setup lang="ts">
/**
 * Minecraft 游戏内 GUI 窗：浅灰面板 + 内斜面 + 硬投影。
 * 面板内容统一 9px 内边距；`flush` 用于舞台那种要满幅放画布的窗口。
 */
withDefaults(
  defineProps<{
    title?: string
    /** 去掉内边距，让内容（如画布、工具栏）贴着边框 */
    flush?: boolean
  }>(),
  { title: undefined, flush: false },
)
</script>

<template>
  <section class="mc-window" :class="{ 'mc-window--flush': flush }">
    <h2 v-if="title" class="mc-window__title">{{ title }}</h2>
    <slot />
  </section>
</template>

<style scoped>
.mc-window {
  background: var(--mc-panel);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-panel-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-panel-lo),
    var(--mc-shadow-panel);
  padding: var(--sp-4);
  color: var(--mc-ink);
  min-width: 0;
}

.mc-window--flush {
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* flush 时标题自己补回内边距，避免贴边 */
.mc-window--flush > .mc-window__title {
  padding: var(--sp-4) var(--sp-4) 0;
}

.mc-window__title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0 0 var(--sp-3);
  font-size: var(--fs-title);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3b3b3b;
  text-shadow: var(--mc-ts-light);
}

.mc-window__title::before {
  content: "";
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  background: var(--mc-accent);
  border: 1px solid #2b2b2b;
  box-shadow: 0 0 0 1px #efefef;
}
</style>
