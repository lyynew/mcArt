# 技术文档

给改代码的人看的。面向使用者的介绍在 [README.md](README.md)，站点上的使用说明在 `docs/guide/`。

## 站点是怎么搭的

一个 VitePress 站点，分三个区：文章 `/guide/`、工具 `/tools/`、二次开发 `/dev/`。

`src/` 是纯组件库，没有独立的应用入口。工具不是复制进文档站的第二份实现：`docs/tools/*.md` 只写一行组件挂载，实现和状态管理都留在 `src/tools/` 下，全站一份。组件用 `theme/defineToolComponent.ts` 包装的异步组件注册，构建时不参与 SSR，canvas、IndexedDB、window 才不会进预渲染；等待期间显示一个像素加载圈。

新增一个工具要登记**四步五处**：`theme/index.ts` 注册组件、`docs/tools/<name>.md` 挂页面、`config.mts` 加导航、`docs/tools/index.md` 与 `theme/HomePage.vue` 两张卡片。完整清单、目录约定与交付前自查见 [docs/dev/adding-a-tool.md](docs/dev/adding-a-tool.md)，参考实现是 `src/tools/map-art/`。

结构上的分工：纯算法放 `.ts`，状态放 `store.ts`，组件只渲染，页面只编排。

版本号只在 `package.json` 的 `version` 维护，构建时通过 `__APP_VERSION__` 注入顶栏 `BETA` 标签与页脚。发正式版把预发布后缀去掉，标签会自动消失。

## 本地开发

需要 Node 22 或更高。

```bash
npm install
npm run dev        # 文档站 + 工具，http://localhost:5173
npm run build      # 类型检查 + 构建，产物在 docs/.vitepress/dist/
npm run preview    # 用生产产物起本地服务
npm run test       # 单元测试
npm run typecheck  # 只做类型检查

npm run sync       # 同步贴图 + 旧版页面（predev / prebuild / pretest 会自动跑）
npm run fixtures   # 重新生成算法基准文件（一般不需要）
```

`pretest` 里的同步是 CI 必需的：贴图没同步，`textures.test.ts` 会直接失败。

## 目录

```
docs/                         VitePress 站点（线上主体）
  .vitepress/config.mts       导航、侧栏、base、别名与版本注入
  .vitepress/head-script.ts   首屏内联脚本：定主题、定动效、给首页挂待施工标记
  .vitepress/theme/           继承默认主题：defineToolComponent、工具页整屏布局、
                              导航显示开关（SiteControls）、全站底部声明（SiteDisclaimer）、
                              首页施工动画的粘合层
  index.md / about.md         首页、关于
  guide/                      使用说明
  tools/                      工具页（一行组件挂载）
  dev/                        二次开发：新增工具的接线手册
  public/                     logo、favicon、字体授权文本、旧版页面副本（生成）
  textures/                   静态贴图副本（由 sync-textures.mjs 生成，.gitignore）
src/
  design/         设计令牌（tokens.css）、基础层（base.css，挂在 .mc-scope）、
                  基础组件 McWindow / McButton …
    builder/      首页施工动画引擎（纯逻辑 + canvas，不依赖 Vue）
    ambient/      首页背景环境层（图案库、网格落点、生命周期、渲染）
  components/     跨工具复用的业务组件（方块格子、分组网格、缩略图）
  core/           纯逻辑：方块表、贴图、读图、颜色、转换、结构读写、gzip/zip
    blocks.ts / block-extras.ts / items.ts   三张方块与物品总表
    textures.ts / texture-catalog.ts / texture-source.ts
                  贴图 URL、2134 条内置素材清单、筛选与取帧
    block-icons.ts            立体方块图标索引（生成物）
  shared/         与业务无关的小工具：下载、剪贴板、防抖、超时
  tools/
    ToolShell.vue 工具页标准三栏外壳
    shared/BuiltinTextureModal.vue  像素画 / 地图画 / 进度图共用的素材选择器
    pixel/        像素画生成器
    map-art/      地图画生成器（新工具的参考实现）
    atlas/        图鉴（方块按分组 / 物品按首字母）
    nbt-viewer/   结构文件查看器
    advancement/  进度提示图（原版 toast 底图 + unifont 点阵字 + 预渲染立体方块图标）
public/
  legacy/         旧版单文件页面，功能对照基准（不能删）
素材源目录（全部入库；贴图文件名即贴图键，图标文件名即 block id）
  原版材质/            方块贴图 1303 张
  原版材质-items/      物品图标 831 张
  原版材质-gui/toast/  原版 GUI 底图 12 张（进度提示框体，160×32）
  原版材质-font/       原版 unifont 点阵字表（unifont.bin，680 KB 定长二进制）
  原版材质-icons/      离线渲染的 32×32 立体方块图标 929 张
.build/               素材生成脚本（png_avg.py / catalog.py / fetch.py）与中间数据
scripts/              导入、同步、生成、基准与构建辅助，共 13 个（见「素材与数据生成」）
tests/fixtures/       算法基准文件，由旧版实现生成后冻结
.github/workflows/deploy.yml   推 main 自动发布到 GitHub Pages
```

