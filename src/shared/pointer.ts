import { ref } from 'vue'

/**
 * 是否「手指优先」的设备（手机、平板）。
 *
 * 只用来切换提示文案与触控目标的尺寸，不改功能——
 * 所有能力在两种设备上都可用，触摸屏接上鼠标也应该按鼠标写提示。
 * `(pointer: coarse)` 描述的是主输入设备，比按屏宽判断更准。
 */
const query = typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)') : null

export const isCoarsePointer = ref(query?.matches ?? false)

query?.addEventListener('change', (event) => {
  isCoarsePointer.value = event.matches
})
