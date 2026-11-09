<script setup lang="ts">
import { McNote, McSegmented, McSlider, McWindow, type SegOption } from '@/design/components'
import { useMapArt } from '../store'
import type { BackgroundMode, DitherMode, SamplingMode, ShadeMode } from '../model'

/**
 * 参数面板。
 *
 * McSegmented 的 modelValue 是 string，而 store 里是字面量联合类型，
 * 所以统一走 setter 转一次型；这样算法层拿到的是可穷举的类型，
 * 模板里也不用塞 TS 语法。
 */
const { imageOptions, colorOptions } = useMapArt()

const samplingOptions: SegOption[] = [
  { value: 'smooth', label: '平滑 · 照片' },
  { value: 'pixel', label: '像素 · 像素画' },
]
const backgroundOptions: SegOption[] = [
  { value: 'transparent', label: '透明' },
  { value: 'white', label: '白底' },
  { value: 'black', label: '黑底' },
]
const shadeOptions: SegOption[] = [
  { value: 'all', label: '全部 244 色' },
  { value: 'flat', label: '仅平面 61 色' },
]
const ditherOptions: SegOption[] = [
  { value: 'none', label: '无' },
  { value: 'floyd', label: '误差扩散' },
  { value: 'bayer', label: '有序抖动' },
]

function setSampling(v: string): void {
  imageOptions.sampling = v as SamplingMode
}
function setBackground(v: string): void {
  imageOptions.background = v as BackgroundMode
}
function setShades(v: string): void {
  colorOptions.shades = v as ShadeMode
}
function setDither(v: string): void {
  colorOptions.dither = v as DitherMode
}
</script>

<template>
  <McWindow title="图像处理">
    <span class="tuning__label">缩放方式</span>
    <McSegmented
      :options="samplingOptions"
      :columns="2"
      dense
      :model-value="imageOptions.sampling"
      @update:model-value="setSampling"
    />

    <span class="tuning__label">透明像素</span>
    <McSegmented
      :options="backgroundOptions"
      :columns="3"
      dense
      :model-value="imageOptions.background"
      @update:model-value="setBackground"
    />

    <McSlider v-model="imageOptions.contrast" label="对比度" :min="-60" :max="60" />
    <McSlider v-model="imageOptions.saturation" label="饱和度" :min="-60" :max="60" />
  </McWindow>

  <McWindow title="配色与抖动">
    <span class="tuning__label">可用色阶</span>
    <McSegmented
      :options="shadeOptions"
      :columns="2"
      dense
      :model-value="colorOptions.shades"
      @update:model-value="setShades"
    />
    <McNote>地图数据是直接写入的，四档明暗都能用；想真在地上平铺摆方块时选 61 色。</McNote>

    <span class="tuning__label">颜色抖动</span>
    <McSegmented
      :options="ditherOptions"
      :columns="3"
      dense
      :model-value="colorOptions.dither"
      @update:model-value="setDither"
    />
    <McSlider
      v-if="colorOptions.dither === 'floyd'"
      v-model="colorOptions.strength"
      label="扩散强度"
      suffix="%"
      :min="0"
      :max="100"
    />
    <McNote>
      误差扩散（Floyd–Steinberg，蛇形扫描）让渐变更顺；有序抖动没有噪点累积。
      颜色匹配一律用 CIEDE2000 感知色差。
    </McNote>
  </McWindow>
</template>

<style scoped>
.tuning__label {
  display: block;
  margin: var(--sp-3) 0 5px;
  font-size: var(--fs-sm);
  color: var(--mc-ink-soft);
}

.tuning__label:first-child {
  margin-top: 0;
}
</style>
