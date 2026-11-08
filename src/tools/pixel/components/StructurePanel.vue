<script setup lang="ts">
import { computed } from 'vue'
import { McButton, McInput, McNote, McSegmented, McSwitch, McWindow, type SegOption } from '@/design/components'
import { useEditor } from '../store/editor'
import { useExporter } from '../composables/useExporter'
import type { Orientation } from '../types'

/**
 * 结构文件：命名、朝向、是否填空气、导出 .nbt。
 * 画幅超过 48 格时会自动分块并打包成 zip，说明写在包内。
 */
const editor = useEditor()
const { settings } = editor
const { busy, exportStructure } = useExporter()

const sizeText = computed(() =>
  settings.orient === 'wall'
    ? `${settings.n} × ${settings.n} × 1`
    : `${settings.n} × 1 × ${settings.n}`,
)

const orientOptions: SegOption[] = [
  { value: 'flat', label: '平铺地面' },
  { value: 'wall', label: '立到墙上' },
]

const tiled = computed(() => settings.n > 48)

function onOrient(value: string): void {
  settings.orient = value as Orientation
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

    <McSwitch v-model="settings.useAir" label="空格填成空气" class="struct__air" />

    <McButton variant="primary" style="margin-top: var(--sp-2)" :disabled="busy" @click="exportStructure">
      {{ busy ? '打包中…' : '导出 .nbt' }}
    </McButton>

    <McNote v-if="tiled">
      超过 48 格会自动切成 {{ Math.ceil(settings.n / 48) ** 2 }} 块，打包成 zip 并附载入说明
    </McNote>
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
