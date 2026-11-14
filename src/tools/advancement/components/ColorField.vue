<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * 颜色字段：方块色块取色 + HEX 文本输入。
 *
 * 只有成就工具用，所以放在工具自己的 components/ 下，不进通用组件库。
 * HEX 框允许边打边错，只在值合法时回写，失焦时把无效输入退回当前值——
 * 否则每敲一个字符都会把颜色闪成黑色。
 */
const model = defineModel<string>({ required: true })
defineProps<{ label: string }>()

const draft = ref(model.value)
watch(model, (v) => {
  draft.value = v
})

function commit(): void {
  const v = draft.value.trim()
  const hex = v.startsWith('#') ? v : `#${v}`
  if (/^#[0-9a-f]{6}$/i.test(hex)) model.value = hex.toLowerCase()
  else draft.value = model.value
}

function onEnter(e: Event): void {
  ;(e.target as HTMLInputElement).blur()
}
</script>

<template>
  <div class="color-field">
    <span class="color-field__label">{{ label }}</span>
    <div class="color-field__row">
      <label class="color-field__swatch" :title="`选择${label}`">
        <input v-model="model" type="color" :aria-label="`选择${label}`" />
      </label>
      <input
        v-model="draft"
        class="color-field__hex"
        type="text"
        spellcheck="false"
        maxlength="7"
        :aria-label="`${label}的十六进制值`"
        @change="commit"
        @blur="commit"
        @keydown.enter="onEnter"
      />
    </div>
  </div>
</template>

<style scoped>
.color-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.color-field__label {
  font-size: var(--fs-sm);
  color: var(--mc-ink-soft);
}

.color-field__row {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* 原生取色器不可见但保留点击区，外面这层给 MC 风格的边框 */
.color-field__swatch {
  position: relative;
  width: 26px;
  height: 22px;
  border: var(--mc-bd) solid #000;
  background: var(--mc-btn);
  box-shadow: inset 1px 1px 0 var(--mc-btn-hi);
  cursor: pointer;
  overflow: hidden;
}

.color-field__swatch input {
  position: absolute;
  inset: -6px;
  width: calc(100% + 12px);
  height: calc(100% + 12px);
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.color-field__hex {
  width: 78px;
  padding: 3px 5px;
  font-family: var(--font-mc);
  font-size: var(--fs-sm);
  color: var(--mc-ink-strong);
  background: #fff;
  border: var(--mc-bd) solid #000;
  box-shadow: inset 2px 2px 0 #c6c6c6;
}
</style>
