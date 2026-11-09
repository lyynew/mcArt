/**
 * 地图画的状态与动作，整个工具只有这一份。
 *
 * 沿用项目里现有工具的做法：模块级 ref + computed 的单向数据流。
 *   source → grid（采样/调色） → palette（色阶） → result（量化）
 * 组件只读写这些状态和调用动作，不自己算任何东西；
 * 纯算法都在 *.ts 里，因此可以脱离浏览器直接单测。
 */
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { readSquareImage, type SquareImage } from '@/core/image'
import { debounce } from '@/shared/debounce'
import { createDemoImage } from './demo'
import { paletteOf } from './map-colors'
import { quantize, type Quantized } from './quantize'
import { rasterize } from './rasterize'
import {
  DEFAULT_COLOR_OPTIONS,
  DEFAULT_IMAGE_OPTIONS,
  DEFAULT_MAP_OPTIONS,
  type ColorOptions,
  type ImageOptions,
  type MapOptions,
} from './model'

const source = shallowRef<SquareImage | null>(null)
const imageOptions = reactive<ImageOptions>({ ...DEFAULT_IMAGE_OPTIONS })
const colorOptions = reactive<ColorOptions>({ ...DEFAULT_COLOR_OPTIONS })
const mapOptions = reactive<MapOptions>({ ...DEFAULT_MAP_OPTIONS })

const message = ref('')
const busy = ref(false)

const hasImage = computed(() => source.value !== null)
const grid = computed(() => (source.value ? rasterize(source.value, imageOptions) : null))
const palette = computed(() => paletteOf(colorOptions.shades))

/**
 * 16k 格 × 244 色的 CIEDE2000 匹配一次约几十毫秒，滑杆拖动时不能每帧都算。
 * 所以结果不是 computed，而是「参数变化 → 防抖 → 写进 shallowRef」。
 * 首帧用 flush() 立刻出图，不让人盯着空画布等 90ms。
 */
const result = shallowRef<Quantized | null>(null)

const recompute = debounce(() => {
  const g = grid.value
  result.value = g
    ? quantize(g, palette.value, {
        shades: colorOptions.shades,
        dither: colorOptions.dither,
        strength: colorOptions.strength,
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
    colorOptions.shades,
    colorOptions.dither,
    colorOptions.strength,
  ],
  () => recompute(),
  { immediate: true },
)
recompute.flush()

async function loadFile(file: File): Promise<void> {
  const looksLikeImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name)
  if (!looksLikeImage) {
    message.value = '请选择 PNG / JPG / WebP 等图片文件'
    return
  }
  busy.value = true
  message.value = '正在解码图片…'
  try {
    source.value = await readSquareImage(file, file.name)
    message.value = `已载入 ${file.name}`
  } catch (e) {
    message.value = e instanceof Error ? `读图失败：${e.message}` : '读图失败'
  } finally {
    busy.value = false
  }
}

function loadDemo(): void {
  source.value = createDemoImage()
  message.value = '已载入示例图 · 试试切换抖动方式'
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
    mapOptions,
    message,
    busy,
    hasImage,
    grid,
    palette,
    result,
    loadFile,
    loadDemo,
    clear,
  }
}
