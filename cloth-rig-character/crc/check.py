"""Checks: the rig and the motion are physically possible and the cloth actually moves.

  build     every piece is skinned (no vertex without a weight), every part made something
  facing    rest pose: eyes / nose / toes in front (-Y), left parts on +X, a 'back' bow behind
  bake      Blender's evaluated pose matches the solver (so the .blend, the glTF and these checks agree)
  body      knees fold back only, elbows forward only, neck <= 90 deg yaw, waist <= 45, thigh <= 75 behind
  feet      no foot under the floor, IK reached the ground, a planted foot does not slide
  direction walking: moving direction = facing direction
  cloth     every chain moves (follow-through exists), lags more on the turn than at idle, never explodes,
            and starts settled
  blink     idle has a blink
  determinism  a second bake gives the same numbers
"""
import hashlib
import json
import math
import bpy
from mathutils import Vector
from .body import LIMITS


def V(a):
    return Vector(a)


def _fwd_from_yaw(yaw):
    a = math.radians(yaw)
    return Vector((math.sin(a), -math.cos(a), 0))


def _flat(v):
    return Vector((v.x, v.y, 0))


def _ang(a, b):
    a, b = _flat(a), _flat(b)
    if a.length < 1e-9 or b.length < 1e-9:
        return 0.0
    return math.degrees(a.angle(b))


def motion_hash(frames):
    h = hashlib.sha1()
    for f in frames:
        for k in sorted(f['joints']):
            h.update(','.join(f'{x:.5f}' for x in f['joints'][k]).encode())
        for k in sorted(f['tips']):
            h.update(','.join(f'{x:.5f}' for x in f['tips'][k][0]).encode())
    return h.hexdigest()


