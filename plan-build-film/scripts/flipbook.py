#!/usr/bin/env python3
"""The film as a web page that plays a frame sequence with its sound (no video file): for a static site or a page
that takes no video. Chapters on the scrubber: the sheet, the build, the wave, inside.

    python3 <skill>/scripts/flipbook.py pbf-out/<name> [--step 2] [--width 640] [--quality 60]
        -> pbf-out/<name>/flipbook/{index.html, film.json, frames/*.webp, score.m4a}
    open index.html   ·   ?t=12.5 opens paused at that second
"""
import argparse
import json
import os
import shutil
import subprocess

from PIL import Image

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("--step", type=int, default=2, help="keep every Nth frame (2 = 12 fps from a 24 fps film)")
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--quality", type=int, default=60)
    ap.add_argument("--dest")
    a = ap.parse_args()
    tl = json.load(open(os.path.join(a.out, "timeline.json"), encoding="utf-8"))
    fps = tl["fps"]
    nf = int(round(tl["duration"] * fps))
    src = os.path.join(a.out, "final")
    if not os.path.isdir(src):
        raise SystemExit("no final/ frames: run hud.py first")
    dest = a.dest or os.path.join(a.out, "flipbook")
    shutil.rmtree(dest, ignore_errors=True)
    os.makedirs(os.path.join(dest, "frames"))
    keep = list(range(1, nf + 1, a.step))
    W0, H0 = Image.open(os.path.join(src, "f_0001.jpg")).size
    w = a.width
    h = round(w * H0 / W0 / 2) * 2
    total = 0
    for i, f in enumerate(keep, 1):
        p = os.path.join(dest, "frames", f"{i:04d}.webp")
        Image.open(os.path.join(src, f"f_{f:04d}.jpg")).convert("RGB").resize((w, h), Image.LANCZOS).save(p, "WEBP", quality=a.quality, method=6)
        total += os.path.getsize(p)
    T = tl["T"]
    cuts = [("도면 sheet", 0.0), ("짓기 build", T["hold"]), ("물결 wave", T["wave"]), ("안으로 inside", T["title"] - 1.5)]
    shots = []
    for k, (nm, t) in enumerate(cuts):
        start = int(round(t * fps / a.step))
        end = int(round(cuts[k + 1][1] * fps / a.step)) if k + 1 < len(cuts) else len(keep)
        shots.append(dict(id=f"s{k}_{nm}", start=start, n=max(1, end - start)))
    audio = None
    wav = os.path.join(a.out, "score.wav")
    if os.path.exists(wav):
        audio = "score.m4a"
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", "96k", os.path.join(dest, audio)], check=True)
        total += os.path.getsize(os.path.join(dest, audio))
    json.dump(dict(title=tl.get("title", ""), fps=fps / a.step, w=w, h=h, count=len(keep), ext="webp", shots=shots, audio=audio),
              open(os.path.join(dest, "film.json"), "w"), indent=1, ensure_ascii=False)
    html = open(os.path.join(SKILL, "templates", "flipbook.html"), encoding="utf-8").read().replace("__TITLE__", tl.get("title", "film"))
    open(os.path.join(dest, "index.html"), "w", encoding="utf-8").write(html)
    print(f"{dest}/  {len(keep)} frames {w}x{h} at {fps / a.step:g} fps{' + ' + audio if audio else ''}, {total / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
