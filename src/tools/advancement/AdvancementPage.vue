<script setup lang="ts">
import { onMounted } from 'vue'
import ToolShell from '@/tools/ToolShell.vue'
import { useAdvancement } from './store'
import TextPanel from './components/TextPanel.vue'
import IconPanel from './components/IconPanel.vue'
import StylePanel from './components/StylePanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ExportPanel from './components/ExportPanel.vue'

/**
 * 进度提示图生成器。
 *
 * 页面只做两件事：把五块面板放进标准三栏外壳、挂载时初始化素材。
 * 参数、算法、渲染、导出、状态分别在 store / *.ts / components 里，
 * 这一层不写任何业务计算。
 */
const { init } = useAdvancement()
onMounted(init)
</script>

<template>
  <ToolShell mobile-stage-first max-width="none">
    <template #controls>
      <TextPanel />
      <IconPanel />
      <StylePanel />
    </template>

    <template #stage>
      <PreviewPanel />
    </template>

    <template #aside>
      <ExportPanel />
    </template>
  </ToolShell>
</template>

<style scoped>
/*
 * ToolShell 窄屏给舞台留了 70svh，那是给 1:1 画布用的。
 * 本工具的横幅是 5:1，590px 高的舞台里只有一条 68px 的图，
 * 首屏几乎全是空棋盘格，参数要滑很久才露出来。压到「横幅 + 留白」即可。
 * :deep 的选择器特异性高于 ToolShell 自己的 .tool-shell__stage。
 */
@media (max-width: 900px) {
  :deep(.tool-shell__stage) {
    min-height: 240px;
  }
}
</style>
