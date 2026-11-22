#!/bin/bash
# sweep.sh — score one checkpoint under several sampler settings with eval.py, one line per setting.
#
#   bash train/sweep.sh <data.npz> <ckpt.pt> [out.txt] ["--temp 1.0" "--temp 1.6 --top-p 0.8 --nms 1" …]
#
# Runs one eval at a time with all cores (running evals next to training slows both badly on a small CPU).
cd "$(dirname "$0")"
data=$1; ckpt=$2; out=${3:-/dev/stdout}; shift 3 2>/dev/null
[ $# -eq 0 ] && set -- "--temp 1.0" "--temp 1.0 --top-p 0.9 --choice 3" "--temp 1.6 --top-p 0.8 --nms 1" "--temp 1.6 --top-p 0.8 --nms 1 --despeckle 1"
for cfg in "$@"; do
  python3 eval.py --data "$data" --ckpt "$ckpt" --steps 16 --guidance 3 $cfg 2>&1 | grep -v Warn | tr '\n' ' '; echo
done > "$out"
