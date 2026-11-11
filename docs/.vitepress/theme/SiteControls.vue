<script setup lang="ts">
/**
 * 导航栏右侧的设置入口：一个图标按钮 + 弹出面板。
 *
 * 面板里三件事：动效开关、夜间开关、动画速度。
 * 速度滑杆按参考图做成胶囊轨道 + 白色圆钮：轨道左侧是「已选区间」的
 * 深色渐变，钮跟手走，松手吸附到最近的一档（只有三档，不做连续值）。
 *
 * ready 的作用：SSR 拿不到用户偏好，先按默认渲染，挂载后再读 DOM 上的
 * 真实状态，服务端与客户端首帧才一致。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  SPEED_LABEL,
  SPEED_ORDER,
  SPEED_SCALE,
  initPrefs,
  prefs,
  resetPrefs,
  setMotion,
  setMotionSpeed,
  toggleAppearance,
} from './prefs'

const ready = ref(false)
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const dragging = ref(false)

const motionOn = computed(() => ready.value && prefs.motion)
const darkOn = computed(() => ready.value && prefs.appearance === 'dark')

const speedIndex = computed(() => Math.max(0, SPEED_ORDER.indexOf(prefs.speed)))
const speedText = computed(() => `${SPEED_SCALE[prefs.speed].toFixed(2)}×`)
const speedLabel = computed(() => SPEED_LABEL[prefs.speed])
const percent = computed(() => (speedIndex.value / (SPEED_ORDER.length - 1)) * 100)

function setFromClientX(clientX: number): void {
  const el = track.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0) return
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  const index = Math.round(ratio * (SPEED_ORDER.length - 1))
  setMotionSpeed(SPEED_ORDER[index])
}

function moveStep(delta: number): void {
  const next = Math.min(SPEED_ORDER.length - 1, Math.max(0, speedIndex.value + delta))
  setMotionSpeed(SPEED_ORDER[next])
}

function onTrackDown(event: PointerEvent): void {
  dragging.value = true
  try {
    track.value?.setPointerCapture(event.pointerId)
  } catch {
    // 合成事件没有活动指针，捕获失败不影响后面的点击定位
  }
  setFromClientX(event.clientX)
}

function onTrackMove(event: PointerEvent): void {
  if (dragging.value) setFromClientX(event.clientX)
}

function onTrackUp(event: PointerEvent): void {
  dragging.value = false
  try {
    track.value?.releasePointerCapture(event.pointerId)
  } catch {
    // 同上
  }
}

function onTrackKey(event: KeyboardEvent): void {
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    event.preventDefault()
    moveStep(1)
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    event.preventDefault()
    moveStep(-1)
  }
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!open.value) return
  if (root.value && !event.composedPath().includes(root.value)) open.value = false
}

function onDocumentKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) open.value = false
}

onMounted(() => {
  initPrefs()
  ready.value = true
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('keydown', onDocumentKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentKey)
})
</script>

<template>
  <div ref="root" class="mc-settings">
    <button
      type="button"
      class="mc-settings__trigger"
      :aria-expanded="open"
      aria-haspopup="dialog"
      aria-label="显示设置"
      title="显示设置"
      @click="open = !open"
    >
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
        <g fill="currentColor">
          <rect x="0" y="2" width="14" height="1.5" />
          <rect x="0" y="6.25" width="14" height="1.5" />
          <rect x="0" y="10.5" width="14" height="1.5" />
          <rect x="3" y="0.75" width="2" height="4" />
          <rect x="9" y="5" width="2" height="4" />
          <rect x="5" y="9.25" width="2" height="4" />
        </g>
      </svg>
      <span class="mc-settings__dot" :data-on="motionOn" aria-hidden="true" />
    </button>

    <div v-if="open" class="mc-settings__panel" role="dialog" aria-label="显示设置">
      <button
        type="button"
        class="mc-row"
        role="switch"
        :aria-checked="motionOn"
        @click="setMotion(!prefs.motion)"
      >
        <span class="mc-row__label">动效</span>
        <span class="mc-row__hint">首页施工与背景</span>
        <span class="mc-switch" :data-on="motionOn" aria-hidden="true"><i /></span>
      </button>

      <button
        type="button"
        class="mc-row"
        role="switch"
        :aria-checked="darkOn"
        @click="toggleAppearance()"
      >
        <span class="mc-row__label">夜间</span>
        <span class="mc-row__hint">深色阅读</span>
        <span class="mc-switch" :data-on="darkOn" aria-hidden="true"><i /></span>
      </button>

      <div class="mc-divider" />

      <div class="mc-speed">
        <div class="mc-speed__head">
          <span class="mc-speed__title">动画速度</span>
          <b class="mc-speed__value">{{ speedText }}</b>
        </div>
        <div
          ref="track"
          class="mc-speed__track"
          role="slider"
          tabindex="0"
          aria-label="动画速度"
          aria-valuemin="0"
          aria-valuemax="2"
          :aria-valuenow="speedIndex"
          :aria-valuetext="speedLabel"
          @pointerdown="onTrackDown"
          @pointermove="onTrackMove"
          @pointerup="onTrackUp"
          @pointercancel="onTrackUp"
          @keydown="onTrackKey"
        >
          <span
            class="mc-speed__fill"
            :style="{ width: percent >= 100 ? '100%' : `calc(${percent}% + 4px)` }"
          />
          <span class="mc-speed__cap" :style="{ left: `calc(${percent}% + 3px)` }" />
          <span class="mc-speed__thumb" :style="{ left: `calc(${percent}%)` }" />
        </div>
        <div class="mc-speed__labels" aria-hidden="true">
          <span>舒缓</span><span>正常</span><span>快速</span>
        </div>
      </div>

      <div class="mc-divider" />

      <div class="mc-settings__foot">
        <span>仅此浏览器</span>
        <button type="button" class="mc-reset" @click="resetPrefs()">
          <span aria-hidden="true">↺</span> 恢复默认
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mc-settings {
  position: relative;
  margin-left: 8px;
}

.mc-settings__trigger {
  position: relative;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 0;
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s;
}

.mc-settings__trigger:hover {
  color: var(--ink);
  border-color: var(--green);
}

.mc-settings__trigger:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}

/* 右下角一颗小灯：一眼看出动效是否开着，不用打开面板 */
.mc-settings__dot {
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 4px;
  height: 4px;
  background: transparent;
}

