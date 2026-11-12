# mcArt

把图片变成 Minecraft 里的画。四个小工具，都在浏览器里跑，图片不上传。

**https://lyynew.github.io/mcArt/**

目前是 v0.1.1 beta。导出的结构文件建议先在存档副本里试加载一次。

## 四个工具

| | |
| --- | --- |
| [方块像素画生成器](https://lyynew.github.io/mcArt/tools/pixel.html) | 图片转方块画，可以逐格改，导出 `.nbt` / `.litematic` / `.schem`、施工图与材料清单 |
| [地图画生成器](https://lyynew.github.io/mcArt/tools/map-art.html) | 写地图数据、平铺或立体阶梯，导出 `map_#.dat`、`give` 命令与施工文件 |
| [图鉴](https://lyynew.github.io/mcArt/tools/atlas.html) | 978 种方块 + 563 种物品的贴图、中文名与 ID，可搜索，一键复制命令 |
| [结构文件查看器](https://lyynew.github.io/mcArt/tools/nbt.html) | 打开 `.nbt` / `.litematic` / `.schem`，分层看结构、点格子查方块、统计材料 |

第一次用可以从[快速开始](https://lyynew.github.io/mcArt/guide/quick-start.html)看起，五分钟出第一张图。拿不准用哪个工具，看[常见问题](https://lyynew.github.io/mcArt/guide/faq.html)。

## 本地运行

需要 Node 22 或更高。

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 静态站点，产物在 docs/.vitepress/dist/
npm run test       # 单元测试
```

`dev` 和 `build` 会自动同步贴图与旧版页面，不用手动跑。

## 继续开发

仓库结构、代码约定、算法与测试、素材生成、部署方式都写在 [TECHNICAL.md](TECHNICAL.md)。
新增工具按 [docs/dev/adding-a-tool.md](docs/dev/adding-a-tool.md) 的接线清单走。

## 说明

偏好和草稿存在浏览器本地，清掉本站的站点数据即可。方块贴图取自 Minecraft Java 版资源，版权归 Mojang Studios，仅供个人制作像素画使用，请勿商用或二次分发；这部分不包含在 MIT 许可内。

代码以 [MIT](LICENSE) 发布。问题与建议走 [GitHub Issues](https://github.com/lyynew/mcArt/issues)。本项目与 Mojang Studios、Microsoft 无关联。
