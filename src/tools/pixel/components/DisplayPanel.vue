<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { McSegmented, McSlider, McSwitch, McWindow, type SegOption } from '@/design/components'
import { debounce } from '@/shared/debounce'
import type { DitherMode } from '@/core/dither'
import { useEditor } from '../store/editor'

/**
 * 显示开关。
 * 只影响预览的几项直接绑 settings；去杂点和抖动会改变匹配结果，走 store 的动作。
 * 抖动强度走防抖——拖滑杆每帧都会全量重匹配，大画幅下会卡。
 */
const editor = useEditor()
const { settings } = editor

const ditherOptions: SegOption[] = [
  { value: 'none', label: '关' },
  { value: 'floyd', label: 'Floyd', title: 'Floyd–Steinberg 误差扩散，渐变过渡自然' },
  { value: 'atkinson', label: 'Atkinson', title: '误差只散给 6 个邻居，纯色区更干净' },
  { value: 'bayer', label: 'Bayer 4', title: '4×4 有序抖动，规则点阵、不积累误差' },
  { value: 'bayer8', label: 'Bayer 8', title: '8×8 有序抖动，点阵更细' },
]

function onDitherMode(value: string): void {
  editor.setDitherMode(value as DitherMode)
}

const strength = ref(settings.ditherStrength)

watch(
  () => settings.ditherStrength,
  (v) => {
    if (v !== strength.value) strength.value = v
  },
)

const applyStrength = debounce((v: number) => editor.setDitherStrength(v), 200)

watch(strength, (v) => {
  if (v === settings.ditherStrength) return
  applyStrength(v)
})

onBeforeUnmount(() => applyStrength.cancel())
</script>

<template>
  <McWindow title="显示">
    <McSwitch v-model="settings.showGrid" label="网格线" />
    <McSwitch
      v-model="settings.blockShading"
      label="方块质感"
      hint="给每一格加一圈明暗边，看起来像堆起来的方块；只影响画布预览，不影响导出"
    />
    <McSwitch
      :model-value="settings.despeckle"
      label="去杂点"
      hint="孤立且颜色接近的格子并到周围，不伤眼睛与高光"
      @update:model-value="editor.setDespeckle"
    />

    <div class="dither">
      <p class="dither__label">颜色抖动</p>
      <McSegmented
        :options="ditherOptions"
        :columns="3"
        dense
        :model-value="settings.ditherMode"
        @update:model-value="onDitherMode"
      />
      <McSlider
        v-if="settings.ditherMode !== 'none'"
        v-model="strength"
        label="抖动强度"
        :min="0"
        :max="100"
        :step="5"
        suffix="%"
        style="margin-top: var(--sp-2)"
      />
    </div>

    <McSwitch
      v-model="settings.focusSelected"
      label="聚焦选中方块"
      hint="把其余方块压暗，方便看某种材料的分布"
    />
  </McWindow>
</template>

<style scoped>
.dither {
  margin: var(--sp-2) 0;
}

.dither__label {
  margin-bottom: 3px;
  font-size: var(--fs-sm);
}
</style>
