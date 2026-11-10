import { computed, reactive, ref, watch } from 'vue'
import { ALL_BLOCKS, PALETTES, buildCustomPalette, type PaletteBlock, type PaletteId } from '@/core/palettes'
import { EMPTY, applyManual, quantize, sampleGrid } from '@/core/convert'
import { DITHER_MODES, type DitherMode } from '@/core/dither'
import { createSettings, HOTBAR_SIZE, SIZE_MAX, SIZE_MIN, type EditorSettings, type ToolId } from '../types'
import { createDemoImage, readSquareImage } from '../image-input'
import {
  buffers,
  markDirty,
  markManual,
  resetBuffers,
  revision,
  sampled,
  setSourceImage,
  sourceImage,
  sourceRevision,
} from './buffers'
import { discard, record, redo, resetHistory, undo, canRedo, canUndo } from './history'
import { notify } from './view-state'
import { loadPersisted, savePersisted, type PersistedState } from './persist'
import { loadCanvas, loadSource, saveCanvas, saveSource } from './draft'
import { debounce } from '@/shared/debounce'

/**
 * 编辑器状态与动作。
 *
 * 这个模块是「领域层」：组件只调用这里的方法、读这里的只读状态，
 * 不直接改 buffers。这样绘制、重算、历史记录三件事的先后顺序只在一处维护。
 *
 * 像素数据在 buffers 里（非响应式），改动后靠 markDirty() 通知重绘。
 */

const settings = reactive<EditorSettings>(createSettings())

/** 自定义方案勾选的方块 ID；空数组表示还没挑 */
const customIds = ref<string[]>([])

/** 物品栏存全表下标，换色板后只要方块还在就能解析回来 */
const hotbar = ref<(number | null)[]>(Array.from({ length: HOTBAR_SIZE }, () => null))

/** 鼠标悬停的格子，供舞台底栏显示坐标与方块名 */
const hover = ref<{ x: number; y: number; k: number } | null>(null)

/** 正在重算（换画幅、换色板等），界面可据此显示忙碌态 */
const busy = ref(false)

/* ---------------- 恢复上次的选择 ---------------- */

const restored = loadPersisted()
if (restored) {
  if (Array.isArray(restored.customIds)) customIds.value = restored.customIds
  if (Array.isArray(restored.hotbar)) {
    hotbar.value = Array.from({ length: HOTBAR_SIZE }, (_, i) => restored.hotbar?.[i] ?? null)
  }
  if (restored.paletteId && restored.paletteId in PALETTES) settings.paletteId = restored.paletteId
  if (typeof restored.n === 'number' && restored.n >= SIZE_MIN && restored.n <= SIZE_MAX) settings.n = restored.n
  if (typeof restored.tool === 'string') settings.tool = restored.tool
  if (typeof restored.brush === 'number') settings.brush = Math.min(3, Math.max(1, restored.brush))
  if (typeof restored.mirror === 'boolean') settings.mirror = restored.mirror
  if (typeof restored.structName === 'string') settings.structName = restored.structName
  if (restored.orient === 'flat' || restored.orient === 'wall') settings.orient = restored.orient
  if (restored.ditherMode && DITHER_MODES.includes(restored.ditherMode)) settings.ditherMode = restored.ditherMode
  else if (typeof restored.dither === 'boolean') settings.ditherMode = restored.dither ? 'floyd' : 'none'
  if (typeof restored.ditherStrength === 'number') {
    settings.ditherStrength = Math.min(100, Math.max(0, restored.ditherStrength))
  }
  const bools = [
    'useAir',
    'showGrid',
    'blockShading',
    'focusSelected',
    'realTexture',
    'despeckle',
  ] as const
  for (const key of bools) {
    if (typeof restored[key] === 'boolean') settings[key] = restored[key] as boolean
  }
}

const customPalette = computed<readonly PaletteBlock[]>(() => buildCustomPalette(customIds.value))

