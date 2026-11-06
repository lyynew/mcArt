# -*- coding: utf-8 -*-
"""下载原版贴图（含已有 68 张的补齐），断点续传。"""
import os, sys, time, urllib.request, urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from catalog import CATALOG

BASE = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures/block"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "原版材质")
os.makedirs(OUT, exist_ok=True)

# 已有色系（混凝土/羊毛/陶瓦）
COLORS = ["white","light_gray","gray","black","red","orange","yellow","lime",
          "green","cyan","light_blue","blue","purple","magenta","pink","brown"]
for c in COLORS:
    for suf in ("_concrete", "_wool", "_terracotta"):
        CATALOG.append((c + suf, "", c + suf, "色"))

need = []
for zh, en, bid, fam in CATALOG:
    if bid in [n for n in need]:
        continue
    need.append(bid)

def ok(path):
    p = os.path.join(OUT, path + ".png")
    return os.path.exists(p) and os.path.getsize(p) > 100

def fetch(name):
    url = BASE + "/" + name + ".png"
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                data = r.read()
            if data[:8] != b"\x89PNG\r\n\x1a\n":
                return None
            return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(0.6)
        except Exception:
            time.sleep(0.6)
    return None

added, skipped, failed = 0, 0, []
for bid in need:
    cands = [bid, bid + "_side", bid + "_top"]
    if any(ok(c) for c in cands):
        skipped += 1
        continue
    got = None
    for c in cands:
        data = fetch(c)
        if data:
            with open(os.path.join(OUT, c + ".png"), "wb") as f:
                f.write(data)
            got = c
            break
    if got:
        added += 1
        print("OK  ", got)
    else:
        failed.append(bid)
        print("FAIL", bid)

print("=== added", added, "skipped", skipped, "failed", len(failed), failed)
print("files on disk:", len([f for f in os.listdir(OUT) if f.endswith(".png")]))
