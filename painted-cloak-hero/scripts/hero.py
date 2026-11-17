#!/usr/bin/env python3
"""cloth-rig-character command line. Run from the project folder (the one with character.json).

    python3 <skill>/scripts/hero.py new my-hero [--from starter|hanbok-girl|raincoat-kid]
    python3 <skill>/scripts/hero.py build            character.json -> out/character.blend, .glb, motion.json
    python3 <skill>/scripts/hero.py check            build + checks (body limits, feet, facing, cloth) -> out/check.json
    python3 <skill>/scripts/hero.py stills [--clip walk] [--count 12]   contact sheet -> out/stills.png
    python3 <skill>/scripts/hero.py sheet            turnaround (both ways + back) + cast sheet of the motion poses
    python3 <skill>/scripts/hero.py render [--res 1280x720 --samples 16]  review MP4 -> out/review.mp4
    python3 <skill>/scripts/hero.py player           copy the three.js review player + glb into out/player/

Needs Blender's Python: either `pip install bpy` (matching Python) and run with python3, or Blender itself:
    blender -b --python <skill>/scripts/hero.py -- build
"""
import argparse
import json
import os
import shutil
import sys

sys.dont_write_bytecode = True        # keep __pycache__ out of the skill folder
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, SKILL)


def argv():
    a = sys.argv
    if '--' in a:
        return a[a.index('--') + 1:]
    return a[1:]


def cmd_new(ns):
    src = {'starter': os.path.join(SKILL, 'starter')}.get(ns.src) or os.path.join(SKILL, 'examples', ns.src)
    if not os.path.isdir(src):
        sys.exit(f'no such starter/example: {ns.src}')
    os.makedirs(ns.dir, exist_ok=True)
    for f in os.listdir(src):
        if f in ('out',):
            continue
        p = os.path.join(src, f)
        if os.path.isfile(p) and not os.path.exists(os.path.join(ns.dir, f)):
            shutil.copy(p, ns.dir)
    if not os.path.exists(os.path.join(ns.dir, 'BRIEF.md')):
        shutil.copy(os.path.join(SKILL, 'references', 'BRIEF.md'), os.path.join(ns.dir, 'BRIEF.md'))
    print(f'{ns.dir}: character.json + BRIEF.md from {ns.src}. Rewrite BRIEF.md for your hero first, then the spec.')


def _build(ns):
    from pch import build
    return build.build(ns.spec, ns.out, glb=True)


def cmd_build(ns):
    sp, body, ctx, rig, data, frames = _build(ns)
    print(f"built {data['name']}: {data['pieces']} pieces, {data['bones']} bones, {len(data['chains'])} cloth chains, "
          f"{data.get('n', 0)} frames @ {data.get('fps')} fps -> {ns.out}/character.blend, character.glb")


def cmd_check(ns):
    import tempfile
    from pch import build, check
    import bpy
    sp, body, ctx, rig, data, frames = _build(ns)
    h0 = check.motion_hash(frames)
    res = check.run(data, frames, rig=bpy.data.objects['rig'])
    tmp = tempfile.mkdtemp()
    sp2, _, _, _, _, frames2 = build.build(ns.spec, tmp, glb=False)
    res += check.run(data, frames, rehash=(h0, check.motion_hash(frames2)))[-1:]
    shutil.rmtree(tmp, ignore_errors=True)
    bad = 0
    for r in res:
        print(('PASS ' if r['ok'] else 'FAIL ') + r['check'] + ' — ' + r['detail'])
        bad += not r['ok']
    with open(os.path.join(ns.out, 'check.json'), 'w') as f:
        json.dump(res, f, indent=1)
    print(f'{len(res) - bad}/{len(res)} checks pass')
    if bad:
        sys.exit(1)


def _ensure(ns):
    if not os.path.exists(os.path.join(ns.out, 'character.blend')) or ns.rebuild:
        _build(ns)
    from pch import render
    render.open_blend(os.path.join(ns.out, 'character.blend'))
    with open(os.path.join(ns.out, 'motion.json')) as f:
        data = json.load(f)
    return render, data


