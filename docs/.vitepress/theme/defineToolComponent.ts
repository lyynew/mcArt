import { defineComponent, h, onMounted, shallowRef, type Component } from 'vue'
import PixelSpinner from './PixelSpinner.vue'

/**
 * 工具的客户端加载包装。
 *
 * 和 VitePress 的 defineClientComponent 一样，动态 import 放在 onMounted 里，
 * 这样 canvas / IndexedDB / window 不会进构建期的 SSR；区别是等待期间渲染
 * 一个像素加载圈，而不是返回 null 让整块工作台空白。
 *
 * 加载圈是纯静态组件，SSR 时会一起输出，所以首屏 HTML 里就有它，
 * 不必等 JS 下载完才出现；客户端水合时同样先渲染它，不会报 mismatch。
 */
export function defineToolComponent(loader: () => Promise<unknown>) {
  return defineComponent({
    name: 'ToolComponent',
    setup() {
      const tool = shallowRef<Component | null>(null)
      const failed = shallowRef(false)

      async function load() {
        failed.value = false
        tool.value = null
        try {
          const mod = await loader()
          // Vite 的动态 import 返回模块对象，组件在 default 上
          tool.value =
            mod && typeof mod === 'object' && 'default' in mod
              ? (mod as { default: Component }).default
              : (mod as Component)
        } catch (err) {
          console.error('[mcArt] 工具加载失败', err)
          failed.value = true
        }
      }

      onMounted(load)

      return () =>
        tool.value
          ? h(tool.value)
          : h(PixelSpinner, { failed: failed.value, onRetry: load })
    },
  })
}
