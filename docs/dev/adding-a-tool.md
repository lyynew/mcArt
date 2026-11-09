---
title: 新增一个工具
---

# 新增一个工具

这份是给二次开发看的接线手册。**参考实现是 `src/tools/map-art/`**：它是按下面这套约定从零搭的，
目录最干净，改动前先读一遍它比读本文档更快。

## 一句话原则

> 纯算法放 `.ts`（可单测） → 状态放一个 `store.ts` → 组件只渲染 → 页面只编排 → 站点接线四处登记。

工具本体只有一份，同时被文档站（`<ToolXxx />`）和过渡期的独立应用入口使用，不要复制第二份实现。

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

  `map-art/` 里 `voxels.ts` 是特意抽的：`.nbt` 分块与 `.litematic` 是两种容器，
  共用同一个「某坐标摆什么」的取块函数，才不会出现投影对、结构文件差一格。
```

约束：

- **纯算法不 import vue、不碰 DOM**。这样能直接在 Node 里跑单测，也方便以后换 UI 框架。
  读图这类必须碰 DOM 的能力放 `src/core/image.ts`，不要在每个工具里各写一份。
- **状态用模块级 ref**（和现有三个工具一致），由 `useXxx()` 导出。组件从它取状态，
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

## 接线清单（四处，缺一不可）

1. `src/tools/registry.ts` —— 加一条 `ToolMeta`（首页卡片、状态标签从这里取）
2. `src/app/router.ts` —— 加一条按需加载的路由（过渡期独立入口）
3. `docs/.vitepress/theme/index.ts` —— `app.component('ToolXxx', defineClientComponent(...))`。
   **必须用 `defineClientComponent`**：构建时不做 SSR，canvas / IndexedDB / window 才不会进预渲染。
4. `docs/.vitepress/config.mts` —— 工具下拉、文章侧栏；再补 `docs/tools/<name>.md`、
   `docs/tools/index.md` 卡片、首页 `HomePage.vue` 卡片

## 交付前自查

- `npm run typecheck` / `npm run test` / `npm run build` 全过；线上 base 也验一次
  （`GITHUB_ACTIONS=1 npm run build`，确认静态资源路径带 `/mcArt/`）
- 桌面 1440 与手机 390 视口截图；手机用 iframe 模拟，headless 浏览器窗口有最小宽度限制
- **矮视口也要截一张**（如 1440×620）：高度锁死的布局只在窗口变矮时暴露溢出，
  1440×900 一切正常、620 就把工具条盖了的教训在地图画预览上发生过
- 导出类工具要**回读自己的产物**：字节能被解析器读回、ZIP 中央目录条目数正确、命令按版本分流
- 图片不上传、断网可用；失败分支给用户看得懂的提示，不要只抛异常

## 不要做的事

- 不要把 `body` / `#app` 当样式根，那会把文档站一起染成像素风
- 不要给舞台里的固定比例块只定宽度就完事，矮视口会溢出（见「舞台里的画布」）
- 不要在组件里复制算法；有第二个工具要用，就提到 `src/core/`
- 不要给 VitePress 页面加第二套导航；顶栏、侧栏、搜索都归默认主题
- 不要在算法里引第三方压缩 / NBT 库；`src/core/archive.ts` 与 `nbt-writer.ts` 已经够用