/** 当前色板的方块列表 */
const blocks = computed<readonly PaletteBlock[]>(() =>
  settings.paletteId === 'custom' ? customPalette.value : PALETTES[settings.paletteId].blocks,
)

/** 当前选中的方块（可能为 undefined：还没选或色板为空） */
const selectedBlock = computed<PaletteBlock | undefined>(() => blocks.value[settings.selected])

/** 每一格命中的方块数量，色板里用它显示角标并压暗没用的方块 */
/**
 * 一次遍历同时得到三样东西：每种方块的数量、实体格数、用色数。
 *
 * 早先拆成两个 computed，结果出现过「方块 2304 / 用色 0」这种自相矛盾的显示——
 * 两个缓存各自失效时机不同，读出来就对不上了。合成一次计算从结构上消掉这个问题，
 * 也少扫一遍 25,600 格。
 */
const analysis = computed(() => {
  // 依赖版本号，而不是数组内容
  void revision.value

  const counts = new Int32Array(blocks.value.length)
  const idx = buffers.idx
  let solid = 0

  for (let i = 0; i < idx.length; i++) {
    const k = idx[i]!
    if (k < 0) continue
    solid++
    if (k < counts.length) counts[k]!++
  }

  let colors = 0
  for (let i = 0; i < counts.length; i++) if (counts[i]! > 0) colors++

  return { counts, solid, colors, total: buffers.n * buffers.n, empty: buffers.n * buffers.n - solid }
})

/** 每种方块的数量，色板角标用 */
const counts = computed<Int32Array>(() => analysis.value.counts)

/** 底栏统计 */
const stats = computed(() => {
  const a = analysis.value
  return { total: a.total, solid: a.solid, empty: a.empty, colors: a.colors }
})

/** 当前画面里实际用到的方块 ID，自定义方案里的「只留用到的」靠它 */
const usedBlockIds = computed<Set<string>>(() => {
  const out = new Set<string>()
  const counts = analysis.value.counts
  for (let i = 0; i < counts.length; i++) {
    if (counts[i]! <= 0) continue
    const b = blocks.value[i]
    if (b) out.add(b.id)
  }
  return out
})

/** 是否有可编辑的画面 */
const hasImage = computed(() => {
  // 依赖版本号，否则这个 computed 永远不会失效
  void sourceRevision.value
  return sourceImage.pixels !== null
})

/* ---------------- 重算管线 ---------------- */

function ensureBuffers(): boolean {
  if (buffers.n !== settings.n) {
    resetBuffers(settings.n)
    return false
  }
  return buffers.idx.length > 0
}

function applyQuantize(src: Uint8ClampedArray): void {
  const n = buffers.n
  const next = quantize(src, n, blocks.value, {
    dither: settings.ditherMode,
    strength: settings.ditherStrength,
    despeckle: settings.despeckle,
  })
  applyManual(next, buffers.manual, buffers.manualBlock, blocks.value, ALL_BLOCKS)
  buffers.idx.set(next)
  markDirty()
}

/** 重新采样原图并匹配：换图片、换画幅、调对比度/饱和度时用 */
function rebuild(): void {
  const pixels = sourceImage.pixels
  if (!pixels || !sourceImage.size) return

  busy.value = true
  try {
    ensureBuffers()
    const src = sampleGrid(
      pixels,
      sourceImage.size,
      buffers.n,
      settings.contrast,
      settings.sat,
    )
    sampled.pixels = src
    applyQuantize(src)
  } finally {
    busy.value = false
  }
}

/** 只用已有采样结果重新匹配：换色板、开关抖动/去杂点时用，快很多 */
function requantize(): void {
  const src = sampled.pixels
  if (!src || buffers.n !== settings.n) {
    rebuild()
    return
  }
  busy.value = true
  try {
    applyQuantize(src)
  } finally {
    busy.value = false
  }
}

/* ---------------- 图片 ---------------- */