素材源目录与 `src/core/` 下的数据表是**两回事**：前者是 PNG / 字表 / 模型产物，后者是可被 TypeScript 直接 import 的清单。改了源要重跑对应生成脚本，生成物同样入库，构建不用联网。

## 视觉

主题在 `docs/.vitepress/theme/custom.css`，一套令牌同时管浅色与深色：暖白纸 + 22px 极淡方格，只有一种草绿，其余靠留白与 1px 线；方角、硬投影、无渐变。文章区是浅色方格，进工具页时同一张方格换成深色底。

- 标题用自托管的方舟像素字体（Ark Pixel 12px，SIL OFL 1.1），按 12 的整数倍放大才不会糊；正文用系统无衬线，标签与代码用等宽。
- 默认主题用 `vitepress/theme-without-fonts`，不加载自带的一整套 Inter WebFont。
- 字体文件在 `docs/.vitepress/theme/fonts/`，授权文本随站点发布在 `docs/public/LICENSE-ARK-PIXEL.txt`。字体作者 TakWolf，项目地址 https://github.com/TakWolf/ark-pixel-font 。
- **进度提示图里的文字不是这套字体**：它用游戏原版 unifont 16×16 点阵逐像素绘制（`tools/advancement/unifont.ts`），字表在 `原版材质-font/unifont.bin`，预览与导出共用同一份绘制，见「素材与数据生成」。两套字体别混用。

工具样式的作用域收敛在 `src/design/base.css`，所有规则挂在 `.mc-scope` 下；`ToolFrame` 带这个类，文档页一个像素都不受影响。工具内部保留游戏内 GUI 的浅灰面板（像素风、按格子对齐）。整屏高度归 `custom.css` 的 `.Layout.tool-page`，不要在工具里另写一套。

底部严正声明在 `theme/SiteDisclaimer.vue`，挂在 `Layout.vue` 的 `#layout-bottom` 插槽，但由 `custom.css` 按页面类控制显示：**只在首页与关于页**显示两行简版（官方要求的英文原句 + 一段中文），整屏工具页只在最后留一行极小小字，其余文档页不显示——声明全文在关于页，文档页里再放一份既重复、还会被固定侧栏盖住左侧。刻意不用 `themeConfig.footer` —— VitePress 的 `VPFooter` 在有侧栏的页面会被 `display:none`，首页和工具页过去又都写了 `footer: false`，只有最外层插槽能覆盖每一页。

> **样式坑**：组件的 `<style scoped>` 里不要用 `:global(.Layout.tool-page)` 匹配祖先。构建时 CSS 压缩器会吞掉 `:global()` 之后的后代选择器，产物退化成 `.Layout.tool-page{display:none}`，整个工具页会消失。祖先类一律在 `custom.css` 写完整选择器，三段类名的优先级足以盖过 `[data-v-*]`。

## 首页施工动画

首页首屏是一段「有人在一起拼页面」的动画：几个像素光标在页面上移动、拉选框、打字，把内容一块块建出来。引擎在 `src/design/builder/`，与 Vue 无关；`theme/useHomeBuilder.ts` 只做挂载与起停。

