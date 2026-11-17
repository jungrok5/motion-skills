"""Bake: every clip becomes its own action (glTF animation), keyed on every bone every frame.

Loops (idle, walk, run):
  1. warm up: run the clip for `warm` loops before frame 0 so the cloak reaches its steady state (pose(t) is defined
     for any t because every loop is periodic),
  2. simulate frames 0..N (N = loop length) in the world — the walk really moves, so the cloak trails behind it,
  3. move to "in place": subtract the root's travel (the review floor scrolls at the same speed instead),
  4. close the loop: the small residual between frame N and frame 0 of every cloth particle is spread linearly over
     the loop, then the chain bones are re-aimed; key N equals key 0, so the clip loops without a pop.
One-shots (turn, wave, hop) start from rest (settled) and end on their last frame.
"""
import math
import bpy
from mathutils import Matrix, Vector
from .pose import Skeleton, solve, aim
from .spring import ChainSim
from .clips import CLIPS, LOOPS, speed


def new_action(rig, name):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    rig.animation_data_create()
    try:
        slot = act.slots.new(id_type='OBJECT', name=rig.name)
        layer = act.layers.new('Layer')
        strip = layer.strips.new(type='KEYFRAME')
        cb = strip.channelbags.new(slot)
        return act, cb.fcurves, slot
    except AttributeError:                       # Blender < 4.4
        return act, act.fcurves, None


def assign(rig, act):
    rig.animation_data_create()
    rig.animation_data.action = act
    try:
        if act.slots:
            rig.animation_data.action_slot = act.slots[0]
    except AttributeError:
        pass


def _keys_to_action(rig, sk, act_fc, keys, n):
    for b in sk.order:
        chans = [('rotation_quaternion', 4, [tuple(q) for q in keys[b]['q']])]
        if b in ('root', 'hips') or max(v.length for v in keys[b]['l']) > 1e-5:
            chans.append(('location', 3, [tuple(v) for v in keys[b]['l']]))
        if b.startswith('eye.'):
            chans.append(('scale', 3, [tuple(v) for v in keys[b]['s']]))
        for path, dim, vals in chans:
            for i in range(dim):
                fc = act_fc.new(f'pose.bones["{b}"].{path}', index=i)
                kp = fc.keyframe_points
                kp.add(n)
                co = []
                for f in range(n):
                    co += [f + 1, vals[f][i]]
                kp.foreach_set('co', co)
                kp.foreach_set('interpolation', [1] * n)   # LINEAR
                fc.update()


