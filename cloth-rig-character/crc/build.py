"""character.json -> character.blend + character.glb + motion.json (+ the review scene in the .blend).

The four steps of the source workflow, in code:
  1. blockout + parts  (parts.build_parts: body, head, then the spec's parts in layering order)
  2. layer the outfit  (the order of spec.parts; each later garment sits a little further out)
  3. bones             (rig.build_armature: body bones + a bone row in every skirt / ribbon / tail)
  4. motion            (clips -> spring follow-through -> bake)
"""
import json
import math
import os
import bpy
from mathutils import Vector
from . import spec as S, body as B, parts as Pm, rig as R, clips as C, bake as K, scene as SC, materials as M


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M.reset()


def build_character(sp):
    body = B.Body(sp)
    ctx = Pm.Ctx(body, sp)
    Pm.build_parts(ctx, sp['parts'])
    rig, heads = R.build_armature(body, ctx)
    R.bind(rig, heads, ctx)
    return body, ctx, rig


def review_camera(sp, body, frames):
    """Fixed camera that keeps the whole sequence in frame (the review rule: the camera never moves)."""
    cam = sp['review'].get('camera', {})
    xs = [f['pose']['root'][0] for f in frames]
    ys = [f['pose']['root'][1] for f in frames]
    H = body.H
    hat = 0.12 * H if any(p['type'] == 'hat' for p in sp['parts']) else 0.0
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    span = max(max(xs) - min(xs), (max(ys) - min(ys)) * 0.6) + 0.75 * H
    tall = H + hat + 0.05 * H
    lens = float(cam.get('lens', 50))
    need_h = max(tall, span / (16 / 9))
    dist = SC.frame_dist(need_h, lens, float(cam.get('fill', 0.92))) * float(cam.get('zoom', 1.0))
    tz = (H + hat) * 0.47
    yaw = float(cam.get('yaw', -12))
    elev = math.radians(float(cam.get('elev', 7)))
    target = Vector((cx + float(cam.get('dx', 0.07 * span)), cy, tz))   # leave room for the inset (top right)
    a = math.radians(yaw)
    loc = target + Vector((math.sin(a) * dist * math.cos(elev), -math.cos(a) * dist * math.cos(elev), dist * math.sin(elev)))
    return SC.camera('review_cam', loc, target, lens), target, dist


def build(spec_path, out_dir, motion=True, glb=True):
    reset()
    sp = S.load(spec_path)
    os.makedirs(out_dir, exist_ok=True)
    body, ctx, rig = build_character(sp)
    data = {'name': sp['name'], 'title': sp.get('title', sp['name']), 'review': sp['review'], 'H': body.H,
            'chains': [{'name': c['name'], 'part': c['part'], 'bones': c['bones'], 'parent': c['parent'],
                        'params': {k: v for k, v in c['params'].items()}} for c in ctx.chains],
            'pieces': len(ctx.pieces), 'bones': len(rig.data.bones), 'arm_rest': None}
    if motion:
        m = C.MotionCtx(body, ctx.surfaces, sp)
        seq = C.Sequence(m, sp['motion']['clips'], sp['motion']['start'], float(sp['motion'].get('blend', 0.25)))
        res = K.bake(rig, body, ctx, seq, int(sp['motion']['fps']))
        data.update({'fps': res['fps'], 'n': res['n'], 'duration': res['duration'], 'chain_stats': res['chains'],
                     'clips': [{'t0': t0, 'type': c['type'], 'label': c.get('label', c['type']), 'dur': c['dur']}
                               for (t0, c, root) in seq.items],
                     'arm_rest': m.arm_rest})
        frames = res['frames']
    else:
        frames = [{'pose': {'root': [0, 0, 0]}}]
    SC.world(sp['review']['bg'])
    SC.floor(sp['review']['floor'], sp['review'].get('grid', '#6d6f80'))
    cam, target, dist = review_camera(sp, body, frames)
    bpy.context.scene.camera = cam
    SC.lights(target, scale=float(sp['review'].get('light', 1.0)))
    data['camera'] = {'loc': list(cam.location), 'target': list(target), 'lens': cam.data.lens}
    bpy.context.scene.frame_set(1)
    blend = os.path.join(out_dir, 'character.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    if glb:
        export_glb(rig, os.path.join(out_dir, 'character.glb'))
    with open(os.path.join(out_dir, 'motion.json'), 'w') as f:
        json.dump({**data, 'frames': frames}, f)
    return sp, body, ctx, rig, data, frames


def export_glb(rig, path):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    rig.select_set(True)
    for o in rig.children:
        o.select_set(True)
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_animations=True,
              export_apply=False, export_yup=True, export_skins=True, export_morph=False,
              export_force_sampling=True, export_optimize_animation_size=True, export_def_bones=False,
              export_image_format='AUTO', export_cameras=False, export_lights=False)
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        for k in ('export_optimize_animation_size', 'export_def_bones', 'export_image_format'):
            kw.pop(k, None)
        bpy.ops.export_scene.gltf(**kw)
