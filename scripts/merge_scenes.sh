#!/usr/bin/env bash
# Copies each scene agent's finished scene file(s) from its sandbox into the main project (backs main up first).
# usage: bash scripts/merge_scenes.sh [box ...]   (default: all)
set -e
cd "$(dirname "$0")/.."
declare -A OWN=( [plaza]="plaza" [studio]="studio" [castle]="castle easel" [village]="village field" [drive]="drive theatre" )
BOXES="${@:-plaza studio castle village drive}"
BK="backup/ocarina_$(date +%Y%m%d_%H%M%S)"; mkdir -p "$BK"; cp -r src/videos/ocarina/scenes "$BK/"
for b in $BOXES; do for s in ${OWN[$b]}; do cp -f "src/videos/ocarina_$b/scenes/$s.ts" "src/videos/ocarina/scenes/$s.ts"; echo "merged $s <- ocarina_$b"; done; done
