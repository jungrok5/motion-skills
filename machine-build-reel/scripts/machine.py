#!/usr/bin/env python3
"""machine-build-reel command line. Run from the project folder (the one with machine.py).

    python3 <skill>/scripts/machine.py new my-machine [--from starter|<example>]
    python3 <skill>/scripts/machine.py build            machine.py -> out/machine.blend, machine.glb, machine_info.json
    python3 <skill>/scripts/machine.py check            build + 14 checks -> out/check.json, out/REVIEW.md (fails = exit 1)
    python3 <skill>/scripts/machine.py sheet            turnaround (both sides) + motion sheet + plates -> out/*.png
    python3 <skill>/scripts/machine.py still --action walk --t 1.2 [--yaw -50 --elev 5]   one framed still
    python3 <skill>/scripts/machine.py reel [--res 1280x720 --samples 32 --only walk,head --step 1]
                                                      the film -> out/reel/reel.mp4 (resumable; checks must pass)
    python3 <skill>/scripts/machine.py player           three.js player + glb -> out/player/
    python3 <skill>/scripts/machine.py jobs             reference-image prompts -> refs/jobs_*.json (no calls made)

Needs Blender's Python: `pip install bpy` (bpy 5.x needs Python 3.13) and run with that python, or Blender itself:
    blender -b --python <skill>/scripts/machine.py -- check
"""
import argparse
import json
import os
import shutil
import sys

sys.dont_write_bytecode = True
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, SKILL)


def argv():
    a = sys.argv
    return a[a.index('--') + 1:] if '--' in a else a[1:]


def quiet():
    """The glTF exporter and Cycles are chatty; keep the console to what matters."""
    import logging
    logging.getLogger('glTFImporter').setLevel(logging.ERROR)
    logging.getLogger().setLevel(logging.ERROR)


def cmd_new(ns):
    src = os.path.join(SKILL, 'starter') if ns.src == 'starter' else os.path.join(SKILL, 'examples', ns.src)
    if not os.path.isdir(src):
        sys.exit(f'no such starter/example: {ns.src}')
    os.makedirs(ns.dir, exist_ok=True)
    for f in os.listdir(src):
        p = os.path.join(src, f)
        if os.path.isfile(p) and not os.path.exists(os.path.join(ns.dir, f)):
            shutil.copy(p, ns.dir)
    for f in ('BRIEF.md', 'PARTS.md'):
        if not os.path.exists(os.path.join(ns.dir, f)):
            shutil.copy(os.path.join(SKILL, 'templates', f), os.path.join(ns.dir, f))
    with open(os.path.join(ns.dir, '.gitignore'), 'a') as f:
        f.write('out/\nref/\nrefs/**/*.png\nrefs/**/*.jpg\nrefs/**/*.webp\nrefs/motion/\n')   # generated media stays out
    print(f'{ns.dir}: machine.py, BRIEF.md, PARTS.md from {ns.src}. Write BRIEF.md and PARTS.md for YOUR machine '
          f'first, then rewrite machine.py (the numbers and the parts).')


def _build(ns, glb=True):
    from mbr import build
    return build.build(ns.spec, ns.out, glb=glb)


def cmd_build(ns):
    mc, k, arm, RR, info = _build(ns)
    print(f"built {info['title']}: {info['n_parts']} parts ({info['n_unique_meshes']} meshes), {info['n_bones']} bones, "
          f"{len(info['actuators'])} actuators, height {info['height']:.1f} m; actions: " +
          ', '.join(f"{a} {v['dur']:.1f}s" for a, v in info['actions'].items()) + f' -> {ns.out}/')


def run_checks(ns):
    from mbr import build, check
    mc, k, arm, RR, info = _build(ns, glb=False)
    res = check.run(mc, k, arm, RR)
    h1 = check.motion_hash(mc)
    h2 = check.motion_hash(build.Machine(ns.spec))
    res.append(check.R('determinism', h1 == h2, h1[:10], 'the spec rebuilt twice gives the same poses'))
    with open(os.path.join(ns.out, 'check.json'), 'w') as f:
        json.dump(res, f, indent=1)
    write_review(ns, info, res)
    return mc, k, arm, RR, info, res


