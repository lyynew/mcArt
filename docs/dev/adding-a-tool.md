---
title: 新增一个工具
---

# 新增一个工具

这份是给二次开发看的接线手册。**参考实现是 `src/tools/map-art/`**：它是按下面这套约定从零搭的，
目录最干净，改动前先读一遍它比读本文档更快。

仓库结构、代码约定、素材生成与部署说明另见根目录的
[TECHNICAL.md](https://github.com/lyynew/mcArt/blob/main/TECHNICAL.md)。

## 一句话原则

> 纯算法放 `.ts`（可单测） → 状态放一个 `store.ts` → 组件只渲染 → 页面只编排 → 站点接线四步五处。

工具本体只有一份，由文档站的 `<ToolXxx />` 挂载，不要复制第二份实现。

## 目录约定

```
src/tools/<name>/
  <Name>Page.vue        页面：只放 ToolShell + 面板 + 跨面板副作用（如整页拖放）
  model.ts              常量、用户能改的选项类型、默认值、游戏侧数据表
  store.ts              模块级 ref / reactive / computed，状态与动作的唯一入口
  *.ts                  纯算法：色板与数据表、采样、量化、高度图、取块、序列化
  render.ts             canvas 渲染（预览与 PNG 导出共用）
  export.ts             组装产物（字节 / 文本 / Blob），不直接触发下载
  demo.ts               示例数据的生成（可选）
  components/           按职责拆面板，每个组件只做一块 UI
  *.test.ts             与纯算法文件一一对应的单测
```

`map-art/` 里 `voxels.ts` 是特意抽的：`.nbt` 分块与 `.litematic` 是两种容器，
共用同一个「某坐标摆什么」的取块函数，才不会出现投影对、结构文件差一格。

约束：

- **纯算法不 import vue、不碰 DOM**。这样能直接在 Node 里跑单测，也方便以后换 UI 框架。
  读图这类必须碰 DOM 的能力放 `src/core/image.ts`，不要在每个工具里各写一份。
- **状态用模块级 ref**（和现有五个工具一致），由 `useXxx()` 导出。组件从它取状态，
  不互相传一堆 props；`shallowRef` 装大的 TypedArray，避免被深度响应式拖慢。
- **组件只用 `src/design/components/` 的基础件和 `tokens.css` 的令牌**。
  颜色、边框、间距不写死；工具样式的作用域由 `ToolFrame` 的 `.mc-scope` 保证，文档页不受污染。
- **耗时计算要防抖**。16k 格 × 244 色的色差匹配一次几十毫秒，滑杆每帧触发会卡；
  `store.ts` 里用 `shared/debounce.ts`，首帧 `flush()` 立刻出结果。
- **下载统一走 `shared/download.ts`**，导出函数只返回 bytes / Blob，UI 层才调 `downloadBlob`。

## 页面骨架

用 `src/tools/ToolShell.vue`，不要自己再写一遍 `flex:1 / min-height:0 / 窄屏滚动`：

```vue
<ToolShell>
  <template #controls> <!-- 参数 --> </template>
  <template #stage>    <!-- 预览 --> </template>
  <template #aside>    <!-- 导出与说明 --> </template>
</ToolShell>
```

- 宽屏三栏各自内部滚动；≤1200px 右栏挪到下面整行；≤900px 单列按内容撑高，
  滚动交回 `ToolFrame`。少写一个槽就少一栏，两栏工具也能用。
- 窄屏默认按 参数 → 舞台 → 信息 排；结果型工具加 `mobile-stage-first`，
  把预览提到最前，免得手机上先滑过一整屏滑杆才看到画。
- 每个 grid 子项都要有 `min-width: 0`，否则一长串说明会把整行撑出屏幕
  （结构查看器在手机端踩过，连带顶栏汉堡按钮都被挤走）。
- 工具页的 `.md` 用 `layout: page` + `pageClass: tool-page` + `footer: false`，
  内容只写 `<ToolFrame><ToolXxx /></ToolFrame>`。

### 舞台里的画布 / 固定比例块

舞台高度在宽屏被 flex 锁死、窄屏靠内容撑高，**两种布局下画布都要正好装进舞台**：

- 只按宽度定尺寸（`width: min(100%, …)` + `aspect-ratio: 1`）在矮视口必然溢出：
  正方形的高度跟着宽度走，容器一矮就往下盖住工具条，还把外层滚动区顶出一段
  （地图画预览踩过，1440×620 就能复现）。
- `max-height` / `max-width` 的补偿救不回来——浏览器只在宽或高为 `auto` 时才把
  约束按比例转移回另一边，两边都有明确值就互不相让，实测直接变形成矩形。
- 纯 CSS 正解是容器查询：舞台 `container-type: size`，画布
  `width: min(100cqw, 100cqh, …)`，宽高谁小听谁的。注意尺寸封闭后内容不再
  撑高容器，窄屏的高度全靠 `ToolShell` 的 `min-height: 70svh` 兜底；
  那行不能被更高优先级的选择器压掉（`ToolShell.vue` 里有注释说明）。
- 需要逐格排版的画布用 JS：`ResizeObserver` 读 `clientWidth / clientHeight`
  两个方向一起算，见像素画的 `useCanvasView.ts` 与结构查看器的 `LayerCanvas.vue`。

## 接线清单（四步五处，缺一不可）

1. `docs/.vitepress/theme/index.ts` —— `app.component('ToolXxx', defineToolComponent(() => import('@/tools/<name>/<Name>Page.vue')))`。
   **必须用 `theme/defineToolComponent.ts` 的包装**：它是异步客户端组件，构建时不参与 SSR，canvas / IndexedDB / window 才不会进预渲染，等待期间还会顶一个像素加载圈。别照抄 VitePress 文档里的 `defineClientComponent`，本项目没用它。
2. `docs/tools/<name>.md` —— 页面本体，只写 frontmatter + `<ToolFrame><ToolXxx /></ToolFrame>`
   （`layout: page` + `pageClass: tool-page` + `footer: false`）。
3. `docs/.vitepress/config.mts` —— 顶部「工具」下拉加链接；有侧栏的区再补侧栏项，站点描述顺手同步。
4. `docs/tools/index.md` 工具卡片 + `docs/.vitepress/theme/HomePage.vue` 首页卡片 —— 两处文案与入口（所以是「四步五处」）。首页 `hero` 面包屑与卡片数量标题也要一起改。

## 先找现成的，别复制第二份

新工具大概率要用下面这些，全站只维护一份：

| 需要 | 用哪个 | 注意 |
| --- | --- | --- |
| 方块 / 物品格子、分组网格 | `components/blocks/BlockSlot.vue` / `BlockGrid.vue` | 契约是 `SpriteDef { zh, en, id, tex, hex? }`，方块与物品都满足；`hex` 可选 |
| 选内置素材 | `tools/shared/BuiltinTextureModal.vue` | 默认 emit 解码后的 `SquareImage`；`pickOnly` 改为 emit 条目，`allow` 可加白名单。**不传这两个 prop 时行为必须不变** |
| 贴图 URL 与取帧 | `core/textures.ts` 的 `textureUrl` / `drawTexture` / `squareSide` | 长条动画贴图只取左上角第一帧 |
| 方块 / 物品总表 | `core/blocks.ts` / `block-extras.ts` / `items.ts` | 生成物，别手改 |
| 立体方块图标 | `core/block-icons.ts` 的 `blockIconId()` + `textures/block-icons/<id>.png` | 929 个方块有 32×32 透明 PNG；查不到要回退，别留空框 |
| 像素中文字 | `tools/advancement/unifont.ts` 的 `drawUnifontText` / `measureUnifont` | 16×16 点阵、无抗锯齿；测量是纯函数，不依赖 canvas |
| 原版 GUI 底图 | `textureUrl('gui/toast/advancement')` | 160×32，整数倍放大才不糊 |
| 下载 / 剪贴板 | `shared/download.ts` | 导出函数只返回 Blob，UI 层才触发下载 |

**扩展共享组件一律加可选 prop，并让默认行为保持不变**，改完回归其它用到它的工具。`BuiltinTextureModal` 的 `pickOnly` / `allow` 就是照这个原则加的：像素画、地图画不传，仍显示 2134 张全部素材。

## 交付前自查

- `npm run typecheck` / `npm run test` / `npm run build` 全过；线上 base 也验一次
  （`GITHUB_ACTIONS=1 npm run build`，确认静态资源路径带 `/mcArt/`）。要端到端就把 `dist`
  挂到 Web 服务器的 `mcArt/` 子目录下，确认贴图 / 字表 / 图标都返回 200——`npm run preview`
  默认在根路径服务，验不出 base 问题。
- 桌面 1440 与手机 390 视口截图；手机用 CDP 的 `Emulation.setDeviceMetricsOverride`
  改设备尺寸，headless 浏览器窗口本身有最小宽度限制，直接调 `--window-size` 不靠谱。
- **矮视口也要截一张**（如 1440×620）：高度锁死的布局只在窗口变矮时暴露溢出，
  1440×900 一切正常、620 就把工具条盖了的教训在地图画预览上发生过
- **手机要滚到底截一张**：浏览器底部导航栏是悬浮层，不缩水 `dvh` 也不报
  `safe-area-inset`（微信 / 小米浏览器 / QQ 浏览器都这样），滚到底的最后一行
  会被它盖住。`ToolFrame` 窄屏留的 56px 底部余量就是给它的——新增工具不用管，
  但别在工具里用 `overflow: hidden` 把这段余量剪掉
- 导出类工具要**回读自己的产物**：字节能被解析器读回、ZIP 中央目录条目数正确、命令按版本分流；图片类确认尺寸、透明通道还在
- **改了共享组件或素材目录，要回归其它工具**：像素画 / 地图画的素材弹窗、图鉴的格子、进度图的图标，至少各打开一次看有没有被连带改坏
- **素材生成物要入库并加存在性单测**：漏跑生成脚本不会让构建失败，只会让界面静默少一块（`textures.test.ts` / `block-icons.test.ts` 就是为此写的）
- 图片不上传、断网可用；失败分支给用户看得懂的提示，不要只抛异常

## 不要做的事

- 不要把 `body` / `#app` 当样式根，那会把文档站一起染成像素风
- 不要给舞台里的固定比例块只定宽度就完事，矮视口会溢出（见「舞台里的画布」）
- 不要在组件里复制算法；有第二个工具要用，就提到 `src/core/`
- 不要给 VitePress 页面加第二套导航；顶栏、侧栏、搜索都归默认主题
- 不要在算法里引第三方压缩 / NBT 库；`src/core/archive.ts` 与 `nbt-writer.ts` 已经够用
