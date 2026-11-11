/* ============================================================
   首页施工动画的 Vue 粘合层
   ------------------------------------------------------------
   引擎本身不认 Vue（在 src/design/builder 里），这里只负责三件事：
   找到容器与画布、跟着「动效 / 速度」偏好起停与调速、卸载时还原。

   用选择器而不是模板 ref：首页是单例组件，两个节点就写在
   HomePage.vue 里，选择器紧挨着标记反而比 ref 转发更少一层胶水。
   ============================================================ */

import { onBeforeUnmount, onMounted, watch } from 'vue'
import {
  COMPACT_CURSORS,
  HOME_CURSORS,
  createPageBuilder,
  type PageBuilder,
} from '@/design/builder'
import { SPEED_SCALE, initPrefs, prefs } from './prefs'

const SURFACE = '.home'
const CANVAS = '.home-cursors'

export function useHomeBuilder(): void {
  let handle: PageBuilder | null = null
  let cleanups: Array<() => void> = []

  function compact(): boolean {
    return window.matchMedia('(max-width: 860px)').matches
  }

  function bindInterrupts(): void {
    const onPointerDown = (event: Event) => {
      // 开关自己要能点，别被跳过逻辑吃掉
      const target = event.target as Element | null
      if (target?.closest?.('.mc-settings')) return
      handle?.skip()
    }
    // 只认点击：滚动不打断，动画按自己的节奏走完
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
    cleanups.push(() => document.removeEventListener('pointerdown', onPointerDown, { capture: true }))
  }

  function stop(): void {
    for (const off of cleanups.splice(0)) off()
    handle?.destroy()
    handle = null
  }

  function start(): void {
    const surface = document.querySelector<HTMLElement>(SURFACE)
    const canvas = document.querySelector<HTMLCanvasElement>(CANVAS)
    if (!surface || !canvas) return
    stop()
    handle = createPageBuilder({
      surface,
      canvas,
      cursors: compact() ? COMPACT_CURSORS : HOME_CURSORS,
      speed: SPEED_SCALE[prefs.speed],
    })
    handle.start()
    bindInterrupts()
  }

  onMounted(() => {
    initPrefs()
    if (prefs.motion) start()
  })

  watch(
    () => prefs.motion,
    (on) => {
      if (on) start()
      else stop()
    },
  )

  // 改速度不重启动画：进度按秒推进，直接换算成新倍率即可
  watch(
    () => prefs.speed,
    (next) => handle?.setSpeed(SPEED_SCALE[next]),
  )

  onBeforeUnmount(stop)
}
