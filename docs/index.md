---
layout: home

hero:
  name: mcArt
  text: Minecraft 网页工具集
  tagline: 把一张图变成方块画，改到满意，导出结构文件直接进游戏。纯前端、离线可用。
  image:
    src: /logo.svg
    alt: mcArt 草方块标志
  actions:
    - theme: brand
      text: 打开生成器
      link: /tools/pixel
    - theme: alt
      text: 读一遍指南
      link: /guide/quick-start

features:
  - title: 颜色按人眼算
    details: 在 Lab 空间里用 CIEDE2000 算色差，比直接比 RGB 更接近肉眼判断，渐变不容易发灰。
  - title: 能改也能画
    details: 画笔、填充、九格物品栏逐格改到满意。手画过的格子会被记住，换方块方案时不会被冲掉。
  - title: 直出结构文件
    details: 导出 Java 版 .nbt，放进 structures 目录用结构方块加载；超过 48 格自动分块打包成 zip。
  - title: 142 种方块
    details: 原版贴图与平均色，混凝土、羊毛、陶瓦、石材、木质、金属等十套预设，也可以自己挑。
  - title: 施工图与材料清单
    details: 施工图带行列坐标，材料清单 CSV 直接给出每种方块的数量，照着铺就行。
  - title: 图片不上传
    details: 全程在浏览器里算，原图不出本机。偏好存 localStorage，草稿存 IndexedDB，刷新不丢。
---
