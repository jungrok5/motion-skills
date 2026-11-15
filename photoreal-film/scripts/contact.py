#!/usr/bin/env python3
"""Contact sheet: every shot at a few moments, side by side, with labels and numbers → out/contact.jpg.
Look at it before every full render: framing through the move, focus, exposure, continuity of palette.

  contact.py [--per 3] [--q draft|preview] [--shots s01,s02] [--reuse]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--per', type=int, default=3, help='frames per shot (first, middle, last …)')
    ap.add_argument('--q', default='draft', choices=['draft', 'preview', 'final'])
    ap.add_argument('--shots')
    ap.add_argument('--reuse', action='store_true', help='do not re-render stills that already exist at this quality')
    ap.add_argument('--width', type=int, default=480, help='width of one tile')
    a = ap.parse_args(_boot.argv())
    film = _boot.boot(a.project)
    import render as R
    from PIL import Image, ImageDraw
    from pf import draw, finish
    from pf import scene as sc

    ids = [film.shot(x.strip())['id'] for x in a.shots.split(',')] if a.shots else [s['id'] for s in film.shots]
    tw = a.width
    th = round(tw * film.size[1] / film.size[0])
    pad, label = 6, 22
    sheet = Image.new('RGB', (a.per * (tw + pad) + pad, len(ids) * (th + label + pad) + pad), (24, 24, 26))
    d = ImageDraw.Draw(sheet)
    font = draw.font(14)
    for row, sid in enumerate(ids):
        s = film.shot(sid)
        frames = sorted({1 + round(i * (s['frames'] - 1) / max(1, a.per - 1)) for i in range(a.per)}) if a.per > 1 else [(s['frames'] + 1) // 2]
        paths = [film.out('stills', f'{sid}_{f:04d}_{a.q}') for f in frames]
        if not (a.reuse and all(os.path.exists(p + '.jpg') for p in paths)):
            R.ensure_plates(film, s, a.q, a)
            shot = film.build(sid, a.q)
            for msg in shot.checks:
                print(f'[warn] {sid}: {msg}')
            for f, p in zip(frames, paths):
                sc.render(shot.scene, f, p + '.exr', film.seed)
                R.finish_one(film, s, f, p + '.exr', p + '.jpg')
        for col, (f, p) in enumerate(zip(frames, paths)):
            im = Image.open(p + '.jpg').convert('RGB')
            import numpy as np
            st = finish.stats(np.asarray(im))
            x, y = pad + col * (tw + pad), pad + row * (th + label + pad)
            sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + label))
            d.text((x, y + 3), f'{sid}  f{f}/{s["frames"]}  {s["start"] / film.fps + (f - 1) / film.fps:5.2f}s   med {st["median"]:.0f}  p95 {st["p95"]:.0f}',
                   font=font, fill=(200, 200, 205))
        print(f'[contact] {sid}', flush=True)
    out = film.out('contact.jpg')
    sheet.save(out, quality=90)
    print(os.path.relpath(out, film.root))


if __name__ == '__main__':
    main()
