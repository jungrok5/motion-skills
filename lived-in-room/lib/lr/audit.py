"""The physical audit: every thing in the room measured against the rule of its support type, and every pair of
things measured for how deep they are sunk into each other. Numbers in millimetres, not opinions.

In a dark frame a book floating 18 cm above the stool under it is invisible to the eye and obvious to a ruler —
so the room is measured as a whole, every time it changes, before anyone looks at a render.
"""
import numpy as np

from . import phys

# millimetre tolerances, in metres
TOL = dict(
    gap=0.0015,     # a "placed" thing may sit this far above its support and still count as resting
    pen=0.002,      # two things may overlap by this much before it is called an intersection
    stick=0.0015,   # a stuck thing's back to the face it is stuck on
    hang=0.003,     # a hung thing to its hook / a suspended thing to its cord
    wall=0.035,     # a thing hung on a wall may stand this far off it (a frame on a nail tips forward a little)
    lean=0.003,     # a leaning thing's top to the wall
    fix=0.002,      # a fixed thing to what it is fixed to
    tip=0.004,      # how far outside its held area a thing's centre may be before it would tip
)


def _hull(pts):
    pts = sorted(set((round(float(x), 5), round(float(y), 5)) for x, y in pts))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def _outside(hull, p):
    """Distance by which p lies outside a convex polygon (0 when inside)."""
    if not hull:
        return float('inf')
    if len(hull) == 1:
        return float(np.hypot(p[0] - hull[0][0], p[1] - hull[0][1]))

    def seg(a, b):
        ax, ay, bx, by = a[0], a[1], b[0], b[1]
        dx, dy = bx - ax, by - ay
        t = 0.0 if dx == dy == 0 else max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy)))
        return float(np.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy))
    if len(hull) == 2:
        return seg(hull[0], hull[1])
    inside = True
    for a, b in zip(hull, hull[1:] + hull[:1]):
        if (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) < 0:
            inside = False
            break
    return 0.0 if inside else min(seg(a, b) for a, b in zip(hull, hull[1:] + hull[:1]))


