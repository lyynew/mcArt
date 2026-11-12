/**
 * 源图入口的共享状态。
 *
 * 「挑一张内置材质」和「裁剪自己上传的图」是像素画、地图画两个工具
 * 都要做的事。弹层只在页面里挂一份（SourceIntake.vue），但触发点有四处：
 * 两个 SourcePanel 的按钮、页面级拖放、Ctrl+V 粘贴。
 * 用一份模块级状态把触发点都收拢到同一个入口，组件之间不必层层传 ref。
 *
 * 同时只会打开一个工具页，所以模块级单例是安全的。
 */
import { ref, shallowRef } from 'vue'

export interface CropRequest {
  blob: Blob
  name: string
}

const cropRequest = shallowRef<CropRequest | null>(null)
const cropOpen = ref(false)
const builtinOpen = ref(false)

/** 打开裁剪弹层；图片只在这里存引用，不提前解码 */
export function requestCrop(blob: Blob, name = ''): void {
  cropRequest.value = { blob, name }
  builtinOpen.value = false
  cropOpen.value = true
}

/** 对刚放进来（或从内置材质挑）的图重新选一次区域 */
export function reopenCrop(): void {
  if (!cropRequest.value) return
  builtinOpen.value = false
  cropOpen.value = true
}

export function openBuiltinPicker(): void {
  cropOpen.value = false
  builtinOpen.value = true
}

export function useSourceIntake() {
  return { cropRequest, cropOpen, builtinOpen, requestCrop, reopenCrop, openBuiltinPicker }
}
