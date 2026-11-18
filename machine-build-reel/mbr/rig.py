"""Armature from the analytic rest pose; rigid skinning (every part on exactly one bone); actions keyed from kin.

Pose transfer: kin gives every bone's world matrix W[b]. A pose bone's matrix_basis is
    basis = (P_rest^-1 · B_rest)^-1 · (W[parent]^-1 · W[b])
so Blender's evaluated pose equals W exactly (checked by check.py: "bake = kinematics").
"""
import bpy
from mathutils import Matrix


def make_armature(kin, W, coll, name='rig'):
    arm_data = bpy.data.armatures.new(name)
    arm = bpy.data.objects.new(name, arm_data)
    coll.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones
    for (b, par, L) in kin.bones:
        e = eb.new(b)
        e.head = (0, 0, 0)
        e.tail = (0, max(0.05, L), 0)
        e.matrix = W[b]
        if par:
            e.parent = eb[par]
        e.use_deform = False
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    arm_data.display_type = 'STICK'
    arm.show_in_front = True
    return arm


def rest_rel(arm, kin):
    """bone -> inverse of its rest matrix relative to its parent (Blender's own, so roll round-off cancels)."""
    out = {}
    for (b, par, _) in kin.bones:
        B = arm.data.bones[b].matrix_local
        if par:
            P = arm.data.bones[par].matrix_local
            out[b] = (P.inverted() @ B).inverted()
        else:
            out[b] = B.inverted()
    return out


def parent_parts(k, arm, W_rest):
    """Rigid skinning: each part object is a child of its bone, placed exactly where it was built."""
    for p in k.parts:
        ob = p['obj']
        b = p['bone']
        Wp = Matrix(ob['rest_world'])
        ob.parent = arm
        ob.parent_type = 'BONE'
        ob.parent_bone = b
        ob.matrix_parent_inverse = Matrix.Identity(4)
        L = arm.data.bones[b].length
        ob.matrix_basis = Matrix.Translation((0, L, 0)).inverted() @ W_rest[b].inverted() @ Wp


def basis_from_world(kin, RR, W):
    out = {}
    for (b, par, _) in kin.bones:
        rel = (W[par].inverted() @ W[b]) if par else W[b]
        out[b] = RR[b] @ rel
    return out


def apply_world(arm, kin, RR, W):
    """Pose the armature so every bone's world matrix is W[b]."""
    Bs = basis_from_world(kin, RR, W)
    for b, m in Bs.items():
        arm.pose.bones[b].matrix_basis = m


def new_action(arm, name):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    try:
        slot = act.slots.new(id_type='OBJECT', name=arm.name)
        layer = act.layers.new('Layer')
        strip = layer.strips.new(type='KEYFRAME')
        cb = strip.channelbags.new(slot)
        return act, cb.fcurves, slot
    except AttributeError:
        return act, act.fcurves, None


def assign(arm, act):
    arm.animation_data_create()
    arm.animation_data.action = act
    try:
        if act.slots:
            arm.animation_data.action_slot = act.slots[0]
    except AttributeError:
        pass


def bake_action(arm, kin, RR, name, pose_fn, n_frames, fps):
    """Key every bone on every frame 1..n_frames+1 (loops: last key = first) from pose_fn(t) -> W."""
    keys = {b: ([], []) for (b, _, _) in kin.bones}
    prevq = {}
    for f in range(n_frames + 1):
        t = f / fps
        W = pose_fn(t)
        Bs = basis_from_world(kin, RR, W)
        for b, m in Bs.items():
            loc, q, _ = m.decompose()
            if b in prevq and prevq[b].dot(q) < 0:
                q = -q                           # keep quaternions on one hemisphere (no flips when interpolating)
            prevq[b] = q
            keys[b][0].append(tuple(loc))
            keys[b][1].append(tuple(q))
    act, fcs, slot = new_action(arm, name)
    n = n_frames + 1
    for b, (locs, qs) in keys.items():
        for path, vals, dim in (('location', locs, 3), ('rotation_quaternion', qs, 4)):
            if path == 'location' and max(abs(c) for v in vals for c in v) < 1e-7:
                continue
            for i in range(dim):
                fc = fcs.new(f'pose.bones["{b}"].{path}', index=i)
                kp = fc.keyframe_points
                kp.add(n)
                co = []
                for f in range(n):
                    co += [f + 1, vals[f][i]]
                kp.foreach_set('co', co)
                kp.foreach_set('interpolation', [1] * n)
                fc.update()
    return act
