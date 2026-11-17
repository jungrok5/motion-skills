"""Stills: views, close-up plates, line drawings, sheets. All from the studio; the machine posed by kin.

    pose_machine(ctx, action, t, travel)    put every bone where kin says, set the lights
    view(ctx, path, yaw, elev, ...)         orbit view framing the whole machine (+ the figure if asked)
    plate(ctx, path, plate)                 close-up of one mechanism (a spec 'plates' entry)
    drawing(ctx, path, cam)                 the same camera as a technical line drawing (Freestyle, white paper)
"""
import math
import os
import subprocess
import bpy
from mathutils import Vector
from . import studio as ST, rig as RG

FONT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'fonts', 'Inter-Medium.otf')


class Ctx:
    def __init__(self, mc, arm, RR, pal=None):
        self.mc = mc
        self.arm = arm
        self.RR = RR
        self.mats = [m for m in bpy.data.materials if m.get('kind') == 'emit']
        self.H = None
        if arm.animation_data:            # posed by hand from kin: no action may overwrite the bones on render
            arm.animation_data.action = None

    def height(self):
        if self.H is None:
            self.H = max(Vector(self.arm.matrix_world @ (pb.matrix @ Vector((0, 0, 0)))).z
                         for pb in self.arm.pose.bones) + 0.8
        return self.H


def set_light(ctx, level):
    for m in ctx.mats:
        b = m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Emission Strength'].default_value = m['emit_full'] * max(0.0, level)


def pose_machine(ctx, action, t, travel=True):
    W, sols = ctx.mc.pose(action, t, travel)
    RG.apply_world(ctx.arm, ctx.mc.kin, ctx.RR, W)
    set_light(ctx, ctx.mc.light(action, t))
    bpy.context.view_layer.update()
    return W, sols


def machine_bounds(ctx, W=None):
    """World AABB of the posed machine from its parts' evaluated bounding boxes."""
    lo = Vector((1e9, 1e9, 1e9))
    hi = -lo
    for ob in bpy.data.collections['Machine'].objects:
        if ob.type != 'MESH':
            continue
        for c in ob.bound_box:
            p = ob.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
    return lo, hi


def render(path, res=(1280, 720), samples=32):
    s = bpy.context.scene
    ST.setup_render(res, samples, s.render.fps)
    path = os.path.abspath(path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def place(cam_loc, target, lens, fstop=0.0, focus=None):
    cam = ST.camera('Cam', cam_loc, target, lens, focus=focus, fstop=fstop)
    yaw = ST.place_cyc(cam_loc, target)
    ST.aim_lights(yaw)
    return cam


def orbit_loc(target, yaw, elev, dist):
    a, e = math.radians(yaw), math.radians(elev)
    return Vector(target) + Vector((math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e))) * dist


def view(ctx, path, yaw=-60.0, elev=6.0, lens=50.0, fill=0.86, res=(1280, 720), samples=32, figure=True,
         ortho=False, aim_z=0.5, target_xy=None):
    """yaw: where the camera stands, degrees around the machine (0 = in front of it on +X, -90 = its right side,
    90 = its left side, 180 = behind)."""
    lo, hi = machine_bounds(ctx)
    c = (lo + hi) / 2
    tgt = Vector((c.x, c.y, hi.z * aim_z)) if target_xy is None else Vector((*target_xy, hi.z * aim_z))
    asp = res[0] / res[1]
    size = max(hi.z, 0.9 * max(hi.x - lo.x, hi.y - lo.y) / asp)      # wide machines are framed by their width
    d = ST.frame_dist(size, lens, fill, aspect=asp)
    loc = orbit_loc(tgt, yaw, elev, d)
    cam = place(loc, tgt, lens)
    cam.data.type = 'ORTHO' if ortho else 'PERSP'
    if ortho:
        cam.data.ortho_scale = size / fill * max(1.0, asp)
    fig = bpy.data.objects.get('Figure')
    if fig:
        fig.hide_render = not figure
    return render(path, res, samples)


def plate_camera(ctx, p, aspect=16 / 9, lens=70.0, W=None):
    """Camera for a close-up plate: looking at a point on a bone from direction `dir` (world), framing `size` m."""
    arm = ctx.arm
    pb = arm.pose.bones[p['bone']]
    M = arm.matrix_world @ pb.matrix
    tgt = M @ Vector(p.get('at', (0, 0, 0)))
    d = Vector(p.get('dir', (0, -1, 0))).normalized()
    dist = ST.frame_dist(p['size'], lens, 0.9, aspect=aspect)
    loc = tgt - d * dist
    if loc.z < 0.4:
        loc.z = 0.4
    return loc, tgt


def plate(ctx, path, p, res=(1280, 720), samples=40, lens=70.0, fstop=4.0):
    loc, tgt = plate_camera(ctx, p, res[0] / res[1], lens)
    place(loc, tgt, lens, fstop=fstop * (p['size'] / 3.0), focus=tgt)
    fig = bpy.data.objects.get('Figure')
    if fig:
        fig.hide_render = False
    return render(path, res, samples)


