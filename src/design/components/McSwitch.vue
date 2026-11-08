<script setup lang="ts">
/**
 * 复选开关：左侧文字、右侧方块打勾。
 * 用真实 checkbox 承载语义与键盘操作，视觉层用 span 画。
 */
const model = defineModel<boolean>({ default: false })

withDefaults(
  defineProps<{
    label?: string
    /** 鼠标悬停的解释，长说明不要挤在行内 */
    hint?: string
    disabled?: boolean
  }>(),
  { label: undefined, hint: undefined, disabled: false },
)
</script>

<template>
  <label class="mc-switch" :title="hint">
    <span class="mc-switch__label">
      <slot>{{ label }}</slot>
    </span>
    <input v-model="model" type="checkbox" class="mc-switch__input" :disabled="disabled" />
    <span class="mc-switch__box" aria-hidden="true" />
  </label>
</template>

<style scoped>
.mc-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: 2px 0;
  font-size: var(--fs-sm);
  cursor: pointer;
  user-select: none;
}

.mc-switch__label {
  min-width: 0;
}

/* 视觉隐藏但保留可聚焦，焦点环画在方块上 */
.mc-switch__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.mc-switch__box {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  background: var(--mc-btn);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #d4d4d4;
  transition: background var(--mc-motion) linear;
}

.mc-switch__input:checked + .mc-switch__box {
  background: var(--mc-accent);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-accent-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-accent-lo);
}

.mc-switch__input:focus-visible + .mc-switch__box {
  outline: 2px solid var(--mc-focus);
  outline-offset: 2px;
}

.mc-switch:hover .mc-switch__box {
  background: var(--mc-btn-hover);
}

.mc-switch:hover .mc-switch__input:checked + .mc-switch__box {
  background: var(--mc-accent-hover);
}

.mc-switch:has(.mc-switch__input:disabled) {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