async function loadImage(blob: Blob, name = ''): Promise<void> {
  const img = await readSquareImage(blob, name)
  setSourceImage(img.pixels, img.size)
  settings.imageName = img.name || name
  void saveSource({ pixels: img.pixels.slice().buffer, size: img.size, name: settings.imageName })

  resetBuffers(settings.n)
  resetHistory()
  rebuild()
  // 选中一个方块，用户进来就能直接画
  if (settings.selected < 0 && blocks.value.length) settings.selected = 0
}

function loadDemo(): void {
  const img = createDemoImage()
  setSourceImage(img.pixels, img.size)
  settings.imageName = img.name
  void saveSource({ pixels: img.pixels.slice().buffer, size: img.size, name: img.name })
  resetBuffers(settings.n)
  resetHistory()
  rebuild()
  if (settings.selected < 0 && blocks.value.length) settings.selected = 0
}

/* ---------------- 设置项 ---------------- */

function setSize(n: number): void {
  if (n === settings.n) return
  settings.n = n
  settings.zoomPx = 0
  // 换画幅等于换网格，人工标记与历史都不再适用
  resetBuffers(n)
  resetHistory()
  rebuild()
}

function setPalette(id: PaletteId): void {
  if (id === settings.paletteId) return
  settings.paletteId = id
  // 换色板需要重新匹配，但手画过的格子由 applyManual 保住
  requantize()
  if (settings.selected >= blocks.value.length) settings.selected = blocks.value.length - 1
}

/**
 * 对比度与饱和度一次改完再重算。
 * 两个滑杆分别调用会触发两次完整重算，256×256 下能差出半秒。
 */
function setTone(contrast: number, sat: number): void {
  if (settings.contrast === contrast && settings.sat === sat) return
  settings.contrast = contrast
  settings.sat = sat
  rebuild()
}

function setContrast(v: number): void {
  setTone(v, settings.sat)
}

function setSat(v: number): void {
  setTone(settings.contrast, v)
}

function setDitherMode(v: DitherMode): void {
  settings.ditherMode = v
  requantize()
}

function setDitherStrength(v: number): void {
  settings.ditherStrength = Math.min(100, Math.max(0, v))
  requantize()
}

function setDespeckle(v: boolean): void {
  settings.despeckle = v
  requantize()
}

function setTool(tool: ToolId): void {
  settings.tool = tool
}

function setBrush(width: number): void {
  settings.brush = Math.min(3, Math.max(1, width))
}

function toggleMirror(): void {
  settings.mirror = !settings.mirror
}

/* ---------------- 选中与物品栏 ---------------- */

function selectBlock(index: number): void {
  const b = blocks.value[index]
  if (!b) return
  settings.selected = index
  hotbar.value[settings.hotSlot] = b.all
  // 吸管 / 橡皮点完方块后切回画笔，符合直觉
  if (settings.tool === 'picker' || settings.tool === 'eraser') settings.tool = 'brush'
}

function selectHotSlot(slot: number): void {
  settings.hotSlot = slot
  const all = hotbar.value[slot]
  if (all === null || all === undefined) {
    // 空槽位只表示「接下来放东西的位置」，方块选择保持不动；
    // 给一句提示，否则点了格子界面毫无变化，看起来像没响应
    notify(`已选中第 ${slot + 1} 格（空）；点上面调色板里的方块放进来`)
    return
  }
  const index = blocks.value.findIndex((b) => b.all === all)
  settings.selected = index
}

function clearHotSlot(slot: number): void {
  hotbar.value[slot] = null
  if (slot !== settings.hotSlot) return

  // 清掉的是当前槽位时，方块选择也跟着失效，需要明确告知
  settings.selected = -1
  notify(`已清空第 ${slot + 1} 格；再画请先选一个方块`)
}

/** 物品栏某格里方块的全表下标（不在当前色板就返回 null） */
function hotSlotBlockAll(slot: number): number | null {
  return hotbar.value[slot] ?? null
}