def run(r, tol=None):
    """Audit the whole room. Returns dict(rows=[…one per thing…], pairs=[…intersections…], open=[…], summary={…}).
    A row: name, kind, support, on, gap_mm (place / lean), dist_mm (hang / stick / suspend / fix), verdict, why."""
    T = dict(TOL, **(tol or {}))
    items = [it for it in r.items.values()]
    shapes = {it.name: r.shape(it.ob) for it in items}
    names = [it.name for it in items]
    lo = np.array([shapes[n].lo for n in names])
    hi = np.array([shapes[n].hi for n in names])
    idx = {n: i for i, n in enumerate(names)}
    rows, opens = [], []

    for it in items:
        sh = shapes[it.name]
        if sh.open_edges:
            opens.append(dict(name=it.name, kind=it.kind, open_edges=sh.open_edges))
        row = dict(name=it.name, kind=it.kind, support=it.support, on=list(it.on), zone=it.zone, gap_mm=None, dist_mm=None,
                   held=None, verdict='ok', why='')
        rows.append(row)
        if it.cls == 'skeleton':
            row['verdict'] = 'skeleton'
            continue
        i = idx[it.name]

        def bad(msg, v='FAIL'):
            row['verdict'] = v if row['verdict'] in ('ok', 'note') or v == 'FAIL' else row['verdict']
            row['why'] = (row['why'] + '; ' if row['why'] else '') + msg

        if it.support in ('place', 'lean'):
            xy = (lo[:, 0] <= hi[i, 0]) & (hi[:, 0] >= lo[i, 0]) & (lo[:, 1] <= hi[i, 1]) & (hi[:, 1] >= lo[i, 1]) & (lo[:, 2] <= lo[i, 2] + 0.03)
            cand = [shapes[names[j]] for j in np.nonzero(xy)[0] if j != i and frozenset((it.name, names[j])) not in r._allow]
            pts, gaps, who = phys.supports_of(sh, cand, declared=set(it.on))
            finite = gaps[np.isfinite(gaps)]
            if not len(finite):
                row['gap_mm'] = float('inf')
                bad('nothing at all below it')
            else:
                g = float(finite.min())
                row['gap_mm'] = round(g * 1000, 2)
                held = gaps <= g + max(0.0015, it.soft)          # a soft thing settles onto more than its highest point
                row['held'] = round(float(held.mean()), 2)
                holders = sorted({w for w, h in zip(who, held) if h and w})
                row['rests_on'] = holders
                limit = max(T['pen'], it.soft)
                if g > T['gap']:
                    bad(f'floats {g * 1000:.1f} mm above {holders[0] if holders else "?"}')
                elif g < -limit:
                    bad(f'sunk {-g * 1000:.1f} mm into {holders[0] if holders else "?"}')
                elif it.support == 'place':
                    hull = _hull([(p[0], p[1]) for p, h in zip(pts, held) if h])
                    com = it.ob.get('lr_com')                          # where its weight is, when that is not its middle
                    if com is not None:
                        from mathutils import Vector
                        wc = it.ob.matrix_world @ Vector(tuple(com))
                        c = (wc.x, wc.y)
                    else:
                        c = ((sh.lo[0] + sh.hi[0]) / 2, (sh.lo[1] + sh.hi[1]) / 2)
                    out = _outside(hull, c)
                    if out > T['tip']:
                        bad(f'its middle is {out * 1000:.0f} mm outside what holds it: it would tip')
                    declared = set(it.on)
                    if declared and holders and not (declared & set(holders)):
                        bad(f'rests on {", ".join(holders)}, not on {", ".join(it.on)} as declared', 'note')
            if it.support == 'lean':
                walls = [o for o in it.on if o.startswith('wall ')]
                if walls:
                    d = phys.distance(sh, shapes[walls[0]])
                    row['dist_mm'] = round(d * 1000, 2)
                    if d > T['lean']:
                        bad(f'its top is {d * 1000:.1f} mm from {walls[0]}: it leans on nothing')
        else:
            holders = [o for o in it.on if o in shapes]
            if not holders:
                bad('held by nothing: give it what it hangs from / sticks to / is fixed to')
                continue
            first = holders[0]
            d = phys.distance(sh, shapes[first])
            row['dist_mm'] = round(d * 1000, 2)
            limit = {'hang': T['hang'], 'suspend': T['hang'], 'stick': T['stick'], 'fix': T['fix']}[it.support]
            verb = {'hang': 'hangs', 'suspend': 'hangs', 'stick': 'is stuck', 'fix': 'is fixed'}[it.support]
            if d > limit:
                bad(f'{d * 1000:.1f} mm from {first}: it {verb} on nothing')
            if it.support == 'hang':
                for w in holders[1:]:
                    if w.startswith('wall '):
                        dw = phys.distance(sh, shapes[w])
                        if dw > T['wall']:
                            bad(f'stands {dw * 1000:.0f} mm off {w}')

    # every pair that overlaps
    pairs = []
    n = len(names)
    cls = [r.items[nm].cls for nm in names]
    for i in range(n):
        ov = np.all(lo[i] <= hi, axis=1) & np.all(lo <= hi[i], axis=1)
        for j in np.nonzero(ov)[0]:
            if j <= i:
                continue
            a, b = names[i], names[j]
            if cls[i] == 'skeleton' and cls[j] == 'skeleton':
                continue
            if frozenset((a, b)) in r._allow:
                continue
            d = phys.penetration(shapes[a], shapes[b])
            limit = max(T['pen'], r.items[a].soft, r.items[b].soft)
            if d > limit:
                pairs.append(dict(a=a, b=b, depth_mm=round(d * 1000, 2)))
    pairs.sort(key=lambda p: -p['depth_mm'])
    fails = [x for x in rows if x['verdict'] == 'FAIL']
    summary = dict(things=sum(1 for x in rows if x['verdict'] != 'skeleton'), skeleton=sum(1 for x in rows if x['verdict'] == 'skeleton'),
                   floating=sum(1 for x in fails if 'floats' in x['why'] or 'nothing' in x['why']),
                   sunk=sum(1 for x in fails if 'sunk' in x['why']), tipping=sum(1 for x in fails if 'tip' in x['why']),
                   unheld=sum(1 for x in fails if 'on nothing' in x['why'] or 'held by nothing' in x['why']),
                   intersecting=len(pairs), open=len(opens), failed=len(fails),
                   by_support={s: sum(1 for x in rows if x['support'] == s and x['verdict'] != 'skeleton') for s in ('place', 'hang', 'stick', 'suspend', 'lean', 'fix')})
    return dict(rows=rows, pairs=pairs, open=opens, summary=summary, tol={k: v * 1000 for k, v in T.items()})


