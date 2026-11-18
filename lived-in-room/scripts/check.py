#!/usr/bin/env python3
"""Everything about a room that a machine can check. Run it before every long render and before calling it done.

  check.py            all checks: builds every version, audits the room, renders one small still per version
  check.py --fast     no rendering (structure, inventory, research, audit, life, camera)

  files       the project files and the two documents exist and are filled in
  inventory   every kind is listed with size, method, support, use and where its numbers come from; what was
              built matches the list in number, in size and in support
  research    every source named in the inventory is in RESEARCH.md with a link (or says honestly it is an estimate)
  model       every version builds; the versions are the SAME room (only light, motion and the walk differ)
  audit       nothing floats, nothing is sunk, nothing would tip, every thing is held, every mesh is closed —
              and the audit itself is shown a floater and a sunk thing to prove it sees them
  life        things move; things are off square; every thing has a reason for being where it is
  camera      the walk starts in the doorway, at a hand's height, never turns faster than the cap, never passes
              through anything
  picture     each version is neither black nor burnt out, the versions look different, a frame renders the same twice
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402

OK, BAD, NOTE = 'ok  ', 'FAIL', 'note'


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--fast', action='store_true')
    a = ap.parse_args(_boot.argv())
    P = _boot.boot(a.project)
    import numpy as np
    from lr import audit, geo
    from lr.room import METHODS, SUPPORTS
    log = P.out('blender.log')
    res = []

    def say(state, group, msg):
        res.append(state)
        print(f'{state}  {group:<10} {msg}', flush=True)

    # ---- files
    missing = [f for f in ('room.py', 'inventory.py', 'skeleton.py', 'layout.py', 'film.py', 'BRIEF.md', 'RESEARCH.md') if not os.path.exists(os.path.join(P.root, f))]
    say(BAD if missing else OK, 'files', f'missing: {", ".join(missing)}' if missing else 'project files, BRIEF.md and RESEARCH.md are here')
    docs = {}
    for f in ('BRIEF.md', 'RESEARCH.md'):
        p = os.path.join(P.root, f)
        docs[f] = open(p, encoding='utf-8').read() if os.path.exists(p) else ''
        blanks = docs[f].count('____')
        if blanks:
            say(BAD, 'files', f'{f} still has {blanks} blank(s) ("____") to fill in')
    if len(P.versions) < 2:
        say(BAD, 'files', 'room.py has one version: the room is filmed at two hours of the day from the same model')

    # ---- inventory (as written)
    inv = {e['id']: e for e in P.inventory}
    bad = []
    for e in P.inventory:
        for k in ('id', 'name', 'n', 'size', 'method', 'support', 'use', 'ref'):
            if k not in e:
                bad.append(f'{e.get("id", "?")}: no "{k}"')
        if e.get('method') not in METHODS:
            bad.append(f'{e.get("id")}: method "{e.get("method")}" (use {", ".join(METHODS)})')
        if e.get('support') not in SUPPORTS:
            bad.append(f'{e.get("id")}: support "{e.get("support")}" (use {", ".join(SUPPORTS)})')
        if not str(e.get('use', '')).strip() or str(e.get('use')).strip() == '-':
            bad.append(f'{e.get("id")}: no use — when and for what is it used? that decides where it goes')
    say(BAD if bad else OK, 'inventory', '; '.join(bad[:6]) + (f' … +{len(bad) - 6}' if len(bad) > 6 else '') if bad else f'{len(inv)} kinds listed, each with size, method, support, use and source')

    # ---- research
    sections = {}
    cur = None
    for line in docs['RESEARCH.md'].splitlines():
        m = re.match(r'^##\s+`?([A-Za-z0-9_.\- ]+?)`?(\s+[—\-:].*)?$', line)
        if m:
            cur = m.group(1).strip()
            sections[cur] = ''
        elif cur:
            sections[cur] += line + '\n'
    refs = sorted({e['ref'] for e in P.inventory if e.get('ref') and e['ref'] != '-'})
    lost = [r_ for r_ in refs if r_ not in sections]
    nosrc = [r_ for r_ in refs if r_ in sections and 'http' not in sections[r_] and not re.search(r'source:\s*(measured|owner|photo|estimate)', sections[r_])]
    est = [r_ for r_ in refs if r_ in sections and 'http' not in sections[r_] and re.search(r'source:\s*estimate', sections[r_])]
    if lost:
        say(BAD, 'research', f'inventory names sources that RESEARCH.md does not have (a "## id" heading each): {", ".join(lost)}')
    if nosrc:
        say(BAD, 'research', f'no source under: {", ".join(nosrc)} — give a link, or "source: measured | owner | photo | estimate"')
    if not lost and not nosrc:
        say(OK, 'research', f'{len(refs)} researched entries, each with a source' + (f' ({len(est)} are honest estimates: {", ".join(est)})' if est else ''))

    # ---- model
    rooms, hashes = {}, {}
    for v in P.versions:
        try:
            with _boot.Hush(log):
                rooms[v] = P.build(v, 'draft')
                hashes[v] = rooms[v].fingerprint
        except Exception as ex:                                       # noqa: BLE001
            say(BAD, 'model', f'{v} does not build: {type(ex).__name__}: {ex}')
            return done(res)
        r = rooms[v]
        for p in r.problems:
            say(BAD, 'model', f'{v}: {p}')
        # everything below that needs measuring is done now, while this version is the one Blender holds
        r._facts = facts(r, P, audit, geo, np)
    if len(set(hashes.values())) > 1:
        say(BAD, 'model', 'the versions are not the same room: ' + ', '.join(f'{v} {h}' for v, h in hashes.items()) +
            ' — put nothing version-dependent in skeleton.py / layout.py; use r.rng(), not random')
    else:
        r0 = next(iter(rooms.values()))
        say(OK, 'model', f'{len(rooms)} versions build and are the same room ({len(r0.items)} things, fingerprint {next(iter(hashes.values()))})')

    r0 = rooms[next(iter(P.versions))]
    F = r0._facts
    # ---- inventory (as built)
    bad = []
    for k, n in F['counts'].items():
        if inv[k]['n'] != n:
            bad.append(f'{k}: built {n}, inventory says {inv[k]["n"]}')
    for k in inv:
        if k not in F['counts']:
            bad.append(f'{k}: in the inventory, not in the room')
    for k, sup in F['supports'].items():
        if inv[k]['support'] not in sup or len(sup) > 1:
            bad.append(f'{k}: built as {"/".join(sorted(sup))}, inventory says {inv[k]["support"]}')
    for k, msg in F['sizes']:
        bad.append(f'{k}: {msg}')
    unref = sorted({k for k, c in F['skeleton_kinds'].items() if inv[k].get('ref', '-') == '-'})
    if unref:
        bad.append('parts of the building without a researched source: ' + ', '.join(unref))
    say(BAD if bad else OK, 'inventory', '; '.join(bad[:8]) + (f' … +{len(bad) - 8}' if len(bad) > 8 else '') if bad else
        f'what was built matches the list: {sum(F["counts"].values())} things of {len(F["counts"])} kinds, {F["sized"]} kinds checked against their real size')

    # ---- audit
    A = F['audit']
    s = A['summary']
    if audit.ok(A):
        say(OK, 'audit', f'{s["things"]} things: nothing floats, nothing is sunk, nothing tips, every thing is held (' +
            ', '.join(f'{k} {v}' for k, v in s['by_support'].items() if v) + ')')
    else:
        say(BAD, 'audit', f'floating {s["floating"]}, sunk {s["sunk"]}, tipping {s["tipping"]}, held by nothing {s["unheld"]}, '
            f'intersecting pairs {s["intersecting"]}, open meshes {s["open"]} — run audit.py for the list')
    for e in F['selftest']:
        say(BAD, 'audit', e)
    if not F['selftest']:
        say(OK, 'audit', 'the audit was shown a thing lifted 180 mm and a thing sunk 10 mm and caught both')

    # ---- life
    need = P.cfg.get('min_motions', 6)
    for v, r in rooms.items():
        m = r.motions
        dead = r._facts['dead']
        if len(m) < need:
            say(BAD, 'life', f'{v}: {len(m)} things move; a room wants at least {need} small motions (a clock, a screen, a lamp, cloth, a far light …)')
        elif dead:
            say(BAD, 'life', f'{v}: registered as moving but never change: {", ".join(dead[:5])}')
        else:
            kinds = sorted({x['kind'] for x in m})
            say(OK, 'life', f'{v}: {len(m)} things move ({", ".join(kinds)})')
    share, off, total = F['askew']
    want = P.cfg.get('min_askew', 0.25)
    if share < want:
        say(BAD, 'life', f'only {off} of {total} kinds of placed things have a member that is off square ({share:.0%}; want ≥ {want:.0%}): a room where '
            f'everything is parallel to the walls is the first thing that reads as rendered — use askew= / rz= where a hand put the thing down')
    else:
        say(OK, 'life', f'{off} of {total} kinds of placed things sit off square ({share:.0%})')
    if F['no_why']:
        say(BAD, 'life', f'{len(F["no_why"])} things have no why= (when and for what is it used?): {", ".join(F["no_why"][:6])}')
    else:
        say(OK, 'life', 'every thing has a reason for being where it is')

    # ---- camera
    for v, r in rooms.items():
        C = r._facts['camera']
        if C is None:
            say(BAD, 'camera', f'{v}: no walk')
            continue
        errs = []
        if C['door'] is not None and C['door'] > 1.0:
            errs.append(f'starts {C["door"]:.2f} m from the doorway (the visitor comes in through the door)')
        if C['pan'] > r.pan_cap + 1e-6:
            errs.append(f'turns at {C["pan"]:.1f}°/s at {C["pan_t"]:.1f} s (cap {r.pan_cap:g}°/s): give the turn more time or less angle')
        if C['zmin'] < 0.9 or C['zmax'] > 1.85:
            errs.append(f'height {C["zmin"]:.2f}–{C["zmax"]:.2f} m: a phone is held between the chest and the eyes')
        if C['out']:
            errs.append(f'leaves the room or scrapes a wall at {C["out"]:.1f} s')
        for name, t, d in C['hits'][:3]:
            errs.append(f'passes {d * 100:.0f} cm from / through {name} at {t:.1f} s')
        if errs:
            for e in errs:
                say(BAD, 'camera', f'{v}: {e}')
        else:
            extra = (f', torch on at {r._phone["on_at"]:g} s' if r._phone else '') + (f', focus hunts {C["hunts"]}×' if C['hunts'] else '')
            say(OK, 'camera', f'{v}: {C["sec"]:.1f} s walk from the doorway, {C["dist"]:.1f} m, fastest turn {C["pan"]:.1f}°/s (cap {r.pan_cap:g}), '
                f'height {C["zmin"]:.2f}–{C["zmax"]:.2f} m, nothing nearer than {C["near"] * 100:.0f} cm{extra}')

    # ---- picture
    if not a.fast:
        from lr import finish, scene as sc
        from PIL import Image
        stats = {}
        first = True
        for v in P.versions:
            with _boot.Hush(log):
                r = P.build(v, 'draft')
            f = max(1, round(P.frames(v) * 0.6))
            tmp = P.out('tmp', f'check_{v}.exr')
            with _boot.Hush(log):
                sc.render(r.scene, f, tmp, P.seed)
            img = _boot.develop(P, v, tmp, f)
            Image.fromarray(img).save(P.out('check', f'{v}.jpg'), quality=88)
            st = finish.stats(img)
            stats[v] = (st, img.astype(np.float32).mean((0, 1)))
            lo, hi = P.versions[v].get('median', (3, 215))
            if st['p95'] < 25:
                say(BAD, 'picture', f'{v}: black (p95 {st["p95"]:.0f}) — nothing is lit, or the exposure is far too low')
            elif st['median'] > hi or st['p995'] >= 254.5 and st['p95'] > 245:
                say(BAD, 'picture', f'{v}: burnt out (median {st["median"]:.0f}, p95 {st["p95"]:.0f}) — lower look.exposure for this version')
            elif st['median'] < lo:
                say(BAD, 'picture', f'{v}: median {st["median"]:.0f} is under the {lo} this version asks for')
            else:
                say(OK, 'picture', f'{v}: median {st["median"]:.0f}, p95 {st["p95"]:.0f}, p99.5 {st["p995"]:.0f}  (out/check/{v}.jpg)')
            if first:
                first = False
                tmp2 = P.out('tmp', f'check_{v}_b.exr')
                with _boot.Hush(log):
                    sc.render(r.scene, f, tmp2, P.seed)
                d = np.abs(_boot.develop(P, v, tmp2, f).astype(np.int16) - img.astype(np.int16)).max()
                say(OK if d <= 1 else BAD, 'picture', f'{v}: the same frame rendered twice differs by {d}/255' + ('' if d <= 1 else ' — something is not a function of the frame number'))
        vs = list(stats)
        for i in range(len(vs)):
            for j in range(i + 1, len(vs)):
                a_, b_ = stats[vs[i]], stats[vs[j]]
                dm = abs(a_[0]['median'] - b_[0]['median'])
                dc = float(np.abs(a_[1] / max(1.0, a_[1].sum()) - b_[1] / max(1.0, b_[1].sum())).sum())
                if dm < 8 and dc < 0.03:
                    say(BAD, 'picture', f'{vs[i]} and {vs[j]} look the same (median {a_[0]["median"]:.0f} / {b_[0]["median"]:.0f}): two hours of the day should not')
                else:
                    say(OK, 'picture', f'{vs[i]} and {vs[j]} are different hours (median {a_[0]["median"]:.0f} / {b_[0]["median"]:.0f})')
    return done(res)


def facts(r, P, audit, geo, np):
    """Measure one built room (must run before the next version is built: Blender holds one scene at a time)."""
    from mathutils import Vector
    inv = {e['id']: e for e in P.inventory}
    F = {}
    F['counts'] = r.counts()
    sup, skel = {}, {}
    for it in r.items.values():
        sup.setdefault(it.kind, set()).add(it.support)
        if it.cls == 'skeleton':
            skel[it.kind] = skel.get(it.kind, 0) + 1
    F['supports'], F['skeleton_kinds'] = sup, skel
    sizes, sized = [], 0
    for k in F['counts']:
        want = inv[k].get('size')
        if not want:
            continue
        sized += 1
        w = sorted(want, reverse=True)
        for it in r.items.values():
            if it.kind != k:
                continue
            d = sorted((x * 1000 for x in it.ob.dimensions), reverse=True)
            off = [(a, b) for a, b in zip(d, w) if abs(a - b) > max(6.0, 0.12 * b)]
            if off:
                sizes.append((k, f'{it.name} is {d[0]:.0f} × {d[1]:.0f} × {d[2]:.0f} mm, inventory says {w[0]:g} × {w[1]:g} × {w[2]:g}'))
                break
    F['sizes'], F['sized'] = sizes, sized
    if 'audit' not in getattr(P, '_once', {}):
        P._once = dict(audit=audit.run(r))
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import audit as audit_script
        import io
        import contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            P._once['selftest'] = audit_script.selftest(r, audit, geo)
    F['audit'], F['selftest'] = P._once['audit'], P._once['selftest']
    # off square
    kinds, askew = {}, set()
    for it in r.items.values():
        if it.support != 'place' or it.cls != 'thing':
            continue
        kinds[it.kind] = True
        import math
        rz = math.degrees(it.ob.rotation_euler.z)
        if abs(((rz % 90) + 45) % 90 - 45) > 0.75:
            askew.add(it.kind)
    F['askew'] = (len(askew) / max(1, len(kinds)), len(askew), len(kinds))
    F['no_why'] = [it.name for it in r.items.values() if it.cls == 'thing' and not it.why.strip()]
    # motions that do not move
    dead = []
    probe = sorted(set(range(1, r.n + 1, max(1, r.n // 60))) | {r.n})
    for target, fn, name in r._anims:
        if not name:
            continue
        vals = {tuple(np.round(np.ravel(list(fn(f).values())[0]), 5)) for f in probe}
        if len(vals) == 1:
            dead.append(name)
    F['dead'] = dead
    # camera
    if r._walk is None or not r.cam_log:
        F['camera'] = None
        return F
    L = [r.cam_log[f] for f in range(1, r.n + 1)]
    pan = max(L, key=lambda x: x['pan'])
    zs = [x['pos'][2] for x in L]
    out = None
    for x in L:
        px, py, _ = x['pos']
        inside_door = r.doorway is not None and (Vector((px, py, 0)) - Vector((r.doorway['center'].x, r.doorway['center'].y, 0))).length < r.doorway['w'] * 0.75
        if not inside_door and (px < 0.12 or px > r.W - 0.12 or py < 0.12 or py > r.D - 0.12):
            out = x['t']
            break
    hits, near = [], 9.0
    for x in L[::3]:
        p = np.array(x['pos'])
        for it in r.items.values():
            if it.cls == 'skeleton':
                continue
            sh = r.shape(it.ob)
            if np.all(p > sh.lo - 0.3) and np.all(p < sh.hi + 0.3):
                d = 0.0 if sh.depth(p) > 0 else sh.nearest(p)
                near = min(near, d)
                if d < 0.05 and not any(h[0] == it.name for h in hits):
                    hits.append((it.name, x['t'], d))
    door = None
    if r.doorway is not None:
        c = r.doorway['center']
        door = float((Vector((L[0]['pos'][0], L[0]['pos'][1], 0)) - Vector((c.x, c.y, 0))).length)
    dist = sum(x['speed'] for x in L) / r.fps
    F['camera'] = dict(pan=pan['pan'], pan_t=pan['t'], zmin=min(zs), zmax=max(zs), out=out, hits=hits, near=near if near < 9 else 0.3, door=door, dist=dist,
                       sec=r.n / r.fps, hunts=sum(1 for k_ in r._walk['keys'] if k_.get('hunt')))
    return F


def done(res):
    bad = res.count(BAD)
    print(f'\n{"FAILED" if bad else "ALL CHECKS PASS"}: {res.count(OK)} ok, {bad} failed')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