- **进度驱动光标**：每块内容有一个归一化进度 `p`，`timeline.poseOf(kind, rect, p)` 直接算出光标此刻的位置与形态（箭头 / 十字 / 竖线）。不是「光标动完再触发动画」，所以加速、跳帧、直接置满都自洽——跳过动画就是把所有块 `p = 1`。
- **模块分工**：`timeline`（时间轴与姿态）、`scheduler`（谁去建哪块：文档顺序前 3 块里挑最近的）是两个纯函数模块，有单测；`sprites`（位图掩码 + 离屏缓存）、`renderer`（canvas）、`engine`（rAF、生命周期）才碰 DOM。
- **不闪白页**：内容默认可见。首屏脚本在首页且动效开启时挂 `html.mc-armed`，只把 `[data-build]` 藏起来；引擎就绪后立刻摘掉这个类、改由内联样式接管。脚本 3.2 秒内没等到引擎也会自动摘掉，宁可没有动画也不能留下白页。
- **可还原**：`destroy()` 会把 `innerHTML` 与内联样式还原，所以「关掉动效」等于回到静态站，而不是停在半成品。改这块务必保持这个契约。
- **偏好只有一份**：`theme/prefs.ts` 的响应式 `prefs` 加上 `<html>` 上的 `dark` 类、`data-motion`、`data-speed`，设置面板和动画引擎都读它；首屏内联脚本（`head-script.ts`）负责在绘制前写好，避免刷新闪烁。深浅色切换会派发 `mcart:appearance`，引擎与背景层据此重算颜色。
- **只认点击，不认滚动**：滚动不打断动画（块坐标是页面坐标，滚动只改「往哪看」）；点页面任意处才跳到最后。建完之后光标不清场，继续在可视区里慢慢漂（`IDLE_FRAME` 把空闲帧率降到约 28fps）。
- **速度三档**：`舒缓 0.8× / 正常 1.25× / 快速 2×`（`prefs.ts` 的 `SPEED_SCALE`）。`setSpeed()` 只改倍率不重启动画，进度按秒推进，切换立刻生效。
- **怎么加一块**：给元素加 `data-build="head|text|card|rule"`（打字 / 擦出 / 画框后擦出 / 划线），其余什么都不用做。不想被动效碰的元素照常不写标记。
- **性能**：单个 rAF 循环、帧间隔钳到 50ms、canvas 缓冲只覆盖一屏且 dpr 上限 1.6、块做视口裁剪、只画正在施工的块，标签统一夹在屏幕内。

## 背景环境层

首页由 `docs/index.md` 挂载 `theme/HomePage.vue`，正文后的 `.home-backdrop` 通过 `useBackdrop.ts` 的组件本地画布 ref 接入 `src/design/ambient/`。仍使用单个固定视口 Canvas，不改变主页排版、施工动画或工具功能。

- **图案与视觉**：`patterns.ts` 用严格图例定义 9 种 5–8 格的 Minecraft 像素图案（苦力怕、生命值、钻石剑/镐、草方块、火把、末影之眼、蘑菇、苹果）。统一草绿、泥土、钻石、红石及材质暗部，不在格子上叠字符、噪点或扫光。原主页的 22px 方格纸面仍挂在 `.home` CSS 层，动效关闭时也不会消失；图案 Canvas 叠在其上，不随漂移改变网格。未知图例、空图案和行宽不一致直接报错。既有 `scatterPattern` 保留兼容，但不参与主页轮换。
- **占用与去重**：`pool.ts` 为完整生命期持有图案占用，旧图彻底淡出并从场景移除才释放。除名称外还计算去除留白、与像素顺序无关的内容指纹，别名画成同一图案也共享占用。优先最久未使用者，同优先级随机打散；图案或空间耗尽就等待，不重复补位，不逐帧反复试探。
- **调度与落点**：`scene.ts` 负责错峰生成、淡出期间的有限交叉过渡以及缩放后的重新摆放。`grid.ts` 按空闲扇区选点，占位预留整个漂移轨迹的包络，淡出元素同样参与避让。默认桌面最多 7 张、窄屏 3 张，最多额外 2 张用于过渡；尺寸不足时安全减少数量。
- **轨迹与节奏**：`motion.ts` 采用有界的连续周期轨迹及 smoothstep 缓入，不随机转向或重置位置。图案整体淡入 1.8 秒、停留 12–20 秒、淡出 2.2 秒，生成间隔 0.85 秒；低幅度呼吸不改变图案内部材质。全部预算、尺寸和节奏由 `config.ts` 集中配置，并使用明确的 TypeScript 类型与参数校验。
- **渲染**：`renderer.ts` 缓存原生像素精灵，最近邻放大、不旋转、不模糊；整幅图案的原点和单元尺寸对齐整数设备像素。默认图案像素为 12 CSS px，窄屏缩至 9 px，与纸面方格解耦。色彩沿用站点令牌，低透明度、窄屏额外衰减，仍位于 `z-index: -1` 且不接收指针事件。
- **生命周期与性能**：`field.ts` 仅负责唯一 rAF 和 DOM 监听，默认最高 60fps（可配置）、时间步钳到 100ms、DPR 上限 2、背板约 800 万像素上限，resize 合并到下一帧。页面隐藏时取消循环，返回后不追赶；显式 stop 不会被可见性事件重启。系统减少动效默认保留静态图案而不申请 rAF，但首页粘合层以站点开关为最终真相：用户明确开启后仍可动画，避免系统默认覆盖手动选择。站点动效开关控制整层启停，destroy 幂等取消帧、解绑尺寸/主题/可见性/媒体查询监听、清空占用与精灵缓存并释放背板。

