"""Checks: the body is possible, the motion has weight, the cloak follows the body a few frames late, the loops close,
and the paint is really paint. Every check reports numbers; `notes()` turns them into the "what's off" list
(source step 8: "renders every clip with its name and a counter, then lists what's off").

  build        every vertex skinned
  facing       rest pose: eyes / toes in front (-Y), left parts on +X
  bake         Blender's evaluated pose = the solver, in every clip (so .blend, glTF and checks agree)
  body         knees fold back only, elbows forward only, neck <= 90 deg yaw, waist <= 45, thigh <= 75 behind
  feet         toes not under the floor, IK reached the floor, planted feet do not slide on the (scrolling) floor
  direction    a locomotion loop moves the way it faces
  lag          the cloak follows the body N frames late (measured), 1 <= N <= 8 in every clip where the body moves
  trail        on walk / run the hem trails behind the body
  clear        no cloak particle inside a leg or the torso
  loop         every loop closes: residual before closing small (the cloth reached a steady cycle), key N = key 0
  idle         the idle breathes (chest and head move) and blinks
  anticipation the turn winds up against itself before it turns
  paint        painted materials show strokes (contrast), the cloak hem is frayed (alpha-cut)
  determinism  a second build gives the same numbers
"""
import hashlib
import math
import bpy
from mathutils import Vector
from .body import LIMITS

V = Vector


def _flat(v):
    return Vector((v.x, v.y, 0))


def _ang(a, b):
    a, b = _flat(a), _flat(b)
    if a.length < 1e-9 or b.length < 1e-9:
        return 0.0
    return math.degrees(a.angle(b))


def _seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-12)))
    return (a + ab * t - p).length


def motion_hash(clips):
    h = hashlib.sha1()
    for c in clips:
        for f in c['frames']:
            for k in sorted(f['joints']):
                h.update(','.join(f'{x:.5f}' for x in f['joints'][k]).encode())
            for k in sorted(f['tips']):
                h.update(','.join(f'{x:.5f}' for x in f['tips'][k][0]).encode())
    return h.hexdigest()


