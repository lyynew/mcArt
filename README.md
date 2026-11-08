# mcArt

Minecraft 网页工具集：方块像素画生成器、方块图鉴、结构文件查看器。
纯前端、无后端，图片不上传，全部在浏览器里算完。

线上地址：`https://lyynew.github.io/mcArt/`

## 三个工具

| 工具 | 做什么 |
| --- | --- |
| 方块像素画生成器 `/pixel` | 图片转方块画，能改能画，导出 `.nbt` 结构文件、施工图与材料清单 |
| 方块图鉴 `/atlas` | 142 种方块的贴图、平均色与 ID，一键复制 `give` 命令 |
| 结构文件查看器 `/nbt` | 拖入 `.nbt` 分层看结构、统计材料，是导出的逆运算 |

旧版单文件页面仍在 `public/legacy/index.html`，作为迁移期的对照基准保留。

## 开发

需要 Node 22 或更高。

```bash
npm install
npm run dev        # 本地开发，http://localhost:5173
npm run build      # 类型检查 + 生产构建，产物在 dist/
npm run preview    # 用生产产物起本地服务
npm run test       # 单元测试
npm run sync:textures   # 从 原版材质/ 同步贴图（dev / build 前会自动跑）
npm run fixtures        # 重新生成算法基准文件（一般不需要）
```

贴图不直接引用 `原版材质/`：`scripts/sync-textures.mjs` 会把它增量拷贝到
`src/assets/textures/`（该目录在 `.gitignore` 里），再交给 Vite 做内容哈希输出。
`predev` / `prebuild` 钩子保证这一步总会先跑；只有直接执行 `vite build` 时才需要手动同步。

## 目录

```
src/
  app/            顶栏、页面外壳、路由
  design/         设计令牌（tokens.css）与基础组件 McWindow / McButton / McSlider …
  components/     跨工具复用的业务组件（方块格子、分组网格）
  core/           纯逻辑：方块数据、贴图、颜色、转换、NBT 读写、gzip/zip
  shared/         与业务无关的小工具：下载、剪贴板、防抖、超时
  tools/
    pixel/        像素画生成器：store（状态与动作）/ composables（交互）/ components（视图）
    atlas/        方块图鉴
    nbt-viewer/   结构文件查看器
  pages/          首页
public/
  legacy/         旧版单文件页面，功能对照基准
  favicon.svg
原版材质/          142 张原版方块贴图，是贴图与平均色的唯一来源
材质清单.txt       方块分组、色值、贴图文件名对照
.build/           生成方块数据与平均色的 Python 脚本（改色板时才用）
scripts/          贴图同步、旧版数据迁移、算法基准生成
tests/fixtures/   算法基准文件，由旧版实现生成后冻结
.github/workflows/deploy.yml   推 main 自动发布到 GitHub Pages
```

新增工具的常规路径：加一页 `src/tools/<name>/`、在 `src/tools/registry.ts` 登记一条、
在 `src/app/router.ts` 加一条路由。真正的逻辑放 store / composable，组件只管渲染。

## 代码约定

- **大数组不进响应式**。画布是 25,600 格，用 `Int16Array` + canvas 命令式绘制，
  改动靠版本号（`revision`）通知重绘。做成 `reactive` 会直接卡死。
- **纯逻辑放在 `core/`**，不碰 DOM，可单测；DOM 相关的（读图、导出、下载）放 composable 或 `export/`。
- **页面只做编排**。`PixelPage.vue` 只负责三栏布局与跨组件副作用，状态在 store、交互在 composable。
- 非响应式对象被 `computed` 依赖时，必须提供版本号作为触发点——否则那个 computed 首次求值后
  永远不会失效（`hasImage` 就踩过这个坑，导致整个编辑器变成只读）。

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

站点挂在 `/mcArt/` 子路径下，`vite.config.ts` 会按 `GITHUB_ACTIONS` 环境变量自动切换 `base`，
本地开发仍是根路径。路由用 hash 模式（`/#/pixel`），因为 GitHub Pages 是纯静态托管，
history 模式下刷新深链会 404。

## 说明

- 方块贴图取自 Minecraft Java 版资源，版权归 Mojang Studios 所有，仅供个人制作像素画使用，
  请勿商用或二次分发。**这部分不包含在 MIT 许可内。**
- 导出的 PNG 与施工图始终是纯色；真实材质只用于画布预览，这样施工图看得更清楚。
- 结构方块单次上限 48×48，更大的画幅会自动分块打包成 zip，附载入说明。

## 许可

代码以 [MIT](LICENSE) 发布，可自由使用、修改、再分发，保留版权声明即可。
旧版功能说明见 [docs/legacy-generator.md](docs/legacy-generator.md)。