**验证**：占用池与场景测试覆盖淡入/淡出重叠、库耗尽、别名去重、公平轮换、极小屏幕与反复缩放；固定种子模拟 24 小时、每 0.5 秒检查唯一性、占用一致性、轨迹包络避让和数量上限。生命周期测试覆盖后台恢复、慢帧钳位、精灵复用、100 次挂载/卸载、减少动效及整数设备像素绘制。模拟验证的是逻辑长期稳定性，不等于真实浏览器 24 小时性能实测。

## 移动端

生成器在手机与平板上可用，触控单独处理：

- 单指绘制、双指缩放与平移。双指以「捏住的那一格」为锚点，缩放和移动用同一个公式，边缩放边挪动不会漂移；双指落下时当前这一笔立刻收尾，手掌误触不会多画一笔。
- `(pointer: coarse)` 下按钮、勾选框、分段选择按手指尺寸加大；桌面那套 22px 高的紧凑工具栏在手机上点不准。
- 提示文案分两套，手机上不出现「滚轮缩放 · 空格拖动」这类做不到的操作。
- 触屏没有右键，物品栏长按 550ms 清空槽位。
- 输入框字号 16px，避免 iOS 在聚焦时放大整个页面。
- 用 `100dvh` / `svh`，地址栏收起展开时布局不跳。
- 浏览器底部导航栏是悬浮层，不缩水 `dvh` 也不报 `safe-area-inset`（微信、小米、QQ 浏览器都这样）。`ToolFrame` 窄屏留了 56px 底部余量，工具内不要用 `overflow: hidden` 把它剪掉。

已知限制：键盘快捷键在触屏上不可用（撤销、重做、工具切换都有按钮）；10 英寸以下建议横屏作图，竖屏时舞台约占 58svh。

## 代码约定

