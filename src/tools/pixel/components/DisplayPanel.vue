<script setup lang="ts">
import { McSwitch, McWindow } from '@/design/components'
import { useEditor } from '../store/editor'

/**
 * 显示开关。
 * 只影响预览的几项直接绑 settings；去杂点和抖动会改变匹配结果，走 store 的动作。
 */
const editor = useEditor()
const { settings } = editor
</script>

<template>
  <McWindow title="显示">
    <McSwitch v-model="settings.showGrid" label="网格线" />
    <McSwitch
      v-model="settings.blockShading"
      label="方块质感"
      hint="给每一格加一圈明暗边，看起来像堆起来的方块；只影响画布预览，不影响导出"
    />
    <McSwitch
      :model-value="settings.despeckle"
      label="去杂点"
      hint="孤立且颜色接近的格子并到周围，不伤眼睛与高光"
      @update:model-value="editor.setDespeckle"
    />
    <McSwitch
      :model-value="settings.dither"
      label="颜色抖动"
      hint="用噪点换取更自然的渐变色带"
      @update:model-value="editor.setDither"
    />
    <McSwitch
      v-model="settings.focusSelected"
      label="聚焦选中方块"
      hint="把其余方块压暗，方便看某种材料的分布"
    />
  </McWindow>
</template>
