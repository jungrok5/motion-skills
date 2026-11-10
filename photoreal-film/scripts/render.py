#!/usr/bin/env python3
"""Render stills or the film's frames with Cycles → linear EXR (+ a finished JPEG next to every still).

  render.py --still s01:0.5,s03:40 [--q preview]     stills: out/stills/<shot>_<frame>_<q>.exr + .jpg
  render.py --shots s01,s02 | --all [--q final]      frames: out/exr/<shot>/<frame>.exr  (resumes: existing frames are kept)
  options: --q draft|preview|final|hero   --spp N   --scale F   --frames A-B   --force   --every N (every Nth frame)
Run from the project folder (or --project DIR).
"""
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def ensure_plates(film, s, q, args):
    """A shot that shows a finished frame of another shot (a photo, a screen) needs that frame first."""
    for sid, fr in s.get('plates', []):
        src = film.shot(sid)
        p = film.plate_path(src['id'], fr)
        tag = p + '.q'
        have = open(tag).read().strip() if os.path.exists(tag) else ''
        order = ['draft', 'preview', 'final', 'hero']
        if os.path.exists(p) and have in order and order.index(have) >= order.index(q):
            continue
        print(f'[plate] {src["id"]}:{fr} at {q} for {s["id"]}', flush=True)
        cmd = [sys.executable, os.path.abspath(__file__), '--project', film.root, '--plate', f'{src["id"]}:{fr}', '--q', q]
        subprocess.run(cmd, check=True)
        open(tag, 'w').write(q)


def finish_one(film, s, f, exr_path, out_path, bars=None, grain=True, gframe=None):
    import numpy as np  # noqa: F401
    from PIL import Image
    from pf import exr, finish
    look = film.look_for(s)
    if not grain:
        look = {**look, 'grain': 0.0}
    img = finish.finish(exr.read_rgb(exr_path), look, frame=s['start'] + f if gframe is None else gframe,
                        fade=finish.fade_for(s, f), bars=bars, film_w=film.size[0])
    Image.fromarray(img).save(out_path, quality=93)
    return img


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--still', help='comma list of shot:frame (frame = local number, or 0..1 with a dot)')
    ap.add_argument('--shots', help='comma list of shot ids to render in full')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--plate', help=argparse_hide())
    ap.add_argument('--q', default=None, choices=['draft', 'preview', 'final', 'hero'])
    ap.add_argument('--spp', type=int)
    ap.add_argument('--scale', type=float)
    ap.add_argument('--frames', help='A-B: only these local frames (with one shot)')
    ap.add_argument('--every', type=int, default=1)
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--threads', type=int, default=0)
    a = ap.parse_args(_boot.argv())
    film = _boot.boot(a.project)
    from pf import scene as sc
    over = {k: v for k, v in (('spp', a.spp), ('scale', a.scale), ('threads', a.threads)) if v}

    if a.plate:
        s, f = _boot.parse_frame(film, a.plate)
        q = a.q or 'final'
        ensure_plates(film, s, q, a)
        shot = film.build(s['id'], q, **over)
        tmp = film.out('plates', f'{s["id"]}_{f:04d}.exr')
        sc.render(shot.scene, f, tmp, film.seed)
        finish_one(film, s, f, tmp, film.plate_path(s['id'], f), bars=None, grain=False)
        return

    if a.still:
        q = a.q or 'preview'
        todo = {}
        for spec in a.still.split(','):
            s, f = _boot.parse_frame(film, spec.strip())
            todo.setdefault(s['id'], []).append(f)
        for sid, frames in todo.items():
            s = film.shot(sid)
            ensure_plates(film, s, q, a)
            t0 = time.time()
            shot = film.build(sid, q, **over)
            for msg in shot.checks:
                print(f'[warn] {sid}: {msg}')
            tb = time.time() - t0
            for f in frames:
                t0 = time.time()
                base = film.out('stills', f'{sid}_{f:04d}_{q}')
                sc.render(shot.scene, f, base + '.exr', film.seed)
                finish_one(film, s, f, base + '.exr', base + '.jpg', bars=None)
                print(f'[still] {os.path.relpath(base + ".jpg", film.root)}  build {tb:.1f}s  render {time.time() - t0:.1f}s', flush=True)
        return

    ids = [s['id'] for s in film.shots] if a.all else [film.shot(x.strip())['id'] for x in (a.shots or '').split(',') if x.strip()]
    if not ids:
        ap.error('nothing to do: give --still, --shots or --all')
    q = a.q or 'final'
    if len(ids) > 1:
        # one process per shot: a shot that fails does not take the rest with it, memory is returned between shots,
        # and each shot starts from the code as it is on disk
        failed = []
        for sid in ids:
            cmd = [sys.executable, os.path.abspath(__file__), '--project', film.root, '--shots', sid, '--q', q, '--every', str(a.every)]
            for k, v in (('--spp', a.spp), ('--scale', a.scale), ('--threads', a.threads)):
                if v:
                    cmd += [k, str(v)]
            if a.force:
                cmd.append('--force')
            if subprocess.run(cmd).returncode:
                failed.append(sid)
                print(f'[fail] {sid}: see the traceback above; the other shots continue', flush=True)
        if failed:
            sys.exit(f'{len(failed)} shot(s) failed: {", ".join(failed)}')
        return
    log = open(film.out('render.log'), 'a')
    for sid in ids:
        s = film.shot(sid)
        lo, hi = 1, s['frames']
        if a.frames:
            lo, hi = (int(v) for v in a.frames.split('-'))
        frames = [f for f in range(lo, hi + 1, a.every) if a.force or not os.path.exists(film.exr(sid, f))]
        if not frames:
            print(f'[skip] {sid}: all frames present')
            continue
        ensure_plates(film, s, q, a)
        t0 = time.time()
        shot = film.build(sid, q, **over)
        for msg in shot.checks:
            print(f'[warn] {sid}: {msg}')
        print(f'[shot] {sid}: {len(frames)} frames at {q}, built in {time.time() - t0:.1f}s', flush=True)
        for f in frames:
            t0 = time.time()
            sc.render(shot.scene, f, film.exr(sid, f), film.seed)
            dt = time.time() - t0
            log.write(f'{sid},{f},{q},{dt:.2f}\n')
            log.flush()
            print(f'[frame] {sid} {f}/{s["frames"]}  {dt:.1f}s', flush=True)


def argparse_hide():
    import argparse
    return argparse.SUPPRESS


if __name__ == '__main__':
    main()
