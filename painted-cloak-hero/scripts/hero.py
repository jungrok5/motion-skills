#!/usr/bin/env python3
"""painted-cloak-hero command line. Run from the project folder (the one with character.json).

    python3 <skill>/scripts/hero.py new my-hero [--from starter|<example>]
    python3 <skill>/scripts/hero.py build                 character.json -> out/character.blend, .glb, motion.json
    python3 <skill>/scripts/hero.py check                 build + checks -> out/check.json, out/REVIEW.md (what's off)
    python3 <skill>/scripts/hero.py concept               front + back view -> concept/ (only where none was given)
    python3 <skill>/scripts/hero.py sheet                 turnaround + cast sheet (both sides, motion poses)
    python3 <skill>/scripts/hero.py stills [--clip walk]  contact sheet of one clip (or all) -> out/stills-<clip>.png
    python3 <skill>/scripts/hero.py clip walk             one clip's review MP4 -> out/clips/walk.mp4
    python3 <skill>/scripts/hero.py review                checks + every clip's MP4 + review.mp4 + REVIEW.md
    python3 <skill>/scripts/hero.py player                three.js review player + glb -> out/player/

Needs Blender's Python: `pip install bpy` (Python 3.13 for bpy 5.x) and run with that python, or Blender itself:
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
        p = os.path.join(src, f)
        if os.path.isfile(p) and not os.path.exists(os.path.join(ns.dir, f)):
            shutil.copy(p, ns.dir)
    if not os.path.exists(os.path.join(ns.dir, 'BRIEF.md')):
        shutil.copy(os.path.join(SKILL, 'references', 'BRIEF.md'), os.path.join(ns.dir, 'BRIEF.md'))
    print(f'{ns.dir}: character.json + BRIEF.md from {ns.src}. Rewrite BRIEF.md for your hero first, then the spec.')


def _build(ns, out=None, glb=True):
    from pch import build
    return build.build(ns.spec, out or ns.out, glb=glb)


def cmd_build(ns):
    sp, body, ctx, rig, data, clips = _build(ns)
    print(f"built {data['name']}: {data['pieces']} pieces, {data['bones']} bones, {len(data['chains'])} cloth chains; clips: " +
          ', '.join(f"{c['label']} ({c['n']} f{' loop' if c['loop'] else ''})" for c in clips) + f" -> {ns.out}/")


def run_checks(ns):
    import tempfile
    import bpy
    from pch import check
    sp, body, ctx, rig, data, clips = _build(ns)
    res = check.run(data, clips, rig=bpy.data.objects['rig'])
    tmp = tempfile.mkdtemp()
    _, _, _, _, _, clips2 = _build(ns, out=tmp, glb=False)
    res += check.run(data, clips, rehash=(check.motion_hash(clips), check.motion_hash(clips2)))[-1:]
    shutil.rmtree(tmp, ignore_errors=True)
    with open(os.path.join(ns.out, 'check.json'), 'w') as f:
        json.dump(res, f, indent=1)
    notes = check.notes(data, clips, res)
    return sp, data, clips, res, notes


def write_review(ns, sp, data, res, notes, media=()):
    lines = [f"# {data['title']} — review", '',
             f"{data['pieces']} pieces, {data['bones']} bones, {len(data['chains'])} cloth chains · clips: " +
             ', '.join(f"{c['label']} {c['n']} frames{' (loop)' if c['loop'] else ''}" for c in data['clips']), '',
             "## What's off", '']
    if notes:
        for i, (lvl, what, knob) in enumerate(notes, 1):
            lines.append(f'{i}. **{lvl}** {what} → {knob}')
    else:
        lines.append('Nothing the checks can measure. Now look (below).')
    lines += ['', '## Checks', ''] + [f"- {'PASS' if r['ok'] else 'FAIL'} {r['check']} — {r['detail']}" for r in res]
    lines += ['', '## Look at the renders (score each with references/BRIEF.md)', '',
              '- Does the cloak follow the body, or move with it? On the turn, does the hem swing wide and keep going after the body stops?',
              '- Does anything float, skate or stand dead still? Does the turn gather (wind-up) and land (recovery)?',
              '- Head turned or body turned? Front / back / left / right agree (the cast sheet, both sides)?',
              '- Brush strokes read as paint on the cloak, hat and clothes — and stay glued to the cloth when it moves?',
              '- The frayed hem and brim edge: ragged like a painted edge, not holes?',
              '- Is the hero clear of the concept inset at every orbit angle?', '']
    for m in media:
        lines.append(f'- {m}')
    with open(os.path.join(ns.out, 'REVIEW.md'), 'w') as f:
        f.write('\n'.join(lines) + '\n')
    return os.path.join(ns.out, 'REVIEW.md')


def cmd_check(ns):
    sp, data, clips, res, notes = run_checks(ns)
    bad = 0
    for r in res:
        print(('PASS ' if r['ok'] else 'FAIL ') + r['check'] + ' — ' + r['detail'])
        bad += not r['ok']
    print(f'{len(res) - bad}/{len(res)} checks pass')
    if notes:
        print("what's off:")
        for lvl, what, knob in notes:
            print(f'  {lvl} {what} -> {knob}')
    print(write_review(ns, sp, data, res, notes))
    if bad:
        sys.exit(1)


def _ensure(ns):
    if not os.path.exists(os.path.join(ns.out, 'character.blend')) or ns.rebuild:
        _build(ns)
    from pch import render
    render.open_blend(os.path.join(ns.out, 'character.blend'))
    with open(os.path.join(ns.out, 'motion.json')) as f:
        data = json.load(f)
    from pch import spec as S, body as B
    sp = S.load(ns.spec)
    return render, data, sp, B.Body(sp)


def _clips(data, name):
    if not name:
        return data['clips']
    cs = [c for c in data['clips'] if c['label'] == name or c['type'] == name]
    if not cs:
        sys.exit(f'no clip {name}; clips: {[c["label"] for c in data["clips"]]}')
    return cs


def _inset(ns, render, data, body):
    d = os.path.join(os.path.dirname(os.path.abspath(ns.spec)), 'concept')
    back = os.path.join(d, 'back.png')
    if not os.path.exists(back):
        render.concept(d, body.H, data['clips'][0], samples=ns.samples)
    return back


def cmd_concept(ns):
    render, data, sp, body = _ensure(ns)
    d = os.path.join(os.path.dirname(os.path.abspath(ns.spec)), 'concept')
    print(render.concept(d, body.H, data['clips'][0], samples=max(ns.samples, 24)))


def cmd_sheet(ns):
    render, data, sp, body = _ensure(ns)
    a = render.turnaround(ns.out, body.H, data['clips'][0], samples=ns.samples)
    b = render.castsheet(ns.out, body.H, data['clips'], samples=ns.samples)
    print(a, b)


def cmd_stills(ns):
    render, data, sp, body = _ensure(ns)
    import bpy
    from pch import scene as SC
    from pch.build import place_camera, orbit_yaw
    s = bpy.context.scene
    SC.setup_render((640, 360), ns.samples)
    cam = bpy.data.objects['review_cam']
    s.camera = cam
    outs = []
    for c in _clips(data, ns.clip):
        n = c['n']
        k = ns.count
        picks = sorted({int(round(i * (n - (1 if c['loop'] else 0)) / max(1, k - 1))) for i in range(k)})
        d = os.path.join(ns.out, 'stills', c['label'])
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d, exist_ok=True)
        render.set_clip(c)
        paths, labels = [], []
        for f in picks:
            s.frame_set(f + 1)
            render.set_floor(c, f / c['fps'], data['grid'])
            place_camera(cam, sp, body, orbit_yaw(sp, f / max(1, n)))
            p = os.path.join(d, f'{f + 1:04d}.png')
            s.render.filepath = p
            bpy.ops.render.render(write_still=True)
            paths.append(p)
            labels.append(f"{c['label']} · {f + 1} / {n} · {f / c['fps']:.2f}s")
        out = os.path.join(ns.out, f"stills-{c['label']}.png")
        render._sheet(paths, labels, out, cols=4)
        outs.append(out)
    print('\n'.join(outs))


def _render_clips(ns, render, data, sp, body, names=None):
    w, h = (int(x) for x in ns.res.split('x'))
    inset = _inset(ns, render, data, body)
    render.open_blend(os.path.join(ns.out, 'character.blend'))
    outs = []
    for c in _clips(data, names):
        d, total = render.clip_frames(ns.out, sp, body, data, c, res=(w, h), samples=ns.samples, resume=not ns.fresh)
        mp4 = render.compose_clip(d, c, data['review'].get('title', 'HERO / ANIMATION REVIEW'), inset,
                                  os.path.join(ns.out, 'clips', f"{c['label']}.mp4"), (w, h))
        outs.append(mp4)
        print(mp4)
    return outs


def cmd_clip(ns):
    render, data, sp, body = _ensure(ns)
    _render_clips(ns, render, data, sp, body, ns.name)


def cmd_review(ns):
    sp, data, clips, res, notes = run_checks(ns)
    for r in res:
        print(('PASS ' if r['ok'] else 'FAIL ') + r['check'] + ' — ' + r['detail'])
    render, data, sp, body = _ensure(ns)
    outs = _render_clips(ns, render, data, sp, body)
    rv = render.concat(outs, os.path.join(ns.out, 'review.mp4'))
    media = [f'clip: {os.path.relpath(p, ns.out)}' for p in outs] + [f'all clips: {os.path.relpath(rv, ns.out)}']
    print(write_review(ns, sp, data, res, notes, media))


def cmd_player(ns):
    d = os.path.join(ns.out, 'player')
    shutil.copytree(os.path.join(SKILL, 'player'), d, dirs_exist_ok=True)
    shutil.copy(os.path.join(ns.out, 'character.glb'), d)
    with open(os.path.join(ns.out, 'motion.json')) as f:
        data = json.load(f)
    meta = {k: data[k] for k in ('name', 'title', 'review', 'fps', 'camera', 'cam_fn', 'H', 'grid') if k in data}
    meta['clips'] = [{k: c[k] for k in ('label', 'type', 'loop', 'n', 'dur', 'speed', 'fwd')} for c in data['clips']]
    back = os.path.join(os.path.dirname(os.path.abspath(ns.spec)), 'concept', 'back.png')
    if os.path.exists(back):
        shutil.copy(back, os.path.join(d, 'back.png'))
        meta['back'] = 'back.png'
    with open(os.path.join(d, 'meta.json'), 'w') as f:
        json.dump(meta, f)
    print(f'{d}/index.html (serve the folder: python3 -m http.server)')


def main():
    ap = argparse.ArgumentParser(prog='hero.py')
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('new')
    p.add_argument('dir')
    p.add_argument('--from', dest='src', default='starter')
    for name in ('build', 'check', 'concept', 'sheet', 'stills', 'clip', 'review', 'player'):
        q = sub.add_parser(name)
        if name == 'clip':
            q.add_argument('name')
        q.add_argument('spec', nargs='?', default='character.json')
        q.add_argument('--out', default='out')
        q.add_argument('--rebuild', action='store_true')
        q.add_argument('--samples', type=int, default=16)
        if name == 'stills':
            q.add_argument('--clip')
            q.add_argument('--count', type=int, default=8)
        if name in ('clip', 'review'):
            q.add_argument('--res', default='1280x720')
            q.add_argument('--fresh', action='store_true')
    ns = ap.parse_args(argv())
    {'new': cmd_new, 'build': cmd_build, 'check': cmd_check, 'concept': cmd_concept, 'sheet': cmd_sheet,
     'stills': cmd_stills, 'clip': cmd_clip, 'review': cmd_review, 'player': cmd_player}[ns.cmd](ns)


if __name__ == '__main__':
    main()