def bake_clip(rig, body, ctx, m, c, fps, warm_loops=3):
    sk = Skeleton(rig)
    c = dict(c)
    c['dur'] = float(c.get('dur', 2.0))
    loop = c['type'] in LOOPS
    fn = CLIPS[c['type']]
    N = max(2, int(round(c['dur'] * fps)))
    if loop:
        c['dur'] = N / fps              # exact loop length in frames
    root0 = (0.0, 0.0, float(c.get('yaw', 0.0)))
    v = speed(m, c)
    ya = math.radians(root0[2])
    fwd = Vector((math.sin(ya), -math.cos(ya), 0))
    sim = ChainSim(sk, ctx.chains, body, ctx.surfaces, fps)
    chain_bones = {b for ch in ctx.chains for b in ch['bones']}
    W = (warm_loops * N) if loop else 0
    frames_D, frames_P, frames_pose, frames_info, frames_G, travel = [], [], [], [], [], []
    for k in range(-W, N + 1):
        t = k / fps
        pose = fn(m, c, t if loop else max(0.0, min(t, c['dur'])), root0)
        D, info = solve(sk, pose, body)
        D = sim.step(D, first=(k == -W), warm=(30 if k == -W else 0))
        if k < 0:
            continue
        T = fwd * (v * t)
        G0 = {ch['name']: sim.goals(D, ch, lag=0.0)[-1] - T for ch in ctx.chains}
        Tm = Matrix.Translation(-T)
        D = {b: Tm @ M for b, M in D.items()}
        P = {ch['name']: [q - T for q in sim.state[ch['name']][0]] for ch in ctx.chains}
        frames_D.append(D)
        frames_P.append(P)
        frames_pose.append(pose)
        frames_info.append(info)
        frames_G.append(G0)
        travel.append(v * t)
    seam = 0.0
    seams = {}
    if loop:
        # close the loop: spread the residual of every particle over the loop
        for ch in ctx.chains:
            a, b = frames_P[0][ch['name']], frames_P[N][ch['name']]
            res = [bb - aa for aa, bb in zip(a, b)]
            seams[ch['name']] = max(r.length for r in res)
            seam = max(seam, seams[ch['name']])
            for f in range(N + 1):
                w = f / N
                frames_P[f][ch['name']] = [q - r * w for q, r in zip(frames_P[f][ch['name']], res)]
    keys = {b: {'q': [], 'l': [], 's': []} for b in sk.order}
    frames = []
    prevq = {}
    for f in range(N + 1):
        D = frames_D[f]
        for ch in ctx.chains:
            pos = frames_P[f][ch['name']]
            for i, bn in enumerate(ch['bones']):
                D[bn] = aim(sk, D, bn, pos[i + 1])
        for b in sk.order:
            B = sk.basis(D, b)
            loc, q, sc = B.decompose()
            if b in prevq and prevq[b].dot(q) < 0:
                q = -q
            prevq[b] = q
            keys[b]['q'].append(q)
            keys[b]['l'].append(loc)
            keys[b]['s'].append(sc)
        pose = frames_pose[f]
        joints = {b: list(D[b] @ sk.head[b]) for b in sk.order if b not in chain_bones}
        joints.update({b + ':tail': list(D[b] @ sk.tail[b]) for b in ('foot.L', 'foot.R', 'head', 'hand.L', 'hand.R')})
        tips = {}
        for ch in ctx.chains:
            last = ch['bones'][-1]
            goal = frames_G[f][ch['name']]          # where the hem would be if it moved with the body (no delay)
            tips[ch['name']] = [list(D[last] @ sk.tail[last]), list(goal), [list(q) for q in frames_P[f][ch['name']]]]
        info = frames_info[f]
        frames.append({'f': f, 't': round(f / fps, 4), 'travel': travel[f], 'pose': {
            'root': list(pose['root']), 'leg.L': list(pose['leg.L']), 'leg.R': list(pose['leg.R']),
            'blink': pose.get('blink', 0), 'hips': list(pose['hips']), 'chest': list(pose['chest'])},
            'joints': joints, 'tips': tips, 'miss': [info['miss.L'], info['miss.R']]})
    if loop:          # key N = key 0 exactly (the loop closes on itself)
        for b in sk.order:
            for ch_ in ('q', 'l', 's'):
                keys[b][ch_][N] = keys[b][ch_][0].copy()
    label = c.get('label', c['type'])
    act, fcurves, slot = new_action(rig, label)
    _keys_to_action(rig, sk, fcurves, keys, N + 1)
    stats = {k: dict(v) for k, v in sim.stats.items()}
    return {'label': label, 'type': c['type'], 'loop': loop, 'fps': fps, 'n': N, 'dur': N / fps, 'speed': v,
            'fwd': list(fwd), 'seam': seam, 'seams': seams, 'chain_stats': stats, 'action': act.name, 'frames': frames,
            'params': {k: c[k] for k in c if isinstance(c[k], (int, float, str, list))}}


def bake(rig, body, ctx, m, clips, fps):
    out = []
    for c in clips:
        if c['type'] not in CLIPS:
            raise KeyError(f"unknown clip {c['type']!r}; known: {sorted(CLIPS)}")
        out.append(bake_clip(rig, body, ctx, m, c, fps))
    assign(rig, bpy.data.actions[out[0]['action']])
    s = bpy.context.scene
    s.render.fps = fps
    s.frame_start, s.frame_end = 1, out[0]['n'] + 1
    return out
