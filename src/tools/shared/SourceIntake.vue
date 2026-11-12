<script setup lang="ts">
/**
 * 源图入口的两个弹层，在工具页面里挂一份即可。
 *
 * 触发（SourcePanel 按钮 / 页面拖放 / 粘贴）走 source-intake.ts 的共享状态，
 * 选中结果统一由 pick 事件交给页面写进各自的 store，两个工具不互相认识。
 */
import type { SquareImage } from '@/core/image'
import BuiltinTextureModal from './BuiltinTextureModal.vue'
import ImageCropModal from './ImageCropModal.vue'
import { useSourceIntake } from './source-intake'

const emit = defineEmits<{ pick: [image: SquareImage] }>()
const { cropOpen, cropRequest, builtinOpen } = useSourceIntake()
</script>

<template>
  <ImageCropModal v-model="cropOpen" :request="cropRequest" @confirm="emit('pick', $event)" />
  <BuiltinTextureModal v-model="builtinOpen" @confirm="emit('pick', $event)" />
</template>
