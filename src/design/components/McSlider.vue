<script setup lang="ts">
/**
 * 带标签与当前值的滑杆。金属凹槽 + 凸起滑块，跟游戏设置里的滑条一致。
 */
const model = defineModel<number>({ required: true })

withDefaults(
  defineProps<{
    label?: string
    min?: number
    max?: number
    step?: number
    /** 数值后缀，例如「格」「px」；纯数字留空 */
    suffix?: string
    /** 滑杆下方的一行解释 */
    note?: string
  }>(),
  { label: undefined, min: 0, max: 100, step: 1, suffix: '', note: undefined },
)
</script>

<template>
  <div class="mc-slider">
    <div class="mc-slider__head">
      <span>{{ label }}</span>
      <b>{{ model }}{{ suffix }}</b>
    </div>
    <input
      v-model.number="model"
      class="mc-slider__input"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :aria-label="label"
    />
    <p v-if="note" class="mc-slider__note">{{ note }}</p>
  </div>
</template>

<style scoped>
.mc-slider {
  min-width: 0;
}

.mc-slider__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
  margin-bottom: 3px;
}

.mc-slider__head b {
  font-size: var(--fs-body);
  color: var(--mc-ink-strong);
}

.mc-slider__input {
  appearance: none;
  -webkit-appearance: none;
  display: block;
  width: 100%;
  height: 12px;
  margin: 0;
  background: var(--mc-btn);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #d4d4d4;
  cursor: pointer;
}

.mc-slider__input::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 16px;
  background: var(--mc-panel);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 #fff,
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #6a6a6a;
}

.mc-slider__input::-moz-range-thumb {
  width: 12px;
  height: 16px;
  border-radius: 0;
  background: var(--mc-panel);
  border: var(--mc-bd) solid #000;
}

.mc-slider__note {
  margin-top: var(--sp-1);
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
  line-height: 1.5;
}
</style>