def write_review(ns, info, res, extra=()):
    fails = [r for r in res if r['fail']]
    lines = [f"# {info['title']} — review", '',
             f"{info['n_parts']} parts ({info['n_unique_meshes']} meshes) · {info['n_bones']} bones · "
             f"{len(info['actuators'])} hydraulic actuators · height {info['height']:.1f} m · walk {info['walk']['speed']:.2f} m/s", '',
             "## What's off", '']
    if not fails:
        lines.append('Nothing the checks can see. Now score the sheets and the reel stills with references/BRIEF.md.')
    for r in fails:
        lines.append(f"- **{r['name']}** — {r['value']}. {r['detail']}")
    lines += ['', '## Checks', '', '| check | result | value | detail |', '|---|---|---|---|']
    for r in res:
        lines.append(f"| {r['name']} | {'ok' if r['ok'] else 'FAIL'} | {r['value']} | {r['detail']} |")
    lines += ['', '## Look at these (a person, or you, before the reel)', '',
              '- turnaround: do front / back / left / right agree? does every joint read as a mechanism up close?',
              '- motion sheet: does each big move gather first and land after? does anything float, slide or stand dead?',
              '- plates vs references (or drawings): list every difference in BRIEF.md — fix it or accept it, in writing.']
    lines += list(extra)
    with open(os.path.join(ns.out, 'REVIEW.md'), 'w') as f:
        f.write('\n'.join(lines) + '\n')


def cmd_check(ns):
    *_, res = run_checks(ns)
    for r in res:
        print(f"{'ok  ' if r['ok'] else 'FAIL'} {r['name']:<12} {r['value']}" + (f"  — {r['detail']}" if not r['ok'] else ''))
    n = sum(r['fail'] for r in res)
    print(f"{len(res) - n}/{len(res)} checks pass -> {ns.out}/check.json, {ns.out}/REVIEW.md")
    if n:
        sys.exit(1)


def _ctx(ns, glb=False):
    from mbr import render as R
    mc, k, arm, RR, info = _build(ns, glb=glb)
    return R.Ctx(mc, arm, RR), info


def cmd_sheet(ns):
    from mbr import sheets
    ctx, info = _ctx(ns)
    a = sheets.turnaround(ctx, os.path.join(ns.out, 'turnaround.png'))
    b = sheets.motion(ctx, os.path.join(ns.out, 'motion_sheet.png'))
    c = sheets.plates(ctx, os.path.join(ns.out, 'plates.png'))
    print('\n'.join([a, b, c]))


def cmd_still(ns):
    from mbr import render as R
    ctx, info = _ctx(ns)
    R.pose_machine(ctx, ns.action, ns.t, travel=False)
    w, h = map(int, ns.res.split('x'))
    p = R.view(ctx, os.path.join(ns.out, f'still_{ns.action}_{ns.t:.2f}.png'), yaw=ns.yaw, elev=ns.elev, lens=ns.lens,
               res=(w, h), samples=ns.samples)
    print(p)


def cmd_reel(ns):
    from mbr import render as R, reel as RL
    mc, k, arm, RR, info, res = run_checks(ns)
    bad = [r['name'] for r in res if r['fail']]
    if bad and not ns.force:
        sys.exit(f'checks fail ({", ".join(bad)}): fix them (out/REVIEW.md) or pass --force for a draft')
    ctx = R.Ctx(mc, arm, RR)
    w, h = map(int, ns.res.split('x'))
    out = os.path.join(ns.out, 'reel')
    rl = RL.Reel(ctx, out, res=(w, h), samples=ns.samples)
    only = ns.only.split(',') if ns.only else list(RL.SECTIONS)
    for s in ('walk', 'assembly', 'stride', 'move', 'head'):
        if s in only:
            d, n = rl.render_section(s, step=ns.step, limit=ns.limit)
            print(f'{s}: {n} frames -> {d}')
    refs = os.path.join(os.path.dirname(os.path.abspath(ns.spec)), 'refs')
    boards = rl.boards(refs if os.path.isdir(refs) else None)
    if ns.no_encode:
        return
    mp4 = rl.encode(boards, os.path.join(out, 'reel.mp4'))
    print(mp4)


def cmd_player(ns):
    from mbr import build
    mc, k, arm, RR, info = _build(ns, glb=False)
    # the web copy: no bevel modifiers applied, every 2nd frame keyed (three.js interpolates) — a few MB, not tens
    build.export_glb(arm, os.path.join(ns.out, 'machine_web.glb'), apply_mods=False, frame_step=2)
    dst = os.path.join(ns.out, 'player')
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    shutil.copytree(os.path.join(SKILL, 'player'), dst)
    sub = os.path.join(dst, mc.M['name'])
    os.makedirs(sub, exist_ok=True)
    shutil.copy(os.path.join(ns.out, 'machine_web.glb'), os.path.join(sub, 'machine.glb'))
    meta = {'title': info['title'], 'height': info['height'], 'figure': info['figure'],
            'figure_at': list(mc.M.get('figure_at', (0, 0, 0))),
            'speed': info['walk']['speed'], 'parts': info['n_parts'], 'bones': info['n_bones'],
            'actuators': len(info['actuators']), 'fps': mc.fps,
            'actions': {a: {'dur': v['dur'], 'loop': v['loop'], 'speed': v['speed'], 'light': v['light']}
                        for a, v in info['actions'].items()},
            'stages': {p['name']: p['stage'] for p in info['parts']}}
    with open(os.path.join(sub, 'meta.json'), 'w') as f:
        json.dump(meta, f)
    print(f'{dst}/index.html?src={mc.M["name"]}  (serve the folder: python3 -m http.server)')