def report(res, limit=40):
    """The audit as text: the summary, then every fault with its number."""
    s = res['summary']
    out = [f"things {s['things']} (+{s['skeleton']} skeleton)   by support: " + '  '.join(f'{k} {v}' for k, v in s['by_support'].items()),
           f"floating {s['floating']}   sunk {s['sunk']}   tipping {s['tipping']}   held by nothing {s['unheld']}   "
           f"intersecting pairs {s['intersecting']}   open meshes {s['open']}"]
    fails = [x for x in res['rows'] if x['verdict'] == 'FAIL']
    for x in fails[:limit]:
        out.append(f"  FAIL  {x['name']:<28} {x['support']:<8} {x['why']}")
    if len(fails) > limit:
        out.append(f'  … and {len(fails) - limit} more')
    for p in res['pairs'][:limit]:
        out.append(f"  FAIL  {p['a']} × {p['b']}: sunk {p['depth_mm']:.1f} mm into each other")
    if len(res['pairs']) > limit:
        out.append(f"  … and {len(res['pairs']) - limit} more pairs")
    for o in res['open'][:limit]:
        out.append(f"  FAIL  {o['name']}: mesh is not closed ({o['open_edges']} open edges) — it cannot be measured")
    notes = [x for x in res['rows'] if x['verdict'] == 'note']
    for x in notes[:12]:
        out.append(f"  note  {x['name']:<28} {x['why']}")
    return '\n'.join(out)


def ok(res):
    s = res['summary']
    return s['failed'] == 0 and s['intersecting'] == 0 and s['open'] == 0


def screen_time(r, every=6, samples=7):
    """How much each thing is on camera over the walk: {name: dict(frames, share, size)} — frames = sampled frames
    in which it is seen, share = of all sampled frames, size = the largest it gets (its height as a share of the
    frame height). Finish what is big on screen for long; do not polish what the camera never finds."""
    import bpy
    from mathutils import Vector
    scene, cam = r.scene, r.cam
    out = {n: dict(frames=0, share=0.0, size=0.0) for n in r.items}
    pts = {}
    for n, it in r.items.items():
        sh = r.shape(it.ob)
        v = sh.v
        pick = v[:: max(1, len(v) // (samples - 1))][: samples - 1]
        pts[n] = [Vector((sh.lo + sh.hi) / 2)] + [Vector(p) for p in pick]
    frames = list(range(1, r.n + 1, every))
    aspect = scene.render.resolution_x / scene.render.resolution_y
    for f in frames:
        scene.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        M = cam.matrix_world.copy()
        inv = M.inverted()
        o = M.translation
        tan_h = cam.data.sensor_width / 2 / cam.data.lens
        tan_v = tan_h / aspect
        for n, it in r.items.items():
            if it.cls == 'skeleton':
                continue
            seen = False
            for p in pts[n]:
                c = inv @ p
                if c.z >= -0.03 or abs(c.x / -c.z) > tan_h or abs(c.y / -c.z) > tan_v:
                    continue
                d = p - o
                dist = d.length
                hit, loc, nrm, fi, ob, _m = scene.ray_cast(dg, o, d.normalized(), distance=dist + 0.002)
                if not hit or ob.name == n or (loc - o).length >= dist - 0.004:
                    seen = True
                    break
            if seen:
                sh = r.shape(it.ob)
                dz = max(0.05, -(inv @ Vector((sh.lo + sh.hi) / 2)).z)
                size = float(np.linalg.norm(sh.hi - sh.lo)) / dz / (2 * tan_v)
                out[n]['frames'] += 1
                out[n]['size'] = max(out[n]['size'], min(1.5, size))
    for n in out:
        out[n]['share'] = out[n]['frames'] / max(1, len(frames))
    scene.frame_set(1)
    return out