- **方块表分两层，别混用**。`core/blocks.ts` 的 `BLOCKS`（142 种）是像素画色板的唯一来源，`palettes.ts` 只从它推导，加条目会改变用户已存草稿的匹配结果；`core/block-extras.ts`（生成物）收识别用的其余大多数方块，两者合出 `findBlock` / `BLOCKS_BY_ID` 注册表。扩展表由 `scripts/build-block-extras.mjs` 从官方 1.21.4 语言文件 / 资产生成（与 26.3 贴图版本解耦，见「素材与数据生成」），别手改生成文件。
- **查表前先归一**。结构文件的方块串可能带 `minecraft:` 前缀、`[facing=north]` 状态或墙上形态（告示牌、旗帜、头颅、火把），一律过 `normalizeBlockId` 再查，否则同一种方块会在材料统计里拆成好几行（`findBlock` 已封装）。
- **大数组不进响应式**。画布是 25,600 格，用 `Int16Array` + canvas 命令式绘制，改动靠版本号 `revision` 通知重绘。做成 `reactive` 会直接卡死。
- **纯逻辑放在 `core/` 或工具自己的 `.ts`**，不碰 DOM，可单测；读图、导出、下载这类碰 DOM 的放 `core/image.ts` / `export.ts` / `shared/`。结构文件与地图数据共用 `core/nbt-writer.ts`，不要各写一个 NBT 拼接器。
- **页面只做编排**。`PixelPage.vue` / `MapArtPage.vue` 只负责布局与跨组件副作用，状态在 store、交互在 composable。
- **耗时计算要防抖**。地图画一次量化是 16k 格 × 244 色的 CIEDE2000，滑杆每帧触发会卡；`store.ts` 用 `shared/debounce.ts`，首帧 `flush()` 立刻出结果。
- **最近色缓存的键要精确**。按 6bit 粗量化会让两个不同颜色撞键，扫描顺序一换结果就变（蛇形抖动踩过）；改用完整 8bit RGB 做键。
- **误差扩散在线性光里做**。gamma 编码的 sRGB 数值差和人眼感知不成比例，在 0–255 上扩散会让暗部发脏；`core/color.ts` 的 `srgbToLinear` / `linearToSrgb` 专供这条路径，选色仍走 CIEDE2000。
- **立体高度差只比符号**。逐列对齐最低点（noobline 逐列可不同高）比全图共用基准省支撑方块；「下降时一次多降几格」反而会拉大跨度，别再试。
- **Litematica 的 BlockStates 不是原版 BitArray**：条目连续打包、可跨 64 位边界，下标 0 必须是 air，顺序是 `y*(x*z) + z*x + x`。全用 BigInt 写，别用 Number 碰第 63 位。
- 非响应式对象被 `computed` 依赖时，必须提供版本号作为触发点——否则那个 computed 首次求值后永远不会失效（`hasImage` 踩过，导致整个编辑器变成只读）。
- **缩放步进用加法，不要「乘系数再取整」**。取整会把小尺寸的步进吃掉：2 × 1.15 = 2.3 → 2，缩到最小时放大方向永久卡死。步进逻辑在 `core/viewport.ts`，薄封装在 `tools/pixel/zoom.ts`。
- **隐藏的表单控件必须锚定在父级内**。`position: absolute` 的隐藏 `input` 若找不到 `position: relative` 的祖先，会挂到整页容器上，点击选文件时浏览器为了让它可见会把页面滚到顶部。父级加 `relative`、input 加 `inset`（`McSwitch`、`McDropzone` 都踩过）。
- **批量与破坏性操作要有前置校验和回执**。替换这类一次改上千格的操作，目标不明确时直接不执行，执行后用 `notify()` 告诉用户改了多少格；只在状态数字里体现，用户会以为程序乱改。
- **手势锚点按被操作元素自己的矩形算**，不要按滚动容器算。画布在容器里居中、还有内边距，漏掉这段偏移会让双指缩放一路滚到边界。公式在 `core/viewport.ts` / `tools/pixel/gesture.ts`，配了单测。
- **影响滚动范围的尺寸变化必须同步生效**。画布尺寸原先等下一帧重绘才更新，手势写 `scrollLeft` 会被旧的内容尺寸夹住（拖 120px 只滚 90px）。现在用 `applyCssSize` 同步改显示尺寸，位图尺寸留给重绘帧。
- **画布容器要给 `min-width: 0` / `min-height: 0`**。flex 子项默认 `min-width: auto`，放大后 `clientWidth == scrollWidth`，横向就滚不动了。滚动区用 `margin: auto` 居中，配 `overscroll-behavior: contain` 防止把整页一起带走。
- **共享组件扩展用可选 prop，默认行为必须不变**。`BuiltinTextureModal` 的 `pickOnly` / `allow` 都是这样加的：像素画、地图画不传，仍然拿解码后的 `SquareImage` 显示全部 2134 张；只有进度图传 `allow` 过滤出有立体图标的方块。给共享组件加必填参数或改默认分支，等于同时改三个工具。
- **格子契约只要求最小字段**。`components/blocks/types.ts` 的 `SpriteDef { zh, en, id, tex, hex? }` 让方块、物品共用一套 `BlockGrid` / `BlockSlot`；`hex` 可选，物品图标的透明区域直接露槽底灰，正是原版物品栏观感。别为第二类数据复制第二份 CSS。
- **能在离线算完的就不要留到浏览器**。立体方块图标由 `build-block-icons.mjs` 展开官方模型渲染成 929 张 32×32 PNG 入库，运行时只 `drawImage`。曾经用三张面贴图在 canvas 里拼等轴立方体，只对 399 个完整立方体成立，台阶、楼梯、酿造台、花草全错。生成物入库后构建不联网，也便于单测直接查文件。

## 算法与测试

`src/core/` 不依赖 DOM，也是重构里风险最大的部分。测试思路是拿旧版当基准：`scripts/make-fixtures.mjs` 把旧版单文件里的函数按区域抽出来跑一遍，把输出冻结成 `tests/fixtures/`，新实现必须逐字节 / 逐格对上。

