/* Vue 粘合层：持有自己的画布 ref，跟随站点开关；系统减少动效由引擎管理。 */
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { createAmbientField, type AmbientField } from '@/design/ambient'
import { initPrefs, prefs } from './prefs'

export function useBackdrop(canvas: Ref<HTMLCanvasElement | null>): void {
  let handle: AmbientField | null = null
  let mounted = false

  function stop(): void {
    handle?.destroy()
    handle = null
  }

  function start(): void {
    if (!mounted || !canvas.value || handle) return
    // 站点开关是最终真相：用户明确开启时，系统默认的减少动效不代替用户选择。
    handle = createAmbientField(canvas.value, { honorReducedMotion: false })
    handle.start()
  }

  onMounted(() => {
    mounted = true
    initPrefs()
    if (prefs.motion) start()
  })

  watch(() => prefs.motion, (on) => {
    if (on) start()
    else stop()
  })

  onBeforeUnmount(() => {
    mounted = false
    stop()
  })
}
