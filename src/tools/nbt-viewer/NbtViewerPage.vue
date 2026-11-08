<script setup lang="ts">
import { computed, ref } from 'vue'
import { McButton, McDropzone, McNote, McSlider, McWindow } from '@/design/components'
import BlockSlot from '@/components/blocks/BlockSlot.vue'
import { BLOCKS_BY_ID } from '@/core/blocks'
import { STRUCT_MAX } from '@/core/nbt'
import LayerCanvas from './LayerCanvas.vue'
import { readStructureFile, type LoadedStructure } from './read-structure-file'
import { materialCounts, projectionOf } from './projection'

/**
 * 结构文件查看器。
 *
 * 是生成器导出的逆运算：把 .nbt 解回方块分布，按层看、按材料统计。
 * 也顺带能检查别人给的结构文件有没有超出结构方块的 48 格上限。
 */
const loaded = ref<LoadedStructure | null>(null)
const layer = ref(0)
const error = ref('')
const loading = ref(false)

async function onFiles(files: File[]): Promise<void> {
  const file = files[0]
  if (!file) return
  error.value = ''
  loading.value = true
  try {
    loaded.value = await readStructureFile(file)
    layer.value = 0
  } catch (e) {
    loaded.value = null
    error.value = e instanceof Error ? e.message : '解析失败，确认选的是 .nbt 结构文件'
  } finally {
    loading.value = false
  }
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
  const kb = l.fileSize / 1024
  return `${l.name} · ${kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`}`
})

function blockOf(id: string) {
  return BLOCKS_BY_ID.get(id.replace(/^minecraft:/, '')) ?? null
}

function percent(count: number): string {
  return solidBlocks.value ? `${((count / solidBlocks.value) * 100).toFixed(1)}%` : '0%'
}

function reset(): void {
  loaded.value = null
  error.value = ''
  layer.value = 0
}
</script>

<template>
  <!-- 空状态：拖入文件是主操作，就让它占据页面的中心 -->
  <div v-if="!loaded" class="viewer viewer--empty">
    <McWindow title="结构文件查看器">
      <McDropzone class="viewer__hero" accept=".nbt,application/octet-stream" :disabled="loading" @files="onFiles">
        <strong class="viewer__hero-title">{{ loading ? '解析中…' : '把 .nbt 拖进来' }}</strong>
        <small class="viewer__hero-hint">
          也可以点击选择文件 · 支持 gzip 压缩与未压缩<br />
          文件不会上传，全部在本地解析
        </small>
      </McDropzone>

      <McNote v-if="error" tone="warn">{{ error }}</McNote>

      <ol class="viewer__howto">
        <li>用生成器导出结构文件，或者拿别人的存档结构</li>
        <li>路径一般是 <code>存档/generated/minecraft/structures/*.nbt</code></li>
        <li>拖进来就能看每一层铺了什么、一共要多少料</li>
      </ol>
    </McWindow>
  </div>

  <div v-else class="viewer">
    <div class="viewer__main">
      <McWindow title="结构文件">
        <McDropzone accept=".nbt,application/octet-stream" :disabled="loading" @files="onFiles">
          <strong class="viewer__drop-title">{{ loading ? '解析中…' : '换一个 .nbt' }}</strong>
          <small class="viewer__drop-hint">拖进来或点击选择</small>
        </McDropzone>
        <McNote>{{ fileText }}</McNote>
        <McNote v-if="error" tone="warn">{{ error }}</McNote>
      </McWindow>

      <McWindow title="分层预览">
        <LayerCanvas :structure="loaded.structure" :layer="layer" />
        <McSlider
          v-if="layerCount > 1"
          v-model="layer"
          :label="`第 ${layer + 1} 层 / 共 ${layerCount} 层`"
          :min="0"
          :max="layerCount - 1"
          :step="1"
          style="margin-top: var(--sp-3)"
        />
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
            <span class="viewer__material-count">{{ m.count }}</span>
            <span class="viewer__material-pct">{{ percent(m.count) }}</span>
          </li>
        </ul>
        <McNote v-if="materials.length === 0">这个结构里没有方块</McNote>
      </McWindow>

      <McButton size="sm" @click="reset">换一个文件</McButton>
    </aside>
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

.viewer--empty {
  grid-template-columns: minmax(0, 1fr);
  max-width: 720px;
  align-content: start;
  padding-top: var(--sp-7);
}

.viewer__hero {
  padding: 44px var(--sp-4);
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
  line-height: 1.6;
  color: var(--mc-ink-soft);
}

.viewer--empty {
  grid-template-columns: minmax(0, 1fr);
  max-width: 720px;
  align-content: start;
  padding-top: var(--sp-7);
}

.viewer__hero {
  padding: 44px var(--sp-4);
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
  line-height: 1.6;
  color: var(--mc-ink-soft);
}

.viewer__main {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  min-height: 0;
  overflow-y: auto;
}

.viewer__side {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
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
  line-height: 1.5;
  color: var(--mc-ink-soft);
}

.viewer__howto {
  margin: 0;
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
  max-height: 300px;
  overflow-y: auto;
}

.viewer__material {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto 42px;
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

@media (max-width: 900px) {
  .viewer {
    grid-template-columns: 1fr;
  }
}
</style>
