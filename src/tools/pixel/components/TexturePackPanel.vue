<script setup lang="ts">
import { computed, ref } from 'vue'
import { McButton, McDropzone, McNote, McSwitch, McWindow } from '@/design/components'
import { useEditor } from '../store/editor'
import { addTextureFiles, clearOverrides, overrideCount } from '../store/texture-pack'

/**
 * 真实材质：用高清材质包覆盖内置贴图。
 * 只影响画布预览，导出的 PNG / 施工图始终是纯色（不然照着铺会看不清）。
 */
const editor = useEditor()
const { settings } = editor

const dirInput = ref<HTMLInputElement | null>(null)
const filesInput = ref<HTMLInputElement | null>(null)
const message = ref('')

const note = computed(() => {
  if (overrideCount.value > 0) return `已覆盖 ${overrideCount.value} 张（文件名＝方块 ID）`
  return '未载入材质，现在显示的是平均色'
})

async function apply(files: File[]): Promise<void> {
  if (!files.length) return
  message.value = ''
  const result = await addTextureFiles(files)
  if (result.added.length === 0) {
    message.value = '没有匹配的文件名，例如 white_concrete.png'
  } else if (result.skipped.length) {
    message.value = `${result.added.length} 张已载入，${result.skipped.length} 张跳过`
  }
}

function onPick(e: Event): void {
  const input = e.target as HTMLInputElement
  void apply(Array.from(input.files ?? []))
  input.value = ''
}

function clear(): void {
  clearOverrides()
  message.value = ''
}
</script>

<template>
  <McWindow title="真实材质">
    <div class="tex__row">
      <McButton size="sm" @click="dirInput?.click()">选文件夹</McButton>
      <McButton size="sm" @click="filesInput?.click()">选图片</McButton>
    </div>

    <McDropzone class="tex__drop" multiple accept="image/png" @files="apply">
      <strong class="tex__drop-title">拖入材质 PNG</strong>
      <small class="tex__drop-hint">文件名＝方块 ID，如 white_concrete.png</small>
    </McDropzone>

    <McSwitch v-model="settings.realTexture" label="画布用真实材质" />
    <McNote>{{ note }}</McNote>
    <McNote v-if="message">{{ message }}</McNote>
    <McButton v-if="overrideCount > 0" size="sm" style="margin-top: var(--sp-1)" @click="clear">
      恢复内置贴图
    </McButton>

    <input
      ref="dirInput"
      type="file"
      multiple
      accept="image/png"
      webkitdirectory
      class="tex__hidden"
      @change="onPick"
    />
    <input
      ref="filesInput"
      type="file"
      multiple
      accept="image/png"
      class="tex__hidden"
      @change="onPick"
    />
  </McWindow>
</template>

<style scoped>
.tex__row {
  display: flex;
  gap: var(--sp-2);
}

.tex__drop {
  margin: var(--sp-2) 0;
  padding: var(--sp-2) 6px;
}

.tex__drop-title {
  display: block;
  font-size: var(--fs-body);
}

.tex__drop-hint {
  display: block;
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
  line-height: 1.5;
}

.tex__hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
