/**
 * 设计系统出口。
 * 页面只从这里取组件，不直接引 .vue 路径，方便以后换实现。
 */
export { default as BlockMosaic } from './BlockMosaic.vue'
export { default as McButton } from './McButton.vue'
export { default as McChip } from './McChip.vue'
export { default as McDropzone } from './McDropzone.vue'
export { default as McInput } from './McInput.vue'
export { default as McModal } from './McModal.vue'
export { default as McNote } from './McNote.vue'
export { default as McSegmented } from './McSegmented.vue'
export { default as McSlider } from './McSlider.vue'
export { default as McSwitch } from './McSwitch.vue'
export { default as McWindow } from './McWindow.vue'
export type { SegOption } from './types'
