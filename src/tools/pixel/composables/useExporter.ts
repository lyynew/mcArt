import { ref } from 'vue'
import { PALETTES } from '@/core/palettes'
import { DATA_VERSION } from '@/core/nbt'
import { safeName } from '@/core/naming'
import { buildLitematic } from '@/core/structure/litematic'
import { buildSchem } from '@/core/structure/schem'
import { canvasToBlob, downloadBlob } from '@/shared/download'
import { buffers } from '../store/buffers'
import { useEditor } from '../store/editor'
import { buildMaterialCsv } from '../export/csv'
import { renderExportCanvas } from '../export/image'
import { buildStructureExport } from '../export/structure'
import { createGridVoxelLayout } from '../export/grid-voxels'

/** 结构文件的三种容器：原版结构方块 / Litematica / WorldEdit */
export type BuildFormat = 'nbt' | 'litematic' | 'schem'

/**
 * 导出五件套。
 *
 * 每个动作只做三件事：从 store 取数据 → 交给 export/ 与 core/structure 的纯函数 → 下载。
 * 失败要有明确提示，用户不会打开控制台看异常。
 */
/** 提示与忙碌态放在模块级：结构文件与图片导出两个面板共用同一份 */
const message = ref('')
const busy = ref(false)

export function useExporter() {
  const editor = useEditor()
  const { settings, blocks, counts } = editor

  function fileBase(): string {
    const palette = PALETTES[settings.paletteId]
    return `方块像素画-${settings.n}x${settings.n}-${palette.label}`
  }

  async function exportPng(withAxis: boolean): Promise<void> {
    if (!editor.hasImage.value) {
      message.value = '先放一张图进来'
      return
    }
    try {
      const canvas = renderExportCanvas({
        idx: buffers.idx,
        blocks: blocks.value,
        n: settings.n,
        withAxis,
      })
      const blob = await canvasToBlob(canvas)
      downloadBlob(blob, `${fileBase()}${withAxis ? '-施工图' : ''}.png`)
      message.value = withAxis ? '施工图已导出' : '像素图已导出'
    } catch {
      message.value = '图片导出失败，刷新再试一次'
    }
  }

  function exportCsv(): void {
    if (!editor.hasImage.value) {
      message.value = '先放一张图进来'
      return
    }
    try {
      const csv = buildMaterialCsv(settings.n, blocks.value, counts.value)
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), '方块像素画-材料清单.csv')
      message.value = '材料清单已导出'
    } catch {
      message.value = '清单导出失败，刷新再试一次'
    }
  }

  async function exportBuild(format: BuildFormat): Promise<void> {
    if (!editor.hasImage.value) {
      message.value = '先放一张图进来'
      return
    }
    if (busy.value) return

    busy.value = true
    message.value = '正在打包…'
    try {
      const base = safeName(settings.structName)

      if (format === 'nbt') {
        const result = await buildStructureExport({
          n: settings.n,
          idx: buffers.idx,
          blocks: blocks.value,
          name: settings.structName,
          useAir: settings.useAir,
          wall: settings.orient === 'wall',
        })
        downloadBlob(result.blob, result.fileName)
        message.value = result.tiled
          ? `已分 ${result.fileCount} 块打包，摆放位置见包内说明`
          : '结构文件已导出'
        return
      }

      // litematic / schem 没有 48 格上限，单文件直接下载
      const layout = createGridVoxelLayout({
        n: settings.n,
        idx: buffers.idx,
        blocks: blocks.value,
        wall: settings.orient === 'wall',
      })

      if (format === 'litematic') {
        const bytes = await buildLitematic(layout, {
          name: settings.structName,
          dataVersion: DATA_VERSION,
          description: `方块像素画 ${settings.n}×${settings.n} · 由 mcArt 生成`,
          regionName: 'pixel-art',
        })
        downloadBlob(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }), `${base}.litematic`)
        message.value = 'Litematica 投影文件已导出'
      } else {
        const bytes = await buildSchem(layout, {
          name: settings.structName,
          dataVersion: DATA_VERSION,
        })
        downloadBlob(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }), `${base}.schem`)
        message.value = 'WorldEdit 图纸已导出'
      }
    } catch {
      message.value = '导出出错，刷新页面再试一次'
    } finally {
      busy.value = false
    }
  }

  return { message, busy, exportPng, exportCsv, exportBuild, fileBase }
}
