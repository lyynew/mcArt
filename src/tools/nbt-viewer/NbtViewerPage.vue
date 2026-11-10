<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { McButton, McDropzone, McNote, McSlider, McWindow } from '@/design/components'
import BlockSlot from '@/components/blocks/BlockSlot.vue'
import { BLOCKS_BY_ID } from '@/core/blocks'
import { STRUCT_MAX } from '@/core/nbt'
import LayerCanvas from './LayerCanvas.vue'
import { FORMAT_LABEL, readStructureFile, type LoadedStructure } from './read-structure-file'
import { denseLayerOf, materialCounts, projectionOf } from './projection'
import { demoStructure } from './demo-structure'

/**
 * 结构文件查看器。
 *
 * 是生成器导出的逆运算：把 .nbt / .litematic / .schem 解回方块分布，按层看、按材料统计。
 * 也顺带能检查别人给的结构文件有没有超出结构方块的 48 格上限。
 *
 * 站内是整屏的，所以这一页有三个「满屏」的处理：
 * 空状态垂直居中、整页都能接住拖进来的文件、载入后预览窗吃掉剩余高度。
 */
const loaded = ref<LoadedStructure | null>(null)
const layer = ref(0)
const error = ref('')
const loading = ref(false)
/** 有文件悬停在窗口上，显示整页的接住提示 */
const dragging = ref(false)

async function apply(next: LoadedStructure): Promise<void> {
  loaded.value = next
  // 默认停在方块最多的那层：第 0 层常常是空的，容易让人以为解析失败
  layer.value = denseLayerOf(next.structure, projectionOf(next.structure.size))
}

async function onFiles(files: File[]): Promise<void> {
  const file = files[0]
  if (!file) return
  error.value = ''
  loading.value = true
  try {
    await apply(await readStructureFile(file))
  } catch (e) {
    loaded.value = null
    error.value = e instanceof Error ? e.message : '解析失败，确认是 .nbt / .litematic / .schem 结构文件'
  } finally {
    loading.value = false
  }
}

function loadDemo(): void {
  error.value = ''
  void apply(demoStructure())
}

function reset(): void {
  loaded.value = null
  error.value = ''
  layer.value = 0
}

const projection = computed(() =>
  loaded.value ? projectionOf(loaded.value.structure.size) : null,
)

const layerCount = computed(() => {
  const p = projection.value
  const s = loaded.value?.structure.size
  return p && s ? s[p.axis] : 1
})

const materials = computed(() =>
  loaded.value ? materialCounts(loaded.value.structure) : [],
)

const solidBlocks = computed(() => materials.value.reduce((n, m) => n + m.count, 0))

const kinds = computed(() => materials.value.length)

const sizeText = computed(() => {
  const s = loaded.value?.structure.size
  return s ? `${s[0]} × ${s[1]} × ${s[2]}` : '—'
})

const oversize = computed(() => {
  const s = loaded.value?.structure.size
  return s ? Math.max(...s) > STRUCT_MAX : false
})

