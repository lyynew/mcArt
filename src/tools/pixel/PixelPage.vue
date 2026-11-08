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
import { withTimeout } from '@/shared/async'
import { useEditor } from './store/editor'

/**
 * 生成器页面。
 *
 * 只做三栏编排与页面级副作用（首次进入生成示例图、Ctrl+V 粘贴图片），
 * 具体逻辑分别在 store（数据与动作）与 components（视图）里。
 */
const editor = useEditor()
const error = ref('')
const customOpen = ref(false)

async function onPaste(e: ClipboardEvent): Promise<void> {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (!file) continue
    e.preventDefault()
    try {
      await editor.loadImage(file, '剪贴板图片')
    } catch {
      error.value = '剪贴板里的图片读不出来'
    }
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

    <p v-if="error" class="pixel__error">{{ error }}</p>
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

.pixel__error {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  padding: 4px 10px;
  font-size: var(--fs-note);
  color: #fff;
  background: rgb(120 40 20 / 92%);
  border: 1px solid #000;
}

@media (max-width: 1120px) {
  .pixel {
    grid-template-columns: 1fr;
    overflow: visible;
    height: auto;
  }

  .pixel__col {
    overflow: visible;
    max-height: none;
  }

  .pixel__stage {
    order: -1;
    min-height: 62vh;
  }
}
</style>
