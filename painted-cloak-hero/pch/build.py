"""character.json -> character.blend + character.glb (one animation per clip) + motion.json (+ the review scene).

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


def review_camera(sp, body, yaw=None):
    """The review camera for a given orbit yaw (the hero stays on the spot; the camera orbits, the light does not)."""
    cam = sp['review'].get('camera', {})
    H = body.H
    hat = 0.12 * H if any(p['type'] == 'hat' for p in sp['parts']) else 0.0
    tall = H + hat + 0.05 * H
    lens = float(cam.get('lens', 50))
    dist = SC.frame_dist(tall, lens, float(cam.get('fill', 0.86))) * float(cam.get('zoom', 1.0))
    tz = (H + hat) * 0.47
    elev = math.radians(float(cam.get('elev', 7)))
    yaw = float(cam.get('yaw', -20)) if yaw is None else yaw
    a = math.radians(yaw)
    # shift the hero left of centre, away from the concept inset (top right): aim the camera right of the hero
    side = Vector((math.cos(a), math.sin(a), 0))
    target = Vector((0, 0, tz)) + side * float(cam.get('dx', 0.16)) * H
    loc = target + Vector((math.sin(a) * dist * math.cos(elev), -math.cos(a) * dist * math.cos(elev), dist * math.sin(elev)))
    return loc, target, lens


def place_camera(cam_ob, sp, body, yaw):
    loc, target, lens = review_camera(sp, body, yaw)
    cam_ob.location = loc
    cam_ob.rotation_euler = (target - loc).to_track_quat('-Z', 'Y').to_euler()
    cam_ob.data.lens = lens


def orbit_yaw(sp, u):
    """Camera yaw at fraction u of a clip's review (source: the view swings from the front round to the profile)."""
    o = sp['review'].get('orbit', [-25, 80])
    if not isinstance(o, list) or len(o) < 2:
        return float(sp['review'].get('camera', {}).get('yaw', -20))
    k = u * u * (3 - 2 * u)
    return float(o[0]) + (float(o[1]) - float(o[0])) * k


def build(spec_path, out_dir, motion=True, glb=True):
    reset()
    sp = S.load(spec_path)
    os.makedirs(out_dir, exist_ok=True)
    body, ctx, rig = build_character(sp)
    data = {'name': sp['name'], 'title': sp.get('title', sp['name']), 'review': sp['review'], 'H': body.H,
            'chains': [{'name': c['name'], 'part': c['part'], 'bones': c['bones'], 'parent': c['parent'],
                        'params': {k: v for k, v in c['params'].items()}} for c in ctx.chains],
            'pieces': len(ctx.pieces), 'bones': len(rig.data.bones), 'fps': int(sp['motion']['fps']),
            'grid': float(sp['review'].get('gridStep', 0.25))}
    clips = []
    if motion:
        m = C.MotionCtx(body, ctx.surfaces, sp)
        clips = K.bake(rig, body, ctx, m, sp['motion']['clips'], int(sp['motion']['fps']))
        data['arm_rest'] = m.arm_rest
    data['clips'] = [{k: v for k, v in c.items() if k != 'frames'} for c in clips]
    SC.world(sp['review']['bg'])
    SC.floor(sp['review']['floor'], sp['review'].get('grid', '#6d6f80'), step=data['grid'])
    loc, target, lens = review_camera(sp, body, orbit_yaw(sp, 0.0))
    cam = SC.camera('review_cam', loc, target, lens)
    bpy.context.scene.camera = cam
    SC.lights(Vector((0, 0, body.H * 0.5)), scale=float(sp['review'].get('light', 1.0)), H=body.H)
    data['camera'] = {'loc': list(cam.location), 'target': list(target), 'lens': lens,
                      'orbit': sp['review'].get('orbit', [-25, 80]), 'fill': sp['review'].get('camera', {}).get('fill', 0.86)}
    data['cam_fn'] = {'dist': (loc - target).length, 'tz': target.z, 'dx': float(sp['review'].get('camera', {}).get('dx', 0.16)) * body.H,
                      'elev': float(sp['review'].get('camera', {}).get('elev', 7))}
    bpy.context.scene.frame_set(1)
    blend = os.path.join(out_dir, 'character.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    if glb:
        export_glb(rig, os.path.join(out_dir, 'character.glb'))
    with open(os.path.join(out_dir, 'motion.json'), 'w') as f:
        json.dump({**data, 'frames': {c['label']: c['frames'] for c in clips}}, f)
    return sp, body, ctx, rig, data, clips


def export_glb(rig, path):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    rig.select_set(True)
    for o in rig.children:
        o.select_set(True)
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_animations=True,
              export_apply=False, export_yup=True, export_skins=True, export_morph=False,
              export_force_sampling=True, export_optimize_animation_size=True, export_def_bones=False,
              export_animation_mode='ACTIONS',
              export_image_format='AUTO', export_cameras=False, export_lights=False)
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        for k in ('export_optimize_animation_size', 'export_def_bones', 'export_image_format', 'export_animation_mode'):
            kw.pop(k, None)
        bpy.ops.export_scene.gltf(**kw)
