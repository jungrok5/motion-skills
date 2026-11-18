#!/usr/bin/env python3
"""Develop the rendered frames: linear EXR → finished PNG, with the look of each version (room.py: look, and
versions[v].look). Changing exposure, grade or grain means running this again — never rendering again.

  finish.py [--version night] [--jobs 4]        out/exr/<version>/NNNN.exr → out/frames/<version>/NNNNN.png
"""
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def one(args):
    root, v, f = args
    P = _boot.boot(root, need_bpy=False)
    from PIL import Image
    Image.fromarray(_boot.develop(P, v, P.exr(v, f), f)).save(P.png(v, f))
    return f


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--version')
    ap.add_argument('--jobs', type=int, default=os.cpu_count() or 2)
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args(_boot.argv())
    P = _boot.boot(a.project, need_bpy=False)
    for v in ([a.version] if a.version else list(P.versions)):
        have = [f for f in range(1, P.frames(v) + 1) if os.path.exists(P.exr(v, f))]
        todo = [f for f in have if a.force or not os.path.exists(P.png(v, f)) or os.path.getmtime(P.png(v, f)) < os.path.getmtime(P.exr(v, f))]
        if not have:
            print(f'{v}: no rendered frames yet (render.py --version {v})')
            continue
        P.out('frames', v)
        with Pool(a.jobs) as pool:
            for i, _ in enumerate(pool.imap_unordered(one, [(P.root, v, f) for f in todo]), 1):
                if i % 48 == 0:
                    print(f'  {v} {i}/{len(todo)}', flush=True)
        print(f'{v}: {len(have)} of {P.frames(v)} frames developed → out/frames/{v}/')


if __name__ == '__main__':
    main()
