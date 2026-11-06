/* ================= 方块数据 ================= */
/*__BLOCKS__*/
function hexToRgb(hex){
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToLab(r, g, b){
  let R = r / 255, G = g / 255, B = b / 255;
  R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
  G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
  B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = function(t){ return t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116); };
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labDist(a, b){
  const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

/* ---------- 全部方块 ---------- */
const ALL_BLOCKS = BLOCK_DEFS.map(function(d){
  const rgb = hexToRgb(d[2]);
  return {
    zh: d[0], en: d[1], hex: d[2],
    id: "minecraft:" + d[3], fam: d[4], tex: d[5],
    rgb: rgb, lab: rgbToLab(rgb[0], rgb[1], rgb[2]), i: -1
  };
});

const FAMILIES = [];
ALL_BLOCKS.forEach(function(b){ if (FAMILIES.indexOf(b.fam) < 0) FAMILIES.push(b.fam); });

const FAM_CN = {
  "混凝土": "混凝土", "羊毛": "羊毛", "陶瓦": "陶瓦",
  "石材": "石材", "砂土": "砂土与砂岩", "木质": "木质",
  "金属宝石": "金属与宝石", "彩色": "彩色方块"
};

function famBlocks(fam){
  return ALL_BLOCKS.filter(function(b){ return b.fam === fam; });
}

/* 按分组取方块；thr > 0 时把颜色过于接近的方块去掉（先到先得） */
function collect(fams, thr){
  const out = [];
  fams.forEach(function(f){
    famBlocks(f).forEach(function(b){
      if (!thr){ out.push(b); return; }
      let min = Infinity;
      for (let i = 0; i < out.length; i++){
        const d = labDist(b.lab, out[i].lab);
        if (d < min) min = d;
      }
      if (min > thr) out.push(b);
    });
  });
  return out;
}

/* 每种方案用独立副本，i 是它在本方案里的下标 */
function makePal(list){
  return list.map(function(b, i){
    const o = Object.assign({}, b);
    o.i = i;
    return o;
  });
}

/* ---------- 预设方案 ---------- */
const BASIC_ORDER = ["混凝土", "羊毛", "石材", "砂土", "木质", "金属宝石", "彩色", "陶瓦"];
const BASIC_THR = 9;

const PALETTES = {
  basic: {
    label: "基本",
    desc: "八个分组去重后的通用套装，什么颜色都够用",
    blocks: makePal(collect(BASIC_ORDER, BASIC_THR))
  },
  concrete: {
    label: "混凝土",
    desc: "纯色块最干净，单一材料最省事",
    blocks: makePal(collect(["混凝土"]))
  },
  wool: {
    label: "羊毛",
    desc: "哑光、色偏柔和，老派地图画首选",
    blocks: makePal(collect(["羊毛"]))
  },
  terracotta: {
    label: "陶瓦",
    desc: "整体偏暗偏灰，像素风更厚重",
    blocks: makePal(collect(["陶瓦"]))
  },
  stone: {
    label: "石材",
    desc: "石、土、砂岩，冷灰到暖棕，适合建筑风",
    blocks: makePal(collect(["石材", "砂土"]))
  },
  wood: {
    label: "木质",
    desc: "木板与原木，暖调木头色",
    blocks: makePal(collect(["木质"]))
  },
  metal: {
    label: "金属",
    desc: "铁金铜与宝石块，饱和度高、对比强",
    blocks: makePal(collect(["金属宝石"]))
  },
  vivid: {
    label: "彩色",
    desc: "荧光、菌光、蛙明灯这类特殊彩色方块",
    blocks: makePal(collect(["彩色"]))
  },
  all: {
    label: "全部",
    desc: "所有内置方块，选项最多但材料也最杂",
    blocks: makePal(ALL_BLOCKS)
  },
  custom: {
    label: "自定义",
    desc: "自己挑方块，想用几种用几种",
    blocks: [],
    custom: true
  }
};

/* 自定义方案的方块 ID 集合 */
const customIds = new Set();

function setCustomPalette(ids){
  customIds.clear();
  ids.forEach(function(id){ customIds.add(id); });
  PALETTES.custom.blocks = makePal(ALL_BLOCKS.filter(function(b){ return customIds.has(b.id); }));
  try{ localStorage.setItem("mcPixelCustom", JSON.stringify(Array.from(customIds))); }catch(e){}
}

function loadCustomPalette(){
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem("mcPixelCustom") || "null"); }catch(e){}
  if (saved && saved.length) setCustomPalette(saved);
}

/* 备注：种数 + 说明 */
function palNoteText(){
  const p = PALETTES[state.palette];
  const n = p.blocks.length;
  if (p.custom) return n ? "自定义方案 · " + n + " 种方块" : "还没挑方块，点下面「选择方块」";
  return n + " 种方块 · " + p.desc;
}
