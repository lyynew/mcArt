<script setup lang="ts">
import type { SegOption } from './types'

/**
 * 分段选择：一排按钮里单选一项。
 * 用 aria-pressed 表达状态，键盘 Tab + Enter/Space 即可操作。
 */
const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    options: SegOption[]
    /** 列数，默认两列 */
    columns?: number
    /** 紧凑尺寸，用于面板内的多选项 */
    dense?: boolean
  }>(),
  { columns: 2, dense: false },
)
</script>

<template>
  <div
    class="mc-seg"
    :class="{ 'mc-seg--dense': dense }"
    :style="{ '--cols': columns }"
    role="group"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="mc-seg__item"
      :class="{ 'is-on': model === opt.value, 'is-span': opt.span }"
      :title="opt.title"
      :aria-pressed="model === opt.value"
      @click="model = opt.value"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.mc-seg {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: var(--sp-1);
}

.mc-seg__item {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--mc-btn);
  color: #fff;
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-btn-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-btn-lo);
  padding: 3px var(--sp-2);
  font-size: var(--fs-sm);
  line-height: 1.35;
  text-shadow: var(--mc-ts-dark);
  cursor: pointer;
  user-select: none;
  transition: background var(--mc-motion) linear;
}

.mc-seg--dense .mc-seg__item {
  padding: 3px 2px;
  font-size: var(--fs-note);
}

.mc-seg__item.is-span {
  grid-column: 1 / -1;
}

.mc-seg__item:hover {
  background: var(--mc-btn-hover);
}

.mc-seg__item:active {
  transform: translate(1px, 1px);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-btn-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-btn-hi);
}

.mc-seg__item.is-on {
  background: var(--mc-accent);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-accent-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-accent-lo);
}

.mc-seg__item.is-on:hover {
  background: var(--mc-accent-hover);
}
</style>