- `nbt.test.ts` —— 结构文件与旧版逐字节一致（四种朝向/空气组合 + 分块），并用解析器回读验证
- `convert.test.ts` —— 匹配结果逐格一致（纯匹配 / 抖动 / 去杂点 / 两者）
- `color.test.ts` —— 240 组色差与 60 组最近方块一致，校验 CIEDE2000 的公开参考值
- `archive.test.ts` —— gzip / zip 字节一致，且能被标准解压器读回
- `csv.test.ts` / `projection.test.ts` —— 材料清单格式、结构文件的分层投影与统计
- `structure/read.test.ts` / `schem.test.ts` / `litematic.test.ts` —— 多格式识别与读写回环
- `viewport.test.ts` —— 缩放夹取、步进、锚点滚动
- `tools/map-art/map-colors.test.ts` —— 244 色的展开、明暗系数与色号唯一性
- `tools/map-art/rasterize.test.ts` —— 平滑 / 像素两种采样、透明填充与调色
- `tools/map-art/quantize.test.ts` —— 线性光转换、五种抖动只产出合法色号、零强度与「无抖动」逐格一致
- `tools/map-art/map-dat.test.ts` —— `map_#.dat` 字节被 `parseNbt` 完整读回、gzip / ZIP 可解、`give` 指令与文件路径按版本分流
- `tools/map-art/heightmap.test.ts` —— 高度差符号逐格等于明暗档、逐列对齐确实省支撑
- `tools/map-art/structure.test.ts` —— 48³ 分块尺寸与 `parseStructure` 兼容回读
- `tools/map-art/litematic.test.ts` —— 位打包跨 64 位边界可解回、Version 6 根结构合规
- `design/builder/timeline.test.ts` —— 各类块的时长与显出比例单调、打字不越界、姿态坐标恒有限
- `design/builder/scheduler.test.ts` —— 调度窗口内就近取块、窗口外再近也不选、空闲游走不扎堆
- `design/ambient/patterns.test.ts` —— 字符画行宽校验、图案尺寸与色彩约束、散点同种子可复现
- `design/ambient/life.test.ts` —— 三段寿命的边界与进度、错峰权重单调、呼吸与扫描波的值域、取字稳定
- `design/ambient/pool.test.ts` —— 全生命期占用、内容别名去重、库耗尽与公平轮换
- `design/ambient/motion.test.ts` —— 连续轨迹、有界位移、阶段过渡单调
- `design/ambient/scene.test.ts` —— 淡出重叠去重、受限屏幕、24 小时模拟轮换与反复缩放
- `design/ambient/field.test.ts` —— 帧与监听清理、后台恢复、减少动效、缓存及背板预算
- `design/ambient/grid.test.ts` —— 矩形留白相交、加权采样、落点不越界且互不重叠、连续摆放会铺开、塞满后返回 null
- `tools/atlas/composables/useAtlas.test.ts` —— 方块分组顺序、物品首字母分桶无重无漏、色板开关隔离、两套选中项互不干扰
- `tools/advancement/toast.test.ts` / `unifont.test.ts` —— 文案整字截断、原版点阵字按码点取字形与 ASCII/CJK 步进
- `core/block-icons.test.ts` —— 立体图标索引优先级、`_top` / `_side` 归一、每个 id 都有 32×32 PNG
- `core/texture-catalog.test.ts` / `textures.test.ts` —— 内置素材清单与目录一致、26.3 贴图别名、GUI 底图与字表存在

素材类生成物漏跑不会让构建失败，只会让界面静默少一块，所以这几组测试直接查文件系统，不只测函数。

`.litematic` 另外用独立的 Python `litemapy` 对 18 万体素做过逐格交叉验证。质量回归还有一条：4×4 块平均色的 ΔE 对比。

`nbt-read.ts` 是只读的 NBT 解析器，既用于测试回读，也是结构查看器的基础；`nbt-writer.ts` 是对应的写入器，结构文件与地图数据共用。

## 数据与存储

- 偏好（色系、自定义勾选、物品栏、结构文件名等）在 `localStorage`，键名 `mcArt.editor.v2`。
- 草稿（画布 + 原图）在 IndexedDB。分两条记录：原图只在换图时写一次，画布每次编辑后写几十 KB，避免反复搬运几 MB。
- 恢复草稿有 600ms 上限，读不到就先给示例图；「读」和「应用」分开，超时后不会有迟到的结果覆盖用户刚画的内容。

## 素材与数据生成

素材有两个官方来源：**26.3 客户端 jar**（贴图、GUI 底图、模型与 blockstates、语言文件）和**官方资源索引**（unifont 字表）。`scripts/import-vanilla.mjs` 从本机 jar 抽出贴图到各自源目录，`scripts/build-unifont.mjs` 从资源索引拉 `.hex` 转成定长二进制。源目录全部入库，构建不联网。

