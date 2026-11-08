import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * GitHub Pages 把站点发布在 https://<user>.github.io/mcArt/ 之下，
 * 构建产物必须带子路径前缀；本地 dev/preview 用根路径，
 * 否则访问地址会变成 localhost:5173/mcArt/ 徒增困扰。
 */
const base = process.env.GITHUB_ACTIONS ? '/mcArt/' : '/'

export default defineConfig({
  base,
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    // 16×16 方块贴图不能内联成 base64：143 张会把 JS 撑大且永远无法单独缓存
    assetsInlineLimit: 0,
  },
})
