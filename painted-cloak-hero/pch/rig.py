"""Armature: the body bones plus every cloth chain the parts registered; skin weights per piece.

Weights: a piece lists the bones it may follow; each vertex is weighted to its nearest bone segments (inverse
distance, top 3). Rigid pieces (eyes, hat, shoes) follow one bone. Skirt vertices follow the skirt chains only,
so the skirt swings on its own bones instead of stretching with the thighs.
"""
import bpy
from mathutils import Vector


def _seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-12)))
    return (a + ab * t - p).length


def build_armature(body, ctx, name='rig'):
    arm = bpy.data.armatures.new(name)
    ob = bpy.data.objects.new(name, arm)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.edit_bones
    heads = {}
    for (n, h, t, parent) in body.bones():
        b = eb.new(n)
        b.head, b.tail, b.roll = h, t, 0.0
        if parent:
            b.parent = eb[parent]
            b.use_connect = False
        heads[n] = (h, t)
    for ch in ctx.chains:
        prev = ch['parent']
        for i, bn in enumerate(ch['bones']):
            b = eb.new(bn)
            b.head, b.tail, b.roll = ch['points'][i], ch['points'][i + 1], 0.0
            b.parent = eb[prev]
            b.use_connect = i > 0
            prev = bn
            heads[bn] = (ch['points'][i], ch['points'][i + 1])
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in ob.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    ob['pch_chains'] = [c['name'] for c in ctx.chains]
    return ob, heads


def bind(rig, heads, ctx):
    for pc in ctx.pieces:
        ob = pc['obj']
        me = ob.data
        if pc['rigid']:
            names = [pc['rigid']]
        else:
            names = pc['bones']
        for n in names:
            if n not in heads:
                raise KeyError(f'piece {ob.name} binds to unknown bone {n}')
        groups = {n: ob.vertex_groups.new(name=n) for n in names}
        wfn = pc.get('wfn')
        if len(names) == 1:
            groups[names[0]].add(list(range(len(me.vertices))), 1.0, 'REPLACE')
        else:
            segs = [(n, Vector(heads[n][0]), Vector(heads[n][1])) for n in names if not (wfn and n in pc.get('fixed', ()))]
            for v in me.vertices:
                p = v.co
                if wfn:
                    fixed = wfn(p)
                    if fixed:
                        for n, w in fixed:
                            if w > 0.01:
                                groups[n].add([v.index], w, 'REPLACE')
                        if sum(w for _, w in fixed) > 0.999:
                            continue
                        scale = 1 - sum(w for _, w in fixed)
                    else:
                        scale = 1.0
                else:
                    scale = 1.0
                ds = sorted(((_seg_dist(p, a, b), n) for (n, a, b) in segs))[:3]
                ws = [(1.0 / (d + 0.004) ** 4, n) for d, n in ds]
                s = sum(w for w, _ in ws)
                for w, n in ws:
                    if w / s > 0.01:
                        groups[n].add([v.index], w / s * scale, 'ADD')
        mod = ob.modifiers.new('rig', 'ARMATURE')
        mod.object = rig
        ob.parent = rig
        ob['pch_part'] = pc['part']
