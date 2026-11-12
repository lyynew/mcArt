/**
 * 地图画的状态与动作，整个工具只有这一份。
 *
 * 沿用项目里现有工具的做法：模块级 ref + 单向数据流。
 *   source → grid（采样/调色） → palette（按建造模式选色板）
 *          → result（量化） → heightMap（立体阶梯才需要）
 * 组件只读写这些状态和调用动作，不自己算任何东西；
 * 纯算法都在 *.ts 里，因此可以脱离浏览器直接单测。
 */
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import type { SquareImage } from '@/core/image'
import { debounce } from '@/shared/debounce'
import { createDemoImage } from './demo'
import { buildHeightMap, type HeightMap } from './heightmap'
import { paletteOf } from './map-colors'
import { quantize, type Quantized } from './quantize'
import { rasterize } from './rasterize'
import {
  DEFAULT_BUILD_OPTIONS,
  DEFAULT_COLOR_OPTIONS,
  DEFAULT_IMAGE_OPTIONS,
  DEFAULT_MAP_OPTIONS,
  type BuildOptions,
  type ColorOptions,
  type ImageOptions,
  type MapOptions,
} from './model'

const source = shallowRef<SquareImage | null>(null)
const imageOptions = reactive<ImageOptions>({ ...DEFAULT_IMAGE_OPTIONS })
const colorOptions = reactive<ColorOptions>({ ...DEFAULT_COLOR_OPTIONS })
const build = reactive<BuildOptions>({ ...DEFAULT_BUILD_OPTIONS })
const mapOptions = reactive<MapOptions>({ ...DEFAULT_MAP_OPTIONS })

const message = ref('')

const hasImage = computed(() => source.value !== null)
const isBuild = computed(() => build.mode !== 'data')

/**
 * 摆方块时不能有「未探索」像素：那一列没有顶层方块，会打断北侧高度链，
 * 后面所有格子的明暗档都跟着错。透明一律填白，用户仍可选黑底。
 */
const effectiveImageOptions = computed<ImageOptions>(() =>
  isBuild.value && imageOptions.background === 'transparent'
    ? { ...imageOptions, background: 'white' }
    : imageOptions,
)

const grid = computed(() =>
  source.value ? rasterize(source.value, effectiveImageOptions.value) : null,
)
const palette = computed(() => paletteOf(build.mode))

/**
 * 16k 格 × 244 色的 CIEDE2000 匹配一次约几十毫秒，滑杆拖动时不能每帧都算。
 * 所以结果不是 computed，而是「参数变化 → 防抖 → 写进 shallowRef」。
 * 首帧用 flush() 立刻出图，不让人盯着空画布等 90ms。
 */
const result = shallowRef<Quantized | null>(null)
const heightMap = shallowRef<HeightMap | null>(null)

const recompute = debounce(() => {
  const g = grid.value
  result.value = g
    ? quantize(g, palette.value, {
        dither: colorOptions.dither,
        strength: colorOptions.strength,
        despeckle: colorOptions.despeckle,
      })
    : null
  heightMap.value =
    result.value && isBuild.value
      ? buildHeightMap(result.value.colors, {
          compress: build.compress,
          noobline: build.noobline,
        })
      : null
}, 90)

watch(
  () => [
    source.value,
    imageOptions.sampling,
    imageOptions.contrast,
    imageOptions.saturation,
    imageOptions.background,
    colorOptions.dither,
    colorOptions.strength,
    colorOptions.despeckle,
    build.mode,
    build.compress,
    build.noobline,
  ],
  () => recompute(),
  { immediate: true },
)
recompute.flush()

/** 裁剪弹层 / 内置材质选择器选好之后，统一从这里送进生成器 */
function setSource(img: SquareImage): void {
  source.value = img
  message.value = `已载入 ${img.name}`
}

function loadDemo(): void {
  source.value = createDemoImage()
  message.value = '已载入示例图 · 试试切换建造模式与抖动'
}

function clear(): void {
  source.value = null
  message.value = ''
}

export function useMapArt() {
  return {
    source,
    imageOptions,
    colorOptions,
    build,
    mapOptions,
    message,
    hasImage,
    isBuild,
    grid,
    palette,
    result,
    heightMap,
    setSource,
    loadDemo,
    clear,
  }
}
