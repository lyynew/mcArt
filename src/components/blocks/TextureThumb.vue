<script setup lang="ts">
import { computed } from 'vue'
import { textureUrl } from '@/core/textures'

/**
 * 一张贴图缩略图。
 *
 * 素材目录里没有这张图时不留破图，退成灰块；配合 <img loading="lazy">，
 * 一屏几百个格子也只有滚到附近的那些会真正发起请求。
 */
const props = withDefaults(
  defineProps<{
    tex: string
    alt?: string
  }>(),
  { alt: '' },
)

const url = computed(() => textureUrl(props.tex))
</script>

<template>
  <img v-if="url" :src="url" :alt="alt" loading="lazy" decoding="async" draggable="false" />
  <span v-else class="thumb-ph" aria-hidden="true" />
</template>

<style scoped>
.thumb-ph {
  display: block;
  width: 100%;
  height: 100%;
  background: #797979;
}
</style>