def cmd_jobs(ns):
    """Write the reference-image prompt files (the source's jobs_*.json) for this machine. No generator is called:
    running them needs the owner's yes (paid service) — see references/REFERENCES.md."""
    from mbr import spec as SP
    M, mod = SP.load(ns.spec)
    d = os.path.join(os.path.dirname(os.path.abspath(ns.spec)), 'refs')
    os.makedirs(d, exist_ok=True)
    desc = getattr(mod, 'DESCRIPTION', M['title'])
    H = M['body']['z'] * 1.4
    scale = (f'It is about {H:.0f} m tall; a 1.75 m person stands beside it for scale. Joint housings are '
             f'{0.04 * H:.1f} to {0.09 * H:.1f} m across.')
    jobs = {
        'jobs_concept.json': [{'name': 'concept', 'prompt': f'Concept painting of {desc} in its world. {scale} '
                               'Cinematic, overcast light, believable heavy engineering.'}],
        'jobs_turnaround.json': [{'name': 'turnaround', 'refs': ['concept.png'], 'prompt':
                                  f'Clean turnaround sheet of the same machine on flat grey: front, left side, back, top, '
                                  f'three-quarter. Same design as the reference, no labels. {scale}'}],
        'jobs_views.json': [{'name': v, 'refs': ['turnaround.png', 'concept.png'], 'prompt':
                             f'The {v} view from the turnaround alone, large, orthographic, flat grey, no labels. {scale}'}
                            for v in ('front', 'left', 'back', 'top', 'three-quarter')],
        'jobs_plates.json': [{'name': p['name'].replace(' ', '_'), 'refs': ['left.png', 'front.png', 'turnaround.png', 'concept.png'],
                              'prompt': f"Studio product render of the {p['name']} mechanism of this machine for a 3D "
                                        f"modeller: every part readable and physically plausible as real heavy engineering "
                                        f"(pins, forks, drums, hydraulic cylinders), flat grey, no labels. {scale}"}
                             for p in M['plates']],
    }
    for f, j in jobs.items():
        with open(os.path.join(d, f), 'w') as fh:
            json.dump(j, fh, indent=1)
    print(f'{d}/: ' + ', '.join(jobs) + ' — prompts only. Generate with an image model that takes reference images, '
          'ONLY after the owner says yes (what, which model, how many, cost). Save results as refs/<name>.png and '
          'refs/plates/<plate>.png; never commit them.')


def main():
    p = argparse.ArgumentParser(prog='machine.py')
    p.add_argument('--spec', default='machine.py')
    p.add_argument('--out', default='out')
    sub = p.add_subparsers(dest='cmd', required=True)
    n = sub.add_parser('new')
    n.add_argument('dir')
    n.add_argument('--from', dest='src', default='starter')
    for c in ('build', 'check', 'sheet', 'player', 'jobs'):
        sub.add_parser(c)
    s = sub.add_parser('still')
    s.add_argument('--action', default='walk')
    s.add_argument('--t', type=float, default=0.0)
    s.add_argument('--yaw', type=float, default=-50.0)
    s.add_argument('--elev', type=float, default=5.0)
    s.add_argument('--lens', type=float, default=50.0)
    s.add_argument('--res', default='1280x720')
    s.add_argument('--samples', type=int, default=32)
    r = sub.add_parser('reel')
    r.add_argument('--res', default='1280x720')
    r.add_argument('--samples', type=int, default=32)
    r.add_argument('--only', default='')
    r.add_argument('--step', type=int, default=1)
    r.add_argument('--limit', type=int, default=None)
    r.add_argument('--force', action='store_true')
    r.add_argument('--no-encode', action='store_true')
    ns = p.parse_args(argv())
    if ns.cmd != 'new':
        quiet()
        os.makedirs(ns.out, exist_ok=True)
    {'new': cmd_new, 'build': cmd_build, 'check': cmd_check, 'sheet': cmd_sheet, 'still': cmd_still,
     'reel': cmd_reel, 'player': cmd_player, 'jobs': cmd_jobs}[ns.cmd](ns)


if __name__ == '__main__':
    main()
