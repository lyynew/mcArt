<script setup lang="ts">
import { computed, ref } from 'vue'
import { McButton, McNote, McSegmented, McWindow, type SegOption } from '@/design/components'
import BuiltinTextureModal from '@/tools/shared/BuiltinTextureModal.vue'
import type { BuiltinTexture } from '@/core/texture-source'
import { blockIconId } from '@/core/block-icons'
import { useAdvancement } from '../store'
import type { IconKind } from '../model'
import IconPreview from './IconPreview.vue'

/**
 * 图标面板：立体方块 / 平面物品 / 自己上传。
 *
 * 选内置素材复用像素画那条选择器（pickOnly 模式），2134 张素材只维护一份
 * 搜索与分组；选中的条目自带 kind，所以挑到物品图标会自动切到「物品」。
 * 方块那一栏只允许「有预渲染立体图标」的条目（allow），免得选到旗帜、
 * 潜影盒这类实体模型后出来一个空格子。图标是离线渲染好的 PNG，运行时只贴图。
 */
const { icon, assets, iconMessage, setIcon, setUpload } = useAdvancement()

const KINDS: SegOption[] = [
  { value: 'block', label: '方块', title: '原版立体方块图标，形状与游戏内一致' },
  { value: 'item', label: '物品', title: '原版物品图标，平面贴图' },
  { value: 'upload', label: '上传', title: '用自己的图片当图标' },
]

const pickerOpen = ref(false)
const fileInput = ref<HTMLInputElement>()

/** 切种类时给一个能立刻看见的默认图标，别让用户面对一个空格子 */
const DEFAULT_TEX: Record<IconKind, string> = {
  block: 'grass_block',
  item: 'items/diamond_sword',
  upload: '',
}

const kindModel = computed({
  get: () => icon.value.kind,
  set: (v: string) => {
    const kind = v as IconKind
    if (kind === icon.value.kind) return
    setIcon(kind, DEFAULT_TEX[kind])
  },
})

const currentLabel = computed(() => {
  if (icon.value.kind === 'upload') return '自己上传的图片'
  return icon.value.tex || '还没选贴图'
})

/** 物品全部可挑；方块只放出有立体图标的，其余靠 allow 从弹窗里滤掉 */
const allowIcon = (entry: BuiltinTexture): boolean =>
  entry.kind !== 'block' || blockIconId(entry.tex) !== null

function onPick(entry: BuiltinTexture): void {
  if (entry.kind === 'block') {
    const id = blockIconId(entry.tex)
    if (id) {
      setIcon('block', id)
      return
    }
  }
  setIcon('item', entry.tex)
}

function onFile(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) setUpload(file)
  // 同一个文件再选一次也要触发 change
  input.value = ''
}
</script>

<template>
  <McWindow title="图标">
    <div class="icon-panel">
      <McSegmented v-model="kindModel" :options="KINDS" :columns="3" dense />

      <div class="icon-panel__current">
        <IconPreview :kind="icon.kind" :assets="assets" />
        <div class="icon-panel__meta">
          <span class="icon-panel__label">当前图标</span>
          <span class="icon-panel__value" :title="currentLabel">{{ currentLabel }}</span>
          <McButton size="sm" @click="pickerOpen = true">从原版素材里挑</McButton>
        </div>
      </div>

      <div class="icon-panel__upload">
        <McButton size="sm" @click="fileInput?.click()">选择图片…</McButton>
        <!-- 隐藏 input 必须放在 relative 的父级里：绝对定位到页面左上角会让
             浏览器滚动到 (0,0)，点一次按钮页面就跳顶（其它工具踩过） -->
        <input
          ref="fileInput"
          class="icon-panel__file"
          type="file"
          accept="image/*"
          aria-label="上传自定义图标"
          @change="onFile"
        />
        <span class="icon-panel__hint">PNG / JPG / WebP，居中裁成方形</span>
      </div>

      <McNote v-if="iconMessage">{{ iconMessage }}</McNote>
      <McNote v-else-if="icon.kind === 'block'">方块图标按官方模型离线渲染成 32×32 透明 PNG，台阶、楼梯、花草等形状都和游戏里一致。</McNote>
      <McNote v-else-if="icon.kind === 'item'">物品图标按原样平面绘制，透明背景保留。</McNote>
      <McNote v-else>上传的图只在本地处理，不会传到服务器。</McNote>
    </div>
  </McWindow>

  <BuiltinTextureModal
    v-model="pickerOpen"
    pick-only
    dialog-title="选一个进度图标"
    hint="挑一张方块或物品图标。方块会显示离线渲染好的立体图标，物品按平面图标显示；选中后立即生效。"
    :allow="allowIcon"
    @select="onPick"
  />
</template>

<style scoped>
.icon-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.icon-panel__current {
  display: flex;
  gap: var(--sp-3);
  align-items: flex-start;
}

.icon-panel__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.icon-panel__label {
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}

.icon-panel__value {
  font-family: var(--font-mc);
  font-size: var(--fs-sm);
  color: var(--mc-ink-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-panel__upload {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
}

.icon-panel__file {
  position: absolute;
  inset: 0 auto auto 0;
  width: 0;
  height: 0;
  opacity: 0;
}

.icon-panel__hint {
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}
</style>
