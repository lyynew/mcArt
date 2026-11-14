# mcArt

把图片变成 Minecraft 里的画。五个小工具，纯前端，图片不上传、断网可用。

**https://lyynew.github.io/mcArt/**

当前是 `v0.1.1-beta.1`。导出的结构文件建议先在存档副本里试加载一次。

## 五个工具

| 工具 | 做什么 |
| --- | --- |
| [方块像素画生成器](https://lyynew.github.io/mcArt/tools/pixel.html) | 图片转方块画，可逐格改；导出 `.nbt` / `.litematic` / `.schem`、施工图与材料清单 |
| [地图画生成器](https://lyynew.github.io/mcArt/tools/map-art.html) | 写地图数据、平铺或立体阶梯；导出 `map_#.dat`、`give` 命令与施工文件 |
| [图鉴](https://lyynew.github.io/mcArt/tools/atlas.html) | 978 种方块 + 563 种物品的贴图、中文名与 ID，可搜索，一键复制命令 |
| [结构文件查看器](https://lyynew.github.io/mcArt/tools/nbt.html) | 打开 `.nbt` / `.litematic` / `.schem`，分层看结构、点格子查方块、统计材料 |
| [进度提示图生成器](https://lyynew.github.io/mcArt/tools/advancement.html) | 原版进度提示底图 + 立体方块 / 物品图标 + 两行中文文案，实时预览后导出 PNG |

第一次用看[快速开始](https://lyynew.github.io/mcArt/guide/quick-start.html)，五分钟出第一张图；拿不准用哪个工具看[常见问题](https://lyynew.github.io/mcArt/guide/faq.html)。

## 本地运行

需要 **Node 22 或更高**。

```bash
npm install
npm run dev          # 文档站 + 工具，http://localhost:5173
npm run typecheck    # 只做类型检查
npm run test         # 单元测试（41 个测试文件，300+ 条用例）
npm run build        # 类型检查 + 构建，产物在 docs/.vitepress/dist/
npm run preview      # 用生产产物起本地服务
```

`dev` / `build` / `test` 前会自动同步贴图与旧版页面（`predev` / `prebuild` / `pretest`），不用手动跑 `npm run sync`。构建分两次：`vitepress build` 产出页面，`postbuild` 再把 3000 多张贴图拷进产物——直接放 `docs/public/` 会让 VitePress 复制十几分钟。

## 继续开发

- [TECHNICAL.md](TECHNICAL.md) —— 目录结构、代码约定、算法与测试、素材生成、部署
- [docs/dev/adding-a-tool.md](docs/dev/adding-a-tool.md) —— 新增工具的接线清单与交付前自查
- 站点内的使用说明在 `docs/guide/`

一句话约定：**纯算法放 `.ts`（可单测）→ 状态放 `store.ts` → 组件只渲染 → 页面只编排**。工具本体只有一份，由文档站的 `<ToolXxx />` 挂载，不要复制第二份实现；跨工具复用的素材选择器、格子组件、点阵字与立体方块图标都只维护一份。

素材不是手抄的，全链路可复现：

```
官方客户端 jar ──→ 原版材质/ · -items/ · -gui/toast/          （贴图与 GUI 底图）
官方资源索引   ──→ 原版材质-font/unifont.bin                    （原版点阵字）
官方模型+贴图  ──→ 原版材质-icons/                              （929 张立体方块图标，离线渲染）
        ↓ scripts/sync-textures.mjs → docs/textures/ → postbuild 拷进产物
        ↓ scripts/build-*.mjs 生成 src/core/ 下的数据表（生成物入库）
```

升级客户端版本时：跑 `node scripts/import-vanilla.mjs` 重抽素材，按需重跑 `build-unifont.mjs` / `build-block-icons.mjs` / `build-texture-catalog.mjs`，再提交生成物。

## 说明

偏好和草稿存在浏览器本地（`localStorage` + IndexedDB），清掉本站的站点数据即可。

**游戏素材版权归 Mojang Studios 所有**，取自 Minecraft Java 版官方客户端资源与官方资源索引，依据 [Minecraft Usage Guidelines](https://www.minecraft.net/en-us/usage-guidelines) 用于本站这一非商业粉丝工具；不含任何第三方图片素材，这部分**不包含在 MIT 代码许可内**，请勿单独提取、再分发或商用。完整来源与免责声明见[关于页](https://lyynew.github.io/mcArt/about.html)。

NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

首页与关于页底部显示这份严正声明（两行简版），内置素材选择弹窗顶部另有一句提示，详细说明在[关于页](https://lyynew.github.io/mcArt/about.html)。若认为本站内容侵犯您的合法权益，请通过 [GitHub Issues](https://github.com/lyynew/mcArt/issues) 联系我们，我们会及时处理。

代码以 [MIT](LICENSE) 发布。问题与建议走 [GitHub Issues](https://github.com/lyynew/mcArt/issues)。
