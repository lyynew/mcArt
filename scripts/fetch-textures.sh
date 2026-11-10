#!/usr/bin/env bash
# 补拉识别表缺的方块贴图。
#
# 清单 .build/tex-need.txt 由 `node scripts/build-block-extras.mjs` 生成（每行：贴图名<TAB>资产路径）。
# 只拉 原版材质/ 里还没有的，失败不中断——网络窗口脉冲式开合时，脚本会歇几秒再试，
# 反复重跑即续传。全部补齐后再跑一次 build-block-extras.mjs 就会生成 src/core/block-extras.ts。
#
# 用法：bash scripts/fetch-textures.sh
#   SECONDS_LIMIT=540   本次最多跑多少秒（默认 9 分钟，凑 Bash 工具的 10 分钟上限）
set -u
cd "$(dirname "$0")/.." || exit 1

MANIFEST=.build/tex-need.txt
if [ ! -f "$MANIFEST" ]; then
  echo "缺少 $MANIFEST —— 先运行：node scripts/build-block-extras.mjs"
  exit 1
fi

SOURCES=(
  "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures"
  "https://ghproxy.net/https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures"
  "https://ghfast.top/https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures"
)

LIMIT=${SECONDS_LIMIT:-540}
DEADLINE=$(( $(date +%s) + LIMIT ))
COOLDOWN=${COOLDOWN:-6}
MAX_MISS=${MAX_MISS:-12}

count_done() { ls 原版材质/*.png 2>/dev/null | wc -l | tr -d ' '; }

before=$(count_done)
echo "开始：已有 $before 张，本次限时 ${LIMIT}s"

pass=0
miss=0
while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  pass=$((pass+1))
  got=0
  todo=0
  while IFS=$'\t' read -r tex rel; do
    [ -z "$tex" ] && continue
    [ -f "原版材质/$tex.png" ] && continue
    todo=$((todo+1))

    ok=0
    for src in "${SOURCES[@]}"; do
      if curl -sS --fail -L --max-time 15 -o "原版材质/$tex.png" "$src/$rel.png" 2>/dev/null; then
        ok=1
        break
      fi
      rm -f "原版材质/$tex.png"
    done

    if [ "$ok" = 1 ]; then
      got=$((got+1))
      miss=0
    else
      miss=$((miss+1))
      if [ "$miss" -ge "$MAX_MISS" ]; then
        echo "  连续 $miss 张失败，网络窗口关了，歇 ${COOLDOWN}s…"
        sleep "$COOLDOWN"
        miss=0
        [ "$(date +%s)" -ge "$DEADLINE" ] && break
      fi
    fi
  done < "$MANIFEST"

  after=$(count_done)
  echo "第 $pass 轮：本轮 +$got，累计 $after"
  if [ "$got" = 0 ] && [ "$todo" -gt 0 ]; then
    # 一整轮一张没拿到，说明窗口全关着，短歇再来
    sleep "$COOLDOWN"
  fi
  if [ "$todo" = 0 ]; then
    echo "全部补齐。"
    break
  fi
done

after=$(count_done)
echo "结束：累计 $after 张（本次 +$((after - before))）"
manifest_total=$(grep -cv '^[[:space:]]*$' "$MANIFEST")
remaining=$((manifest_total - (after - 142)))
[ "$remaining" -lt 0 ] && remaining=0
echo "还差约 $remaining 张；继续就再跑一次本脚本。"
exit 0
