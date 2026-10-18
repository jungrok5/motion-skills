#!/usr/bin/env bash
# Render a page to MP4 in short segments, in parallel, then join them.
# Resumable: finished segments are kept, so re-running continues where it stopped.
# Run from the project root (render.mjs serves files from the current directory):
#   <skill>/scripts/render-chunked.sh <page.html> <out.mp4> [segment seconds=15] [parallel=3] [crf=23]
# Extra render.mjs flags go in RENDER_ARGS, e.g. for an embed bake (see references/EMBED.md):
#   RENDER_ARGS='--query embed&layout=tall&q=0.8 --size 1080x1350' <skill>/scripts/render-chunked.sh p/index.html out/p-tall.mp4 6
# Keeps the result under GitHub's 100 MB file limit by re-encoding at a higher CRF if needed.
set -euo pipefail
page=$1; out=$2; seg=${3:-15}; par=${4:-3}; crf=${5:-23}
render="$(cd "$(dirname "$0")" && pwd)/render.mjs"
work="${TMPDIR:-/tmp}/render-chunks/$(basename "$out" .mp4)"; mkdir -p "$work"; mkdir -p "$(dirname "$out")"
dur=$(node -e "
const fs=require('fs'); const s=fs.readFileSync(process.argv[1],'utf8');
const m=s.match(/DURATION\s*=\s*([0-9.]+)/); console.log(m?m[1]:'');" "$page")
[ -n "$dur" ] || { echo "no DURATION in $page"; exit 1; }
n=$(node -e "console.log(Math.ceil($dur/$seg))")
export page work seg dur crf render RENDER_ARGS="${RENDER_ARGS:-}"
seq 0 $((n-1)) | xargs -P "$par" -I{} bash -c '
  i={}; f=$(printf "%s/c%03d.mp4" "$work" $i)
  [ -s "$f" ] && exit 0
  from=$(node -e "console.log($i*$seg)"); to=$(node -e "console.log(Math.min(($i+1)*$seg, $dur))")
  node "$render" "$page" "$f.part.mp4" --from $from --to $to --crf "$crf" $RENDER_ARGS >/dev/null 2>&1 && mv "$f.part.mp4" "$f" && echo "seg $i done"'
ls "$work"/c[0-9][0-9][0-9].mp4 2>/dev/null | sort | sed "s/^/file '/; s/$/'/" > "$work/list.txt" || true
[ "$(wc -l < "$work/list.txt")" -eq "$n" ] || { echo "missing segments; re-run to resume"; exit 1; }
ffmpeg -y -loglevel error -f concat -safe 0 -i "$work/list.txt" -c copy -movflags +faststart "$out"
size=$(wc -c < "$out" | tr -d " ")
if [ "$size" -gt 95000000 ]; then
  ffmpeg -y -loglevel error -i "$out" -c:v libx264 -preset slow -crf $((crf+5)) -pix_fmt yuv420p -movflags +faststart "$out.small.mp4" && mv "$out.small.mp4" "$out"
fi
echo "wrote $out ($(du -h "$out" | cut -f1), $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")s)"
rm -rf "$work"