const fileText = computed(() => {
  const l = loaded.value
  if (!l) return ''
  const label = FORMAT_LABEL[l.structure.format]
  if (l.demo) return `示例结构 · 内置生成 · ${label}`
  const kb = l.fileSize / 1024
  return `${l.name} · ${label} · ${kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`}`
})

function blockOf(id: string) {
  return BLOCKS_BY_ID.get(id.replace(/^minecraft:/, '')) ?? null
}

function percent(count: number): string {
  return solidBlocks.value ? `${((count / solidBlocks.value) * 100).toFixed(1)}%` : '0%'
}

function step(delta: number): void {
  const max = layerCount.value - 1
  layer.value = Math.min(max, Math.max(0, layer.value + delta))
}

/** 滑杆上显示 1 起的层号，跟「第 x / 共 N 层」的说法对齐；
 *  内部仍按 0 起的下标走，投影那边是这么用的。 */
const layerDisplay = computed({
  get: () => layer.value + 1,
  set: (v: number) => {
    layer.value = Math.min(layerCount.value, Math.max(1, v)) - 1
  },
})

/* —— 整页拖放 ——
   只接文件（拖着文字选词不算）。拖到 McDropzone 上时它自己会 preventDefault，
   这里看到 defaultPrevented 就退让，避免同一个文件被解析两遍。 */
let dragDepth = 0

function hasFiles(e: DragEvent): boolean {
  const types = e.dataTransfer?.types
  return types ? Array.from(types).includes('Files') : false
}

function onDragEnter(e: DragEvent): void {
  if (!hasFiles(e)) return
  dragDepth += 1
  dragging.value = true
}

function onDragOver(e: DragEvent): void {
  if (!hasFiles(e)) return
  // 不阻止默认行为，浏览器就不允许放置
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

function onDragLeave(e: DragEvent): void {
  // 离开窗口时某些浏览器拿不到 types，不能拿 hasFiles 当条件，
  // 否则浮层会停在屏幕上不消失
  if (!dragging.value) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0 || e.relatedTarget === null) {
    dragDepth = 0
    dragging.value = false
  }
}

function onDrop(e: DragEvent): void {
  if (!hasFiles(e)) return
  dragDepth = 0
  dragging.value = false
  if (e.defaultPrevented) return
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) void onFiles([file])
}

/* —— 键盘切层 ——
   只接左右与翻页键：上下键留给滚动，别和页面抢。 */
function onKeydown(e: KeyboardEvent): void {
  if (!loaded.value || layerCount.value <= 1) return
  const el = e.target as HTMLElement | null
  const tag = el?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return

  if (e.key === 'Home') {
    e.preventDefault()
    layer.value = 0
    return
  }
  if (e.key === 'End') {
    e.preventDefault()
    layer.value = layerCount.value - 1
    return
  }

  if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'PageDown') step(-10)
  else if (e.key === 'PageUp') step(10)
  else return

  e.preventDefault()
}

onMounted(() => {
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="viewer" :class="{ 'viewer--empty': !loaded }">
    <!-- 文件悬停时的整页提示：拖到哪儿都能接住 -->
    <div v-if="dragging" class="viewer__overlay">
      <div class="viewer__overlay-box">
        <strong>松手即可解析</strong>
        <small>.nbt / .litematic / .schem · 本地解析，不上传</small>
      </div>
    </div>

    <!-- 空状态：拖入是主操作，让它居中占据整屏 -->
    <McWindow v-if="!loaded" title="结构文件查看器" class="viewer__empty-win">
      <McDropzone
        class="viewer__hero"
        accept=".nbt,.litematic,.schem,application/octet-stream"
        :disabled="loading"
        @files="onFiles"
      >
        <strong class="viewer__hero-title">{{ loading ? '解析中…' : '把结构文件拖进来' }}</strong>
        <small class="viewer__hero-hint">
          点击选择文件，或者直接拖到页面任意位置<br />
          支持 .nbt / .litematic / .schem，gzip 与未压缩都行 · 文件不会上传，全部在本地解析
        </small>
      </McDropzone>

      <McNote v-if="error" tone="warn">{{ error }}</McNote>

      <div class="viewer__demo">
        <McButton class="viewer__demo-btn" size="sm" :disabled="loading" @click="loadDemo">
          先看个示例结构
        </McButton>
        <span class="viewer__demo-hint">32×32 × 16 层的石制金字塔，能试分层与材料统计</span>
      </div>

      <ol class="viewer__howto">
        <li>用生成器导出结构文件，或者拿别人分享的 .nbt / .litematic / .schem</li>
        <li>放哪都行：.nbt 在存档 <code>generated/minecraft/structures/</code>，.litematic 在 <code>.minecraft/schematics</code>，.schem 在 <code>worldedit/schematics</code></li>
        <li>拖进来就能看每一层铺了什么、一共要多少料</li>
      </ol>
    </McWindow>

    <template v-else>
      <div class="viewer__main">
        <McWindow title="文件">
          <McDropzone
            accept=".nbt,.litematic,.schem,application/octet-stream"
            :disabled="loading"
            @files="onFiles"
          >
            <strong class="viewer__drop-title">{{ loading ? '解析中…' : '换一个结构文件' }}</strong>
            <small class="viewer__drop-hint">拖进来或点击选择</small>
          </McDropzone>
          <McNote>{{ fileText }}</McNote>
          <McNote v-if="error" tone="warn">{{ error }}</McNote>
        </McWindow>

        <McWindow title="分层预览" flush class="viewer__preview">
          <div class="viewer__stage">
            <LayerCanvas :structure="loaded.structure" :layer="layer" />
          </div>

          <div v-if="layerCount > 1" class="viewer__layers">
            <McSlider
              v-model="layerDisplay"
              label="当前层"
              suffix=" 层"
              :min="1"
              :max="layerCount"
              :step="1"
            />
            <div class="viewer__layer-row">
              <McButton
                size="sm"
                :disabled="layer === 0"
                title="前一层（←）"
                aria-label="前一层"
                @click="step(-1)"
              >
                ‹
              </McButton>
              <span class="viewer__layer-total">第 {{ layer + 1 }} / {{ layerCount }} 层</span>
              <span class="viewer__layer-hint">← → 切换 · PgUp / PgDn 跳十层</span>
              <McButton
                size="sm"
                :disabled="layer === layerCount - 1"
                title="后一层（→）"
                aria-label="后一层"
                @click="step(1)"
              >
                ›
              </McButton>
            </div>
          </div>
        </McWindow>
      </div>

      <aside class="viewer__side">
        <McWindow title="概览">
          <dl class="viewer__stat">
            <dt>尺寸</dt>
            <dd>{{ sizeText }}</dd>
            <dt>方块</dt>
            <dd>{{ solidBlocks.toLocaleString('zh-CN') }} 块</dd>
            <dt>种类</dt>
            <dd>{{ kinds }} 种</dd>
            <dt>数据版本</dt>
            <dd>{{ loaded.structure.dataVersion }}</dd>
          </dl>
          <McNote v-if="oversize" tone="warn">
            尺寸超过 {{ STRUCT_MAX }} 格，结构方块一次加载不了，需要分块
          </McNote>
        </McWindow>

        <McWindow title="材料清单">
          <ul class="viewer__materials">
            <li v-for="m in materials" :key="m.id" class="viewer__material">
              <BlockSlot :block="blockOf(m.id)" :size="0" class="viewer__material-slot" />
              <span class="viewer__material-name">{{ blockOf(m.id)?.zh ?? m.id }}</span>
              <span class="viewer__material-count">{{ m.count.toLocaleString('zh-CN') }}</span>
              <span class="viewer__material-pct">{{ percent(m.count) }}</span>
            </li>
          </ul>
          <McNote v-if="materials.length === 0">这个结构里没有方块</McNote>
        </McWindow>

        <McButton size="sm" @click="reset">换一个文件</McButton>
      </aside>
    </template>
  </div>
</template>

<style scoped>
.viewer {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: var(--sp-5);
  padding: var(--sp-5) 14px 14px;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}

/* —— 空状态：整屏居中，一块接住文件的板子 —— */
.viewer--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-6);
}

.viewer__empty-win {
  width: min(760px, 100%);
}

.viewer__hero {
  padding: 52px var(--sp-4);
  text-align: center;
}

.viewer__hero-title {
  display: block;
  font-size: 15px;
  margin-bottom: var(--sp-2);
}

.viewer__hero-hint {
  display: block;
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--mc-ink-soft);
}

.viewer__demo {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}

/* 按钮是 flex 项，默认会被压到比文字还窄，标签就溢出到框外面了 */
.viewer__demo-btn {
  flex: 0 0 auto;
}

.viewer__demo-hint {
  font-size: var(--fs-note);
  line-height: 1.5;
  color: var(--mc-ink-soft);
}

.viewer__howto {
  margin: var(--sp-2) 0 0;
  padding-left: 18px;
  font-size: var(--fs-sm);
  line-height: 1.8;
  color: var(--mc-ink-soft);
}

.viewer__howto code {
  font-family: var(--font-mc);
  font-size: var(--fs-note);
  color: var(--mc-ink-strong);
  overflow-wrap: anywhere;
}

/* —— 整页拖放提示 —— */
.viewer__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  pointer-events: none;
  background: rgb(12 11 8 / 62%);
  backdrop-filter: blur(2px);
}

.viewer__overlay-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: 28px 40px;
  color: var(--mc-text);
  background: var(--mc-bg);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-bar-top),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 #14120d,
    var(--mc-shadow-modal);
}

.viewer__overlay-box strong {
  font-size: 16px;
  letter-spacing: 0.06em;
}

.viewer__overlay-box small {
  font-size: var(--fs-sm);
  color: var(--mc-text-dim);
}

/* —— 载入后：左预览右清单，各自吃满高度 —— */
.viewer__main {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}

.viewer__preview {
  flex: 1 1 auto;
  min-height: 0;
}

.viewer__stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  padding: var(--sp-3);
}

.viewer__layers {
  padding: 0 var(--sp-3) var(--sp-3);
}

.viewer__layer-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-1);
}

.viewer__layer-total {
  font-size: var(--fs-note);
  color: var(--mc-ink-strong);
  white-space: nowrap;
}

.viewer__layer-hint {
  margin-left: auto;
  font-size: var(--fs-micro);
  color: var(--mc-ink-soft);
  white-space: nowrap;
}

/* 触屏没有方向键，这条提示只会误导 */
@media (pointer: coarse) {
  .viewer__layer-hint {
    display: none;
  }
}

.viewer__side {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}

.viewer__side > * {
  flex: 0 0 auto;
}

.viewer__drop-title {
  display: block;
  font-size: 12.5px;
  margin-bottom: 3px;
}

.viewer__drop-hint {
  display: block;
  font-size: var(--fs-sm);
  color: var(--mc-ink-soft);
}

.viewer__stat {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 4px var(--sp-2);
  margin: 0;
  font-size: var(--fs-sm);
}

.viewer__stat dt {
  color: var(--mc-ink-soft);
}

.viewer__stat dd {
  margin: 0;
  color: var(--mc-ink-strong);
}

.viewer__materials {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.viewer__material {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto 44px;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-note);
}

.viewer__material-slot {
  width: 20px;
  height: 20px;
}

.viewer__material-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--mc-ink);
}

.viewer__material-count {
  color: var(--mc-ink-strong);
}

.viewer__material-pct {
  text-align: right;
  color: var(--mc-ink-soft);
}

/* —— 窄屏：单列，按内容撑高，滚动交给外层容器（和生成器同一条规则） —— */
@media (max-width: 900px) {
  .viewer {
    grid-template-columns: minmax(0, 1fr);
    flex: 0 0 auto;
    height: auto;
    grid-auto-rows: max-content;
    align-content: start;
  }

  .viewer--empty {
    display: flex;
    min-height: 100%;
  }

  .viewer__main,
  .viewer__side {
    overflow: visible;
  }

  .viewer__preview {
    min-height: 70svh;
  }

  /* 窄屏放不下这行快捷键说明，挤着反而把整行撑出屏幕 */
  .viewer__layer-hint {
    display: none;
  }
}
</style>
