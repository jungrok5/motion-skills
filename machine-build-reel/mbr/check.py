"""Checks. Every one reports a number, not just pass / fail; `run` returns a list of dicts and REVIEW.md is written
from them by the CLI. Failures stop the reel (the source's "checking every part" made executable).

  parts        every part rides exactly one bone; no part shares a bone's name; part / mesh / bone counts
  bake         Blender's evaluated pose = kinematics (each action sampled; max error, mm)
  reach        no limb target clamped (the legs reach every foot placement; mm)
  bends        no joint bends past straight the wrong way (hyperextension) and none folds past 165°
  limits       hinge ranges inside the spec's `limits` (when given) — reported per joint either way
  feet         planted feet never slide (world, travelling) and sit on the ground; swinging feet stay above it
  support      at least N feet planted at every instant of the walk (2 for 4 legs, 3 for 6+)
  actuators    every rod stays inside its barrel through every action (min overlap) with leverage (min arm)
  clash        no two parts on different bones intersect in any sampled frame unless they already touch at rest
  idle         the idle breathes: the body, head and lights all move
  moves        each move gathers first (anticipation) and overshoots on the way back (recovery)
  loops        walk and idle close (pose at the end = pose at the start)
  facing       it walks the way its head points
  determinism  the same spec gives the same poses (rebuilt and hashed)
"""
import hashlib
import math
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from . import rig as RG

MM = 1000.0


def R(name, ok, value, detail='', fail=True):
    return {'name': name, 'ok': bool(ok), 'value': value, 'detail': detail, 'fail': fail and not ok}


def sample_times(dur, fps, step=1):
    n = int(round(dur * fps))
    return [f / fps for f in range(0, n + 1, step)]


