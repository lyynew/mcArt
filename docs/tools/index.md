---
title: 工具
---

# 工具

四个工具共用同一份方块数据、贴图与 CIEDE2000 色差算法。两个生成器负责「做」，图鉴负责「查」，结构查看器负责「验」；地图画走的是另一个出口，产物不是方块而是地图物品数据。

<div class="tool-cards">
  <a class="tool-card" href="./pixel">
    <span class="tool-card__head">
      <span class="tool-card__name">方块像素画生成器</span>
      <span class="tool-card__tag">可用</span>
    </span>
    <span class="tool-card__desc">上传图片，按最优色差匹配成方块画。可以逐格修改，最后导出 Java 版结构文件、施工图与材料清单。</span>
    <span class="tool-card__meta">16–160 格 · 10 套方案 · .nbt / PNG / CSV</span>
  </a>
  <a class="tool-card" href="./map-art">
    <span class="tool-card__head">
      <span class="tool-card__name">地图画生成器</span>
      <span class="tool-card__tag">可用</span>
    </span>
    <span class="tool-card__desc">三条路线：直接写地图数据（244 色）、平铺摆方块（59 色）、立体阶梯（177 色）。CIEDE2000 匹配与五种抖动，导出 <code>map_#.dat</code>、<code>give</code> 指令、<code>.litematic</code> 与分块 <code>.nbt</code>。</span>
    <span class="tool-card__meta">128 × 128 · 244 / 59 / 177 色 · .dat / .litematic / .nbt / PNG</span>
  </a>
  <a class="tool-card" href="./atlas">
    <span class="tool-card__head">
      <span class="tool-card__name">方块图鉴</span>
      <span class="tool-card__tag">可用</span>
    </span>
    <span class="tool-card__desc">142 种方块的原版贴图、平均色与 ID。按分组浏览，搜中英文名，一键复制 <code>minecraft:xxx</code> 与 <code>give</code> 命令。</span>
    <span class="tool-card__meta">142 种方块 · 贴图放大 · 命令复制</span>
  </a>
  <a class="tool-card" href="./nbt">
    <span class="tool-card__head">
      <span class="tool-card__name">结构文件查看器</span>
      <span class="tool-card__tag">可用</span>
    </span>
    <span class="tool-card__desc">拖入 .nbt，按层浏览方块分布、统计材料，检查尺寸有没有超过结构方块 48×48 的上限。是导出的逆运算。</span>
    <span class="tool-card__meta">分层查看 · 尺寸校验 · 材料统计</span>
  </a>
</div>

## 四个工具怎么配合

1. 在**方块像素画生成器**里做出画，导出 `.nbt`；
2. 对导出结果不放心，用**结构查看器**打开同一个文件，逐层核对方块与尺寸；
3. 施工时想知道某种方块长什么样、ID 是什么，用**图鉴**查；
4. 想要的是能拿在手里看的**地图物品**，改用**地图画生成器**——它不摆方块，
   直接产出存档用的 `map_#.dat`，用法见[地图画与地图数据](../guide/map-art)。

## 关于工作台的外观

文章区是暖白纸 + 方格 + 像素标题；点进工具时，同一套方格换成深色底，变成一块「工作台」，
让画布和面板更清楚。工具内部仍是游戏内 GUI 那种浅灰面板——它按格子对齐，本来就是像素风，
功能与交互也是旧版逐项验证过来的。外壳已经统一，面板内部的进一步打磨放到后面一起做。
