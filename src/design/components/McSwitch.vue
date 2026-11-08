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
  position: relative; /* 隐藏的 input 必须相对本行定位，见下 */
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

/*
 * 视觉隐藏但保留可聚焦，焦点环画在方块上。
 * 必须用 inset 把 input 钉在本行内：绝对定位元素若没有定位祖先，
 * 会跑到最近的定位祖先（这里是整页容器），点击时浏览器为了让它可见
 * 会把页面滚到顶部——那是「点一下开关，页面跳回顶上」的真正原因。
 */
.mc-switch__input {
  position: absolute;
  inset: 0 auto auto 0;
  width: 1px;
  height: 1px;
  margin: 0;
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

/* 触屏：整行高度就是点击区域，勾选框本身也放大一点 */
@media (pointer: coarse) {
  .mc-switch {
    padding: 6px 0;
    font-size: 13px;
  }

  .mc-switch__box {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
  }
}
</style>
