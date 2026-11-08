<script setup lang="ts">
/**
 * 面板里的输入框：凹槽底 + 白色文字。
 * 搜索框与文件名输入共用，`type` 区分 search / text。
 */
const model = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    type?: 'text' | 'search'
    placeholder?: string
    /** 无障碍标签，视觉上不显示 */
    ariaLabel?: string
    spellcheck?: boolean
  }>(),
  { type: 'text', placeholder: undefined, ariaLabel: undefined, spellcheck: false },
)
</script>

<template>
  <input
    v-model="model"
    class="mc-input"
    :type="type"
    :placeholder="placeholder"
    :aria-label="ariaLabel ?? placeholder"
    :spellcheck="spellcheck"
  />
</template>

<style scoped>
.mc-input {
  width: 100%;
  background: var(--mc-btn);
  color: #fff;
  border: var(--mc-bd) solid #000;
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-body);
  text-shadow: var(--mc-ts-dark);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #d4d4d4;
  outline: none;
}

.mc-input::placeholder {
  color: #dcdcdc;
}

.mc-input:focus-visible {
  outline: 2px solid var(--mc-focus);
  outline-offset: 1px;
}

/* 去掉 Safari 搜索框自带的清除按钮，尺寸在像素界面里太违和 */
.mc-input[type='search']::-webkit-search-cancel-button {
  appearance: none;
}

/*
 * iOS 对字号小于 16px 的输入框，会在聚焦时自动放大整个页面，
 * 失焦后也不会缩回去——搜索框一点就把界面撑花了。
 * 唯一可靠的规避方式就是把字号提到 16px。
 */
@media (pointer: coarse) {
  .mc-input {
    font-size: 16px;
    padding: 6px var(--sp-3);
  }
}
</style>
