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
import { ensureFont, type ToastAssets } from './render'
import { facesOf } from './cube'

const EMPTY_ASSETS: ToastAssets = {
  background: null,
  top: null,
  side: null,
  flat: null,
  upload: null,
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
    assets.value = { ...assets.value, top: null, side: null, flat: null }
    return
  }

  let next: Partial<ToastAssets>
  if (choice.kind === 'block') {
    const faces = facesOf(choice.tex)
    const [top, side] = await Promise.all([loadOne(faces.top), loadOne(faces.side)])
    next = { top, side, flat: null }
  } else {
    const flat = await loadOne(choice.tex)
    next = { top: null, side: null, flat }
  }

  if (token !== iconToken) return
  assets.value = { ...assets.value, ...next }
}

/** 页面挂载时调一次：字体 → 原版底图 → 默认图标 */
async function init(): Promise<void> {
  try {
    await ensureFont()
  } catch {
    iconMessage.value = '像素字体加载失败，文字会退回系统字体'
  }
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
