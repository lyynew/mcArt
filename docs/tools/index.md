---
title: 工具
---

# 工具

五个工具：两个做画、一个查方块与物品、一个复查导出的文件、一个做进度提示图。

<div class="tool-cards">
  <a class="tool-card" href="./pixel">
    <span class="tool-card__head">
      <span class="tool-card__name">方块像素画生成器</span>
      <span class="tool-card__tag">可用</span>
    </span>
    <span class="tool-card__desc">上传图片，配成方块画，可以逐格改。导出结构文件、施工图与材料清单。</span>
    <span class="tool-card__meta">16–256 格 · 10 套方案 · .nbt / .litematic / .schem / PNG / CSV</span>
  </a>
  <a class="tool-card" href="./map-art">
    <span class="tool-card__head">
      <span class="tool-card__name">地图画生成器</span>
      <span class="tool-card__tag">可用</span>
    </span>
    <span class="tool-card__desc">三种做法：直接写地图数据、平铺摆方块、立体阶梯。导出地图文件、<code>give</code> 指令与施工文件。</span>
    <span class="tool-card__meta">128 × 128 · 244 / 59 / 177 色 · .dat / .litematic / .schem / .nbt / PNG</span>
  </a>
  <a class="tool-card" href="./atlas">
    <span class="tool-card__head">
      <span class="tool-card__name">图鉴</span>
      <span class="tool-card__tag">可用</span>
    </span>
    <span class="tool-card__desc">978 种方块与 563 种物品的原版贴图、中文名与 ID。可搜索，标出能用于像素画的方块，一键复制命令。</span>
    <span class="tool-card__meta">1541 条 · 方块按组 / 物品按字母 · 命令复制</span>
  </a>
  <a class="tool-card" href="./nbt">
    <span class="tool-card__head">
      <span class="tool-card__name">结构文件查看器</span>
      <span class="tool-card__tag">可用</span>
    </span>
    <span class="tool-card__desc">拖入结构文件，按层看方块分布，点格子查名字与坐标；画布可以缩放拖拽，另附材料统计。</span>
    <span class="tool-card__meta">分层查看 · 点选查块 · 缩放画布 · 材料统计</span>
  </a>
  <a class="tool-card" href="./advancement">
    <span class="tool-card__head">
      <span class="tool-card__name">进度提示图生成器</span>
      <span class="tool-card__tag">可用</span>
    </span>
    <span class="tool-card__desc">用游戏原版进度提示底图，配上方块等轴图标或物品图标，填两行中文文案，实时预览后导出 PNG。</span>
    <span class="tool-card__meta">320 × 64 · 原版底图 · 1× / 2× / 4× · 只出 PNG</span>
  </a>
</div>

## 怎么配合

1. 在**方块像素画生成器**里做出画，导出结构文件；
2. 不放心的话，用**结构查看器**打开同一个文件，逐层核对方块与尺寸；
3. 施工时想知道某种方块长什么样、ID 是什么，用**图鉴**查；
4. 想要的是能拿在手里看的**地图物品**，改用**地图画生成器**——它不摆方块，直接产出存档用的 `map_#.dat`，用法见[地图画与地图数据](../guide/map-art)。

文章区是浅色方格，点进工具时换成深色底，画布和面板更清楚。
