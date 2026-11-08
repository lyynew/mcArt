<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { BlockMosaic, McButton, McChip, McWindow } from '@/design/components'
import { STATUS_TEXT, TOOLS } from '@/tools/registry'

/**
 * 工具占位页。
 * 有的工具还没实现，但导航和路由先立起来，
 * 免得点进来是 404 —— 明确告诉用户「在做什么、什么时候能用」比空白页体面。
 */
const props = defineProps<{ toolId: string }>()

const tool = computed(() => TOOLS.find((t) => t.id === props.toolId))

/** 迁移期的现实进度，比一句「敬请期待」有用 */
const progressNote = computed(() => {
  switch (props.toolId) {
    case 'pixel':
      return '正在把旧版单文件重构成 Vue 组件：数据层、设计系统、核心算法已经拆开，界面与编辑器交互排队中。旧版页面功能是完整的，随时可以先继续用。'
    case 'atlas':
      return '排在生成器之后。数据已经就位（142 种方块的分组、平均色、贴图文件名），剩下的是浏览与复制的界面。'
    default:
      return '排在最后：需要先有 .nbt 的解析器，而它和生成器共用同一套几何与压缩代码，所以会跟着导出功能一起做。'
  }
})
</script>

<template>
  <div class="soon">
    <McWindow v-if="tool" class="soon__panel">
      <div class="soon__head">
        <BlockMosaic :blocks="tool.preview" :cell="32" :cols="3" />
        <div>
          <h1 class="soon__name">{{ tool.name }}</h1>
          <McChip :accent="tool.status === 'ready'">{{ STATUS_TEXT[tool.status] }}</McChip>
        </div>
      </div>

      <p class="soon__tagline">{{ tool.tagline }}</p>
      <p class="soon__detail">{{ tool.detail }}</p>
      <p class="soon__note">{{ progressNote }}</p>

      <div class="soon__actions">
        <a v-if="tool.id === 'pixel'" class="soon__primary" href="legacy/index.html">
          先去旧版用
        </a>
        <McButton @click="$router.push('/')">回到工具集</McButton>
        <RouterLink class="soon__legacy" to="/atlas">看看方块图鉴</RouterLink>
      </div>
    </McWindow>

    <McWindow v-else title="找不到这个工具" class="soon__panel">
      <p class="soon__detail">地址里的工具名对不上，回首页看看有哪些。</p>
      <RouterLink to="/">回到工具集</RouterLink>
    </McWindow>
  </div>
</template>

<style scoped>
.soon {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: var(--sp-7) var(--sp-6);
}

.soon__head {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-bottom: var(--sp-4);
}

.soon__name {
  font-size: 17px;
  letter-spacing: 0.02em;
  color: #2b2b2b;
  margin-bottom: var(--sp-2);
}

.soon__tagline {
  font-size: 13px;
  color: var(--mc-ink-strong);
  margin-bottom: var(--sp-2);
}

.soon__detail {
  font-size: var(--fs-body);
  line-height: 1.7;
  color: var(--mc-ink-soft);
}

.soon__note {
  margin-top: var(--sp-4);
  padding: var(--sp-3);
  font-size: var(--fs-note);
  line-height: 1.65;
  color: var(--mc-ink-soft);
  background: var(--mc-plate);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-plate-lo),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-plate-hi);
}

.soon__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-top: var(--sp-5);
}

.soon__primary {
  display: inline-flex;
  align-items: center;
  padding: 5px var(--sp-3);
  font-size: var(--fs-body);
  color: #fff;
  background: var(--mc-accent);
  border: var(--mc-bd) solid #000;
  box-shadow:
    inset var(--mc-bv) var(--mc-bv) 0 var(--mc-accent-hi),
    inset calc(-1 * var(--mc-bv)) calc(-1 * var(--mc-bv)) 0 var(--mc-accent-lo);
  text-shadow: var(--mc-ts-dark);
  text-decoration: none;
}

.soon__primary:hover {
  background: var(--mc-accent-hover);
  text-decoration: none;
}

.soon__legacy {
  margin-left: auto;
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}

@media (max-width: 640px) {
  .soon {
    padding: var(--sp-5) var(--sp-4);
  }

  .soon__actions {
    flex-wrap: wrap;
  }

  .soon__legacy {
    margin-left: 0;
  }
}
</style>
