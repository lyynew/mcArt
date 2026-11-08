<script setup lang="ts">
/**
 * 面板内的说明文字。留一个最小高度，避免文案出现/消失时布局跳动。
 */
withDefaults(defineProps<{ tone?: 'default' | 'warn' }>(), { tone: 'default' })
</script>

<template>
  <p class="mc-note" :class="`mc-note--${tone}`">
    <slot />
  </p>
</template>

<style scoped>
.mc-note {
  min-height: 14px;
  margin-top: var(--sp-2);
  font-size: var(--fs-note);
  line-height: 1.5;
  color: var(--mc-ink-soft);
}

.mc-note--warn {
  color: #8a3a1f;
}
</style>
