"""machine.py -> out/machine.blend, out/machine.glb, out/machine_info.json.

Order (the source's step 6, one script): reset scene · load spec · kinematics · actions sampled · actuator anchors
searched · armature · parts (project build(k): stock limbs + the topic's own body, head, ...) · rigid skinning ·
studio · actions keyed · save · glTF · numbers out.
"""
import json
import os
import bpy
from mathutils import Matrix, Vector
from . import spec as SP, kin as KN, motion as MO, actuators as AC, rig as RG, materials as MT, kit as KT, studio as ST


class Machine:
    """Everything a later step needs, rebuilt from the spec (no hidden state)."""

    def __init__(self, path):
        self.path = os.path.abspath(path)
        self.M, self.mod = SP.load(self.path)
        self.kin = KN.Kin(self.M)
        self.mot = MO.Motion(self.M, self.kin)
        self.fps = int(self.M.get('fps', 24))
        self.act_report = AC.assign(self.kin, self.mot)
        self.W_rest, _ = self.pose('rest', 0.0)

    def cmd(self, action, t, travel=True):
        return self.mot.cmd(action, t, travel)

    def pose(self, action, t, travel=True):
        c = self.cmd(action, t, travel)
        return self.kin.pose(c, cmd_at=lambda tt: self.cmd(action, tt, travel), t=t)

    def light(self, action, t):
        return self.cmd(action, t).get('light', 1.0)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def build(path, out_dir, glb=True, keyed=True, studio=True):
    reset()
    mc = Machine(path)
    M, kin = mc.M, mc.kin
    scene = bpy.context.scene
    scene.render.fps = mc.fps
    coll = bpy.data.collections.new('Machine')
    scene.collection.children.link(coll)
    pal = MT.Palette(M['palette'])
    arm = RG.make_armature(kin, mc.W_rest, coll)
    k = KT.Kit(M, kin, mc.W_rest, pal, coll)
    k.mc = mc
    if not hasattr(mc.mod, 'build'):
        raise RuntimeError('machine.py has no build(k)')
    mc.mod.build(k)
    RG.parent_parts(k, arm, mc.W_rest)
    RR = RG.rest_rel(arm, kin)
    if studio:
        scoll = bpy.data.collections.new('Studio')
        scene.collection.children.link(scoll)
        H = machine_height(mc)
        ST.cyclorama(H, coll=scoll)
        ST.lights(coll=scoll)
        ST.figure(M['figure'], coll=scoll, loc=M.get('figure_at', (0, 0, 0)))
    actions = mc.mot.actions()
    info_actions = {}
    if keyed:
        for name, (dur, loop) in actions.items():
            n = int(round(dur * mc.fps))
            # the glTF / .blend actions stay in place; the walk's speed goes in the info file
            RG.bake_action(arm, kin, RR, f'A_{name}', lambda t, a=name: mc.pose(a, t, travel=False)[0], n, mc.fps)
            info_actions[name] = {'frames': n + 1, 'dur': n / mc.fps, 'loop': loop,
                                  'speed': mc.mot.v if name == 'walk' else 0.0,
                                  'light': [round(mc.light(name, f / mc.fps), 3) for f in range(n + 1)]}
        for pb in arm.pose.bones:
            pb.matrix_basis = Matrix.Identity(4)
        RG.assign(arm, bpy.data.actions['A_idle'])
    os.makedirs(out_dir, exist_ok=True)
    scene.frame_start, scene.frame_end = 1, int(round(actions['idle'][0] * mc.fps)) + 1
    scene.frame_set(1)
    info = describe(mc, k, info_actions)
    with open(os.path.join(out_dir, 'machine_info.json'), 'w') as f:
        json.dump(info, f, indent=1)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, 'machine.blend'), compress=True)
    if glb:
        export_glb(arm, os.path.join(out_dir, 'machine.glb'))
    return mc, k, arm, RR, info


def machine_height(mc):
    W = mc.W_rest
    zs = [m.translation.z for m in W.values()]
    return max(zs) + 1.0


def describe(mc, k, actions):
    M = mc.M
    W = mc.W_rest
    pts = []
    for p in k.parts:
        ob = p['obj']
        Wp = Matrix(ob['rest_world'])
        for c in ob.bound_box:
            pts.append(Wp @ Vector(c))
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    tris = sum(sum(len(pl.vertices) - 2 for pl in me.polygons) for me in {p['obj'].data for p in k.parts})
    return {
        'name': M['name'], 'title': M['title'], 'units': 'm', 'axes': '+X forward, +Y left, +Z up',
        'height': hi[2], 'bounds': [lo, hi], 'figure': M['figure'],
        'parts': [{'name': p['name'], 'bone': p['bone'], 'stage': p['stage'], 'mats': p['mats']} for p in k.parts],
        'n_parts': len(k.parts), 'n_unique_meshes': len({p['obj'].data.name for p in k.parts}),
        'n_bones': len(mc.kin.bones), 'tris_unique': tris,
        'bones': [{'name': b, 'parent': par, 'rest': [list(r) for r in W[b]]} for (b, par, _) in mc.kin.bones],
        'actuators': mc.act_report,
        'walk': {'cycle': mc.mot.T, 'duty': mc.mot.duty, 'stride': mc.mot.S, 'speed': mc.mot.v,
                 'offsets': mc.mot.off},
        'actions': actions,
    }


def export_glb(arm, path, apply_mods=True, frame_step=1):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    arm.select_set(True)
    for o in arm.children:
        o.select_set(True)
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_animations=True,
              export_apply=apply_mods, export_yup=True, export_skins=True, export_morph=False,
              export_force_sampling=True, export_animation_mode='ACTIONS', export_cameras=False,
              export_lights=False, export_def_bones=False, export_optimize_animation_size=True,
              export_frame_step=frame_step)
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        for kk in ('export_optimize_animation_size', 'export_def_bones', 'export_animation_mode', 'export_frame_step'):
            kw.pop(kk, None)
        bpy.ops.export_scene.gltf(**kw)
