<script setup lang="ts">
import { computed, ref } from 'vue'
import { McButton, McWindow } from '@/design/components'
import BlockSlot from '@/components/blocks/BlockSlot.vue'
import type { ItemDef } from '@/core/items'
import { copyText } from '@/shared/clipboard'

/**
 * 物品详情卡。
 *
 * 和方块详情卡分开写：物品没有分组、没有平均色、也没有「进不进色板」这回事，
 * 硬塞进同一个组件只会让两边都长出一堆 v-if。
 */
const props = defineProps<{ item: ItemDef }>()

const copied = ref('')

const fullId = computed(() => `minecraft:${props.item.id}`)
/** 物品贴图键形如 items/diamond，展示时只留文件名 */
const textureName = computed(() => `${props.item.tex.replace(/^items\//, '')}.png`)

async function copy(label: string, text: string): Promise<void> {
  const ok = await copyText(text)
  copied.value = ok ? `已复制${label}` : '复制失败，请手动选中'
  setTimeout(() => {
    copied.value = ''
  }, 1800)
}

/** 物品默认给 1 个：工具护甲给 64 个没意义 */
function giveCommand(): string {
  return `/give @s ${fullId.value} 1`
}
</script>

<template>
  <McWindow title="物品详情">
    <div class="detail__hero">
      <BlockSlot :block="item" :size="96" />
      <div class="detail__names">
        <h2 class="detail__zh">{{ item.zh }}</h2>
        <p class="detail__en">{{ item.en }}</p>
        <div class="detail__tags">
          <span class="detail__tag">物品</span>
          <span class="detail__tag detail__tag--off">仅图鉴与图标</span>
        </div>
      </div>
    </div>

    <dl class="detail__list">
      <dt>物品 ID</dt>
      <dd class="detail__mono">{{ fullId }}</dd>
      <dt>贴图</dt>
      <dd class="detail__mono">{{ textureName }}</dd>
    </dl>

    <div class="detail__actions">
      <McButton size="sm" @click="copy('ID', fullId)">复制 ID</McButton>
      <McButton size="sm" variant="primary" @click="copy('命令', giveCommand())">
        复制 give 命令
      </McButton>
    </div>

    <p class="detail__copied">{{ copied }}</p>
  </McWindow>
</template>

<style scoped>
.detail__hero {
  display: flex;
  gap: var(--sp-4);
  align-items: flex-start;
  margin-bottom: var(--sp-4);
}

.detail__names {
  min-width: 0;
}

.detail__zh {
  font-size: 15px;
  letter-spacing: 0.02em;
  color: #2b2b2b;
}

.detail__en {
  margin-top: 2px;
  font-size: var(--fs-sm);
  color: var(--mc-ink-soft);
}

.detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: var(--sp-2);
}

.detail__tag {
  padding: 1px 6px;
  font-size: var(--fs-note);
  color: #fff;
  background: var(--mc-accent);
  border: 1px solid #2b2b2b;
  text-shadow: var(--mc-ts-dark);
}

.detail__tag--off {
  background: #6b6b6b;
}

.detail__list {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 4px var(--sp-3);
  margin: 0;
  font-size: var(--fs-sm);
}

.detail__list dt {
  color: var(--mc-ink-soft);
}

.detail__list dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.detail__mono {
  font-family: var(--font-mc);
  color: var(--mc-ink-strong);
}

.detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-4);
}

.detail__copied {
  min-height: 14px;
  margin-top: var(--sp-2);
  font-size: var(--fs-note);
  color: var(--mc-accent-lo);
}
</style>
