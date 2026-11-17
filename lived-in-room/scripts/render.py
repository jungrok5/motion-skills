#!/usr/bin/env python3
"""Render the room.

  render.py --still night:0.5,dawn:3.2s      finished stills along the walks        → out/stills/<version>_<frame>.jpg
  render.py --view plan,desk [--supports]    the room under the WORK LIGHT, from the review views in room.py
                                             (--supports: every thing painted by its support type) → out/views/
  render.py --view desk --in night[:3.5s]    the same viewpoint under a version's own light        → out/views/desk_night.jpg
  render.py --version night [--step 2]       the frames of one walk (resumes; --step 2 = every other frame first)
  render.py --all                            every version                                → out/exr/<version>/NNNN.exr
  render.py --blend                          save the built room as a .blend per version  → out/<version>.blend

  --q draft|preview|final|hero   --spp N   --scale 0.5   --threads N
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--still')
    ap.add_argument('--view')
    ap.add_argument('--supports', action='store_true')
    ap.add_argument('--in', dest='within', help='version (and optionally a moment: night:3.5s) whose light the views are rendered in')
    ap.add_argument('--version')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--blend', action='store_true')
    ap.add_argument('--step', type=int, default=1)
    ap.add_argument('--frames', help='first-last, e.g. 1-48')
    ap.add_argument('--q', default=None)
    ap.add_argument('--spp', type=int)
    ap.add_argument('--scale', type=float)
    ap.add_argument('--threads', type=int, default=0)
    a = ap.parse_args(_boot.argv())
    P = _boot.boot(a.project)
    from PIL import Image
    from lr import finish, scene as sc
    over = {k: v for k, v in dict(spp=a.spp, scale=a.scale, threads=a.threads).items() if v}
    log = P.out('blender.log')

    def still(r, version, frame, path, quality):
        tmp = P.out('tmp', f'{os.path.basename(path)}.exr')
        t = time.time()
        with _boot.Hush(log):
            sc.render(r.scene, frame, tmp, P.seed)
        img = _boot.develop(P, version, tmp, frame)
        Image.fromarray(img).save(path, quality=92)
        s = finish.stats(img)
        print(f'{os.path.relpath(path, P.root)}  {img.shape[1]}x{img.shape[0]}  {time.time() - t:.0f}s  median {s["median"]:.0f}  p95 {s["p95"]:.0f}  p99.5 {s["p995"]:.0f}')
        os.remove(tmp)

    if a.still:
        by = {}
        for spec in a.still.split(','):
            v, f = _boot.parse_when(P, spec)
            by.setdefault(v, []).append(f)
        for v, fs in by.items():
            with _boot.Hush(log):
                r = P.build(v, a.q or 'preview', **over)
            for p in r.problems:
                print('  problem:', p)
            for f in fs:
                still(r, v, f, P.out('stills', f'{v}_{f:04d}.jpg'), a.q or 'preview')
    if a.view:
        for name in a.view.split(','):
            if a.within:
                v, f = _boot.parse_when(P, a.within if ':' in a.within else a.within + ':0.5')
                with _boot.Hush(log):
                    r = P.build(v, a.q or 'preview', view=name, **over)
                still(r, v, f, P.out('views', f'{name}_{v}.jpg'), a.q or 'preview')
                continue
            with _boot.Hush(log):
                r = P.build('work', a.q or 'preview', view=name, mode='supports' if a.supports else None, **over)
            still(r, 'work', 1, P.out('views', f'{name}{"_supports" if a.supports else ""}.jpg'), a.q or 'preview')
    versions = list(P.versions) if a.all else [a.version] if a.version else []
    for v in versions:
        q = a.q or 'final'
        with _boot.Hush(log):
            r = P.build(v, q, **over)
        for p in r.problems:
            print('  problem:', p)
        if a.blend:
            import bpy
            for im in bpy.data.images:
                if im.packed_file is None and im.has_data:
                    im.pack()
            path = P.out(f'{v}.blend')
            with _boot.Hush(log):
                bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
            print(f'{os.path.relpath(path, P.root)}  {os.path.getsize(path) / 1e6:.1f} MB  ({len(r.items)} things)')
            continue
        n = P.frames(v)
        lo, hi = (1, n)
        if a.frames:
            lo, hi = [int(x) for x in a.frames.split('-')]
        todo = [f for f in range(lo, hi + 1, a.step) if not os.path.exists(P.exr(v, f))]
        print(f'{v}: {len(todo)} frames to render of {len(range(lo, hi + 1, a.step))} (quality {q}, {r.scene.render.resolution_x * r.scene.render.resolution_percentage // 100}'
              f'x{r.scene.render.resolution_y * r.scene.render.resolution_percentage // 100}, {r.scene.cycles.samples} samples)', flush=True)
        t0 = time.time()
        for i, f in enumerate(todo, 1):
            t = time.time()
            with _boot.Hush(log):
                sc.render(r.scene, f, P.exr(v, f), P.seed)
            el = time.time() - t0
            print(f'  {v} {f:04d}  {time.time() - t:.0f}s   {i}/{len(todo)}   left ~{el / i * (len(todo) - i) / 60:.0f} min', flush=True)
    if a.blend and not versions:
        print('give --version <name> or --all with --blend')


if __name__ == '__main__':
    main()