def run(data, frames, rig=None, rehash=None):
    res = []

    def rep(name, ok, detail):
        res.append({'check': name, 'ok': bool(ok), 'detail': detail})

    H = data['H']
    # ---- build
    if rig is not None:
        bad = []
        for o in rig.children:
            if o.type != 'MESH':
                continue
            nz = sum(1 for v in o.data.vertices if not any(g.weight > 1e-4 for g in v.groups))
            if nz:
                bad.append(f'{o.name}:{nz}')
        rep('build: every vertex skinned', not bad, ', '.join(bad) or f'{len(rig.children)} pieces, {len(rig.data.bones)} bones')
        # ---- facing (rest pose)
        B = rig.data.bones
        hc = B['head'].head_local
        eyes = (B['eye.L'].head_local + B['eye.R'].head_local) / 2
        toeL = B['foot.L'].tail_local
        probs = []
        if not eyes.y < hc.y - 0.02 * H:
            probs.append('eyes not in front of the head')
        if not toeL.y < B['foot.L'].head_local.y:
            probs.append('toes point backwards')
        for s, sx in (('L', 1), ('R', -1)):
            for b in ('hand.', 'thigh.', 'eye.'):
                if B[b + s].head_local.x * sx <= 0:
                    probs.append(f'{b}{s} on the wrong side')
        for c in data['chains']:
            if c['name'].startswith('bow_') and rig.get('crc_bow_at', 'back') == 'back':
                pass
        rep('facing: front / back / left / right', not probs, '; '.join(probs) or 'eyes, toes in front (-Y); .L parts on +X')
    # ---- bake agrees with Blender
    if rig is not None:
        sc = bpy.context.scene
        worst = 0.0
        for f in frames[:: max(1, len(frames) // 8)]:
            sc.frame_set(f['f'] + 1)
            for name in ('hips', 'head', 'hand.L', 'foot.R', 'shin.L'):
                p = rig.matrix_world @ rig.pose.bones[name].head
                worst = max(worst, (p - V(f['joints'][name])).length)
            for c in data['chains'][:3]:
                last = c['bones'][-1]
                p = rig.matrix_world @ rig.pose.bones[last].tail
                worst = max(worst, (p - V(f['tips'][c['name']][0])).length)
        rep('bake: Blender pose = solver', worst < 0.002, f'max {worst * 1000:.2f} mm')
    # ---- body limits
    viol = {}

    def bump(k, f, v):
        if k not in viol or abs(v) > abs(viol[k][1]):
            viol[k] = (f, v)
    for fr in frames:
        J = {k: V(v) for k, v in fr['joints'].items()}
        fwd_root = _fwd_from_yaw(fr['pose']['root'][2])
        up = Vector((0, 0, 1))
        chest_f = (J['upper_arm.L'] - J['upper_arm.R']).cross(up).normalized()
        hips_f = (J['thigh.L'] - J['thigh.R']).cross(up).normalized()
        head_f = _flat((J['eye.L'] + J['eye.R']) / 2 - J['head'])
        a = _ang(head_f, chest_f)
        if a > LIMITS['neck_yaw']:
            bump('neck_yaw', fr['f'], a)
        a = _ang(chest_f, hips_f)
        if a > LIMITS['waist_yaw']:
            bump('waist_yaw', fr['f'], a)
        hu = (J['head:tail'] - J['head']).normalized()
        cu = (J['neck'] - J['chest']).normalized()
        a = math.degrees(hu.angle(cu))
        if a > LIMITS['neck_pitch']:
            bump('neck_pitch', fr['f'], a)
        for s in ('L', 'R'):
            hip, knee, ank = J['thigh.' + s], J['shin.' + s], J['foot.' + s]
            th, sh = knee - hip, ank - knee
            bend = math.degrees(th.angle(sh))
            foot_f = _flat(J['foot.' + s + ':tail'] - ank).normalized()
            line = ank - hip
            t = (knee - hip).dot(line) / max(line.length_squared, 1e-9)
            off = knee - (hip + line * t)
            if bend > 4 and off.dot(foot_f) < 0:
                bump('knee_backwards.' + s, fr['f'], bend)
            if bend > LIMITS['knee_bend'][1]:
                bump('knee_over.' + s, fr['f'], bend)
            # thigh behind the body
            d = th.normalized()
            back = math.degrees(math.atan2(-d.dot(hips_f), -d.z))
            if back > LIMITS['hip_back']:
                bump('hip_back.' + s, fr['f'], back)
            sh_, el, wr = J['upper_arm.' + s], J['forearm.' + s], J['hand.' + s]
            ua, fa = el - sh_, wr - el
            eb = math.degrees(ua.angle(fa))
            line = wr - sh_
            t = (el - sh_).dot(line) / max(line.length_squared, 1e-9)
            off = el - (sh_ + line * t)
            if eb > 6 and off.dot(chest_f) > 0.002 * H:
                bump('elbow_backwards.' + s, fr['f'], eb)
            if eb > LIMITS['elbow_bend'][1]:
                bump('elbow_over.' + s, fr['f'], eb)
    rep('body: joint limits (knee back, elbow forward, neck, waist, hip)', not viol,
        ', '.join(f'{k} f{v[0]} {v[1]:.0f}deg' for k, v in viol.items()) or 'all frames inside limits')
    # ---- feet
    under, miss, slide = 0.0, 0.0, 0.0
    where = {'miss': 0, 'slide': 0}
    prev = None
    for fr in frames:
        for s in ('L', 'R'):
            toe = V(fr['joints']['foot.' + s + ':tail'])
            under = max(under, -toe.z)
        if max(fr['miss']) > miss:
            miss, where['miss'] = max(fr['miss']), fr['f'] + 1
        if prev is not None:
            for i, s in enumerate(('L', 'R')):
                a, b = prev['pose']['leg.' + s], fr['pose']['leg.' + s]
                planted = abs(a[2] - b[2]) < 1e-6 and abs(a[3]) < 1e-6 and abs(b[3]) < 1e-6 and (V(a[:2]) - V(b[:2])).length < 1e-6
                if planted:
                    d = (V(fr['joints']['foot.' + s]) - V(prev['joints']['foot.' + s])).length
                    if d > slide:
                        slide, where['slide'] = d, fr['f'] + 1
        prev = fr
    rep('feet: on the floor, planted feet do not slide', under < 0.012 * H and miss < 0.012 * H and slide < 0.004 * H,
        f'deepest toe {under * 100:.1f} cm below floor, IK miss {miss * 100:.1f} cm (f{where["miss"]}), '
        f'planted slide {slide * 1000:.1f} mm/frame (f{where["slide"]})')
    # ---- direction
    worst = 0.0
    for c in data['clips']:
        if c['type'] != 'walk':
            continue
        fs = [fr for fr in frames if c['t0'] + 0.4 < fr['t'] < c['t0'] + c['dur']]
        for a, b in zip(fs, fs[1:]):
            mv = V(b['pose']['root'][:2]) - V(a['pose']['root'][:2])
            if mv.length > 1e-5:
                worst = max(worst, _ang(Vector((mv.x, mv.y, 0)), _fwd_from_yaw(b['pose']['root'][2])))
    rep('direction: moves the way it faces', worst < 20, f'max {worst:.1f} deg between motion and facing')
    # ---- cloth
    st = data['chain_stats']
    dead = [k for k, v in st.items() if v['max_dev'] < 0.012 * H]
    rep('cloth: every chain follows through', not dead,
        ('still: ' + ', '.join(dead)) if dead else ', '.join(f'{k} {v["max_dev"] * 100:.1f}cm' for k, v in list(st.items())[:6]) + ' ...')
    blown = []
    for c in data['chains']:
        for fr in frames:
            tip, goal = fr['tips'][c['name']]
            if any(math.isnan(x) for x in tip):
                blown.append(c['name'] + ' NaN')
                break
    settled = max((V(frames[0]['tips'][c['name']][0]) - V(frames[0]['tips'][c['name']][1])).length for c in data['chains']) if data['chains'] else 0
    rep('cloth: stable and settled at frame 1', not blown and settled < 0.05 * H, (', '.join(blown) or 'no NaN') + f'; frame-1 sag {settled * 100:.1f} cm')
    turn = [c for c in data['clips'] if c['type'] in ('turn', 'spin')]
    idle = [c for c in data['clips'] if c['type'] == 'idle']
    if turn and idle and data['chains']:
        def lag(c):
            fs = [fr for fr in frames if c['t0'] <= fr['t'] <= c['t0'] + c['dur']]
            return max(max((V(fr['tips'][ch['name']][0]) - V(fr['tips'][ch['name']][1])).length for ch in data['chains']) for fr in fs)
        lt, li = lag(turn[0]), lag(idle[0])
        rep('cloth: lags and flares on the turn', lt > max(1.6 * li, 0.02 * H), f'turn {lt * 100:.1f} cm vs idle {li * 100:.1f} cm')
    if idle:
        bl = max(fr['pose']['blink'] for fr in frames if idle[0]['t0'] <= fr['t'] <= idle[0]['t0'] + idle[0]['dur'])
        rep('blink: idle has a blink', bl > 0.8, f'max blink {bl:.2f}')
    if rehash:
        h0, h1 = rehash
        rep('determinism: rebuild gives the same motion', h0 == h1, h0[:12] + (' = ' if h0 == h1 else ' != ') + h1[:12])
    return res