# ---- line drawing (the code-only "reference" side of the comparison) ------------------------------------------
def drawing_mode(on):
    """White paper, black lines: every machine material swapped for flat white holdout-like diffuse, Freestyle on."""
    s = bpy.context.scene
    s.render.use_freestyle = on
    vl = bpy.context.view_layer
    vl.use_freestyle = on
    if on:
        fs = vl.freestyle_settings
        fs.crease_angle = math.radians(140)
        if not fs.linesets:
            fs.linesets.new('Lines')
        ls = fs.linesets[0]
        ls.select_by_visibility = True
        ls.select_silhouette = True
        ls.select_border = True
        ls.select_crease = True
        if ls.linestyle is None:
            ls.linestyle = bpy.data.linestyles.new('Ink')
        ls.linestyle.color = (0.08, 0.09, 0.12)
        ls.linestyle.thickness = 1.25
        s.render.line_thickness_mode = 'ABSOLUTE'
        white = bpy.data.materials.get('M_Paper')
        if white is None:            # flat paper: an emission shader, so nothing shades and nothing is noisy
            white = bpy.data.materials.new('M_Paper')
            white.use_nodes = True
            nt = white.node_tree
            for nd in list(nt.nodes):
                nt.nodes.remove(nd)
            em = nt.nodes.new('ShaderNodeEmission')
            em.inputs['Color'].default_value = (0.95, 0.945, 0.93, 1)
            em.inputs['Strength'].default_value = 1.0
            outn = nt.nodes.new('ShaderNodeOutputMaterial')
            nt.links.new(em.outputs['Emission'], outn.inputs['Surface'])
        s.view_layers[0].material_override = white
        for n in ('Key', 'Fill', 'Rim'):
            o = bpy.data.objects.get(n)
            if o:
                o['e0'] = o.data.energy
                o.data.energy = 0.0
        w = s.world.node_tree.nodes.get('Background')
        s.world['bg0'] = list(w.inputs['Color'].default_value)
        s.world['bs0'] = w.inputs['Strength'].default_value
        w.inputs['Color'].default_value = (1, 1, 1, 1)
        w.inputs['Strength'].default_value = 1.0
        cyc = bpy.data.objects.get('Cyc')
        if cyc:
            cyc.hide_render = True
        s.view_settings.view_transform = 'Standard'
        s.view_settings.look = 'None'
    else:
        s.view_layers[0].material_override = None
        for n in ('Key', 'Fill', 'Rim'):
            o = bpy.data.objects.get(n)
            if o and 'e0' in o:
                o.data.energy = o['e0']
        w = s.world.node_tree.nodes.get('Background')
        if 'bg0' in s.world:
            w.inputs['Color'].default_value = s.world['bg0']
            w.inputs['Strength'].default_value = s.world['bs0']
        cyc = bpy.data.objects.get('Cyc')
        if cyc:
            cyc.hide_render = False
        ST.setup_render()


def drawing(ctx, path, res=(1280, 720)):
    """Render the current camera as a line drawing."""
    drawing_mode(True)
    try:
        s = bpy.context.scene
        s.render.resolution_x, s.render.resolution_y = res
        s.cycles.samples = 4
        s.cycles.use_denoising = False
        path = os.path.abspath(path)
        s.render.filepath = path
        bpy.ops.render.render(write_still=True)
    finally:
        drawing_mode(False)
    return path


# ---- ffmpeg helpers -------------------------------------------------------------------------------------------------
def ff(args):
    cmd = ['ffmpeg', '-loglevel', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError('ffmpeg failed: ' + ' '.join(cmd) + '\n' + r.stderr[-2000:])


def label(text, x='24', y='h-48', size=26, color='white', box=True):
    t = text.replace(':', r'\:').replace("'", r"\'")
    b = ':box=1:boxcolor=black@0.35:boxborderw=10' if box else ''
    return f"drawtext=fontfile='{FONT}':text='{t}':x={x}:y={y}:fontsize={size}:fontcolor={color}{b}"


def grid(paths, out, cols, cell=(640, 360), labels=None, bg='0x101012', pad=6, label_y='h-th-14'):
    """Tile images into a sheet (each scaled into its cell), optional label under each."""
    ins = []
    for p in paths:
        ins += ['-i', p]
    n = len(paths)
    rows = (n + cols - 1) // cols
    fl = []
    for i in range(n):
        f = (f"[{i}:v]scale={cell[0]}:{cell[1]}:force_original_aspect_ratio=decrease,"
             f"pad={cell[0]}:{cell[1]}:(ow-iw)/2:(oh-ih)/2:color={bg}")
        if labels:
            f += ',' + label(labels[i], size=max(14, cell[1] // 22), y=label_y)
        fl.append(f + f'[c{i}]')
    W, H = cols * cell[0] + (cols + 1) * pad, rows * cell[1] + (rows + 1) * pad
    lay = '|'.join(f'{pad + (i % cols) * (cell[0] + pad)}_{pad + (i // cols) * (cell[1] + pad)}' for i in range(n))
    fl.append(''.join(f'[c{i}]' for i in range(n)) + f'xstack=inputs={n}:layout={lay}:fill={bg}[g]')
    fl.append(f'[g]pad={W}:{H}:0:0:color={bg}[out]')
    if n == 1:
        fl[-2] = '[c0]copy[g]'
    ff(ins + ['-filter_complex', ';'.join(fl), '-map', '[out]', '-frames:v', '1', out])
    return out
