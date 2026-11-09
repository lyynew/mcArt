import { createRouter, createWebHashHistory } from 'vue-router'
import { TOOLS } from '@/tools/registry'

/**
 * 用 hash 路由：GitHub Pages 是纯静态托管，history 模式下刷新深链会 404，
 * 需要额外的 404.html 兜底。工具集这类站点没必要为「好看的 URL」付这个代价。
 * 以后要换 history，只需改这里 + 复制一份 dist/index.html 为 404.html。
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
      meta: { title: 'Minecraft 网页工具集' },
    },
    {
      path: '/pixel',
      name: 'pixel',
      // 工具页按需加载：首屏不该为整个编辑器的贴图与算法付费
      component: () => import('@/tools/pixel/PixelPage.vue'),
    },
    {
      path: '/map-art',
      name: 'map-art',
      component: () => import('@/tools/map-art/MapArtPage.vue'),
    },
    {
      path: '/atlas',
      name: 'atlas',
      component: () => import('@/tools/atlas/AtlasPage.vue'),
    },
    {
      path: '/nbt',
      name: 'nbt',
      component: () => import('@/tools/nbt-viewer/NbtViewerPage.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const tool = TOOLS.find((t) => t.path === to.path)
  const page = tool ? tool.name : (to.meta.title as string | undefined)
  document.title = page ? `${page} · mcArt` : 'mcArt · Minecraft 网页工具集'
})

export default router
