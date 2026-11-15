"""Bake: run the clip sequence frame by frame, solve the body, simulate the cloth chains, write one action with a
key on every bone every frame (linear), and record what the checks need (joint positions, chain motion, labels)."""
import math
import bpy
from mathutils import Quaternion
from .pose import Skeleton, solve
from .spring import ChainSim


def _new_action(rig, name):
    act = bpy.data.actions.new(name)
    rig.animation_data_create()
    try:
        slot = act.slots.new(id_type='OBJECT', name=rig.name)
        layer = act.layers.new('Layer')
        strip = layer.strips.new(type='KEYFRAME')
        cb = strip.channelbags.new(slot)
        rig.animation_data.action = act
        rig.animation_data.action_slot = slot
        return act, cb.fcurves
    except AttributeError:                       # Blender < 4.4
        rig.animation_data.action = act
        return act, act.fcurves


def bake(rig, body, ctx, seq, fps, record_every=1):
    sk = Skeleton(rig)
    sim = ChainSim(sk, ctx.chains, body, ctx.surfaces, fps)
    n = int(round(seq.duration * fps)) + 1
    chain_bones = {b for c in ctx.chains for b in c['bones']}
    keys = {b: {'q': [], 'l': [], 's': []} for b in sk.order}
    frames = []
    prevq = {}
    for f in range(n):
        t = f / fps
        pose = seq.pose(t)
        D, info = solve(sk, pose, body)
        D = sim.step(D, first=(f == 0), warm=(30 if f == 0 else 0))
        for b in sk.order:
            B = sk.basis(D, b)
            loc, q, sc = B.decompose()
            if b in prevq and prevq[b].dot(q) < 0:
                q = -q
            prevq[b] = q
            keys[b]['q'].append(q)
            keys[b]['l'].append(loc)
            keys[b]['s'].append(sc)
        if f % record_every == 0:
            joints = {b: list(D[b] @ sk.head[b]) for b in sk.order if b not in chain_bones}
            joints.update({b + ':tail': list(D[b] @ sk.tail[b]) for b in ('foot.L', 'foot.R', 'head', 'hand.L', 'hand.R')})
            tips = {}
            for c in ctx.chains:
                last = c['bones'][-1]
                goal = D[c['parent']] @ c['points'][-1]
                tips[c['name']] = [list(D[last] @ sk.tail[last]), list(goal)]
            frames.append({'f': f, 't': round(t, 4), 'label': seq.label(t), 'pose': {
                'root': list(pose['root']), 'leg.L': list(pose['leg.L']), 'leg.R': list(pose['leg.R']),
                'blink': pose.get('blink', 0)}, 'joints': joints, 'tips': tips,
                'miss': [info['miss.L'], info['miss.R']]})
    act, fcurves = _new_action(rig, 'review')
    for b in sk.order:
        pb = rig.pose.bones[b]
        chans = [('rotation_quaternion', 4, [tuple(q) for q in keys[b]['q']])]
        if b in ('root', 'hips') or max(v.length for v in keys[b]['l']) > 1e-5:
            chans.append(('location', 3, [tuple(v) for v in keys[b]['l']]))
        if b.startswith('eye.'):
            chans.append(('scale', 3, [tuple(v) for v in keys[b]['s']]))
        for path, dim, vals in chans:
            for i in range(dim):
                fc = fcurves.new(f'pose.bones["{b}"].{path}', index=i)
                try:
                    fc.group = None
                except Exception:
                    pass
                kp = fc.keyframe_points
                kp.add(n)
                co = []
                for f in range(n):
                    co += [f + 1, vals[f][i]]
                kp.foreach_set('co', co)
                kp.foreach_set('interpolation', [1] * n)   # LINEAR
                fc.update()
    s = bpy.context.scene
    s.render.fps = fps
    s.frame_start, s.frame_end = 1, n
    # markers for the clip names (the HUD reads them)
    for (t0, c, root) in seq.items:
        s.timeline_markers.new(c.get('label', c['type']), frame=int(round(t0 * fps)) + 1)
    return {'frames': frames, 'n': n, 'fps': fps, 'chains': sim.stats, 'duration': seq.duration}
