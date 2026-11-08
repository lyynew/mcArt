import { onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from 'vue'
import { ALL_BLOCKS } from '@/core/palettes'
import { preloadTextures } from '@/core/textures'
import { buffers, revision } from '../store/buffers'
import { useEditor } from '../store/editor'
import { overrides } from '../store/texture-pack'
import { applyCssSize, paintBoard } from '../board-painter'

/**
 * 把 store 的数据接到 canvas 上。
 *
 * 触发重绘的条件集中在这里（内容版本、单格像素、显示开关、色板、选中项），
 * 组件不用关心什么时候该画——只管把 canvas 元素交出来。
 *
 * 一帧内多次变更会合并成一次绘制：拖动滚轮缩放时，
 * 每次事件都全量重画 25,600 格是撑不住的。
 */
export function useBoardPainter(canvas: Ref<HTMLCanvasElement | null>, cell: Ref<number>) {
  const editor = useEditor()
  const { settings } = editor

  const textures = shallowRef<Map<string, HTMLImageElement>>(new Map())

  let frame = 0
  let disposed = false

  function paint(): void {
    const el = canvas.value
    if (!el || buffers.n === 0) return

    const merged = new Map(textures.value)
    // 用户覆盖的材质优先
    overrides.value.forEach((img, tex) => merged.set(tex, img))

    paintBoard(el, {
      n: buffers.n,
      idx: buffers.idx,
      blocks: editor.blocks.value,
      cell: cell.value,
      devicePixelRatio: window.devicePixelRatio || 1,
      showGrid: settings.showGrid,
      shading: settings.blockShading,
      realTextures: settings.realTexture,
      focusIndex: settings.focusSelected ? settings.selected : -1,
      textures: merged,
    })
  }

  function schedule(): void {
    if (disposed || frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      paint()
    })
  }

  watch(
    [
      revision,
      cell,
      () => settings.showGrid,
      () => settings.blockShading,
      () => settings.realTexture,
      () => settings.focusSelected,
      () => settings.selected,
      editor.blocks,
      overrides,
    ],
    schedule,
    { flush: 'post' },
  )

  onMounted(async () => {
    // 先画一帧（可能是平均色），贴图解码完再补一帧
    schedule()
    const names = ALL_BLOCKS.map((b) => b.tex)
    const loaded = await preloadTextures(names)
    if (disposed) return
    textures.value = loaded
    schedule()
  })

  onBeforeUnmount(() => {
    disposed = true
    if (frame) cancelAnimationFrame(frame)
  })

  /**
   * 手势期间同步更新显示尺寸。
   * 不走绘制帧，因为滚动范围必须立刻反映新的画布大小（原因见 applyCssSize 的注释）。
   */
  function syncCssSize(): void {
    const el = canvas.value
    if (!el || !buffers.n) return
    applyCssSize(el, buffers.n * cell.value)
  }

  return { repaint: schedule, syncCssSize, textures }
}
