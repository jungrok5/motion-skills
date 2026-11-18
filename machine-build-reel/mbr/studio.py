"""The studio: a grey cyclorama (floor sweeping up into a wall), soft sun key + fill + rim, grey world, and a 1.75 m
orange scale figure. Scale-free: the machine's height sets the cyc's size; the lights are suns, so nothing changes
with size. Cycles on the CPU, denoised.
"""
import math
import bpy
from mathutils import Matrix, Vector
from .geom import Mesh, T
from .materials import hex2rgb

LOOK = {
    'floor': '#8a8b8d', 'wall': '#7c7d80', 'world': '#9a9b9e', 'world_strength': 0.55,
    'key': 3.2, 'key_angle': 14.0, 'key_dir': (-35.0, 52.0), 'fill': 0.55, 'rim': 1.4,
    'figure': '#d8662c', 'exposure': 0.0, 'look': 'AgX - Medium High Contrast',
}


def setup_render(res=(1280, 720), samples=32, fps=24):
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = samples
    s.cycles.use_adaptive_sampling = True
    s.cycles.adaptive_threshold = 0.03
    s.cycles.use_denoising = True
    try:
        s.cycles.denoiser = 'OPENIMAGEDENOISE'
    except TypeError:
        pass
    s.cycles.max_bounces = 6
    s.cycles.diffuse_bounces = 3
    s.cycles.glossy_bounces = 3
    s.cycles.transmission_bounces = 2
    s.cycles.transparent_max_bounces = 4
    s.cycles.caustics_reflective = False
    s.cycles.caustics_refractive = False
    s.cycles.blur_glossy = 1.0
    s.cycles.seed = 7
    s.render.resolution_x, s.render.resolution_y = res
    s.render.resolution_percentage = 100
    s.render.fps = fps
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGB'
    s.render.film_transparent = False
    s.render.use_persistent_data = True
    vs = s.view_settings
    try:
        vs.view_transform = 'AgX'
        vs.look = LOOK['look']
    except TypeError:
        pass
    vs.exposure = LOOK['exposure']


def _mat(name, hexcol, rough=0.6, spec=0.3):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*hex2rgb(hexcol), 1)
    b.inputs['Roughness'].default_value = rough
    if 'Specular IOR Level' in b.inputs:
        b.inputs['Specular IOR Level'].default_value = spec
    return m


def cyclorama(H, look=LOOK, coll=None):
    """Floor + curved sweep + wall, built along +X; the wall stands at y = +D (behind the subject from a camera at
    -Y). Rotate the object about Z to put the wall behind any camera."""
    coll = coll or bpy.context.scene.collection
    D = 4.0 * H            # wall distance
    R = 1.6 * H            # sweep radius
    X = 14.0 * H
    F = 12.0 * H
    Hc = 6.0 * H
    prof = [(-F, 0.0), (-F / 2, 0.0), (0.0, 0.0), (D - R, 0.0)]
    for i in range(1, 13):
        a = (math.pi / 2) * i / 12
        prof.append((D - R + R * math.sin(a), R - R * math.cos(a)))
    prof += [(D, R + (Hc - R) * 0.5), (D, Hc)]
    m = Mesh()
    v, f = [], []
    nx = 12
    for i, (y, z) in enumerate(prof):
        for j in range(nx + 1):
            v.append((-X + 2 * X * j / nx, y, z))
    for i in range(len(prof) - 1):
        for j in range(nx):
            a = i * (nx + 1) + j
            f.append((a, a + 1, a + nx + 2, a + nx + 1))
    m.v, m.f, m.m = v, f, [0] * len(f)
    me = m.make('ME_Cyc', 60)
    me.materials.append(_mat('M_Studio', look['floor'], 0.55, 0.25))
    ob = bpy.data.objects.new('Cyc', me)
    coll.objects.link(ob)
    ob['studio'] = True
    return ob


def lights(look=LOOK, coll=None):
    coll = coll or bpy.context.scene.collection
    out = {}
    for name, (az, el), e, ang, sh in (('Key', look['key_dir'], look['key'], look['key_angle'], True),
                                       ('Fill', (look['key_dir'][0] + 150, 22.0), look['fill'], 40.0, False),
                                       ('Rim', (look['key_dir'][0] + 200, 38.0), look['rim'], 8.0, True)):
        ld = bpy.data.lights.new(name, 'SUN')
        ld.energy = e
        ld.angle = math.radians(ang)
        try:
            ld.cycles.cast_shadow = sh
        except AttributeError:
            ld.use_shadow = sh
        ob = bpy.data.objects.new(name, ld)
        coll.objects.link(ob)
        ob['az'], ob['el'] = az, el
        out[name] = ob
    w = bpy.data.worlds.new('Studio')
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (*hex2rgb(look['world']), 1)
    bg.inputs['Strength'].default_value = look['world_strength']
    return out


