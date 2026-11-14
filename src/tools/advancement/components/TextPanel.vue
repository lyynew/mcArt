<script setup lang="ts">
import { ref } from 'vue'
import { McInput, McNote, McWindow } from '@/design/components'
import { GLYPH_HEIGHT, TEXT_MAX_WIDTH } from '../model'
import { useAdvancement } from '../store'

/**
 * 文案面板：两行文字 + 一批现成进度文案。
 * 预设只填文字，不碰图标和配色——用户明确不要「进度类型」那一套分层预设。
 */
const { title, description, presets, applyPreset } = useAdvancement()
const presetId = ref('')

function onPreset(): void {
  if (!presetId.value) return
  applyPreset(presetId.value)
  // 让 select 回到占位项，同一条预设还能再点一次
  presetId.value = ''
}
</script>

<template>
  <McWindow title="文案">
    <div class="text-panel">
      <select v-model="presetId" class="text-panel__preset" aria-label="选用内置文案" @change="onPreset">
        <option value="">选一句现成的文案…</option>
        <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.title }}</option>
      </select>

      <McInput v-model="title" placeholder="标题，例如：海底世界！" aria-label="进度标题" />
      <McInput v-model="description" placeholder="描述，例如：有用的知识又双叒增加了，" aria-label="进度描述" />

      <McNote>每行最多约 {{ Math.floor(TEXT_MAX_WIDTH / GLYPH_HEIGHT) }} 个汉字（原版 16×16 点阵）；超出的会按整字截断。</McNote>
    </div>
  </McWindow>
</template>

<style scoped>
.text-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.text-panel__preset {
  width: 100%;
  padding: 5px 6px;
  font-family: var(--font-mc);
  font-size: var(--fs-sm);
  color: #fff;
  background: var(--mc-btn);
  border: var(--mc-bd) solid #000;
  box-shadow: inset 2px 2px 0 var(--mc-btn-hi);
  cursor: pointer;
}

.text-panel__preset option {
  color: #222;
  background: #fff;
}
</style>
