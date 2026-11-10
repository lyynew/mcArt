import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'
import { bootLoader } from './boot-loader'

/**
 * 工具组件在 markdown 里挂载（docs/tools/*.md），
 * 所以要把 `@` 别名和 __APP_VERSION__ 透传给 Vite。
 */

const pkg = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
) as { version: string }

/** GitHub Pages 发布在 /mcArt/ 之下；本地开发用根路径 */
const base = process.env.GITHUB_ACTIONS ? '/mcArt/' : '/'

const repo = 'https://github.com/lyynew/mcArt'

export default defineConfig({
  lang: 'zh-CN',
  title: 'mcArt',
  titleTemplate: ':title · mcArt',
  description:
    '方块像素画、地图画、方块图鉴、结构文件查看器。纯前端，图片不上传。',
  base,
  cleanUrls: false,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#f6f5f0' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'mcArt · Minecraft 网页工具集' }],
    [
      'meta',
      {
        property: 'og:description',
        content: '把一张图变成方块画或地图物品，导出结构文件与地图数据直接进游戏。纯前端、离线可用。',
      },
    ],
  ],

  vite: {
    // dev 只吐一个空 #app，挂上首屏加载圈；生产构建不加载这个插件
    plugins: [bootLoader()],
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    resolve: {
      alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
    },
    build: {
      // 16×16 方块贴图不内联：143 张 base64 会把 JS 撑大，也永远无法单独缓存
      assetsInlineLimit: 0,
    },
  },

  markdown: {
    // 工具页里的相对路径与行内 HTML 都按常规处理即可
    image: { lazyLoading: true },
  },

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'mcArt',

    nav: [
      { text: '文章', link: '/guide/', activeMatch: '^/guide/' },
      {
        text: '工具',
        activeMatch: '^/tools/',
        items: [
          { text: '工具总览', link: '/tools/' },
          { text: '方块像素画生成器', link: '/tools/pixel' },
          { text: '地图画生成器', link: '/tools/map-art' },
          { text: '方块图鉴', link: '/tools/atlas' },
          { text: '结构文件查看器', link: '/tools/nbt' },
        ],
      },
      { text: '关于', link: '/about' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '指南总览', link: '/guide/' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '生成原理', link: '/guide/how-it-works' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '结构文件与进游戏', link: '/guide/structure-file' },
            { text: '方块与材质', link: '/guide/blocks-and-textures' },
            { text: '地图画与地图数据', link: '/guide/map-art' },
          ],
        },
        {
          text: '参考',
          items: [
            { text: '常见问题', link: '/guide/faq' },
            { text: '旧版生成器说明', link: '/guide/legacy-generator' },
          ],
        },
      ],
      '/dev/': [
        {
          text: '二次开发',
          items: [
            { text: '新增一个工具', link: '/dev/adding-a-tool' },
            { text: '技术文档（GitHub）', link: 'https://github.com/lyynew/mcArt/blob/main/TECHNICAL.md' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: repo }],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            displayDetails: '显示详情',
            resetButtonTitle: '清除',
            backButtonTitle: '返回',
            noResultsText: '没有找到相关内容',
            footer: {
              selectText: '选择',
              selectKeyAriaLabel: '回车',
              navigateText: '切换',
              navigateUpKeyAriaLabel: '上箭头',
              navigateDownKeyAriaLabel: '下箭头',
              closeText: '关闭',
              closeKeyAriaLabel: 'Esc',
            },
          },
        },
      },
    },

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新于', formatOptions: { dateStyle: 'medium' } },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色',
    darkModeSwitchTitle: '切换到深色',
    externalLinkIcon: true,

    footer: {
      message: '代码以 MIT 发布 · 方块贴图版权归 Mojang Studios，仅供个人制作像素画使用',
      copyright: 'mcArt · 纯前端，图片不上传',
    },
  },
})