def aim_lights(cam_yaw_deg):
    """Lights keep their angles relative to the camera (a studio lights each set-up for its camera)."""
    for name in ('Key', 'Fill', 'Rim'):
        ob = bpy.data.objects.get(name)
        if not ob:
            continue
        az = math.radians(ob['az'] + cam_yaw_deg)
        el = math.radians(ob['el'])
        d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
        ob.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()


def place_cyc(cam_loc, target):
    """Turn the cyclorama so its wall stands behind the target as seen from the camera."""
    cyc = bpy.data.objects.get('Cyc')
    if not cyc:
        return 0.0
    d = Vector(target) - Vector(cam_loc)
    yaw = math.atan2(d.y, d.x) - math.pi / 2
    cyc.rotation_euler = (0, 0, yaw)
    cyc.location = (target[0], target[1], 0)
    return math.degrees(math.atan2(-d.y, -d.x))


def figure(height=1.75, color=LOOK['figure'], coll=None, loc=(0, 0, 0), yaw=0.0):
    """A plain mannequin for scale: no face, standing, arms down."""
    coll = coll or bpy.context.scene.collection
    h = height / 1.75
    m = Mesh()
    for sx in (-1, 1):
        m.loft([(0.0, 0.07, 0.08, 2, 0, 0), (0.45, 0.065, 0.07, 2, 0, 0), (0.85, 0.085, 0.095, 2, 0, 0)], 14, 0,
               M=T(0, sx * 0.1, 0) @ Matrix.Rotation(math.pi / 2, 4, "X"))
        m.loft([(1.42, 0.05, 0.05, 2, 0, 0), (1.12, 0.045, 0.045, 2, 0, 0), (0.78, 0.04, 0.04, 2, 0, 0)], 10, 0,
               M=T(0, sx * 0.235, 0) @ Matrix.Rotation(math.pi / 2, 4, "X"))
    m.loft([(0.84, 0.15, 0.1, 2.3, 0, 0), (1.05, 0.14, 0.09, 2.3, 0, 0), (1.3, 0.19, 0.11, 2.4, 0, 0),
            (1.44, 0.2, 0.11, 2.4, 0, 0), (1.5, 0.08, 0.06, 2, 0, 0)], 18, 0,
           M=Matrix.Rotation(math.pi / 2, 4, "X"))
    m.loft([(1.5, 0.045, 0.045, 2, 0, 0), (1.56, 0.045, 0.045, 2, 0, 0)], 10, 0, M=Matrix.Rotation(math.pi / 2, 4, "X"))
    secs = []
    for i in range(9):
        a = -math.pi / 2 + math.pi * i / 8
        secs.append((1.64 + 0.1 * math.sin(a), max(1e-3, 0.085 * math.cos(a)), max(1e-3, 0.1 * math.cos(a)), 2, 0, 0))
    m.loft(secs, 14, 0, M=Matrix.Rotation(math.pi / 2, 4, "X"), cap0=False, cap1=False)
    # loft builds along +Y; rotate -90° about X maps +Y to +Z
    me = m.make('ME_Figure', 50)
    me.materials.append(_mat('M_Figure', color, 0.55))
    ob = bpy.data.objects.new('Figure', me)
    coll.objects.link(ob)
    ob.scale = (h, h, h)
    ob.location = loc
    ob.rotation_euler = (0, 0, math.radians(yaw))
    ob['studio'] = True
    return ob


def camera(name, loc, target, lens=50.0, focus=None, fstop=0.0, coll=None, sensor=36.0):
    coll = coll or bpy.context.scene.collection
    cd = bpy.data.cameras.get(name) or bpy.data.cameras.new(name)
    ob = bpy.data.objects.get(name)
    if ob is None:
        ob = bpy.data.objects.new(name, cd)
        coll.objects.link(ob)
    cd.lens = lens
    cd.sensor_width = sensor
    cd.clip_start = 0.05
    cd.clip_end = 5000
    ob.location = Vector(loc)
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if fstop > 0:
        cd.dof.use_dof = True
        cd.dof.focus_distance = (Vector(focus or target) - Vector(loc)).length
        cd.dof.aperture_fstop = fstop
    else:
        cd.dof.use_dof = False
    bpy.context.scene.camera = ob
    return ob


def frame_dist(size, lens=50.0, fill=0.8, sensor=36.0, aspect=16 / 9):
    """Distance at which an object `size` tall fills `fill` of the frame height."""
    sh = sensor / aspect if aspect >= 1 else sensor
    return size / fill * lens / sh


def setup(M, coll=None):
    H = M.get('height_hint') or (M['body']['z'] * 1.4)
    cyc = cyclorama(H, coll=coll)
    lights(coll=coll)
    return cyc
