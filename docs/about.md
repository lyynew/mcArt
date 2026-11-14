---
title: 关于
---

# 关于

mcArt 是一个 Minecraft 周边的小工具站：把图片变成方块画或地图物品数据，把结构文件再读回来看，也能查方块与物品、做一张进度达成提示图。

做它的起因很实际——网上的像素画生成器要么只给一张预览图，要么导出的格式进不了游戏，要么把图片传到服务器上。自己做一遍更省心，于是就有了这个项目。

## 它能做什么

- **方块像素画生成器** —— 图片转方块画，可逐格修改，导出结构文件、施工图与材料清单
- **地图画生成器** —— 写地图数据 / 平铺 / 立体阶梯三条路线，导出地图文件、`give` 指令与施工文件
- **图鉴** —— 978 种方块与 563 种物品的贴图、中文名与命令
- **结构文件查看器** —— 打开导出的文件，分层查看、点格子查方块、统计材料
- **进度提示图生成器** —— 游戏原版进度提示底图 + 方块/物品图标 + 两行文案，导出 PNG

## 它不做什么

- 不联机、不做社区、不存你的图
- 不支持基岩版结构文件（格式不同，得另写一套导出器）
- 不追求「一键生成完美结果」——像素画这件事，最后几格总要人自己调

## 怎么做的

纯静态页面，没有后端，读图、配色、导出都在浏览器里完成。想看代码层面的说明，见仓库的
[TECHNICAL.md](https://github.com/lyynew/mcArt/blob/main/TECHNICAL.md)。

## 许可

代码以 [MIT](https://github.com/lyynew/mcArt/blob/main/LICENSE) 发布，可自由使用、修改、再分发，保留版权声明即可。

**游戏素材版权归 Mojang Studios 所有**。站内的方块 / 物品贴图、GUI 底图、点阵字表、方块模型与 blockstates 均取自 Minecraft Java 版官方客户端资源，依据 [Minecraft Usage Guidelines](https://www.minecraft.net/en-us/usage-guidelines) 用于本站这一非商业粉丝工具；这部分**不包含在 MIT 代码许可内**，请勿将素材单独提取、再分发或用于商业用途。进度提示图里的立体方块图标由本项目依据官方模型与贴图离线渲染生成（`scripts/build-block-icons.mjs`），**不含任何第三方图片素材**。

> NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
> 本站是非官方的 Minecraft 粉丝工具，与 Mojang Studios、Microsoft 无关联，也未获其认可或支持。

本页是完整版；站点每一页底部也会显示同一份「严正声明」，工具页为紧凑条。若认为本站内容侵犯您的合法权益，请通过 [GitHub Issues](https://github.com/lyynew/mcArt/issues) 联系我们，我们会及时处理。

## 反馈

问题与建议走 [GitHub Issues](https://github.com/lyynew/mcArt/issues)。报 bug 时如果能附上原图（或类似的一张）、画幅、选用的方块方案，定位会快很多。
