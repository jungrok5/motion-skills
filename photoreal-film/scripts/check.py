#!/usr/bin/env python3
"""Automatic checks for a film project. Exit code 1 when anything fails.

  check.py [--shots s01,s02] [--no-render] [--strict]

  structure   film.py loads, every shot has a module with build(s), plates point at real shots/frames, lengths sane
  build       every shot builds; it has a camera, a camera move, light; every mesh has a material; the focus distance
              stays inside the clip range; no unseeded randomness or wall-clock time in the shot code
  picture     three tiny draft renders per shot (first / middle / last): not blank, not black, not burnt out (fades
              excepted), something in focus, something moves between first and last
  determinism the same frame rendered twice gives the same picture (--strict: every shot, otherwise the first)
  deliverables (when present) out/frames complete and all one size; out/score.wav the film's length, not clipped
"""
import os
import re
import sys
import wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402

FAIL, WARN, OK = [], [], []


def fail(m):
    FAIL.append(m)
    print('  FAIL', m, flush=True)


def warn(m):
    WARN.append(m)
    print('  warn', m, flush=True)


def ok(m):
    OK.append(m)
    print('  ok  ', m, flush=True)


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--shots')
    ap.add_argument('--no-render', action='store_true', help='structure and build checks only')
    ap.add_argument('--strict', action='store_true', help='determinism for every shot')
    a = ap.parse_args(_boot.argv())
    film = _boot.boot(a.project)
    import numpy as np
    from PIL import Image
    from pf import exr, finish
    from pf import scene as sc
    import bpy

    ids = [film.shot(x.strip())['id'] for x in a.shots.split(',')] if a.shots else [s['id'] for s in film.shots]
    print(f'{film.title}: {len(film.shots)} shots, {film.frames} frames, {film.duration:.2f} s at {film.fps} fps, {film.size[0]}x{film.size[1]}')

    print('structure')
    if film.size[0] % 2 or film.size[1] % 2:
        fail(f'film size {film.size} must be even in both directions (H.264)')
    if film.bars and (film.bars[0] < film.size[0] or film.bars[1] < film.size[1]):
        fail(f'bars {film.bars} are smaller than the picture {film.size}')
    seen = set()
    for s in film.shots:
        if s['id'] in seen:
            fail(f'{s["id"]}: duplicate shot id')
        seen.add(s['id'])
        p = os.path.join(film.root, 'shots', s['id'] + '.py')
        if not os.path.exists(p):
            fail(f'{s["id"]}: shots/{s["id"]}.py not found')
            continue
        src = open(p).read()
        if not re.search(r'^def build\(', src, re.M):
            fail(f'{s["id"]}: no build(s) function')
        if s['frames'] < 8:
            warn(f'{s["id"]}: {s["frames"]} frames is under a third of a second')
        for bad, why in ((r'\brandom\.(random|uniform|choice|randint|gauss)\(', 'module-level random: use s.rng(tag)'),
                         (r'np\.random\.(rand|randn|random|uniform|normal)\(', 'unseeded numpy random: use np.random.RandomState(seed)'),
                         (r'\btime\.time\(|datetime\.now\(', 'wall-clock time: frames must depend on the frame number only')):
            if re.search(bad, src):
                fail(f'{s["id"]}: {why}')
        for sid, fr in s.get('plates', []):
            try:
                src_shot = film.shot(sid)
                if not 1 <= fr <= src_shot['frames']:
                    fail(f'{s["id"]}: plate {sid}:{fr} is outside that shot (1..{src_shot["frames"]})')
                if src_shot['start'] >= s['start']:
                    warn(f'{s["id"]}: plate {sid}:{fr} comes from a later shot')
            except KeyError as e:
                fail(f'{s["id"]}: plate: {e}')
    if not FAIL:
        ok(f'{len(film.shots)} shots declared, modules present')

    print('build' + ('' if a.no_render else ' + picture'))
    import render as R
    first = True
    for sid in ids:
        s = film.shot(sid)
        try:
            R.ensure_plates(film, s, 'draft', a)
            shot = film.build(sid, 'draft')
        except Exception as e:                               # a shot that does not build is the first thing to know
            import traceback
            traceback.print_exc()
            fail(f'{sid}: build failed: {type(e).__name__}: {e}')
            continue
        for m in shot.checks:
            fail(f'{sid}: {m}')
        scn = shot.scene
        bare = [o.name for o in scn.objects if o.type == 'MESH' and (not o.data.materials or any(m is None for m in o.data.materials))]
        if bare:
            fail(f'{sid}: meshes without a material (they render flat grey): {", ".join(bare[:6])}')
        lit = any(o.type == 'LIGHT' for o in scn.objects) or any(
            n.type == 'EMISSION' or (n.type == 'BSDF_PRINCIPLED' and n.inputs['Emission Strength'].default_value > 0)
            for m in bpy.data.materials if m.node_tree for n in m.node_tree.nodes)
        world_lit = any(n.type == 'TEX_SKY' or (n.type == 'BACKGROUND' and n.inputs['Strength'].default_value > 0)
                        for n in scn.world.node_tree.nodes)
        if not (lit or world_lit):
            fail(f'{sid}: nothing lights the scene')
        if shot.cam is not None and shot.focus_log:
            cs, ce = shot.cam.data.clip_start, shot.cam.data.clip_end
            bad = [f for f, v in shot.focus_log.items() if not (cs < v[2] < ce)]
            if bad:
                fail(f'{sid}: focus distance leaves the clip range {cs}..{ce} at frames {bad[:5]}')
            p0, p1 = shot.focus_log[1][0], shot.focus_log[s['frames']][0]
            l0, l1 = shot.focus_log[1][1], shot.focus_log[s['frames']][1]
            travel = sum((a - b) ** 2 for a, b in zip(p0, p1)) ** 0.5 + sum((a - b) ** 2 for a, b in zip(l0, l1)) ** 0.5
            if travel < 1e-6 and not s.get('locked'):
                warn(f'{sid}: the camera never moves (say locked=True in film.py if that is the design)')
            # an aperture wider than the subject distance allows is the commonest reason nothing is sharp
            for f in (1, s['frames']):
                _, _, dist, lens, fst = shot.focus_log[f]
                if lens / 1000.0 / fst > dist * 0.2:
                    warn(f'{sid} f{f}: aperture {lens / fst:.0f} mm across at {dist * 1000:.0f} mm focus distance — depth of field '
                         f'is under a millimetre; stop down (macro at real scale wants f/8-f/16)')
        if a.no_render or FAIL and any(m.startswith(sid) for m in FAIL):
            if a.no_render and not any(m.startswith(sid) for m in FAIL):
                ok(f'{sid}: builds, has a camera, light and materials')
            continue
        frames = sorted({1, (s['frames'] + 1) // 2, s['frames']})
        imgs = {}
        for f in frames:
            base = film.out('check', f'{sid}_{f:04d}')
            sc.render(scn, f, base + '.exr', film.seed)
            imgs[f] = R.finish_one(film, s, f, base + '.exr', base + '.jpg', grain=False)
        sharp = 0.0
        for f, img in imgs.items():
            st = finish.stats(img)
            fd = finish.fade_for(s, f)
            faded = fd is not None and fd[1] > 0.3
            if not faded:
                if st['p995'] < 28:
                    fail(f'{sid} f{f}: black frame (brightest part {st["p995"]:.0f}/255)')
                elif st['p95'] - st['p5'] < 6:
                    fail(f'{sid} f{f}: blank frame (no contrast)')
                if (img.astype(np.float32).mean(2) > 250).mean() > 0.25:
                    fail(f'{sid} f{f}: more than a quarter of the frame is burnt out')
                if st['median'] > 190:
                    warn(f'{sid} f{f}: median {st["median"]:.0f}/255 — very bright for this look')
                sharp = max(sharp, finish.sharpness(img))
        if sharp and sharp < 1.6:
            fail(f'{sid}: nothing is in focus in any checked frame (sharpness {sharp:.2f}): check focus= and fstop')
        if len(frames) > 1:
            d = np.abs(imgs[frames[0]].astype(np.float32) - imgs[frames[-1]].astype(np.float32)).mean()
            if d < 0.4 and not s.get('locked'):
                fail(f'{sid}: first and last frame are the same picture (nothing moves)')
        if first or a.strict:
            f = frames[len(frames) // 2]
            base = film.out('check', f'{sid}_{f:04d}_again')
            sc.render(scn, f, base + '.exr', film.seed)
            a1, a2 = exr.read_rgb(film.out('check', f'{sid}_{f:04d}.exr')), exr.read_rgb(base + '.exr')
            diff = float(np.abs(np.clip(a1, 0, 4) - np.clip(a2, 0, 4)).max())
            if diff > 2e-2:
                fail(f'{sid} f{f}: rendering the frame twice gives different pictures (max diff {diff:.3f}): something is not a function of the frame')
            else:
                ok(f'{sid} f{f}: deterministic (max diff {diff:.4f})')
            first = False
        ok(f'{sid}: builds, lit, in focus (sharpness {sharp:.1f}), moves')

    fr_dir = os.path.join(film.root, 'out', 'frames')
    if os.path.isdir(fr_dir) and os.listdir(fr_dir):
        print('deliverables')
        have = sorted(f for f in os.listdir(fr_dir) if f.endswith('.png'))
        miss = [f for f in range(1, film.frames + 1) if f'{f:05d}.png' not in have]
        if miss:
            warn(f'out/frames: {len(miss)} of {film.frames} frames not finished yet (first missing: {miss[0]})')
        else:
            sizes = {Image.open(os.path.join(fr_dir, f)).size for f in (have[0], have[len(have) // 2], have[-1])}
            want = tuple(film.bars or film.size)
            if sizes != {want}:
                fail(f'out/frames: sizes {sizes}, expected {want}')
            else:
                ok(f'out/frames: {film.frames} frames at {want[0]}x{want[1]}')
        wav = os.path.join(film.root, 'out', 'score.wav')
        if os.path.exists(wav):
            with wave.open(wav) as w:
                n, sr = w.getnframes(), w.getframerate()
                pcm = np.frombuffer(w.readframes(n), '<i2').astype(np.float32) / 32768
            if abs(n / sr - film.duration) > 0.1:
                fail(f'out/score.wav is {n / sr:.2f} s, the film is {film.duration:.2f} s (re-run score.py)')
            elif np.abs(pcm).max() >= 0.999:
                fail('out/score.wav clips')
            elif np.sqrt((pcm ** 2).mean()) < 1e-3:
                fail('out/score.wav is silent')
            else:
                ok(f'out/score.wav: {n / sr:.2f} s, peak {20 * np.log10(np.abs(pcm).max()):.1f} dBFS')

    print(f'\n{len(FAIL)} failed, {len(WARN)} warnings, {len(OK)} ok')
    sys.exit(1 if FAIL else 0)


if __name__ == '__main__':
    main()
