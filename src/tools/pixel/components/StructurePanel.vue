<script setup lang="ts">
import { computed, ref } from 'vue'
import { McButton, McInput, McNote, McSegmented, McSwitch, McWindow, type SegOption } from '@/design/components'
import { useEditor } from '../store/editor'
import { useExporter, type BuildFormat } from '../composables/useExporter'
import type { Orientation } from '../types'

/**
 * 结构文件：命名、朝向、格式、是否填空气。
 * .nbt 超过 48 格自动分块打包成 zip；.litematic / .schem 单文件，无分块。
 */
const editor = useEditor()
const { settings } = editor
const { busy, exportBuild } = useExporter()

const format = ref<BuildFormat>('nbt')

const sizeText = computed(() =>
  settings.orient === 'wall'
    ? `${settings.n} × ${settings.n} × 1`
    : `${settings.n} × 1 × ${settings.n}`,
)

const orientOptions: SegOption[] = [
  { value: 'flat', label: '平铺地面' },
  { value: 'wall', label: '立到墙上' },
]

const formatOptions: SegOption[] = [
  { value: 'nbt', label: '.nbt', title: '原版结构方块' },
  { value: 'litematic', label: '.litematic', title: 'Litematica 全息投影' },
  { value: 'schem', label: '.schem', title: 'WorldEdit 图纸' },
]

const formatNotes: Record<BuildFormat, string> = {
  nbt: '原版结构方块加载，存档 generated/minecraft/structures/ 目录',
  litematic: 'Litematica 全息投影，生存照着铺；单文件，不用分块',
  schem: 'WorldEdit / FAWE 的 //paste，创造模式粘贴；单文件，不用分块',
}

const tiled = computed(() => format.value === 'nbt' && settings.n > 48)

function onOrient(value: string): void {
  settings.orient = value as Orientation
}

function onFormat(value: string): void {
  format.value = value as BuildFormat
}
</script>

<template>
  <McWindow title="结构文件">
    <div class="struct__size"><span>尺寸</span><b>{{ sizeText }}</b></div>

    <McInput v-model="settings.structName" placeholder="结构名" aria-label="结构名" />

    <McSegmented
      :options="orientOptions"
      :model-value="settings.orient"
      style="margin-top: var(--sp-2)"
      @update:model-value="onOrient"
    />

    <McSegmented
      :options="formatOptions"
      :model-value="format"
      :columns="3"
      dense
      style="margin-top: var(--sp-2)"
      @update:model-value="onFormat"
    />

    <McSwitch v-if="format === 'nbt'" v-model="settings.useAir" label="空格填成空气" class="struct__air" />

    <McButton variant="primary" style="margin-top: var(--sp-2)" :disabled="busy" @click="exportBuild(format)">
      {{ busy ? '打包中…' : `导出 .${format}` }}
    </McButton>

    <McNote v-if="tiled">
      超过 48 格会自动切成 {{ Math.ceil(settings.n / 48) ** 2 }} 块，打包成 zip 并附载入说明
    </McNote>
    <McNote v-else>{{ formatNotes[format] }}</McNote>
  </McWindow>
</template>

<style scoped>
.struct__size {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 3px;
  font-size: var(--fs-sm);
}

.struct__size b {
  font-size: var(--fs-body);
  color: var(--mc-ink-strong);
}

.struct__air {
  margin-top: var(--sp-2);
}
</style>