`原版材质/`（方块）与 `原版材质-items/`（物品）是贴图的唯一来源，两边有 72 个同名贴图，**必须分开存**。`scripts/sync-textures.mjs` 增量同步五条来源到 `docs/textures/`：方块在根、物品在 `items/`、GUI 底图在 `gui/toast/`、点阵字表在 `font/`、立体方块图标在 `block-icons/`（该目录在 `.gitignore` 里）。`scripts/copy-textures.mjs` 在 postbuild 把这一层直接拷进 `docs/.vitepress/dist/textures/`。**不要把贴图放回 `docs/public/`**：三千多张小图让 VitePress 复制要十几分钟。URL 由 `core/textures.ts` 拼成 `BASE + tex + '.png'`，26.3 改名贴图走 `TEXTURE_ALIAS` 转换，别改方块表里的 `tex` 字段。GUI 底图、点阵字表、立体图标都**不进 `TEXTURE_CATALOG`**——它们是界面素材，不该被选去画像素画。旧版单文件页面同理，`scripts/sync-legacy.mjs` 把它从 `public/legacy/` 复制到 `docs/public/legacy/` 一起发布；`public/legacy/index.html` 是源文件，也是 sync-legacy 与 make-fixtures 的基准，不能删。

**原版有一批贴图不是单个方块**，而是把动画帧 / 多个面纵向堆成 `16×N`（`water_still` 是 16×512，`magma` 是 16×48）。整张画进方格会被压成一团横条纹，所以显示时统一只取**左上角、以窄边为边长的那一块**（正好是游戏里的第一帧）：canvas 走 `core/textures.ts` 的 `squareSide` / `drawTexture`，图鉴格子的 `<img>` 用 `object-fit: cover` + `object-position: left top`。`.build/png_avg.py` 算平均色时取同一块区域，配色和显示才对得上。规则只在这两处，别在同步脚本里裁源文件，也别改 `原版材质/` —— 完整帧数据要留着，用户自选的材质包也走同一套绘制逻辑。

### 脚本清单

| 类别 | 脚本 | 作用 |
| --- | --- | --- |
| 导入 | `scripts/import-vanilla.mjs` | 从本机 26.3 客户端 jar 抽方块 / 物品 / GUI 贴图与语言文件，写 `.build/textures-manifest.json` |
| 导入 | `scripts/build-unifont.mjs` | 从官方资源索引取 `unifont.zip`，解析 `.hex` → 四段定长二进制 `unifont.bin`（21744 码位 / 680 KB） |
| 导入 | `scripts/fetch-textures.sh` | 补拉识别表缺的贴图；URL 要带 `/textures/`，curl 要 `-L`，否则 301 的 HTML 会被当成 png 存下来 |
| 同步 | `scripts/sync-textures.mjs` | 五个素材目录增量同步到 `docs/textures/` |
| 同步 | `scripts/sync-legacy.mjs` | 旧版单文件页面复制到 `docs/public/legacy/` |
| 同步 | `scripts/copy-textures.mjs` | postbuild 把贴图拷进产物，并清掉旧的一层 |
| 生成 | `scripts/build-block-extras.mjs` | 从官方 1.21.4 的 assets / lang / textures 生成 `block-extras.ts`；生成器写文本用 Python 的 `writeTextPlain`，node 写出的文本会被 E-SafeNet 加密 |
| 生成 | `scripts/build-items.mjs` | 生成 `items.ts`（563 条物品表） |
| 生成 | `scripts/build-texture-catalog.mjs` | 扫素材目录、反查 `blocks.ts` / `block-extras.ts` / `items.ts` 的中文名，生成 `texture-catalog.ts`（26.3 共 2134 条）；`texture-catalog.test.ts` 校验清单与目录一致 |
| 生成 | `scripts/build-block-icons.mjs` | 展开官方 `models/block` + `blockstates`，离线光栅化成 929 张 32×32 PNG 与 `block-icons.ts` 索引；零外部依赖，PNG 编解码与等轴投影全部手写 |
| 生成 | `scripts/migrate-blocks.mjs` | 早期方块表迁移，一次性脚本，保留作来源说明 |
| 基准 | `scripts/make-fixtures.mjs` | 从旧版实现生成算法基准 |
| 辅助 | `scripts/clean-dist.mjs` | prebuild 把旧 dist rename 到 `.build/.trash/`，绕开本机安全删除策略（dev 还开着时会 EPERM，脚本会明确提示） |
| 辅助 | `.build/png_avg.py --json` | 重算平均色，改色板时才跑；`.build/catalog.py` / `fetch.py` 是它的配套数据脚本 |