def run(mc, k, arm, RR, fast=False):
    out = []
    kin, mot = mc.kin, mc.mot
    acts = mot.actions()
    fps = mc.fps

    # parts ------------------------------------------------------------------------------------------------------
    bad = [p['name'] for p in k.parts if p['obj'].parent is not arm or p['obj'].parent_type != 'BONE']
    clash_names = [p['name'] for p in k.parts if p['name'] in kin.parent]
    out.append(R('parts', not bad and not clash_names,
                 f"{len(k.parts)} parts, {len({p['obj'].data.name for p in k.parts})} meshes, {len(kin.bones)} bones",
                 ('not on a bone: ' + ', '.join(bad[:5]) if bad else '') + (' name = bone: ' + ', '.join(clash_names) if clash_names else '')))

    # bake = kinematics ------------------------------------------------------------------------------------------
    worst = 0.0
    for name, (dur, loop) in acts.items():
        act = bpy.data.actions.get(f'A_{name}')
        if not act:
            continue
        RG.assign(arm, act)
        for f in (1, int(dur * fps / 3) + 1, int(dur * fps * 0.77) + 1):
            bpy.context.scene.frame_set(f)
            W, _ = mc.pose(name, (f - 1) / fps, travel=False)
            for b in ('body', f'foot_{kin.limbs[0].name}', kin.limbs[-1].bone(kin.limbs[-1].n - 1), 'head'):
                if b not in arm.pose.bones:
                    continue
                m = arm.matrix_world @ arm.pose.bones[b].matrix
                worst = max(worst, (m.translation - W[b].translation).length)
    if arm.animation_data:
        arm.animation_data.action = None
    out.append(R('bake', worst < 0.002, f'{worst * MM:.2f} mm', 'Blender pose vs kinematics, max over sampled bones'))

    # one sweep over every action (travelling) for reach, bends, feet, support, actuators ------------------------
    clamp = 0.0
    bend_flip = []
    fold_max = 0.0
    hinge = {}
    slip = 0.0
    sink = 0.0
    swing_low = 1e9
    planted_min = 99
    lever_min, overlap_min = 1e9, 1e9
    act_bad = []
    nlegs = sum(1 for l in kin.limbs if l.role == 'leg')
    need = 2 if nlegs <= 4 else 3
    for name, (dur, loop) in list(acts.items()):
        last_stance = {}
        signs0 = {}
        for t in sample_times(dur, fps, 1 if name == 'walk' else 2):
            cmd = mot.cmd(name, t, travel=True)
            W, sols = kin.pose(cmd)
            planted = 0
            for l in kin.limbs:
                s = sols[l.name]
                clamp = max(clamp, s['clamp'])
                sg = l.bend_signs(s)
                key = l.name
                if key not in signs0:
                    signs0[key] = [math.copysign(1, x) for x in sg]
                for i, x in enumerate(sg):
                    if abs(x) > 0.02 and math.copysign(1, x) != signs0[key][i]:
                        bend_flip.append(f'{l.name} j{i + 1} {name} t={t:.2f}')
                ha = l.hinge_angles(s)
                for j, a in enumerate(ha):
                    jn = l.joint_names[j]
                    lo, hi = hinge.get((l.name, jn), (1e9, -1e9))
                    hinge[(l.name, jn)] = (min(lo, a), max(hi, a))
                for j in range(1, l.n):
                    fold_max = max(fold_max, abs(ha[j]))
                if l.role == 'leg':
                    c = cmd['limbs'][l.name]
                    fp = W[f'foot_{l.name}'].translation
                    if c.get('phase', 'stance') == 'stance':
                        planted += 1
                        sink = max(sink, abs(fp.z - l.ball))
                        if l.name in last_stance:
                            slip = max(slip, (fp - last_stance[l.name]).length)
                        last_stance[l.name] = fp.copy()
                    else:
                        last_stance.pop(l.name, None)
                        for kd in range(len(l.digits)):
                            db = W[f'digit{kd}_{l.name}']
                            tip = db.translation + db.to_3x3() @ Vector((0, l.digit_len, 0))
                            swing_low = min(swing_low, tip.z)
                # actuators
                for j in range(l.n):
                    jn = l.joint_names[j]
                    a = l.anchors.get(jn)
                    if not a or 'Bl' not in a:
                        continue
                    from .kin import act_points
                    up, lo_, piv = act_points(l, s, j, a)
                    L = (lo_ - up).length
                    eyes = 2.2 * a['r']
                    ov = (a['Bl'] + a['Rl'] + eyes - L) / a['Bl']
                    overlap_min = min(overlap_min, ov)
                    d = (lo_ - up).normalized()
                    lev = (piv - up - d * (piv - up).dot(d)).length
                    lever_min = min(lever_min, lev)
                    if L < a['Bl'] + eyes - 1e-3 or ov < 0.15:
                        act_bad.append(f'{jn}_{l.name} {name} t={t:.2f} L={L:.2f}')
            if name == 'walk':
                planted_min = min(planted_min, planted)
    out.append(R('reach', clamp < 0.001, f'{clamp * MM:.1f} mm', 'largest distance a limb target was out of reach'))
    out.append(R('bends', not bend_flip and fold_max < 165, f'max fold {fold_max:.0f}°, {len(bend_flip)} flips',
                 '; '.join(bend_flip[:4])))
    lim_bad = []
    for l in kin.limbs:
        for jn, (lo, hi) in (l.limits or {}).items():
            got = hinge.get((l.name, jn))
            if got and (got[0] < lo - 0.5 or got[1] > hi + 0.5):
                lim_bad.append(f'{jn}_{l.name} {got[0]:.0f}..{got[1]:.0f} (limit {lo}..{hi})')
    rng = '; '.join(f'{jn}_{ln} {a:.0f}..{b:.0f}°' for (ln, jn), (a, b) in list(hinge.items())[:6])
    out.append(R('limits', not lim_bad, f'{len(hinge)} hinges', ('; '.join(lim_bad) or rng)))
    out.append(R('feet', slip < 0.002 and sink < 0.002 and swing_low > -0.03,
                 f'slip {slip * MM:.2f} mm, off-ground {sink * MM:.2f} mm, lowest swinging toe {swing_low:.3f} m',
                 'planted feet are world-fixed; toes of a swinging foot must clear the ground'))
    out.append(R('support', planted_min >= need, f'min {planted_min} feet planted', f'needs >= {need} at every instant'))
    out.append(R('actuators', not act_bad, f'min rod overlap {overlap_min * 100:.0f} %, min lever {lever_min:.2f} m',
                 '; '.join(act_bad[:4])))

    # clash -----------------------------------------------------------------------------------------------------
    if not fast:
        out.append(clash(mc, k, arm, RR))

    # idle breathes ---------------------------------------------------------------------------------------------
    dur = acts['idle'][0]
    moved = {}
    lights = []
    W0, _ = kin.pose(mot.cmd('idle', 0.0))
    for t in sample_times(dur, fps, 6):
        W, _ = kin.pose(mot.cmd('idle', t))
        lights.append(mot.cmd('idle', t)['light'])
        for b in ('body', 'head'):
            if b in W:
                moved[b] = max(moved.get(b, 0), (W[b].translation - W0[b].translation).length)
    H = mc.W_rest['body'].translation.z
    ok = moved.get('body', 0) > 0.003 * H and moved.get('head', 1) > 0.004 * H and (max(lights) - min(lights)) > 0.05
    out.append(R('idle', ok, f"body {moved.get('body', 0):.2f} m, head {moved.get('head', 0):.2f} m, lights ±{(max(lights) - min(lights)) / 2:.2f}",
                 'a machine at rest still settles, shifts and looks around'))

    # moves: anticipation + recovery ---------------------------------------------------------------------------
    for name, mv in mot.moves.items():
        a, r, chan = anticipation(mv)
        ok = a >= 0.04 and r >= 0.03
        out.append(R(f'move:{name}', ok, f'{chan}: anticipation {a * 100:.0f} %, recovery overshoot {r * 100:.0f} %',
                     'gather against the move first (>= 4 % of it), overshoot rest on the way back (>= 3 %)'))

    # loops -----------------------------------------------------------------------------------------------------
    worst = 0.0
    for name in ('walk', 'idle'):
        dur = acts[name][0]
        A, _ = kin.pose(mot.cmd(name, 0.0, travel=False))
        B, _ = kin.pose(mot.cmd(name, dur, travel=False))
        for b in A:
            worst = max(worst, (A[b].translation - B[b].translation).length)
    out.append(R('loops', worst < 0.001, f'{worst * MM:.2f} mm', 'pose(end) - pose(start), in place'))

    # facing ----------------------------------------------------------------------------------------------------
    W, _ = kin.pose(mot.cmd('walk', 0.0))
    W2, _ = kin.pose(mot.cmd('walk', 1.0))
    travel = (W2['root'].translation - W['root'].translation)
    hd = W['head'].to_3x3() @ Vector((0, 1, 0)) if 'head' in W else W['body'].to_3x3() @ Vector((1, 0, 0))
    out.append(R('facing', travel.dot(hd) > 0, f'travel·head {travel.normalized().dot(hd.normalized()):.2f}',
                 'walks where it looks'))
    return out


