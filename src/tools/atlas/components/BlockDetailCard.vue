<script setup lang="ts">
import { ref } from 'vue'
import { McButton, McWindow } from '@/design/components'
import BlockSlot from '@/components/blocks/BlockSlot.vue'
import type { PaletteBlock } from '@/core/palettes'
import { fullId } from '@/core/blocks'
import { copyText } from '@/shared/clipboard'

/**
 * 方块详情卡：大图 + 名称 + ID + 复制命令。
 * 图鉴的主要用途就是「拿到 ID 去游戏里用」，所以复制按钮放在最显眼的位置。
 */
const props = defineProps<{ block: PaletteBlock }>()

const copied = ref('')

async function copy(label: string, text: string): Promise<void> {
  const ok = await copyText(text)
  copied.value = ok ? `已复制${label}` : '复制失败，请手动选中'
  setTimeout(() => {
    copied.value = ''
  }, 1800)
}

function giveCommand(): string {
  return `/give @s ${fullId(props.block)} 64`
}
</script>

<template>
  <McWindow title="方块详情">
    <div class="detail__hero">
      <BlockSlot :block="block" :size="96" />
      <div class="detail__names">
        <h2 class="detail__zh">{{ block.zh }}</h2>
        <p class="detail__en">{{ block.en }}</p>
        <p class="detail__fam">{{ block.fam }}</p>
      </div>
    </div>

    <dl class="detail__list">
      <dt>方块 ID</dt>
      <dd class="detail__mono">{{ fullId(block) }}</dd>
      <dt>平均色</dt>
      <dd class="detail__mono">
        <span class="detail__swatch" :style="{ background: block.hex }" />
        {{ block.hex }}
      </dd>
      <dt>贴图文件</dt>
      <dd class="detail__mono">{{ block.tex }}.png</dd>
    </dl>

    <div class="detail__actions">
      <McButton size="sm" @click="copy('ID', fullId(block))">复制 ID</McButton>
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

.detail__fam {
  display: inline-block;
  margin-top: var(--sp-2);
  padding: 1px 6px;
  font-size: var(--fs-note);
  color: #fff;
  background: var(--mc-accent);
  border: 1px solid #2b2b2b;
  text-shadow: var(--mc-ts-dark);
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

.detail__swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 4px;
  vertical-align: -1px;
  border: 1px solid #000;
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
