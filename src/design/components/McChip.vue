<script setup lang="ts">
/**
 * 小标签：版本号、外链这类附属信息。
 * 有 href 时渲染成链接，否则是纯文字块。
 */
withDefaults(
  defineProps<{
    href?: string
    title?: string
    /** 强调色，用于「新」这类标记 */
    accent?: boolean
  }>(),
  { href: undefined, title: undefined, accent: false },
)
</script>

<template>
  <component
    :is="href ? 'a' : 'span'"
    class="mc-chip"
    :class="{ 'mc-chip--accent': accent }"
    :href="href"
    :title="title"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'noopener' : undefined"
  >
    <slot />
  </component>
</template>

<style scoped>
.mc-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--fs-note);
  letter-spacing: 0.05em;
  white-space: nowrap;
  color: #e9e5d6;
  background: #2b2820;
  border: var(--mc-bd) solid #000;
  padding: 3px var(--sp-3);
  text-decoration: none;
  text-shadow: 1px 1px 0 #000;
  box-shadow:
    inset 1px 1px 0 #4b4638,
    inset -1px -1px 0 #14120d;
}

a.mc-chip:hover {
  background: #3b3729;
  color: var(--mc-accent-ink);
  text-decoration: none;
}

.mc-chip:active {
  transform: translate(1px, 1px);
}

.mc-chip--accent {
  color: var(--mc-accent-ink);
}
</style>
