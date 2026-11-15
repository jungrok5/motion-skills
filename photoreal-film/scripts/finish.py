#!/usr/bin/env python3
"""Finish the rendered EXRs into the delivered frames: lens glow, aberration, vignette, tone map, grade, grain,
fades, letterbox → out/frames/00001.png … (global frame numbers). Re-run after changing the look in film.py:
nothing is re-rendered. Renders smaller than the film size are enlarged to it first.

  finish.py [--shots s01,s02] [--jobs 4] [--force] [--allow-missing]
"""
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402

_film = None


def _init(project):
    global _film
    _film = _boot.boot(project, need_bpy=False)


def _one(job):
    import numpy as np
    from PIL import Image
    from pf import exr, finish
    sid, f, src, dst = job
    s = _film.shot(sid)
    lin = exr.read_rgb(src)
    W, H = _film.size
    if lin.shape[1] != W:
        lin = np.maximum(finish.resize(lin, W, H, Image.BICUBIC), 0)
    img = finish.finish(lin, _film.look_for(s), frame=s['start'] + f, fade=finish.fade_for(s, f), bars=_film.bars, film_w=W)
    Image.fromarray(img).save(dst, compress_level=3)
    return dst


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--shots')
    ap.add_argument('--jobs', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--allow-missing', action='store_true', help='skip frames that are not rendered yet instead of failing')
    a = ap.parse_args(_boot.argv())
    film = _boot.boot(a.project, need_bpy=False)
    ids = [film.shot(x.strip())['id'] for x in a.shots.split(',')] if a.shots else [s['id'] for s in film.shots]
    jobs, missing = [], []
    for sid in ids:
        s = film.shot(sid)
        for f in range(1, s['frames'] + 1):
            src, dst = film.exr(sid, f), film.out('frames', f'{s["start"] + f:05d}.png')
            if not os.path.exists(src):
                missing.append(f'{sid}:{f}')
                continue
            if a.force or not os.path.exists(dst) or os.path.getmtime(dst) < max(os.path.getmtime(src), os.path.getmtime(os.path.join(film.root, 'film.py'))):
                jobs.append((sid, f, src, dst))
    if missing and not a.allow_missing:
        sys.exit(f'{len(missing)} frames are not rendered yet (first: {missing[0]}). Run render.py, or pass --allow-missing.')
    print(f'[finish] {len(jobs)} frames to finish, {len(missing)} missing', flush=True)
    if jobs:
        with Pool(a.jobs, initializer=_init, initargs=(a.project,)) as pool:
            for i, dst in enumerate(pool.imap_unordered(_one, jobs, chunksize=2), 1):
                if i % 24 == 0 or i == len(jobs):
                    print(f'[finish] {i}/{len(jobs)}', flush=True)


if __name__ == '__main__':
    main()