def anticipation(mv):
    """For the channel with the biggest excursion: how far it first moves the *other* way (fraction of the
    excursion), and how far past its end value it swings on the way back."""
    best = None
    main = mv.get('main')
    for ch, keys in mv['keys'].items():
        if not ch.split('.')[0] in ('body', 'neck', 'head') or isinstance(keys[0][1], (tuple, list)):
            continue
        if main and ch != main:
            continue
        v0 = keys[0][1]
        vals = [v for _, v in keys]
        peak = max(vals, key=lambda v: abs(v - v0))
        ex = peak - v0
        sc = abs(ex) / (1.0 if ch.endswith('dz') or ch.endswith('dx') or ch.endswith('dy') else 10.0)
        if abs(ex) < 1e-6:
            continue
        if best is None or sc > best[0]:
            best = (sc, ch, keys, v0, ex)
    if not best:
        return 0.0, 0.0, '-'
    _, ch, keys, v0, ex = best
    sgn = math.copysign(1, ex)
    ipk = max(range(len(keys)), key=lambda i: abs(keys[i][1] - v0))
    pre = [(v - v0) * -sgn for _, v in keys[:ipk]]
    a = max([0.0] + pre) / abs(ex)
    vend = keys[-1][1]
    post = [(v - vend) * -sgn for _, v in keys[ipk:]]
    r = max([0.0] + post) / abs(ex)
    return a, r, ch


