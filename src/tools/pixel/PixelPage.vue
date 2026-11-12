<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import SourcePanel from './components/SourcePanel.vue'
import TexturePackPanel from './components/TexturePackPanel.vue'
import SizePanel from './components/SizePanel.vue'
import PaletteSchemePanel from './components/PaletteSchemePanel.vue'
import TonePanel from './components/TonePanel.vue'
import DisplayPanel from './components/DisplayPanel.vue'
import StagePanel from './components/StagePanel.vue'
import BlockPalettePanel from './components/BlockPalettePanel.vue'
import StructurePanel from './components/StructurePanel.vue'
import ExportPanel from './components/ExportPanel.vue'
import CustomPaletteModal from './components/CustomPaletteModal.vue'
import SourceIntake from '@/tools/shared/SourceIntake.vue'
import { requestCrop } from '@/tools/shared/source-intake'
import { withTimeout } from '@/shared/async'
import { useEditor } from './store/editor'

/**
 * 生成器页面。
 *
 * 只做三栏编排与页面级副作用（首次进入生成示例图、Ctrl+V 粘贴图片），
 * 具体逻辑分别在 store（数据与动作）与 components（视图）里。
 */
const editor = useEditor()
const customOpen = ref(false)

function onPaste(e: ClipboardEvent): void {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (!file) continue
    e.preventDefault()
    requestCrop(file, '剪贴板图片')
    return
  }
}

onMounted(async () => {
  window.addEventListener('paste', onPaste)
  if (editor.hasImage.value) return

  // 草稿要走 IndexedDB，首次打开数据库可能偏慢。
  // 这里只给它 600ms：读得到就恢复，读不到就先上示例图。
  // 关键是「读」和「应用」是分开的，超时后不会有迟到的结果回来覆盖用户操作。
  const draft = await withTimeout(editor.readDraft(), 600)
  if (draft) editor.applyDraft(draft)
  else editor.loadDemo()
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste)
})
</script>

<template>
  <div class="pixel">
    <aside class="pixel__col">
      <SourcePanel />
      <TexturePackPanel />
      <SizePanel />
      <PaletteSchemePanel @open-custom="customOpen = true" />
      <TonePanel />
      <DisplayPanel />
    </aside>

    <StagePanel class="pixel__stage" />

    <aside class="pixel__col">
      <BlockPalettePanel />
      <StructurePanel />
      <ExportPanel />
    </aside>

    <CustomPaletteModal v-model="customOpen" />
    <SourceIntake @pick="editor.loadSquareImage" />
  </div>
</template>

<style scoped>
.pixel {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr) 272px;
  gap: var(--sp-5);
  padding: var(--sp-5) 14px 14px;
  overflow: hidden;
}

.pixel__col {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

/* 面板在纵向 flex 里默认会被压缩，必须显式禁止，否则内容会被切掉 */
.pixel__col > * {
  flex: 0 0 auto;
}

.pixel__stage {
  min-height: 0;
}

@media (max-width: 1120px) {
  .pixel {
    grid-template-columns: 1fr;
    overflow: visible;
    height: auto;
    /*
     * 单列时必须彻底退出「撑满视口」的角色。
     * 只写 height: auto 是不够的：顶部那条 flex: 1 仍然会把它压成视口剩余高度，
     * grid 的行随之被压缩，而两列都带 min-height: 0（宽屏用来内部滚动的），
     * 结果就是每一列被压成一两百像素、内容溢出到外面、左右两栏互相盖住。
     * 改成按内容撑高，滚动交给外层 .site-main。
     */
    flex: 0 0 auto;
    grid-auto-rows: max-content;
    align-content: start;
  }

  .pixel__col {
    /* 同理：允许列被压扁是宽屏的滚动技巧，单列下必须放开 */
    min-height: auto;
    overflow: visible;
    max-height: none;
  }

  .pixel__stage {
    order: -1;
    /*
     * 舞台固定高度，不用 min-height 让内容撑：
     * 以前放大画布（单格像素变大）会把舞台一起撑高，整页跟着变长，
     * 工具栏与状态栏被推到屏幕外，画布右边也像「被切掉」。
     * 定高之后画布只在舞台内部滚动（.canvaswrap），工具条与底栏始终可见，
     * 配合「适应」按钮随时回到整张图都看得见的状态。
     */
    height: 62vh;
    height: min(74svh, 640px);
    min-height: 0;
  }
}
</style>