/* ---------------- 自定义色板 ---------------- */

function setCustomIds(ids: string[]): void {
  customIds.value = ids
  if (settings.paletteId === 'custom') {
    requantize()
    if (settings.selected >= blocks.value.length) settings.selected = blocks.value.length - 1
  }
}

/* ---------------- 绘制 ---------------- */

/** 写单格；返回是否真的发生了变化 */
function setCell(index: number, k: number): boolean {
  if (buffers.idx[index] === k) return false
  buffers.idx[index] = k
  const all = k < 0 ? -1 : (blocks.value[k]?.all ?? -1)
  markManual(index, all)
  return true
}

function applyBrush(cx: number, cy: number, k: number): boolean {
  const n = buffers.n
  const width = settings.brush
  const half = Math.floor((width - 1) / 2)
  let changed = false

  for (let dy = 0; dy < width; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const x = cx - half + dx
      const y = cy - half + dy
      if (x < 0 || y < 0 || x >= n || y >= n) continue
      if (setCell(y * n + x, k)) changed = true
      if (settings.mirror) {
        const mx = n - 1 - x
        if (setCell(y * n + mx, k)) changed = true
      }
    }
  }
  return changed
}

function floodFill(sx: number, sy: number, k: number): boolean {
  const n = buffers.n
  const total = n * n
  const start = sy * n + sx
  const target = buffers.idx[start]!
  if (target === k) return false

  const seen = new Uint8Array(total)
  const done = new Uint8Array(total)
  const stack: number[] = [start]
  let changed = false

  while (stack.length) {
    const i = stack.pop()!
    if (seen[i]) continue
    seen[i] = 1
    if (buffers.idx[i] !== target) continue

    buffers.idx[i] = k
    done[i] = 1
    changed = true

    const x = i % n
    const y = (i - x) / n
    if (x + 1 < n) stack.push(i + 1)
    if (x > 0) stack.push(i - 1)
    if (y + 1 < n) stack.push(i + n)
    if (y > 0) stack.push(i - n)
  }

  // 对称只复制真正被填到的格子
  if (changed && settings.mirror) {
    for (let i = 0; i < total; i++) {
      if (!done[i]) continue
      const x = i % n
      const y = (i - x) / n
      const mi = y * n + (n - 1 - x)
      buffers.idx[mi] = k
      done[mi] = 1
    }
  }

  for (let i = 0; i < total; i++) {
    if (done[i]) markManual(i, k < 0 ? -1 : (blocks.value[k]?.all ?? -1))
  }

  return changed
}

/** 全图同种替换；返回实际改动格数 */
function replaceAll(from: number, to: number): number {
  let hits = 0
  const total = buffers.n * buffers.n
  const all = to < 0 ? -1 : (blocks.value[to]?.all ?? -1)
  for (let i = 0; i < total; i++) {
    if (buffers.idx[i] !== from) continue
    buffers.idx[i] = to
    markManual(i, all)
    hits++
  }
  return hits
}

/**
 * 只替换与点击处连通的同种方块。
 *
 * 与「填充」的区别在语义：填充是「把这片区域换成新方块」，
 * 这里是「把这片里同种的方块换掉，别的不动」，看起来像同一件事，
 * 但在已经混色的区域里前者会覆盖掉其他颜色，后者只换目标那一种。
 */
function replaceConnected(sx: number, sy: number, from: number, to: number): number {
  const n = buffers.n
  const total = n * n
  const seen = new Uint8Array(total)
  const stack: number[] = [sy * n + sx]
  const all = to < 0 ? -1 : (blocks.value[to]?.all ?? -1)
  let hits = 0

  while (stack.length) {
    const i = stack.pop()!
    if (seen[i]) continue
    seen[i] = 1
    if (buffers.idx[i] !== from) continue

    buffers.idx[i] = to
    markManual(i, all)
    hits++

    const x = i % n
    const y = (i - x) / n
    if (x + 1 < n) stack.push(i + 1)
    if (x > 0) stack.push(i - 1)
    if (y + 1 < n) stack.push(i + n)
    if (y > 0) stack.push(i - n)
  }

  return hits
}

