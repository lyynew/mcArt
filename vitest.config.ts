import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * 单测只跑 src 下的纯算法（*.test.ts），不碰 .vue，
 * 因此只需要 `@` 别名，不需要 Vue 插件。
 * 站点构建配置在 docs/.vitepress/config.mts，两边互不依赖。
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