def cmd_stills(ns):
    render, data = _ensure(ns)
    import bpy
    s = bpy.context.scene
    fps = data['fps']
    a, b = s.frame_start, s.frame_end
    if ns.clip:
        cs = [c for c in data['clips'] if c['label'] == ns.clip or c['type'] == ns.clip]
        if not cs:
            sys.exit(f'no clip {ns.clip}; clips: {[c["label"] for c in data["clips"]]}')
        a = int(round(cs[0]['t0'] * fps)) + 1
        b = a + int(round(cs[0]['dur'] * fps)) - 1
    n = ns.count
    picks = sorted({int(round(a + (b - a) * i / max(1, n - 1))) for i in range(n)})
    d = os.path.join(ns.out, 'stills')
    shutil.rmtree(d, ignore_errors=True)
    from pch import scene as SC
    SC.setup_render((640, 360), ns.samples)
    s.camera = bpy.data.objects['review_cam']
    paths = []
    os.makedirs(d, exist_ok=True)
    for f in picks:
        s.frame_set(f)
        p = os.path.join(d, f'{f:04d}.png')
        s.render.filepath = p
        bpy.ops.render.render(write_still=True)
        paths.append(p)
    labels = []
    for f in picks:
        t = (f - 1) / fps
        lab = [c['label'] for c in data['clips'] if c['t0'] <= t + 1e-6][-1]
        labels.append(f'f{f} · {t:.2f}s · {lab}')
    out = os.path.join(ns.out, f'stills{"-" + ns.clip if ns.clip else ""}.png')
    render._sheet(paths, labels, out, cols=4)
    print(out)


def cmd_sheet(ns):
    render, data = _ensure(ns)
    back = render.turnaround(ns.out, data['H'], samples=ns.samples)
    cast = render.castsheet(ns.out, data['H'], data, samples=ns.samples)
    print(os.path.join(ns.out, 'turnaround.png'), cast)


def cmd_render(ns):
    render, data = _ensure(ns)
    w, h = (int(x) for x in ns.res.split('x'))
    sp_dir = os.path.dirname(os.path.abspath(ns.spec))
    concept = os.path.join(sp_dir, 'concept', 'back.png')
    back = concept if os.path.exists(concept) else os.path.join(ns.out, 'turn', 'back.png')
    if not os.path.exists(back):
        back = render.turnaround(ns.out, data['H'], samples=ns.samples)
        render.open_blend(os.path.join(ns.out, 'character.blend'))
    render.frames(ns.out, (w, h), ns.samples, every=ns.every, resume=not ns.fresh)
    out = render.compose(ns.out, data, back, os.path.join(ns.out, 'review.mp4'), (w, h))
    print(out)


def cmd_player(ns):
    d = os.path.join(ns.out, 'player')
    shutil.copytree(os.path.join(SKILL, 'player'), d, dirs_exist_ok=True)
    shutil.copy(os.path.join(ns.out, 'character.glb'), d)
    with open(os.path.join(ns.out, 'motion.json')) as f:
        data = json.load(f)
    meta = {k: data[k] for k in ('name', 'title', 'review', 'fps', 'n', 'duration', 'clips', 'camera', 'H') if k in data}
    back = os.path.join(ns.out, 'turn', 'back.png')
    if os.path.exists(back):
        shutil.copy(back, os.path.join(d, 'back.png'))
        meta['back'] = 'back.png'
    with open(os.path.join(d, 'meta.json'), 'w') as f:
        json.dump(meta, f)
    print(f'{d}/index.html (serve the folder: python3 -m http.server)')


def main():
    ap = argparse.ArgumentParser(prog="hero.py")
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('new')
    p.add_argument('dir')
    p.add_argument('--from', dest='src', default='starter')
    for name in ('build', 'check', 'stills', 'sheet', 'render', 'player'):
        q = sub.add_parser(name)
        q.add_argument('spec', nargs='?', default='character.json')
        q.add_argument('--out', default='out')
        q.add_argument('--rebuild', action='store_true')
        q.add_argument('--samples', type=int, default=16)
        if name == 'stills':
            q.add_argument('--clip')
            q.add_argument('--count', type=int, default=12)
        if name == 'render':
            q.add_argument('--res', default='1280x720')
            q.add_argument('--every', type=int, default=1)
            q.add_argument('--fresh', action='store_true')
    ns = ap.parse_args(argv())
    {'new': cmd_new, 'build': cmd_build, 'check': cmd_check, 'stills': cmd_stills, 'sheet': cmd_sheet,
     'render': cmd_render, 'player': cmd_player}[ns.cmd](ns)


if __name__ == '__main__':
    main()
