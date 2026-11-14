<script setup lang="ts">
import { McButton, McNote, McWindow } from '@/design/components'
import { useAdvancement } from '../store'
import ColorField from './ColorField.vue'

/** 配色面板：两行各自取色，外加两个一键换色（不是进度类型预设） */
const { titleColor, descColor, useVanillaColors, useSampleColors } = useAdvancement()
</script>

<template>
  <McWindow title="配色">
    <div class="style-panel">
      <ColorField v-model="titleColor" label="标题" />
      <ColorField v-model="descColor" label="描述" />

      <div class="style-panel__actions">
        <McButton size="sm" @click="useVanillaColors">游戏原版配色</McButton>
        <McButton size="sm" @click="useSampleColors">参考图配色</McButton>
      </div>

      <McNote>底图用的是游戏原版进度提示贴图，只换文字颜色不会动框体。</McNote>
    </div>
  </McWindow>
</template>

<style scoped>
.style-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.style-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
</style>
