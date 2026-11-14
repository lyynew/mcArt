/**
 * 进度提示工具的状态与动作，整个工具只有这一份。
 *
 * 沿用项目的做法：模块级 ref + 单向数据流，组件只读写状态和调动作。
 * 图标面板的提示与导出面板的回执分开存，别让「已导出」跑到图标框里。
 * 素材图片是非响应式的 HTMLImageElement，所以统一放在一个 shallowRef 里，
 * 每次加载完成整体替换——之前「非响应式对象塞进 computed」导致界面永远不
 * 刷新的坑，这里不能重犯。
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { textureImage } from '@/core/textures'
import {
  DEFAULT_SPEC,
  SAMPLE_DESC_COLOR,
  SAMPLE_TITLE_COLOR,
  TOAST_BACKGROUND,
  TOAST_PRESETS,
  VANILLA_DESC_COLOR,
  VANILLA_TITLE_COLOR,
  type ExportScale,
  type IconChoice,
  type ToastSpec,
} from './model'
import type { ToastAssets } from './render'
import { FONT_BYTES_EXPECTED } from './unifont'

const EMPTY_ASSETS: ToastAssets = {
  background: null,
  block: null,
  flat: null,
  upload: null,
  font: null,
}

const title = ref(DEFAULT_SPEC.title)
const description = ref(DEFAULT_SPEC.description)
const titleColor = ref(DEFAULT_SPEC.titleColor)
const descColor = ref(DEFAULT_SPEC.descColor)
const icon = shallowRef<IconChoice>({ ...DEFAULT_SPEC.icon })
const scale = ref<ExportScale>(DEFAULT_SPEC.scale)

const assets = shallowRef<ToastAssets>({ ...EMPTY_ASSETS })
const fontReady = ref(false)
const iconMessage = ref('')

const spec = computed<ToastSpec>(() => ({
  title: title.value,
  description: description.value,
  titleColor: titleColor.value,
  descColor: descColor.value,
  icon: icon.value,
  scale: scale.value,
}))

/** 素材请求的竞态守卫：连点几个图标时，晚到的旧请求不能覆盖新选择 */
let iconToken = 0

async function loadOne(tex: string | undefined): Promise<HTMLImageElement | null> {
  if (!tex) return null
  try {
    return (await textureImage(tex)) ?? null
  } catch {
    return null
  }
}

async function loadIcon(choice: IconChoice): Promise<void> {
  const token = ++iconToken

  // 上传图由 setUpload 单独管，这里只负责把方块/物品那几张置空，
  // 免得切走再切回来时IconKind 和残留贴图对不上。
  if (choice.kind === 'upload') {
    if (token !== iconToken) return
    assets.value = { ...assets.value, block: null, flat: null }
    return
  }

  let next: Partial<ToastAssets>
  if (choice.kind === 'block') {
    // 立体图标是离线渲染好的 PNG，直接按 block id 取；万一缺图，
    // 退回同名平面贴图，至少不让图标框空着
    const icon = await loadOne(`block-icons/${choice.tex}`)
    const flat = icon ? null : await loadOne(choice.tex)
    next = { block: icon ?? flat, flat: null }
  } else {
    const flat = await loadOne(choice.tex)
    next = { block: null, flat }
  }

  if (token !== iconToken) return
  assets.value = { ...assets.value, ...next }
}

/** 原版点阵字表，680 KB 定长二进制，加载一次常驻内存 */
async function loadFont(): Promise<void> {
  try {
    const url = `${import.meta.env.BASE_URL}textures/font/unifont.bin`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    if (buf.byteLength !== FONT_BYTES_EXPECTED) {
      throw new Error(`字表长度 ${buf.byteLength}，应为 ${FONT_BYTES_EXPECTED}`)
    }
    assets.value = { ...assets.value, font: new Uint8Array(buf) }
  } catch {
    iconMessage.value = '原版点阵字加载失败，文字已退回系统字体'
  }
}

/** 页面挂载时调一次：点阵字 → 原版底图 → 默认图标 */
async function init(): Promise<void> {
  await loadFont()
  fontReady.value = true

  try {
    const bg = await loadOne(TOAST_BACKGROUND)
    if (bg) assets.value = { ...assets.value, background: bg }
    else iconMessage.value = '原版底图没读到，已用内置框体兜底'
  } catch {
    iconMessage.value = '原版底图没读到，已用内置框体兜底'
  }

  await loadIcon(icon.value)
}

watch(icon, loadIcon)

function setIcon(kind: IconChoice['kind'], tex = ''): void {
  icon.value = { kind, tex }
  if (kind === 'upload' && !assets.value.upload) {
    iconMessage.value = '还没上传图片，点「选择图片」挑一张'
  } else {
    iconMessage.value = ''
  }
}

function setUpload(file: File): void {
  if (!file.type.startsWith('image/')) {
    iconMessage.value = '请选择图片文件'
    return
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    assets.value = { ...assets.value, upload: img }
    icon.value = { kind: 'upload', tex: '' }
    iconMessage.value = `已载入 ${file.name}`
    // 立刻 revoke 在部分浏览器会让已显示的图变空，留一点余量
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }
  img.onerror = () => {
    iconMessage.value = '图片解码失败，换一张试试'
    URL.revokeObjectURL(url)
  }
  img.src = url
}

function applyPreset(id: string): void {
  const preset = TOAST_PRESETS.find((p) => p.id === id)
  if (!preset) return
  title.value = preset.title
  description.value = preset.description
  iconMessage.value = ''
}

function useVanillaColors(): void {
  titleColor.value = VANILLA_TITLE_COLOR
  descColor.value = VANILLA_DESC_COLOR
}

function useSampleColors(): void {
  titleColor.value = SAMPLE_TITLE_COLOR
  descColor.value = SAMPLE_DESC_COLOR
}

export function useAdvancement() {
  return {
    title,
    description,
    titleColor,
    descColor,
    icon,
    scale,
    assets,
    fontReady,
    iconMessage,
    spec,
    presets: TOAST_PRESETS,
    init,
    setIcon,
    setUpload,
    applyPreset,
    useVanillaColors,
    useSampleColors,
  }
}