function pickCell(x: number, y: number): void {
  const k = buffers.idx[y * buffers.n + x]!
  if (k >= 0) selectBlock(k)
}

/** 一次完整的按下—拖动—抬起，历史只记一步 */
let strokeChanged = false

function beginStroke(): void {
  strokeChanged = false
  record()
}

/**
 * 在格子上执行一次操作。
 * 返回是否改动，调用方负责累积并在结束时交给 endStroke。
 */
/** 单次操作的可选修饰 */
export interface StrokeOptions {
  /**
   * 替换工具专用：true 时只替换与点击处连通的一片。
   * 默认 false（全图同种），与旧版一致；误触全图的代价太高，所以留了这个出口。
   */
  region?: boolean
}

function strokeAt(x: number, y: number, opts?: StrokeOptions): boolean {
  if (!hasImage.value) return false
  const n = buffers.n
  if (x < 0 || y < 0 || x >= n || y >= n) return false

  const tool = settings.tool
  if (tool === 'picker') {
    pickCell(x, y)
    return false
  }
  if (tool === 'pan') return false

  if (tool === 'replace') {
    const from = buffers.idx[y * n + x]!
    const to = settings.selected

    // 替换是「全图同种批量替换」，目标不明确时一次点击就会波及整幅图：
    // 没选方块时 to 是 -1，会把这种方块全部删光；点空格则会把所有空气一次填满。
    // 这两种情况都不该执行，并且要告诉用户下一步该怎么做。
    if (to < 0) {
      notify('替换前先在调色板里选一个目标方块')
      return false
    }
    if (from === EMPTY) {
      notify('替换的起点必须是实心方块；要把空白填满请用填充工具')
      return false
    }
    if (from === to) return false

    const region = opts?.region === true
    const hits = region
      ? replaceConnected(x, y, from, to)
      : replaceAll(from, to)
    if (hits === 0) return false

    markDirty()
    const fromName = blocks.value[from]?.zh ?? '该方块'
    const toName = blocks.value[to]?.zh ?? '目标方块'
    // 批量改动必须给回执，否则「怎么全变了」会变成信任问题
    notify(
      region
        ? `已把相连的 ${hits} 格「${fromName}」换成「${toName}」`
        : `已把全图 ${hits} 格「${fromName}」换成「${toName}」`,
    )
    return true
  }

  const target = tool === 'eraser' ? EMPTY : settings.selected
  if (target === EMPTY || target >= 0) {
    const changed = tool === 'fill' ? floodFill(x, y, target) : applyBrush(x, y, target)
    if (changed) markDirty()
    return changed
  }
  return false
}

function trackStroke(changed: boolean): void {
  if (changed) strokeChanged = true
}

function endStroke(): void {
  if (!strokeChanged) discard()
}

/* ---------------- 自动保存 ---------------- */

const persist = debounce(() => {
  const snapshot: PersistedState = {
    customIds: customIds.value,
    paletteId: settings.paletteId,
    hotbar: hotbar.value,
    tool: settings.tool,
    brush: settings.brush,
    mirror: settings.mirror,
    structName: settings.structName,
    orient: settings.orient,
    useAir: settings.useAir,
    showGrid: settings.showGrid,
    blockShading: settings.blockShading,
    focusSelected: settings.focusSelected,
    realTexture: settings.realTexture,
    ditherMode: settings.ditherMode,
    ditherStrength: settings.ditherStrength,
    despeckle: settings.despeckle,
    n: settings.n,
  }
  savePersisted(snapshot)
}, 400)