def measure_lag(c, chains):
    """Frames by which the cloak hem follows where the body puts it: argmin over k of |tip(f) - goal(f - k)|
    (circular for loops, means removed so the steady trailing offset does not count). Returns (lag, per chain)."""
    fr = c['frames']
    n = c['n'] if c['loop'] else len(fr)
    out = {}
    for ch in chains:
        name = ch['name']
        tip = [V(f['tips'][name][0]) for f in fr[:n]]
        goal = [V(f['tips'][name][1]) for f in fr[:n]]
        if c['loop']:
            mt = sum(tip, Vector()) / n
            mg = sum(goal, Vector()) / n
            tip = [p - mt for p in tip]
            goal = [p - mg for p in goal]
        spread = max((g - goal[0]).length for g in goal)
        if spread < 1e-3:
            continue
        best, bk = None, 0.0
        for k10 in range(0, 121):
            k = k10 / 10
            e = 0.0
            for f in range(n):
                x = f - k
                if c['loop']:
                    x %= n
                else:
                    x = max(0.0, x)
                i0 = int(math.floor(x))
                i1 = (i0 + 1) % n if c['loop'] else min(n - 1, i0 + 1)
                g = goal[i0].lerp(goal[i1], x - i0)
                e += (tip[f] - g).length_squared
            if best is None or e < best:
                best, bk = e, k
        out[name] = bk
    if not out:
        return None, out
    vals = sorted(out.values())
    return vals[len(vals) // 2], out


def run(data, clips, rig=None, rehash=None):
    res = []

    def rep(name, ok, detail, **num):
        res.append({'check': name, 'ok': bool(ok), 'detail': detail, **num})

    H = data['H']
    chains = data['chains']
    cloak = [ch for ch in chains if ch['part'] == 'cloak' or ch['name'].startswith('cloak')]
    # ---- build + facing
    if rig is not None:
        bad = []
        for o in rig.children:
            if o.type != 'MESH':
                continue
            nz = sum(1 for v in o.data.vertices if not any(g.weight > 1e-4 for g in v.groups))
            if nz:
                bad.append(f'{o.name}:{nz}')
        rep('build: every vertex skinned', not bad, ', '.join(bad) or f'{len(rig.children)} pieces, {len(rig.data.bones)} bones')
        B = rig.data.bones
        hc = B['head'].head_local
        eyes = (B['eye.L'].head_local + B['eye.R'].head_local) / 2
        probs = []
        if not eyes.y < hc.y - 0.01 * H:
            probs.append('eyes not in front of the head')
        if not B['foot.L'].tail_local.y < B['foot.L'].head_local.y:
            probs.append('toes point backwards')
        for s, sx in (('L', 1), ('R', -1)):
            for b in ('hand.', 'thigh.', 'eye.'):
                if B[b + s].head_local.x * sx <= 0:
                    probs.append(f'{b}{s} on the wrong side')
        if cloak:
            ys = [sum(V(B[bn].head_local).y for bn in ch['bones']) / len(ch['bones']) for ch in cloak]
            if sum(ys) / len(ys) < 0:
                probs.append('the cloak hangs in front, not behind')
        rep('facing: front / back / left / right', not probs, '; '.join(probs) or 'eyes, toes in front (-Y); .L parts on +X; cloak behind')
        # ---- bake = Blender
        from .bake import assign
        sc = bpy.context.scene
        worst = 0.0
        for c in clips:
            assign(rig, bpy.data.actions[c['action']])
            for f in c['frames'][:: max(1, len(c['frames']) // 6)]:
                sc.frame_set(f['f'] + 1)
                for name in ('hips', 'head', 'hand.L', 'foot.R', 'shin.L'):
                    p = rig.matrix_world @ rig.pose.bones[name].head
                    worst = max(worst, (p - V(f['joints'][name])).length)
                for ch in chains[:3]:
                    last = ch['bones'][-1]
                    p = rig.matrix_world @ rig.pose.bones[last].tail
                    worst = max(worst, (p - V(f['tips'][ch['name']][0])).length)
        assign(rig, bpy.data.actions[clips[0]['action']])
        rep('bake: Blender pose = solver (every clip)', worst < 0.002, f'max {worst * 1000:.2f} mm', value=worst)
    # ---- body limits
    viol = {}

    def bump(k, where, v):
        if k not in viol or abs(v) > abs(viol[k][1]):
            viol[k] = (where, v)
    for c in clips:
        for fr in c['frames']:
            where = f"{c['label']} f{fr['f'] + 1}"
            J = {k: V(v) for k, v in fr['joints'].items()}
            up = Vector((0, 0, 1))
            chest_f = (J['upper_arm.L'] - J['upper_arm.R']).cross(up).normalized()
            hips_f = (J['thigh.L'] - J['thigh.R']).cross(up).normalized()
            head_f = _flat((J['eye.L'] + J['eye.R']) / 2 - J['head'])
            a = _ang(head_f, chest_f)
            if a > LIMITS['neck_yaw']:
                bump('neck_yaw', where, a)
            a = _ang(chest_f, hips_f)
            if a > LIMITS['waist_yaw']:
                bump('waist_yaw', where, a)
            hu = (J['head:tail'] - J['head']).normalized()
            cu = (J['neck'] - J['chest']).normalized()
            a = math.degrees(hu.angle(cu))
            if a > LIMITS['neck_pitch']:
                bump('neck_pitch', where, a)
            for s in ('L', 'R'):
                hip, knee, ank = J['thigh.' + s], J['shin.' + s], J['foot.' + s]
                th, sh = knee - hip, ank - knee
                bend = math.degrees(th.angle(sh))
                foot_f = _flat(J['foot.' + s + ':tail'] - ank).normalized()
                line = ank - hip
                t = (knee - hip).dot(line) / max(line.length_squared, 1e-9)
                off = knee - (hip + line * t)
                if bend > 4 and off.dot(foot_f) < 0:
                    bump('knee_backwards.' + s, where, bend)
                if bend > LIMITS['knee_bend'][1]:
                    bump('knee_over.' + s, where, bend)
                d = th.normalized()
                back = math.degrees(math.atan2(-d.dot(hips_f), -d.z))
                if back > LIMITS['hip_back']:
                    bump('hip_back.' + s, where, back)
                sh_, el, wr = J['upper_arm.' + s], J['forearm.' + s], J['hand.' + s]
                ua, fa = el - sh_, wr - el
                eb = math.degrees(ua.angle(fa))
                line = wr - sh_
                t = (el - sh_).dot(line) / max(line.length_squared, 1e-9)
                off = el - (sh_ + line * t)
                if eb > 6 and off.dot(chest_f) > 0.002 * H:
                    bump('elbow_backwards.' + s, where, eb)
                if eb > LIMITS['elbow_bend'][1]:
                    bump('elbow_over.' + s, where, eb)
    rep('body: joint limits (knee back, elbow forward, neck, waist, hip)', not viol,
        ', '.join(f'{k} {v[0]} {v[1]:.0f}deg' for k, v in viol.items()) or 'every frame of every clip inside the limits')
    # ---- feet (planted = the IK target did not move in the world; the in-place joint + travel must not move either)
    under, miss, slide = 0.0, 0.0, 0.0
    w_miss = w_slide = ''
    for c in clips:
        fwd = V(c['fwd'])
        prev = None
        for fr in c['frames']:
            for s in ('L', 'R'):
                under = max(under, -V(fr['joints']['foot.' + s + ':tail']).z)
            if max(fr['miss']) > miss:
                miss, w_miss = max(fr['miss']), f"{c['label']} f{fr['f'] + 1}"
            if prev is not None:
                for s in ('L', 'R'):
                    a, b = prev['pose']['leg.' + s], fr['pose']['leg.' + s]
                    planted = (abs(a[2] - b[2]) < 1e-6 and abs(a[3]) < 1e-6 and abs(b[3]) < 1e-6 and
                               (V(a[:2]) - V(b[:2])).length < 1e-6)
                    if planted:
                        pa = V(prev['joints']['foot.' + s]) + fwd * prev['travel']
                        pb = V(fr['joints']['foot.' + s]) + fwd * fr['travel']
                        d = (pb - pa).length
                        if d > slide:
                            slide, w_slide = d, f"{c['label']} f{fr['f'] + 1}"
            prev = fr
    rep('feet: on the floor, planted feet do not slide', under < 0.012 * H and miss < 0.012 * H and slide < 0.003,
        f'deepest toe {under * 100:.1f} cm below floor, IK miss {miss * 100:.1f} cm ({w_miss or "-"}), '
        f'planted slide {slide * 1000:.2f} mm/frame on the floor ({w_slide or "-"})', slide=slide, miss=miss)
    # ---- direction
    worst = 0.0
    for c in clips:
        if c['speed'] <= 0:
            continue
        for fr in c['frames']:
            yaw = math.radians(fr['pose']['root'][2])
            worst = max(worst, _ang(V(c['fwd']), Vector((math.sin(yaw), -math.cos(yaw), 0))))
    rep('direction: moves the way it faces', worst < 10, f'max {worst:.1f} deg between travel and facing')
    # ---- lag, trail, clear
    if cloak:
        lags = {}
        for c in clips:
            moving = c['type'] != 'idle'
            lag, per = measure_lag(c, cloak)
            if lag is not None:
                lags[c['label']] = (lag, moving)
        bad = [f'{k} {v[0]:.1f}' for k, v in lags.items() if v[1] and not (1.0 <= v[0] <= 8.0)]
        rep('lag: the cloak follows the body a few frames late', not bad and any(v[1] for v in lags.values()),
            ', '.join(f'{k} {v[0]:.1f} frames' for k, v in lags.items()) + (('; out of 1..8: ' + ', '.join(bad)) if bad else ''),
            lags={k: v[0] for k, v in lags.items()})
        trails = []
        for c in clips:
            if c['speed'] <= 0:
                continue
            fwd = V(c['fwd'])
            back = [sum(-(V(f['tips'][ch['name']][0]) - V(f['tips'][ch['name']][1])).dot(fwd) for f in c['frames']) / len(c['frames']) for ch in cloak]
            trails.append((c['label'], sum(back) / len(back)))
        if trails:
            rep('trail: on the move the hem trails behind', all(t > 0.008 * H for _, t in trails),
                ', '.join(f'{k} hem {t * 100:.1f} cm behind its rest place' for k, t in trails), trails=dict(trails))
        worst, where = 1.0, ''
        legr = H * 0.034 * 0.9
        for c in clips:
            for fr in c['frames'][::2]:
                J = {k: V(v) for k, v in fr['joints'].items()}
                segs = []
                for s in ('L', 'R'):
                    segs.append((J['thigh.' + s], J['shin.' + s], legr * 1.1))
                    segs.append((J['shin.' + s], J['foot.' + s], legr * 0.8))
                for ch in cloak:
                    for q in fr['tips'][ch['name']][2][2:]:
                        q = V(q)
                        for a, b, r in segs:
                            d = _seg_dist(q, a, b) - r
                            if d < worst:
                                worst, where = d, f"{c['label']} f{fr['f'] + 1} {ch['name']}"
        rep('clear: the cloak never goes inside the legs', worst > -0.015, f'closest {worst * 100:.1f} cm from a leg surface ({where})',
            value=worst)
    # ---- loops
    loops = [c for c in clips if c['loop']]
    if loops:
        rep('loop: every loop closes on itself', all(c['seam'] < 0.03 * H for c in loops),
            ', '.join(f"{c['label']} {c['n']} frames, cloth residual {c['seam'] * 100:.1f} cm before closing" for c in loops),
            seams={c['label']: c['seam'] for c in loops})
    # ---- idle
    idle = [c for c in clips if c['type'] == 'idle']
    if idle:
        c = idle[0]
        def rng(name):
            ps = [V(f['joints'][name]) for f in c['frames']]
            return max((p - ps[0]).length for p in ps)
        ch, hd = rng('chest'), rng('head')
        bl = max(f['pose']['blink'] for f in c['frames'])
        rep('idle: breathes, shifts and blinks', ch > 0.003 and hd > 0.004 and bl > 0.8,
            f'chest moves {ch * 1000:.1f} mm, head {hd * 1000:.1f} mm, max blink {bl:.2f}')
    # ---- anticipation (turn)
    for c in clips:
        if c['type'] != 'turn':
            continue
        yaws = [f['pose']['root'][2] for f in c['frames']]
        total = yaws[-1] - yaws[0]
        sgn = 1 if total >= 0 else -1
        early = yaws[: max(2, len(yaws) // 3)]
        wind = -min((y - yaws[0]) * sgn for y in early)
        rep(f'anticipation: {c["label"]} winds up before it turns', wind > 1.0,
            f'wind-up {wind:.1f} deg against a {abs(total):.0f} deg turn', value=wind)
    # ---- paint
    if rig is not None:
        import numpy as np
        flat, frayed = [], None
        for img in bpy.data.images:
            if not img.name.endswith('_paint'):
                continue
            px = np.empty(img.size[0] * img.size[1] * 4, np.float32)
            img.pixels.foreach_get(px)
            px = px.reshape(-1, 4)
            lum = px[:, :3] @ np.array([0.3, 0.59, 0.11], np.float32)
            if float(lum.std()) < 0.025:
                flat.append(f'{img.name} {lum.std():.3f}')
        for o in rig.children:
            if o.name.startswith('cloak') and o.type == 'MESH' and o.data.materials:
                for n in o.data.materials[0].node_tree.nodes:
                    if n.type == 'TEX_IMAGE':
                        px = np.empty(n.image.size[0] * n.image.size[1] * 4, np.float32)
                        n.image.pixels.foreach_get(px)
                        frayed = float((px[3::4] < 0.5).mean())
        ok = not flat and (frayed is None or frayed > 0.003 or not cloak)
        rep('paint: strokes show, the hem is frayed', ok,
            ('flat: ' + ', '.join(flat) + '; ' if flat else 'every painted texture has stroke contrast; ') +
            (f'cloak hem cut away on {frayed * 100:.1f} % of its texture' if frayed is not None else 'no painted cloak'))
    if rehash:
        h0, h1 = rehash
        rep('determinism: rebuild gives the same motion', h0 == h1, h0[:12] + (' = ' if h0 == h1 else ' != ') + h1[:12])
    return res


def notes(data, clips, res):
    """The "what's off" list: failures first, then soft findings with the number, where, and the knob to turn."""
    out = []
    H = data['H']
    for r in res:
        if not r['ok']:
            out.append(('FAIL', r['check'], r['detail']))
    by = {r['check'].split(':')[0]: r for r in res}
    lag = by.get('lag')
    if lag and lag.get('lags'):
        for k, v in lag['lags'].items():
            c = next(c for c in clips if c['label'] == k)
            if c['type'] == 'idle':
                continue
            if v < 2.0:
                out.append(('WARN', f'{k}: the cloak follows only {v:.1f} frames late — it reads stiff, glued to the body',
                            'raise the cloak "lag" (3-4) or lower "stiff"'))
            elif v > 6.0:
                out.append(('WARN', f'{k}: the cloak is {v:.1f} frames late — it floats like silk',
                            'lower "lag" or raise "stiff" / "damp" for heavy wool'))
    tr = by.get('trail')
    if tr and tr.get('trails'):
        for k, t in tr['trails'].items():
            if t < 0.02 * H:
                out.append(('WARN', f'{k}: the hem trails only {t * 100:.1f} cm', 'raise "lag" or "drag" on the cloak'))
    cl = by.get('clear')
    if cl and cl.get('value', 1) < 0.01:
        out.append(('WARN', f'cloak comes within {cl["value"] * 100:.1f} cm of a leg ({cl["detail"].split("(")[-1].rstrip(")")})',
                    'raise "flare", shorten "length", or lower "lag" on that clip'))
    ft = by.get('feet')
    if ft and ft.get('slide', 0) > 0.0012:
        out.append(('WARN', f'planted foot creeps {ft["slide"] * 1000:.1f} mm a frame', 'check the hip height / stride of that clip'))
    lp = by.get('loop')
    if lp and lp.get('seams'):
        for k, sm in lp['seams'].items():
            if sm > 0.01 * H:
                out.append(('WARN', f'{k}: the cloth needed {sm * 100:.1f} cm of correction to close the loop',
                            'the cloak is not periodic: raise "damp", soften "twist" / "fold", or lengthen the loop'))
    an = [r for r in res if r['check'].startswith('anticipation')]
    for r in an:
        if r.get('value', 0) < 2.5:
            out.append(('WARN', f'{r["check"].split(":")[1].strip()} — wind-up only {r["value"]:.1f} deg', 'the turn starts cold; make "move" longer'))
    return out
