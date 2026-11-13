<script setup lang="ts">
/**
 * 内置原版素材选择器（方块贴图 + 物品图标）。
 *
 * 两处共用：像素画、地图画生成器的「使用内置素材」按钮。清单来自
 * core/texture-catalog.ts，以素材目录里的 PNG 为准；选中后交给 core 取
 * 左上角第一帧，再送进生成器。物品图标带透明背景，原样保留 alpha。
 *
 * 两千多张不能一次渲染进 DOM，所以按筛选结果分页「加载更多」；
 * 缩略图 <img loading="lazy">，滚到附近才真正请求贴图。
 */
import { computed, ref, watch } from 'vue'
import {
  McButton,
  McInput,
  McModal,
  McNote,
  McSegmented,
  type SegOption,
} from '@/design/components'
import TextureThumb from '@/components/blocks/TextureThumb.vue'
import type { SquareImage } from '@/core/image'
import {
  BUILTIN_TEXTURES,
  countBuiltinTextures,
  familiesFor,
  filterBuiltinTextures,
  loadBuiltinTexture,
  type BuiltinTexture,
  type TextureFilterKind,
} from '@/core/texture-source'

const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ confirm: [image: SquareImage] }>()

const KINDS: SegOption[] = [
  { value: 'all', label: '全部', title: '方块贴图与物品图标一起找' },
  { value: 'block', label: '方块贴图', title: '原版方块贴图，含多面与动画帧' },
  { value: 'item', label: '物品图标', title: '物品 / 成就图标，透明背景会保留' },
]
const PAGE = 120

const kind = ref<string>('all')
const query = ref('')
const family = ref('全部')
const shown = ref(PAGE)
const busy = ref('')
const error = ref('')

const kindFilter = computed<TextureFilterKind>(() =>
  kind.value === 'block' || kind.value === 'item' ? kind.value : 'all',
)
const families = computed(() => familiesFor(kindFilter.value))
const list = computed(() =>
  filterBuiltinTextures(BUILTIN_TEXTURES, query.value, family.value, shown.value, kindFilter.value),
)
const total = computed(() =>
  countBuiltinTextures(BUILTIN_TEXTURES, query.value, family.value, kindFilter.value),
)
const blockCount = BUILTIN_TEXTURES.filter((t) => t.kind === 'block').length
const itemCount = BUILTIN_TEXTURES.length - blockCount

watch([kind, query, family], () => {
  shown.value = PAGE
})

/* 关掉再打开时清掉上次的搜索词，否则会停在「只剩一条结果」的状态；
   素材种类与分组是有意保留的，连续挑同一类图标更省事。 */
watch(open, (isOpen) => {
  if (!isOpen) return
  query.value = ''
  shown.value = PAGE
  error.value = ''
})

function loadMore(): void {
  shown.value = Math.min(shown.value + PAGE, total.value)
}

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
  <McModal v-model="open" title="使用内置素材" width="880px">
    <div class="bt">
      <p class="bt__hint">
        挑一张原版方块贴图或物品图标当源图，选中后直接生成。长条堆叠贴图（动画帧 / 多个面）只取最开始的
        1:1 第一帧；物品图标的透明背景会保留 —— 像素画留空格，地图画按「背景」设置处理。
      </p>

      <div class="bt__filters">
        <div class="bt__tabs">
          <McSegmented v-model="kind" :options="KINDS" :columns="3" dense aria-label="素材种类" />
        </div>
        <McInput v-model="query" type="search" placeholder="搜索中文名 / 英文名 / 贴图名" aria-label="搜索内置素材" />
        <select v-model="family" class="bt__select" aria-label="按分组筛选">
          <option>全部</option>
          <option v-for="f in families" :key="f" :value="f">{{ f }}</option>
        </select>
        <span class="bt__count">{{ total }} 张</span>
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
            <TextureThumb :tex="item.tex" :alt="item.label" />
          </span>
          <span class="bt__label">{{ item.label }}</span>
          <small class="bt__tex">{{ item.tex }}</small>
        </button>
      </div>
      <McNote v-else>没有匹配的素材，换个关键词或切到「全部」试试</McNote>

      <div v-if="shown < total" class="bt__more">
        <McButton size="sm" @click="loadMore">还有 {{ total - shown }} 张 · 加载更多</McButton>
      </div>
      <McNote v-if="error" tone="warn">{{ error }}</McNote>
    </div>

    <template #footer>
      <span class="bt__foot-note">
        共 {{ BUILTIN_TEXTURES.length }} 张内置素材 · 方块 {{ blockCount }} · 物品图标 {{ itemCount }}
      </span>
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
  flex-wrap: wrap;
}

.bt__tabs {
  flex: 0 0 264px;
  max-width: 100%;
}

/* 分段控件默认 dense 是 10.5px 白字压在 #8b8b8b 上，弹层里太小也太灰；
   只把未选中项加深底色、字号提到 12px，选中态仍用组件自己的绿。 */
.bt__tabs :deep(.mc-seg__item:not(.is-on)) {
  font-size: 12px;
  background: #6b6b6b;
}

.bt__filters > :nth-child(2) {
  flex: 1 1 200px;
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
  /* 棋盘底：物品图标大多是透明背景，衬一下才看得清轮廓 */
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

.bt__more {
  display: flex;
  justify-content: center;
}

.bt__foot-note {
  margin-right: auto;
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}

@media (max-width: 640px) {
  .bt__tabs {
    flex: 1 1 100%;
  }

  .bt__filters > :nth-child(2) {
    flex: 1 1 100%;
  }
}
</style>