def _world_tris(ob, M):
    me = ob.data
    vs = [M @ v.co for v in me.vertices]
    fs = [tuple(p.vertices) for p in me.polygons]
    return vs, fs


def clash(mc, k, arm, RR, step=None):
    """Part vs part on different bones through sampled frames of every action. Pairs that already touch in the
    rest pose (pins in their cheeks, lugs on their beams) are left out; anything new is a clash."""
    mot = mc.mot
    parts = [p for p in k.parts if p['obj'].type == 'MESH']
    local = {}
    for p in parts:
        me = p['obj'].data
        if me.name not in local:
            local[me.name] = ([v.co.copy() for v in me.vertices], [tuple(pl.vertices) for pl in me.polygons])
    rest_basis = {p['name']: (Matrix.Translation((0, arm.data.bones[p['bone']].length, 0)) @ p['obj'].matrix_basis)
                  for p in parts}

    def trees(W):
        out = {}
        for p in parts:
            M = W[p['bone']] @ rest_basis[p['name']]
            vs, fs = local[p['obj'].data.name]
            wv = [M @ v for v in vs]
            lo = Vector((min(v.x for v in wv), min(v.y for v in wv), min(v.z for v in wv)))
            hi = Vector((max(v.x for v in wv), max(v.y for v in wv), max(v.z for v in wv)))
            out[p['name']] = (BVHTree.FromPolygons(wv, fs, epsilon=0.0), lo, hi, p['bone'])
        return out

    def pairs(TT):
        names = list(TT)
        res = set()
        for i in range(len(names)):
            a = TT[names[i]]
            for j in range(i + 1, len(names)):
                b = TT[names[j]]
                if a[3] == b[3]:
                    continue
                if (a[1].x > b[2].x or b[1].x > a[2].x or a[1].y > b[2].y or b[1].y > a[2].y or
                        a[1].z > b[2].z or b[1].z > a[2].z):
                    continue
                if a[0].overlap(b[0]):
                    res.add((names[i], names[j]))
        return res
    W0, _ = mc.pose('rest', 0.0)
    rest_pairs = pairs(trees(W0))
    new = {}
    frames = 0
    for name, (dur, loop) in mot.actions().items():
        n = 10 if name in ('walk', 'idle') else 12
        for i in range(n + 1):
            t = dur * i / n
            W, _ = mc.pose(name, t, travel=False)
            frames += 1
            for pr in pairs(trees(W)) - rest_pairs:
                new.setdefault(pr, f'{name} t={t:.1f}')
    det = '; '.join(f'{a} × {b} ({w})' for (a, b), w in list(new.items())[:6])
    return R('clash', not new, f'{len(new)} new intersections over {frames} frames ({len(rest_pairs)} rest contacts)',
             det)


def motion_hash(mc):
    h = hashlib.sha1()
    for name, (dur, loop) in mc.mot.actions().items():
        for t in (0.0, dur * 0.31, dur * 0.77):
            W, _ = mc.pose(name, t)
            for b in sorted(W):
                h.update(('%.5f' % W[b].translation.length).encode())
    return h.hexdigest()