watch(
  [
    customIds,
    hotbar,
    () => settings.paletteId,
    () => settings.tool,
    () => settings.brush,
    () => settings.mirror,
    () => settings.structName,
    () => settings.orient,
    () => settings.useAir,
    () => settings.showGrid,
    () => settings.blockShading,
    () => settings.focusSelected,
    () => settings.realTexture,
    () => settings.ditherMode,
    () => settings.ditherStrength,
    () => settings.despeckle,
    () => settings.n,
  ],
  persist,
  { deep: true },
)

/** 按原图重新生成：清掉人工痕迹，但仍可撤销 */
function regenerate(): void {
  if (!hasImage.value) return
  record()
  resetBuffers(settings.n)
  rebuild()
}

/* ---------------- 草稿（IndexedDB） ---------------- */

/** 画布数据每次编辑后写一份；原图单独存，不重复搬运 */
const saveDraftSoon = debounce(() => {
  if (!buffers.n) return
  void saveCanvas({
    n: buffers.n,
    idx: buffers.idx.slice().buffer,
    manual: buffers.manual.slice().buffer,
    manualBlock: buffers.manualBlock.slice().buffer,
    imageName: settings.imageName,
    savedAt: Date.now(),
  })
}, 1500)

watch(revision, saveDraftSoon)

/** 超过这个时长的草稿不再自动恢复，免得用户看到很久以前的东西 */
const DRAFT_TTL = 7 * 24 * 3600 * 1000

export interface DraftPayload {
  canvas: {
    n: number
    idx: ArrayBuffer
    manual: ArrayBuffer
    manualBlock: ArrayBuffer
    imageName: string
    savedAt: number
  }
  source: { pixels: ArrayBuffer; size: number; name: string } | null
}

/**
 * 只读取草稿，不改任何状态。
 *
 * 拆成「读」和「应用」两步，是为了让页面可以先给个超时：
 * 慢的时候直接放弃恢复，而不是让一个迟到的异步结果去覆盖用户刚画的东西。
 */
async function readDraft(): Promise<DraftPayload | null> {
  const [canvas, source] = await Promise.all([loadCanvas(), loadSource()])
  if (!canvas) return null
  if (Date.now() - canvas.savedAt > DRAFT_TTL) return null
  if (!canvas.n || canvas.n < SIZE_MIN || canvas.n > SIZE_MAX) return null
  return { canvas, source }
}

/** 把读到的草稿应用于当前画布（同步，一次到位） */
function applyDraft(payload: DraftPayload): void {
  const { canvas, source } = payload

  settings.n = canvas.n
  resetBuffers(canvas.n)
  buffers.idx.set(new Int16Array(canvas.idx))
  buffers.manual.set(new Uint8Array(canvas.manual))
  buffers.manualBlock.set(new Int16Array(canvas.manualBlock))

  if (source) setSourceImage(new Uint8ClampedArray(source.pixels), source.size)
  if (canvas.imageName) settings.imageName = canvas.imageName

  resetHistory()
  markDirty()

  if (settings.selected < 0 && blocks.value.length) settings.selected = 0
}

/* ---------------- 历史 ---------------- */

function doUndo(): void {
  undo()
}

function doRedo(): void {
  redo()
}

export function useEditor() {
  return {
    settings,
    blocks,
    selectedBlock,
    counts,
    usedBlockIds,
    stats,
    hover,
    busy,
    hasImage,
    hotbar,
    canUndo,
    canRedo,

    loadImage,
    loadDemo,
    regenerate,
    readDraft,
    applyDraft,
    setSize,
    setPalette,
    setTone,
    setContrast,
    setSat,
    setDitherMode,
    setDitherStrength,
    setDespeckle,
    setTool,
    setBrush,
    toggleMirror,

    selectBlock,
    selectHotSlot,
    clearHotSlot,
    hotSlotBlockAll,
    setCustomIds,
    customIds,

    beginStroke,
    strokeAt,
    trackStroke,
    endStroke,

    doUndo,
    doRedo,
  }
}
