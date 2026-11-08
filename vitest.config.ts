import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

/**
 * 单测复用 Vite 的别名与插件配置，避免 @/ 在测试里解析不到。
 * 现在还没有测试文件，先放宽 passWithNoTests，等核心算法移植进来再收紧。
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
      passWithNoTests: true,
    },
  }),
)
