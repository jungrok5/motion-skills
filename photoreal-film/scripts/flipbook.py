#!/usr/bin/env python3
"""A web page that plays the film as a frame sequence (no video file): out/flipbook/ with index.html, film.json,
frames/NNNN.webp and the score. For sharing a cut on a static site or embedding in a page.

  flipbook.py [--step 2] [--width 640] [--quality 55] [--no-audio] [--bars]
  open:  out/flipbook/index.html   ·   #s03 or ?t=3.2 opens paused at that shot / second
"""
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--step', type=int, default=2, help='keep every Nth frame (2 = 12 fps from a 24 fps film)')
    ap.add_argument('--width', type=int, default=640)
    ap.add_argument('--quality', type=int, default=55)
    ap.add_argument('--no-audio', action='store_true')
    ap.add_argument('--bars', action='store_true', help='keep the letterbox bars (default: the picture area only)')
    ap.add_argument('--out', default=None)
    a = ap.parse_args(_boot.argv())
    film = _boot.boot(a.project, need_bpy=False)
    from PIL import Image
    src = film.out('frames')
    out = os.path.abspath(a.out) if a.out else film.out('flipbook')
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(os.path.join(out, 'frames'))
    keep = list(range(1, film.frames + 1, a.step))
    W, H = film.size
    bw, bh = film.bars or film.size
    w = a.width
    h = round(w * (bh if a.bars else H) / (bw if a.bars else W) / 2) * 2
    total = 0
    for i, f in enumerate(keep, 1):
        p = os.path.join(src, f'{f:05d}.png')
        if not os.path.exists(p):
            sys.exit(f'{os.path.relpath(p, film.root)} is missing: run render.py and finish.py first')
        im = Image.open(p).convert('RGB')
        if not a.bars and im.size != (W, H):
            ox, oy = (im.width - W) // 2, (im.height - H) // 2
            im = im.crop((ox, oy, ox + W, oy + H))
        dst = os.path.join(out, 'frames', f'{i:04d}.webp')
        im.resize((w, h), Image.LANCZOS).save(dst, 'WEBP', quality=a.quality, method=6)
        total += os.path.getsize(dst)
    audio = None
    wav = film.out('score.wav')
    if not a.no_audio and os.path.exists(wav):
        audio = 'score.m4a'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '80k',
                        os.path.join(out, audio)], check=True)
        total += os.path.getsize(os.path.join(out, audio))
    shots = [dict(id=s['id'], start=(s['start'] + a.step - 1) // a.step, n=max(1, s['frames'] // a.step)) for s in film.shots]
    json.dump(dict(title=film.title, fps=film.fps / a.step, w=w, h=h, count=len(keep), ext='webp', shots=shots, audio=audio),
              open(os.path.join(out, 'film.json'), 'w'), indent=1)
    html = open(os.path.join(_boot.SKILL, 'templates', 'flipbook.html')).read().replace('__TITLE__', film.title)
    open(os.path.join(out, 'index.html'), 'w').write(html)
    print(f'{os.path.relpath(out, film.root)}/  {len(keep)} frames {w}x{h} at {film.fps / a.step:g} fps, {total / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
