# mcArt

**当前版本：v0.1.1 beta（测试版）** —— 功能与数据结构仍可能调整，导出的 `.nbt` 请先在存档副本里试加载。

Minecraft 网页工具集：方块像素画生成器、方块图鉴、结构查看器。
纯前端、无后端，图片不上传，全部在浏览器里算完。

线上地址：`https://lyynew.github.io/mcArt/`

版本号只在 `package.json` 的 `version` 维护，构建时注入界面（顶栏 `BETA` 标签与页脚版本号）。
发正式版把版本改成 `x.y.z` 去掉预发布后缀，`BETA` 标签会自动消失。

## 站点结构

一个 VitePress 站点，两个区：

| 区 | 路径 | 内容 |
| --- | --- | --- |
| 文章 | `/guide/` | 快速开始、生成原理、结构文件、方块与材质、常见问题 |
| 工具 | `/tools/` | 三个工具的页面，直接挂载 `src/tools/**` 下的 Vue 组件 |

工具不是复制进文档站的第二份实现：`docs/tools/*.md` 只写一行 `<ToolPixel />`，
组件本身还住在 `src/tools/`，和独立应用共用同一份代码、同一套状态管理。

**工具的像素风外观暂时保留**，与文章区的排版风格不同；视觉统一放到后面一起做。
为了让它能安全内嵌，样式做了作用域收敛：`src/design/base.css` 的所有规则都挂在
`.mc-scope` 下，工具容器（`ToolFrame`）带这个类，文档页一个像素都不受影响。

## 三个工具

| 工具 | 做什么 |
| --- | --- |
| 方块像素画生成器 `/tools/pixel` | 图片转方块画，能改能画，导出 `.nbt` 结构文件、施工图与材料清单 |
| 方块图鉴 `/tools/atlas` | 142 种方块的贴图、平均色与 ID，一键复制 `give` 命令 |
| 结构文件查看器 `/tools/nbt` | 拖入 `.nbt` 分层看结构、统计材料，是导出的逆运算 |

旧版单文件页面仍在 `public/legacy/index.html`（站点上对应 `/legacy/`），
由 `npm run sync:legacy` 复制到 `docs/public/` 一起发布，作为对照基准保留。

独立应用入口（`index.html` + `src/main.ts` + `src/app/`）也还在，用 `npm run dev:app` 起。
它是迁移期的回退方案，等工具视觉统一后会被删掉。

## 移动端

生成器在手机与平板上可用，触控按手指的语义单独做过：

- **单指绘制，双指缩放与平移**。双指手势以「捏住的那一格」为锚点，缩放和移动用同一个公式，
  边缩放边挪动也不会漂移。双指落下时当前这一笔立刻收尾，手掌误触不会在画面上多画一笔。
- **触控目标放大**。`(pointer: coarse)` 下按钮、勾选框、分段选择都按手指尺寸加高加宽；
  桌面那套 22px 高的紧凑工具栏在手机上点不准。
- **提示文案分两套**。手机上不会出现「滚轮缩放 · 空格拖动」这种做不到的操作。
- **物品栏长按清空**。触屏没有右键，长按 550ms 即可清空槽位。
- **输入框 16px**。iOS 对字号小于 16px 的输入框会在聚焦时放大整个页面，只能靠字号规避。
- **动态视口高度**。用 `100dvh` / `svh`，地址栏收起展开时布局不跳。

已知限制：键盘快捷键在触屏上自然不可用（撤销、重做、工具切换都有对应按钮）；
10 英寸以下建议横屏作图，竖屏时舞台约占 58svh。

## 开发

需要 Node 22 或更高。

```bash
npm install
npm run dev        # 文档站 + 工具，http://localhost:5173
npm run build      # 类型检查 + 构建，产物在 docs/.vitepress/dist/
npm run preview    # 用生产产物起本地服务
npm run test       # 单元测试
npm run typecheck  # 只做类型检查

npm run dev:app    # 过渡期：起旧的独立应用入口（不含文章区）
npm run build:app  # 过渡期：构建旧的独立应用

npm run sync       # 同步贴图 + 旧版页面（dev / build 前会自动跑）
npm run fixtures   # 重新生成算法基准文件（一般不需要）
```

贴图不直接引用 `原版材质/`：`scripts/sync-textures.mjs` 会把它增量拷贝到
`src/assets/textures/`（该目录在 `.gitignore` 里），再交给 Vite 做内容哈希输出。
旧版单文件页面同理，`scripts/sync-legacy.mjs` 把它从 `public/legacy/` 复制到
`docs/public/legacy/` 一起发布。`predev` / `prebuild` 钩子保证这两步总会先跑。

## 目录

```
docs/                         VitePress 站点（线上主体）
  .vitepress/config.mts       导航、侧栏、base、别名与版本注入
  .vitepress/theme/           继承默认主题：注册工具组件、工具页整屏布局
  index.md                    首页
  guide/                      文章
  tools/                      工具页（一行组件挂载）
  public/                     logo、favicon、旧版页面副本（生成）
src/
  app/            顶栏、页面外壳、路由（仅独立应用入口用）
  design/         设计令牌（tokens.css）、基础层（base.css，挂在 .mc-scope）、基础组件 McWindow / McButton …
  components/     跨工具复用的业务组件（方块格子、分组网格）
  core/           纯逻辑：方块数据、贴图、颜色、转换、NBT 读写、gzip/zip
  shared/         与业务无关的小工具：下载、剪贴板、防抖、超时
  tools/
    pixel/        像素画生成器：store（状态与动作）/ composables（交互）/ components（视图）
    atlas/        方块图鉴
    nbt-viewer/   结构文件查看器
  pages/          独立应用入口的首页
public/
  legacy/         旧版单文件页面，功能对照基准
  favicon.svg
原版材质/          142 张原版方块贴图，是贴图与平均色的唯一来源
材质清单.txt       方块分组、色值、贴图文件名对照
.build/           生成方块数据与平均色的 Python 脚本（改色板时才用）
scripts/          贴图与旧版页面同步、算法基准生成
tests/fixtures/   算法基准文件，由旧版实现生成后冻结
.github/workflows/deploy.yml   推 main 自动发布到 GitHub Pages
```

