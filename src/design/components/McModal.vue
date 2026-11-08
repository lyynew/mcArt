<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * 模态窗口：暗色斜纹遮罩 + 游戏内 GUI 窗面板。
 * 打开时锁页面滚动、接管 Esc、把焦点移到面板上，
 * 关闭后焦点还给触发元素（浏览器默认行为即可覆盖大多数情况）。
 */
const open = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    title?: string
    /** CSS 宽度，默认贴近旧版的 min(880px, 100%) */
    width?: string
    closeOnEsc?: boolean
  }>(),
  { title: undefined, width: '880px', closeOnEsc: true },
)

const panel = ref<HTMLElement | null>(null)

function close() {
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.closeOnEsc) {
    e.stopPropagation()
    close()
  }
}

watch(open, async (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
  if (isOpen) {
    window.addEventListener('keydown', onKeydown)
    await nextTick()
    panel.value?.focus()
  } else {
    window.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="mc-modal" @click.self="close">
      <div
        ref="panel"
        class="mc-modal__panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        :style="{ width: `min(${width}, 100%)` }"
        tabindex="-1"
      >
        <header class="mc-modal__head">
          <h2 v-if="title" class="mc-modal__title">{{ title }}</h2>
          <button type="button" class="mc-modal__close" title="关闭（Esc）" @click="close">
            ✕
          </button>
        </header>
        <div class="mc-modal__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="mc-modal__foot">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mc-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-7);
  background: rgb(12 11 8 / 72%);
  background-image: repeating-linear-gradient(
    45deg,
    rgb(0 0 0 / 25%) 0 4px,
    transparent 4px 8px
  );
}

.mc-modal__panel {
  display: flex;
  flex-direction: column;
  max-height: 100%;
  padding: var(--sp-4);
  background: var(--mc-panel);
  border: var(--mc-bd) solid #000;
  color: var(--mc-ink);
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-panel-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-panel-lo),
    var(--mc-shadow-modal);
  outline: none;
}

.mc-modal__head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.mc-modal__title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-title);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3b3b3b;
  text-shadow: var(--mc-ts-light);
}

.mc-modal__title::before {
  content: "";
  width: 7px;
  height: 7px;
  background: var(--mc-accent);
  border: 1px solid #2b2b2b;
  box-shadow: 0 0 0 1px #efefef;
}

.mc-modal__close {
  margin-left: auto;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  background: var(--mc-btn);
  color: #fff;
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-btn-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-btn-lo);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}

.mc-modal__close:hover {
  background: var(--mc-btn-hover);
}

.mc-modal__body {
  flex: 1;
  min-height: 120px;
  overflow-y: auto;
}

.mc-modal__foot {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-top: var(--sp-4);
}
</style>
