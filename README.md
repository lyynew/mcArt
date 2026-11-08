# mcArt

Minecraft 网页工具集：方块像素画生成器、方块图鉴、结构文件查看器。
纯前端、无后端，图片不上传，全部在浏览器里算完。

线上地址：`https://lyynew.github.io/mcArt/`（首次部署后生效）

## 现在是什么状态

正在从「单文件网页」迁移到 **Vue 3 + TypeScript + Vite** 的工具集站点。

迁移期间旧版没有被删掉，放在 `public/legacy/index.html`，功能完整、可以继续用；
新版逐个工具对齐之后再撤掉它。

| 工具 | 状态 | 说明 |
| --- | --- | --- |
| 方块像素画生成器 | 迁移中 | 图片转方块画，导出 `.nbt` 结构文件 |
| 方块图鉴 | 规划中 | 142 种方块的贴图、平均色、命令复制 |
| 结构文件查看器 | 规划中 | 拖入 `.nbt` 分层浏览、统计材料 |

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
所以在 `dev` / `build` 之前这一步必须跑过——用 npm 的 `predev` / `prebuild` 钩子自动保证，
只有你直接执行 `vite build` 时才需要手动 `npm run sync:textures`。

## 目录

```
src/
  app/            顶栏、页面外壳、路由
  design/         设计令牌（tokens.css）与基础组件 McWindow / McButton / McSwitch …
  core/           方块数据、贴图注册表、颜色、转换、NBT —— 不含 DOM，可直接单测
  pages/          页面
  tools/          工具注册表（首页卡片、导航、页面标题都从这里取）
  assets/textures/  贴图副本，由 sync:textures 生成，不进仓库
public/
  legacy/         旧版单文件页面，迁移期的功能对照基准
  favicon.svg
原版材质/          142 张原版方块贴图，是贴图与平均色的唯一来源
材质清单.txt       方块分组、色值、贴图文件名对照
.build/           生成方块数据与平均色的 Python 脚本（改色板时才用）
scripts/          贴图同步、旧版数据迁移、算法基准生成
tests/fixtures/   算法基准文件，由 npm run fixtures 从旧版实现生成
.github/workflows/deploy.yml   推 main 自动发布到 GitHub Pages
```

新增一个工具，通常只需要：加一页 `src/pages/`、在 `src/tools/registry.ts` 登记一条、在
`src/app/router.ts` 加一条路由。

## 算法与测试

`src/core/` 是不依赖 DOM 的纯逻辑：颜色（CIEDE2000）、转换（采样/匹配/去杂点/抖动）、
结构文件写入、gzip/zip 打包。这些都能直接单测，也是重构里风险最大的部分。

测试的核心思路是**拿旧版当基准**：`scripts/make-fixtures.mjs` 把旧版单文件里那几个函数
原样抽出来跑一遍，把输出冻结成 `tests/fixtures/`，新实现必须逐字节/逐格对上。

- `nbt.test.ts` —— 结构文件与旧版**逐字节一致**（四种朝向/空气组合 + 分块）
- `convert.test.ts` —— 匹配结果逐格一致（纯匹配 / 抖动 / 去杂点 / 两者）
- `color.test.ts` —— 240 组色差与 60 组最近方块一致，并校验 CIEDE2000 的公开参考值
- `archive.test.ts` —— gzip/zip 字节一致，且能被标准解压器读回

另外 `nbt-read.ts` 是一个只读的 NBT 解析器：测试里用它把导出的文件**回读**成方块网格，
验证字节流本身自洽（只比对字节的话，两边一起错是查不出来的），将来也是结构文件查看器的基础。

## 部署

推到 `main` 即自动构建并发布（GitHub Actions）。首次使用需要在仓库的
**Settings → Pages → Source** 里选 **GitHub Actions**。

站点挂在 `/mcArt/` 子路径下，`vite.config.ts` 会按 `GITHUB_ACTIONS` 环境变量自动切换 `base`，
本地开发仍是根路径。

路由用 hash 模式（`/#/pixel`），因为 GitHub Pages 是纯静态托管，history 模式下刷新深链会 404。
以后要换成干净 URL，得额外把 `dist/index.html` 复制一份成 `404.html`。

## 像素画生成器

迁移期间功能以旧版为准，简述：

- 图片自动居中裁成方图，透明处保留为空格；六档画幅 32 / 48 / 64 / 96 / 128 / 160
- 按 **CIEDE2000** 色差匹配方块，可调对比度、饱和度，可去杂点
- 142 种方块、8 个分组、10 套色系（含自定义），选择存本地
- 画笔 / 橡皮 / 吸管 / 填充 / 替换 / 抓手，1–3 格笔刷、左右对称、50 步撤销
- 导出纯净 PNG、带 8 格坐标的施工图、材料清单 CSV、Java 版结构文件 `.nbt`
- 结构方块上限 48×48，更大画幅自动分块打包成 zip，附载入说明

完整的功能说明、快捷键表与 `.nbt` 使用步骤见 [docs/legacy-generator.md](docs/legacy-generator.md)
（目前描述的是旧版实现，新版对齐后会改写）。

## 说明

- 方块贴图取自 Minecraft Java 版资源，版权归 Mojang Studios 所有，仅供个人制作像素画使用，
  请勿商用或二次分发。**这部分不包含在 MIT 许可内。**
- 导出的 PNG 与施工图始终是纯色；真实材质只用于画布预览，这样施工图看得更清楚。
- 材质包与自定义色系存在浏览器本地，换浏览器或清缓存会丢；图纸本身靠导出文件保存。

## 许可

代码以 [MIT](LICENSE) 发布，可自由使用、修改、再分发，保留版权声明即可。
