<script setup lang="ts">
/**
 * 内置原版材质选择器。
 *
 * 把方块图鉴里的原版贴图直接当源图用：选中后交给 core 取左上角第一帧，
 * 再送进像素画 / 地图画生成器。长条堆叠贴图（水、岩浆、火之类）在列表里
 * 也按第一帧显示（object-fit: cover + object-position: left top），
 * 和方块图鉴、画布上的取帧规则是同一套。
 */
import { computed, ref } from 'vue'
import { McButton, McInput, McModal, McNote } from '@/design/components'
import type { SquareImage } from '@/core/image'
import {
  BUILTIN_FAMILIES,
  BUILTIN_TEXTURES,
  countBuiltinTextures,
  filterBuiltinTextures,
  loadBuiltinTexture,
  type BuiltinTexture,
} from '@/core/texture-source'

const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ confirm: [image: SquareImage] }>()

const query = ref('')
const family = ref('全部')
const busy = ref('')
const error = ref('')

const list = computed(() => filterBuiltinTextures(BUILTIN_TEXTURES, query.value, family.value))
const total = computed(() => countBuiltinTextures(BUILTIN_TEXTURES, query.value, family.value))

async function pick(item: BuiltinTexture): Promise<void> {
  if (busy.value) return
  busy.value = item.tex
  error.value = ''
  try {
    const image = await loadBuiltinTexture(item)
    emit('confirm', image)
    open.value = false
  } catch (e) {
    error.value = e instanceof Error ? `读图失败：${e.message}` : '读图失败'
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <McModal v-model="open" title="使用内置方块图片" width="880px">
    <div class="bt">
      <p class="bt__hint">
        挑一张原版材质当源图。长条堆叠贴图（动画帧 / 多个面）只取最开始的 1:1 第一帧。
      </p>

      <div class="bt__filters">
        <McInput v-model="query" type="search" placeholder="搜索中文名 / 英文名 / 贴图名" aria-label="搜索方块贴图" />
        <select v-model="family" class="bt__select" aria-label="按分组筛选">
          <option>全部</option>
          <option v-for="f in BUILTIN_FAMILIES" :key="f" :value="f">{{ f }}</option>
        </select>
        <span class="bt__count">{{ total }} 张{{ total > list.length ? ` · 显示前 ${list.length} 张` : '' }}</span>
      </div>

      <div v-if="list.length" class="bt__grid">
        <button
          v-for="item in list"
          :key="item.tex"
          type="button"
          class="bt__item"
          :class="{ 'bt__item--busy': busy === item.tex }"
          :title="`${item.label} · ${item.tex}.png`"
          :disabled="Boolean(busy)"
          @click="pick(item)"
        >
          <span class="bt__thumb">
            <img :src="item.url" :alt="item.label" loading="lazy" />
          </span>
          <span class="bt__label">{{ item.label }}</span>
          <small class="bt__tex">{{ item.tex }}</small>
        </button>
      </div>
      <McNote v-else>没有匹配的贴图，换个关键词试试</McNote>
      <McNote v-if="error" tone="warn">{{ error }}</McNote>
    </div>

    <template #footer>
      <span class="bt__foot-note">共 {{ BUILTIN_TEXTURES.length }} 张内置原版材质</span>
      <McButton size="sm" @click="open = false">取消</McButton>
    </template>
  </McModal>
</template>

<style scoped>
.bt {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.bt__hint {
  font-size: var(--fs-sm);
  color: var(--mc-ink-soft);
  line-height: 1.6;
}

.bt__filters {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.bt__filters > :first-child {
  flex: 1;
  min-width: 0;
}

.bt__select {
  max-width: 150px;
  padding: var(--sp-2) var(--sp-3);
  font: inherit;
  font-size: var(--fs-sm);
  color: #fff;
  background: var(--mc-btn);
  border: var(--mc-bd) solid #000;
}

.bt__count {
  flex: 0 0 auto;
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}

.bt__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--sp-2);
  max-height: 420px;
  overflow-y: auto;
  padding: var(--sp-2);
  background: var(--mc-plate);
  border: var(--mc-bd) solid #000;
  box-shadow: inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo);
}

.bt__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;
  padding: var(--sp-2);
  font: inherit;
  color: var(--mc-ink-strong);
  background: var(--mc-panel);
  border: var(--mc-bd) solid #000;
  box-shadow: inset var(--mc-bv) var(--mc-bv) 0 var(--mc-panel-hi);
  cursor: pointer;
}

.bt__item:hover:not(:disabled) {
  background: var(--mc-panel-hi);
  outline: 2px solid var(--mc-accent);
  outline-offset: -2px;
}

.bt__item:disabled {
  opacity: 0.7;
  cursor: progress;
}

.bt__item--busy {
  outline: 2px solid var(--mc-pick);
  outline-offset: -2px;
}

.bt__thumb {
  display: block;
  width: 48px;
  height: 48px;
  overflow: hidden;
  background: repeating-conic-gradient(#2c2c2c 0% 25%, #383838 0% 50%) 50% / 12px 12px;
  border: 1px solid #000;
}

/* 长条贴图只露左上角那一帧，和画布里的 drawTexture 取法一致 */
.bt__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: left top;
  image-rendering: pixelated;
}

.bt__label {
  display: block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: var(--fs-note);
}

.bt__tex {
  display: block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-family: var(--font-mono);
  font-size: var(--fs-micro);
  color: var(--mc-ink-soft);
}

.bt__foot-note {
  margin-right: auto;
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}
</style>
