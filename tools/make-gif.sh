#!/bin/sh
# Frames to GIF with ffmpeg: crop first, then a two-pass palette (small, no banding).
# usage: sh tools/make-gif.sh [frames_dir=out/hero-frames] [out=docs/hero.gif] [crop=W:H:X:Y or none] [width=640] [fps=10]
# tools/shots.mjs --hero calls this with the values from shots.config.json "hero".
set -eu
DIR="${1:-out/hero-frames}"; OUT="${2:-docs/hero.gif}"; CROP="${3:-none}"; W="${4:-640}"; FPS="${5:-10}"
command -v ffmpeg >/dev/null || { echo "ffmpeg not found" >&2; exit 1; }
ls "$DIR"/*.png >/dev/null 2>&1 || { echo "no PNG frames in $DIR (run: node tools/shots.mjs --hero)" >&2; exit 1; }
mkdir -p "$(dirname "$OUT")"
PAL="$(dirname "$OUT")/.palette.png"
if [ "$CROP" = none ]; then F="fps=$FPS,scale=$W:-1:flags=neighbor"; else F="crop=$CROP,fps=$FPS,scale=$W:-1:flags=neighbor"; fi
ffmpeg -v error -y -framerate "$FPS" -pattern_type glob -i "$DIR/*.png" -vf "$F,palettegen=max_colors=128" "$PAL"
ffmpeg -v error -y -framerate "$FPS" -pattern_type glob -i "$DIR/*.png" -i "$PAL" -lavfi "$F [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=4" -loop 0 "$OUT"
rm -f "$PAL"
SZ=$(wc -c < "$OUT"); echo "wrote $OUT ($SZ bytes)"
[ "$SZ" -le 5000000 ] || echo "warning: GIF over 5 MB; lower width, fps or frames" >&2
