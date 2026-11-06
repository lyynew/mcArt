# -*- coding: utf-8 -*-
"""生成方块数据：平均色取真实贴图，输出 JS 代码块。"""
import os, sys, json, base64
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEX = os.path.join(ROOT, "原版材质")
sys.path.insert(0, HERE)
from catalog import CATALOG
from png_avg import avg_color

TEX_ALIAS = {
    "snow_block": "snow",
    "smooth_quartz": "quartz_block_bottom",
    "magma_block": "magma",
    "dried_kelp_block": "dried_kelp_side",
}

def find_tex(bid):
    for c in [TEX_ALIAS.get(bid), bid, bid + "_side", bid + "_top"]:
        if c and os.path.exists(os.path.join(TEX, c + ".png")):
            return c
    return None

COLORS = ["white","light_gray","gray","black","red","orange","yellow","lime",
          "green","cyan","light_blue","blue","purple","magenta","pink","brown"]
CN = {"white":"白色","light_gray":"淡灰色","gray":"灰色","black":"黑色","red":"红色",
      "orange":"橙色","yellow":"黄色","lime":"黄绿色","green":"绿色","cyan":"青色",
      "light_blue":"淡蓝色","blue":"蓝色","purple":"紫色","magenta":"品红色",
      "pink":"粉红色","brown":"棕色"}
EN = {"white":"White","light_gray":"Light Gray","gray":"Gray","black":"Black","red":"Red",
      "orange":"Orange","yellow":"Yellow","lime":"Lime","green":"Green","cyan":"Cyan",
      "light_blue":"Light Blue","blue":"Blue","purple":"Purple","magenta":"Magenta",
      "pink":"Pink","brown":"Brown"}

def fam_list(suffix, fam, zh_suffix, en_suffix):
    out = []
    for c in COLORS:
        out.append((CN[c] + zh_suffix, EN[c] + " " + en_suffix, c + suffix, fam))
    return out

blocks = []
blocks += fam_list("_concrete", "混凝土", "混凝土", "Concrete")
blocks += fam_list("_wool", "羊毛", "羊毛", "Wool")
blocks += fam_list("_terracotta", "陶瓦", "陶瓦", "Terracotta")
blocks += CATALOG

# 去重（同 id 只留一个）
seen = set()
uniq = []
for b in blocks:
    if b[2] in seen:
        continue
    seen.add(b[2])
    uniq.append(b)

rows = []
missing = []
for zh, en, bid, fam in uniq:
    tex = find_tex(bid)
    if not tex:
        missing.append(bid)
        continue
    rgb = avg_color(os.path.join(TEX, tex + ".png"))
    rows.append((zh, en, bid, fam, tex, rgb))

print("blocks:", len(rows), "missing tex:", missing)
fams = {}
for r in rows:
    fams[r[3]] = fams.get(r[3], 0) + 1
print("fams:", fams)

# ---- 输出 JS ----
def jsdef(r):
    zh, en, bid, fam, tex, rgb = r
    hexv = "#%02X%02X%02X" % rgb
    return '  ["%s","%s","%s","%s","%s","%s"]' % (zh, en, hexv, bid, fam, tex)

lines = ",\n".join(jsdef(r) for r in rows)
blocks_js = "/* 方块总表：[中文名, 英文名, 平均色, 方块ID, 分组, 贴图文件名] */\nconst BLOCK_DEFS = [\n" + lines + "\n];\n"

# ---- 贴图 ----
used_tex = sorted({r[4] for r in rows})
all_files = sorted(f[:-4] for f in os.listdir(TEX) if f.endswith(".png"))
extra = [f for f in all_files if f not in used_tex]
print("textures used:", len(used_tex), "extra files:", extra)

tex_lines = []
total = 0
for name in used_tex:
    raw = open(os.path.join(TEX, name + ".png"), "rb").read()
    total += len(raw)
    tex_lines.append('  "%s": "data:image/png;base64,%s"' % (name, base64.b64encode(raw).decode()))
tex_js = ('/* 内置原版方块贴图（Minecraft Java 1.21.4 assets，仅供个人使用） */\n'
          "const VANILLA_TEX = {\n" + ",\n".join(tex_lines) + "\n};\n")
print("png bytes:", total)

open(os.path.join(HERE, "blocks.js"), "w", encoding="utf-8").write(blocks_js)
open(os.path.join(HERE, "tex.js"), "w", encoding="utf-8").write(tex_js)
json.dump([[r[0], r[1], r[3], r[4], "#%02X%02X%02X" % r[5]] for r in rows],
          open(os.path.join(HERE, "blocks.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote blocks.js", len(blocks_js), "tex.js", len(tex_js))
