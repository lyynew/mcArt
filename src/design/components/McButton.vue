<script setup lang="ts">
/**
 * Minecraft 凸起按钮。
 * 三种语义：默认（金属面）/ primary（草绿，做主动作）/ on（选中态，同样草绿）。
 * 尺寸 sm 用于工具栏与紧凑面板，icon 用于 ±、关闭这类方按钮。
 */
withDefaults(
  defineProps<{
    variant?: 'default' | 'primary'
    size?: 'md' | 'sm'
    /** 选中/激活态，用于工具切换、色系切换这类可反复点的按钮 */
    active?: boolean
    /** 纯图标方钮：固定 28px 宽，去掉左右内边距 */
    icon?: boolean
    disabled?: boolean
    title?: string
    type?: 'button' | 'submit'
  }>(),
  {
    variant: 'default',
    size: 'md',
    active: false,
    icon: false,
    disabled: false,
    title: undefined,
    type: 'button',
  },
)
</script>

<template>
  <button
    :type="type"
    class="mc-btn"
    :class="[
      `mc-btn--${size}`,
      {
        'mc-btn--primary': variant === 'primary',
        'mc-btn--on': active,
        'mc-btn--icon': icon,
      },
    ]"
    :disabled="disabled"
    :title="title"
    :aria-pressed="active ? true : undefined"
  >
    <slot />
  </button>
</template>

<style scoped>
.mc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  background: var(--mc-btn);
  color: #fff;
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-btn-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-btn-lo);
  padding: 5px var(--sp-3);
  font-size: var(--fs-body);
  line-height: 1.2;
  text-shadow: var(--mc-ts-dark);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: background var(--mc-motion) linear;
}

.mc-btn--sm {
  padding: 3px var(--sp-2);
  font-size: var(--fs-sm);
}

.mc-btn--icon {
  width: 28px;
  padding: 3px 0;
  font-size: 14px;
  line-height: 1;
}

.mc-btn:hover:not(:disabled) {
  background: var(--mc-btn-hover);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 #d0d0d0,
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-btn-lo);
}

.mc-btn:active:not(:disabled) {
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-btn-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-btn-hi);
  transform: translate(1px, 1px);
}

/* 草绿：主动作与选中态共用一个视觉 */
.mc-btn--primary,
.mc-btn--on {
  background: var(--mc-accent);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-accent-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-accent-lo);
}

.mc-btn--primary:hover:not(:disabled),
.mc-btn--on:hover:not(:disabled) {
  background: var(--mc-accent-hover);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-accent-hover-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-accent-lo);
}

.mc-btn--primary:active:not(:disabled),
.mc-btn--on:active:not(:disabled) {
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-accent-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-accent-hi);
}

.mc-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/*
 * 触屏：按手指尺寸放大。
 * 桌面 22px 高的小按钮在手机上点十次错三次，工具栏又是高频操作区。
 */
@media (pointer: coarse) {
  .mc-btn--sm {
    padding: 7px 9px;
    font-size: 12.5px;
  }

  .mc-btn--icon {
    width: 36px;
    padding: 6px 0;
  }
}
</style>
