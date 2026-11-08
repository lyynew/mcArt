<script setup lang="ts">
import { ref } from 'vue'

/**
 * 拖放 / 点选上传区。
 * 用真实的 input[type=file] 承载选择，拖拽走原生 DnD；
 * 键盘可以 Tab 到它再按 Enter / 空格打开文件选择。
 */
const props = withDefaults(
  defineProps<{
    accept?: string
    multiple?: boolean
    /** 拖拽是否在视觉上高亮 */
    disabled?: boolean
  }>(),
  { accept: 'image/*', multiple: false, disabled: false },
)

const emit = defineEmits<{ (e: 'files', files: File[]): void }>()

const fileInput = ref<HTMLInputElement | null>(null)
const isOver = ref(false)

function openPicker(): void {
  if (props.disabled) return
  fileInput.value?.click()
}

function emitFiles(list: FileList | null | undefined): void {
  if (!list || list.length === 0) return
  const files = Array.from(list)
  emit('files', props.multiple ? files : files.slice(0, 1))
}

function onDrop(e: DragEvent): void {
  isOver.value = false
  if (props.disabled) return
  e.preventDefault()
  emitFiles(e.dataTransfer?.files)
}

function onDragOver(e: DragEvent): void {
  if (props.disabled) return
  e.preventDefault()
  isOver.value = true
}

function onDragLeave(): void {
  isOver.value = false
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openPicker()
  }
}
</script>

<template>
  <div
    class="mc-drop"
    :class="{ 'is-over': isOver, 'is-disabled': disabled }"
    role="button"
    tabindex="0"
    :aria-disabled="disabled"
    @click="openPicker"
    @keydown="onKey"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <slot />
    <input
      ref="fileInput"
      class="mc-drop__input"
      type="file"
      :accept="accept"
      :multiple="multiple"
      @change="emitFiles(($event.target as HTMLInputElement).files)"
    />
  </div>
</template>

<style scoped>
.mc-drop {
  background: var(--mc-plate);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-plate-hi);
  padding: var(--sp-5) var(--sp-3);
  text-align: center;
  cursor: pointer;
  color: var(--mc-ink);
  transition: background var(--mc-motion) linear;
}

.mc-drop:hover {
  background: #bcbcbc;
}

.mc-drop:active {
  transform: translate(1px, 1px);
}

.mc-drop.is-over {
  background: #a8c78e;
}

.mc-drop.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 真正的文件框藏起来，但保留在无障碍树里 */
.mc-drop__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