.mc-settings__dot[data-on='true'] {
  background: var(--green);
}

.mc-settings__panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 60;
  width: 300px;
  padding: 6px 14px 10px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  box-shadow: 6px 6px 0 rgb(27 26 22 / 12%);
  color: var(--ink);
}

html.dark .mc-settings__panel {
  box-shadow: 6px 6px 0 rgb(0 0 0 / 40%);
}

.mc-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.mc-row + .mc-row {
  border-top: 1px solid var(--line);
}

.mc-row__label {
  font-size: 13px;
}

.mc-row__hint {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-3);
  text-align: right;
}

.mc-row:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}

/* 开关：方形钮在方框里滑动，和站点方角语言一致 */
.mc-switch {
  position: relative;
  display: block;
  width: 32px;
  height: 18px;
  border: 1px solid var(--line-strong);
  background: var(--paper-2);
  transition: background-color 0.14s, border-color 0.14s;
}

.mc-switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background: var(--ink-3);
  transition: transform 0.14s, background-color 0.14s;
}

.mc-switch[data-on='true'] {
  border-color: var(--green);
  background: var(--green-soft);
}

.mc-switch[data-on='true'] i {
  transform: translateX(14px);
  background: var(--green);
}

.mc-divider {
  height: 1px;
  margin: 4px 0;
  background: var(--line);
}

/* —— 速度滑杆：胶囊轨道 + 白色圆钮 —— */
.mc-speed {
  padding: 12px 0 6px;
}

.mc-speed__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}

.mc-speed__title {
  font-size: 13px;
}

.mc-speed__value {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.mc-speed__track {
  position: relative;
  height: 9px;
  /* 留出圆钮的一半，拉到两端时钮才不会顶出面板 */
  margin: 0 10px;
  border-radius: 999px;
  background: var(--paper-2);
  box-shadow: inset 0 0 0 1px var(--line);
  cursor: pointer;
  touch-action: none;
}

.mc-speed__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--ink) 0%, var(--ink-3) 100%);
  opacity: 0.85;
}

/* 轨道末端的小圆点：参考图里的收尾标记 */
.mc-speed__cap {
  position: absolute;
  top: 50%;
  width: 3px;
  height: 3px;
  margin: -1.5px 0 0 -1.5px;
  border-radius: 999px;
  background: var(--ink-3);
  opacity: 0.5;
}

.mc-speed__thumb {
  position: absolute;
  top: 50%;
  width: 21px;
  height: 21px;
  margin: -10.5px 0 0 -10.5px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 22%), 0 0 0 1px rgb(0 0 0 / 6%);
  transition: left 0.14s ease;
  pointer-events: none;
}

.mc-speed__track:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 6px;
}

.mc-speed__labels {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-3);
}

.mc-settings__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-3);
}

.mc-reset {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: var(--ink-2);
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
}

.mc-reset:hover {
  color: var(--green);
}

@media (max-width: 480px) {
  .mc-settings__panel {
    width: min(300px, calc(100vw - 28px));
  }
}
</style>