**生成物都入库**：`block-extras.ts` / `items.ts` / `texture-catalog.ts` / `block-icons.ts` / `unifont.bin` / `原版材质-icons/*.png`。构建与测试只依赖仓库里的文件，不需要 jar、不需要联网；CI 只跑 `npm ci → test → build`。

**升级游戏版本**：改 `import-vanilla.mjs` 的 `VERSION`（或传 `--version` / `--jar`）→ 重跑导入 → 依次重跑 `build-unifont.mjs`、`build-block-icons.mjs`、`build-texture-catalog.mjs` → `npm run sync` → 提交生成物。`build-block-extras.mjs` 走的是 1.21.4 语言文件镜像，跟贴图版本解耦，不用每次都跑。

加一个配色方块的顺序：把 PNG 放进 `原版材质/`（文件名用方块 ID）→ 在 `src/core/blocks.ts` 补一条数据（中文名、分组、平均色）→ 重跑 `npm run dev`，同步脚本会带上新文件。改了色板记得重跑 `npm run fixtures`。

## 部署

推到 `main` 即由 `.github/workflows/deploy.yml` 跑测试、类型检查、构建并发布到 GitHub Pages。首次使用要在仓库的 **Settings → Pages → Source** 里选 **GitHub Actions**。

站点挂在 `/mcArt/` 子路径下，`config.mts` 按 `GITHUB_ACTIONS` 环境变量自动切换 `base`，本地开发仍是根路径。产物是 VitePress 的静态多页站点，深链 `/tools/pixel.html` 刷新由 Pages 直接命中同名文件，不需要 hash 路由与 404 兜底。

验线上 base 要跑 `GITHUB_ACTIONS=1 npm run build`，并确认产物里贴图 / 字表 URL 带 `/mcArt/`（例如 `/mcArt/textures/block-icons/grass_block.png`）。`npm run preview` 默认在根路径服务，不会带 base，要端到端验证就把 `dist` 挂到 Web 服务器的 `mcArt/` 子目录下再打开。

## 数据来源与许可

- **游戏素材**：方块 / 物品贴图、GUI 底图、模型与 blockstates、unifont 字表均取自 Minecraft Java 版官方客户端资源与官方资源索引，版权归 Mojang Studios，依据 [Minecraft Usage Guidelines](https://www.minecraft.net/en-us/usage-guidelines) 用于本站这一非商业粉丝工具，**不包含在 MIT 代码许可内**，请勿单独提取、再分发或商用。
- **免责声明**：NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT. 这份声明由 `theme/SiteDisclaimer.vue` 显示在首页与关于页底部（工具页有一行极简提示），完整措辞见 `docs/about.md` 与 README。
- **没有引入第三方图片**：进度图的立体方块图标由 `build-block-icons.mjs` 依据官方模型与贴图离线渲染生成。刻意没用 Wiki / 第三方站点的预渲染图库——那些内容带 CC BY-NC-SA，与本项目 MIT 代码叠加后授权链不干净。
- **字体**：站点标题用 Ark Pixel 12px（SIL OFL 1.1，授权文本随站发布在 `docs/public/LICENSE-ARK-PIXEL.txt`）；进度图内的文字用游戏原版 unifont 16×16 点阵（与游戏素材同源），两套字体别混用。
- **数据**：地图基础色表、明暗系数、`map_#.dat` 字段与 DataVersion 来自 Minecraft Wiki 的公开游戏数据；方块 → 基础色来自 `plonck/palette`（MIT）导出的 `blocks.csv`；`.litematic` 格式来自公开的 Litematica Version 6 规格说明。
- **算法**：CIEDE2000 / Floyd–Steinberg / Atkinson / Bayer 是公开算法，实现均为本项目自写，没有复制第三方代码。

## 已知限制

- 导出的 PNG 与施工图始终是纯色；真实材质只用于画布预览。
- 结构方块单次上限 48×48，更大的画幅会自动分块打包成 zip，附载入说明。
- 基岩版 `.mcstructure` 尚未支持，需要另写一套导出器。
- 立体方块图标覆盖 929 / 978 个方块；旗帜、潜影盒、箱子、头颅等实体模型没有静态图标，素材选择器里已过滤掉。

代码以 [MIT](LICENSE) 发布。旧版功能说明见 [docs/guide/legacy-generator.md](docs/guide/legacy-generator.md)。
