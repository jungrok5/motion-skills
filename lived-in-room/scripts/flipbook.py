#!/usr/bin/env python3
"""The walks as a web page that plays a frame sequence (no video file): for a static site or a page that takes no
video. Versions are chapters.

  flipbook.py [--step 2] [--width 640] [--quality 55]     out/frames/ → out/flipbook/{index.html, film.json, frames/}
  open out/flipbook/index.html   ·   #dawn or ?t=3.2 opens paused at that version / second
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--step', type=int, default=2, help='keep every Nth frame (2 = 12 fps from a 24 fps film)')
    ap.add_argument('--width', type=int, default=640)
    ap.add_argument('--quality', type=int, default=55)
    ap.add_argument('--out', default=None)
    a = ap.parse_args(_boot.argv())
    P = _boot.boot(a.project, need_bpy=False)
    from PIL import Image
    out = os.path.abspath(a.out) if a.out else P.out('flipbook')
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(os.path.join(out, 'frames'))
    w = a.width
    h = round(w * P.size[1] / P.size[0] / 2) * 2
    shots, i, total = [], 0, 0
    for v in P.versions:
        keep = [f for f in range(1, P.frames(v) + 1, a.step)]
        miss = [f for f in keep if not os.path.exists(P.png(v, f))]
        if miss:
            sys.exit(f'{v}: frame {miss[0]} is not developed ({len(miss)} missing): run render.py --version {v} --step {a.step} and finish.py first')
        shots.append(dict(id=v, start=i, n=len(keep)))
        for f in keep:
            i += 1
            dst = os.path.join(out, 'frames', f'{i:04d}.webp')
            Image.open(P.png(v, f)).convert('RGB').resize((w, h), Image.LANCZOS).save(dst, 'WEBP', quality=a.quality, method=6)
            total += os.path.getsize(dst)
    json.dump(dict(title=P.title, fps=P.fps / a.step, w=w, h=h, count=i, ext='webp', shots=shots, audio=None), open(os.path.join(out, 'film.json'), 'w'), indent=1, ensure_ascii=False)
    html = open(os.path.join(_boot.SKILL, 'templates', 'flipbook.html'), encoding='utf-8').read().replace('__TITLE__', P.title)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)
    print(f'{os.path.relpath(out, P.root)}/  {i} frames {w}x{h} at {P.fps / a.step:g} fps, {total / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
