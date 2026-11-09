<script setup lang="ts">
import { McNote, McSegmented, McSlider, McSwitch, McWindow, type SegOption } from '@/design/components'
import { useMapArt } from '../store'
import type { BackgroundMode, BuildMode, DitherMode, SamplingMode } from '../model'

/**
 * 参数面板。
 *
 * McSegmented 的 modelValue 是 string，而 store 里是字面量联合类型，
 * 所以统一走 setter 转一次型；模板里不塞 TS 语法，算法层拿到的仍是可穷举的类型。
 */
const { imageOptions, colorOptions, build, palette } = useMapArt()

const modeOptions: SegOption[] = [
  { value: 'data', label: '数据' },
  { value: 'flat', label: '平铺' },
  { value: 'staircase', label: '阶梯' },
]
const samplingOptions: SegOption[] = [
  { value: 'smooth', label: '平滑 · 照片' },
  { value: 'pixel', label: '像素 · 像素画' },
]
const backgroundOptions: SegOption[] = [
  { value: 'transparent', label: '透明' },
  { value: 'white', label: '白底' },
  { value: 'black', label: '黑底' },
]
const ditherOptions: SegOption[] = [
  { value: 'none', label: '无' },
  { value: 'floyd', label: '误差扩散' },
  { value: 'atkinson', label: 'Atkinson' },
  { value: 'bayer', label: 'Bayer 4×4' },
  { value: 'bayer8', label: 'Bayer 8×8', span: true },
]
const supportOptions: SegOption[] = [
  { value: 'dirt', label: '泥土' },
  { value: 'cobblestone', label: '圆石' },
  { value: 'stone', label: '石头' },
  { value: 'oak_planks', label: '橡木木板' },
]

function setMode(v: string): void {
  build.mode = v as BuildMode
}
function setSampling(v: string): void {
  imageOptions.sampling = v as SamplingMode
}
function setBackground(v: string): void {
  imageOptions.background = v as BackgroundMode
}
function setDither(v: string): void {
  colorOptions.dither = v as DitherMode
}
function setSupport(v: string): void {
  build.supportBlock = v
}
</script>

<template>
  <McWindow title="建造方式">
    <span class="tuning__label">产出路线</span>
    <McSegmented
      :options="modeOptions"
      :columns="3"
      dense
      :model-value="build.mode"
      @update:model-value="setMode"
    />
    <McNote v-if="build.mode === 'data'">
      直接把 {{ palette.length }} 色写进地图文件，四档明暗都能用，不用摆方块。
    </McNote>
    <McNote v-else-if="build.mode === 'flat'">
      平铺同高只出 220 档，{{ palette.length }} 色；可导出施工文件。透明像素自动填白。
    </McNote>
    <McNote v-else>
      立体阶梯用高度差出前三档，{{ palette.length }} 色；需要 noobline 与支撑方块。
      透明像素自动填白。
    </McNote>

    <template v-if="build.mode === 'staircase'">
      <span class="tuning__label">阶梯优化</span>
      <McSwitch
        v-model="build.compress"
        label="高度压缩"
        hint="每列独立对齐最低点，noobline 逐列取不同高度，支撑方块最少"
      />
      <McSwitch v-model="build.noobline" label="生成 noobline" hint="北侧边界外多铺一行，固定首行明暗档" />

      <span class="tuning__label">支撑方块</span>
      <McSegmented
        :options="supportOptions"
        :columns="2"
        dense
        :model-value="build.supportBlock"
        @update:model-value="setSupport"
      />
    </template>
  </McWindow>

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
    <McNote v-if="build.mode !== 'data' && imageOptions.background === 'transparent'">
      摆方块时透明会打断高度链，这里按白底处理。
    </McNote>

    <McSlider v-model="imageOptions.contrast" label="对比度" :min="-60" :max="60" />
    <McSlider v-model="imageOptions.saturation" label="饱和度" :min="-60" :max="60" />
  </McWindow>

  <McWindow title="配色与抖动">
    <span class="tuning__label">颜色抖动</span>
    <McSegmented
      :options="ditherOptions"
      :columns="2"
      dense
      :model-value="colorOptions.dither"
      @update:model-value="setDither"
    />
    <McSlider
      v-if="colorOptions.dither === 'floyd' || colorOptions.dither === 'atkinson'"
      v-model="colorOptions.strength"
      label="扩散强度"
      suffix="%"
      :min="0"
      :max="100"
    />
    <McSwitch v-model="colorOptions.despeckle" label="去孤立噪点" hint="抖动后把孤立的杂色并回周围" />
    <McNote>
      误差在<strong>线性光</strong>里扩散（不是 gamma 数值），渐变更干净；
      颜色一律用 CIEDE2000 感知色差选。Atkinson 噪点最少，Bayer 有序抖动不积累误差。
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