新增工具的常规路径：加一页 `src/tools/<name>/`、在 `src/tools/registry.ts` 登记一条、
在 `docs/tools/` 下加一个 md 挂载它（独立应用入口则同步加一条路由）。
真正的逻辑放 store / composable，组件只管渲染。

## 代码约定

- **大数组不进响应式**。画布是 25,600 格，用 `Int16Array` + canvas 命令式绘制，
  改动靠版本号（`revision`）通知重绘。做成 `reactive` 会直接卡死。
- **纯逻辑放在 `core/`**，不碰 DOM，可单测；DOM 相关的（读图、导出、下载）放 composable 或 `export/`。
- **页面只做编排**。`PixelPage.vue` 只负责三栏布局与跨组件副作用，状态在 store、交互在 composable。
- 非响应式对象被 `computed` 依赖时，必须提供版本号作为触发点——否则那个 computed 首次求值后
  永远不会失效（`hasImage` 就踩过这个坑，导致整个编辑器变成只读）。
- **缩放步进用加法，不要「乘系数再取整」**。取整会把小尺寸的步进吃掉：2 × 1.15 = 2.3 → 2，
  于是缩到最小时放大方向永久卡死。步进逻辑抽在 `tools/pixel/zoom.ts`，由 `zoom.test.ts` 固定行为。
- **隐藏的表单控件必须锚定在父级内**。`position: absolute` 的隐藏 `input` 若找不到
  `position: relative` 的祖先，会挂到整页容器上，点击/选文件时浏览器为了让它可见会把页面滚到顶部。
  父级加 `relative`、input 加 `inset`（`McSwitch`、`McDropzone` 都踩过）。
- **批量与破坏性操作要有前置校验和回执**。替换这类一次改上千格的操作，目标不明
  确时直接不执行，执行后用 `notify()` 明确告诉用户改了多少格；只在状态数字里体现，用户会以为程序乱改。
- **手势锚点按被操作元素自己的矩形算**，不要按滚动容器算。画布在容器里居中、还有内边距，
  漏掉这段偏移会让双指缩放一路滚到边界。公式在 `tools/pixel/gesture.ts`，配了单测。
- **影响滚动范围的尺寸变化必须同步生效**。画布尺寸原先等下一帧重绘才更新，手势写 `scrollLeft`
  会被旧的内容尺寸夹住（拖 120px 只滚 90px，甚至完全不动）。现在用 `applyCssSize` 同步改显示尺寸，
  位图尺寸仍留给重绘帧处理。

## 算法与测试

`src/core/` 是不依赖 DOM 的纯逻辑，也是重构里风险最大的部分。测试思路是**拿旧版当基准**：
`scripts/make-fixtures.mjs` 把旧版单文件里那几个函数按区域抽出来跑一遍，
把输出冻结成 `tests/fixtures/`，新实现必须逐字节 / 逐格对上。

- `nbt.test.ts` —— 结构文件与旧版**逐字节一致**（四种朝向/空气组合 + 分块），并用解析器回读验证
- `convert.test.ts` —— 匹配结果逐格一致（纯匹配 / 抖动 / 去杂点 / 两者）
- `color.test.ts` —— 240 组色差与 60 组最近方块一致，并校验 CIEDE2000 的公开参考值
- `archive.test.ts` —— gzip / zip 字节一致，且能被标准解压器读回
- `csv.test.ts` / `projection.test.ts` —— 材料清单格式、结构文件的分层投影与统计

`nbt-read.ts` 是只读的 NBT 解析器，既用于测试回读，也是结构查看器的基础。

## 数据与存储

- **偏好**（色系、自定义勾选、物品栏、结构文件名等）存在 `localStorage`，键名 `mcArt.editor.v2`
- **草稿**（画布 + 原图）存在 IndexedDB。分两条记录：原图只在换图时写一次，
  画布每次编辑后写几十 KB，避免反复搬运几 MB
- 恢复草稿有 600ms 上限，读不到就先给示例图；「读」和「应用」分开，
  超时后不会有迟到的结果覆盖用户刚画的内容

## 部署

推到 `main` 即自动构建并发布（GitHub Actions）。首次使用需要在仓库的
**Settings → Pages → Source** 里选 **GitHub Actions**。

站点挂在 `/mcArt/` 子路径下，`docs/.vitepress/config.mts` 会按 `GITHUB_ACTIONS`
环境变量自动切换 `base`，本地开发仍是根路径。文档站是 VitePress 的静态多页产物，
深链（`/tools/pixel`）刷新由 Pages 直接命中同名文件，不需要 hash 路由与 404 兜底。

## 说明

- 方块贴图取自 Minecraft Java 版资源，版权归 Mojang Studios 所有，仅供个人制作像素画使用，
  请勿商用或二次分发。**这部分不包含在 MIT 许可内。**
- 导出的 PNG 与施工图始终是纯色；真实材质只用于画布预览，这样施工图看得更清楚。
- 结构方块单次上限 48×48，更大的画幅会自动分块打包成 zip，附载入说明。

## 许可

代码以 [MIT](LICENSE) 发布，可自由使用、修改、再分发，保留版权声明即可。
旧版功能说明见 [docs/guide/legacy-generator.md](docs/guide/legacy-generator.md)。
