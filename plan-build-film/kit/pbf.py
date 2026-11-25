"""pbf: the Blender kit of plan-build-film. A building script (a project's build.py) imports it, builds every part as
its own object under a stage, registers its shots and named points, and either renders stills or hands the scene to
kit/film.py, which flies the parts in by stage on a drawing sheet and films it.

    import os, sys
    sys.path.insert(0, os.environ["PBF_KIT"])          # film.py / still.py set it; or the path to <skill>/kit
    import pbf as K
    OPTS, SHOTS = K.args(); scene = K.setup(OPTS)
    with K.stage("foundation"):
        K.box("footing", 0, 1, 0, 1, -0.3, 0.0, K.basalt("footing"))
    K.point("focus", (4, 3, 1))                        # the wave starts here
    K.shot("hero", loc=(18, -14, 9), target=(5, 4, 1), lens=35)
    K.finish(OPTS, SHOTS)                               # stills (or nothing, in film mode)

Units are metres, z up, the plan's origin at (0, 0). Every part made through a primitive lands in K.PARTS with the
stage current when it was made; the film counts and flies exactly those. Bevels are cut into the mesh (no modifiers),
so a flying part is never a deforming mesh. Materials are procedural (no files); K.scan() uses a Poly Haven CC0 texture
when scripts/fetch-assets.py has fetched it and falls back to the procedural one when it has not.
"""
import json
import math
import os
import random
import sys
from contextlib import contextmanager

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

PARTS = []      # (object, stage)
LIGHTS = []     # (light object, stage) - switched on by the film
EMISSIVE = []   # emission sockets the film switches on with the lights
POINTS = {}     # named points (the wave's origin, the camera's targets)
SHOTS = {}      # name -> dict(loc, target, lens, ev)
STAGE = ["misc"]
OPTS = {}
FILM = False
ROOT = None
RNG = random.Random(7)
ASSETS = os.environ.get("PBF_ASSETS", os.path.join(os.path.expanduser("~"), ".pbf", "polyhaven"))


# ---------------------------------------------------------------- arguments and the scene
def args(default_shots=("hero",)):
    """'-- shot shot --res 960x540 --samples 32 --look golden' -> (opts, shots)"""
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    shots, opts, i = [], {}, 0
    while i < len(argv):
        a = argv[i]
        if a.startswith("--"):
            if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                opts[a[2:]] = argv[i + 1]
                i += 2
            else:
                opts[a[2:]] = True
                i += 1
        else:
            shots.append(a)
            i += 1
    return opts, shots or list(default_shots)


def _gpu(scene):
    """the first GPU backend that has a device, else the CPU"""
    try:
        cp = bpy.context.preferences.addons["cycles"].preferences
    except KeyError:
        return "CPU"
    for kind in ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"):
        try:
            cp.compute_device_type = kind
            cp.get_devices()
        except TypeError:
            continue
        devs = [d for d in cp.devices if d.type == kind]
        if devs:
            for d in cp.devices:
                d.use = d.type == kind
            scene.cycles.device = "GPU"
            return kind
    scene.cycles.device = "CPU"
    return "CPU"


def setup(opts, samples=48, res="960x540"):
    """An empty scene; Cycles on the best device; Khronos PBR Neutral (AgX turns a warm sunset beige)."""
    global OPTS, ROOT, FILM
    OPTS = opts
    FILM = bool(opts.get("film"))
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    dev = "CPU" if opts.get("cpu") else _gpu(scene)
    c = scene.cycles
    c.samples = int(opts.get("samples", samples))
    c.use_adaptive_sampling = True
    c.adaptive_threshold = float(opts.get("adaptive", 0.04))
    c.use_denoising = True
    try:
        c.denoiser = "OPTIX" if dev == "OPTIX" else "OPENIMAGEDENOISE"
    except TypeError:
        pass
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces = 8, 3, 3
    c.transmission_bounces, c.transparent_max_bounces, c.volume_bounces = 6, 16, 0
    c.caustics_reflective = c.caustics_refractive = False
    c.blur_glossy = 1.0
    c.sample_clamp_indirect = 8.0
    rx, ry = map(int, str(opts.get("res", res)).lower().split("x"))
    scene.render.resolution_x, scene.render.resolution_y = rx, ry
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    try:
        scene.view_settings.view_transform = opts.get("vt", "Khronos PBR Neutral")
        scene.view_settings.look = "None"
    except TypeError:
        print("pbf: Khronos PBR Neutral not found (Blender 4.2+ has it); keeping", scene.view_settings.view_transform)
    scene.view_settings.exposure = float(opts.get("exposure", 0.0))
    if scene.world is None:
        scene.world = bpy.data.worlds.new("world")
    scene.world.use_nodes = True
    ROOT = scene.collection
    RNG.seed(int(opts.get("seed", 7)))
    print(f"pbf: Cycles on {dev}, {c.samples} samples, {rx}x{ry}")
    return scene


@contextmanager
def stage(name):
    """with K.stage("frame"): every part made inside is tagged 'frame'"""
    prev = STAGE[0]
    STAGE[0] = name
    try:
        yield
    finally:
        STAGE[0] = prev


def link(o, part=True):
    ROOT.objects.link(o)
    if part:
        o["stage"] = STAGE[0]
        PARTS.append((o, STAGE[0]))
    return o


def point(name, xyz):
    POINTS[name] = tuple(float(v) for v in xyz)
    return Vector(POINTS[name])


def shot(name, loc, target, lens=35.0, ev=0.0, **extra):
    SHOTS[name] = dict(loc=tuple(loc), target=tuple(target), lens=float(lens), ev=float(ev), **extra)


# ---------------------------------------------------------------- meshes (every one its own object)
def _obj(name, bm, mat, smooth=False, part=True, origin=None):
    """bmesh -> object with its origin at the mesh centre (a flying part turns about itself)"""
    verts = [v.co.copy() for v in bm.verts]
    c = Vector(origin) if origin is not None else (sum(verts, Vector()) / max(1, len(verts)))
    bmesh.ops.translate(bm, verts=bm.verts, vec=-c)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        me.shade_smooth()
    if mat is not None:
        me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    o.location = c
    return link(o, part)


def _bevel(bm, b):
    if b and b > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=b, offset_type="OFFSET", segments=1,
                        profile=0.5, affect="EDGES", clamp_overlap=True)


def box(name, x0, x1, y0, y1, z0, z1, mat, bevel=0.004, part=True):
    """an axis-aligned box from its extents (metres)"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    s = Vector((abs(x1 - x0), abs(y1 - y0), abs(z1 - z0)))
    bmesh.ops.scale(bm, vec=s, verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)), verts=bm.verts)
    _bevel(bm, min(bevel, min(s) * 0.3))
    return _obj(name, bm, mat, part=part)


def beam(name, a, b, w, h, mat, up=(0, 0, 1), bevel=0.004, part=True):
    """a rectangular member from point a to point b, w wide and h deep (rafters, braces, purlins)"""
    a, b = Vector(a), Vector(b)
    d = b - a
    L = d.length
    x = d.normalized()
    u = Vector(up)
    if abs(x.dot(u.normalized())) > 0.99:
        u = Vector((1, 0, 0)) if abs(x.x) < 0.9 else Vector((0, 1, 0))
    y = u.cross(x).normalized()
    z = x.cross(y)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((L, w, h)), verts=bm.verts)
    _bevel(bm, min(bevel, min(w, h) * 0.3))
    R = Matrix((x, y, z)).transposed().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ R, verts=bm.verts)
    return _obj(name, bm, mat, part=part)


def prism(name, pts, z0, z1, mat, bevel=0.0, part=True):
    """a polygon (x, y) extruded from z0 to z1 (slabs, odd-shaped floors)"""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z0)) for x, y in pts]
    f = bm.faces.new(vs)
    if f.normal.z > 0:
        f.normal_flip()
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    top = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, 0, z1 - z0)), verts=top)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    _bevel(bm, bevel)
    return _obj(name, bm, mat, part=part)


def cyl(name, x, y, r, z0, z1, mat, seg=16, r1=None, smooth=True, part=True):
    """an upright cylinder or cone frustum (posts, pots, cups)"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r1 is None else r1, depth=z1 - z0)
    bmesh.ops.translate(bm, vec=Vector((x, y, (z0 + z1) / 2)), verts=bm.verts)
    o = _obj(name, bm, mat, smooth=False, part=part)
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = abs(p.normal.z) < 0.5
    return o


def sphere(name, c, r, mat, sub=2, scale=(1, 1, 1), part=True):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(c), verts=bm.verts)
    return _obj(name, bm, mat, smooth=True, part=part)


def rock(name, c, size, mat, seed=0, rough=0.28, sub=2, flat_bottom=True, yaw=None, face=None, part=True):
    """an irregular stone: an icosphere scaled to size (sx, sy, sz), pushed by noise, its bottom flattened so it sits.
    face=0.4 also cuts its two y sides flat at +-0.4*sy: the face a stone shows in a wall (laid stones are not balls)"""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=0.5)
    off = Vector((seed * 1.731, seed * 0.917, seed * 2.113))
    for v in bm.verts:
        n = v.co.normalized()
        k = 1.0 + rough * noise.noise(n * 1.6 + off) + rough * 0.45 * noise.noise(n * 4.1 + off)
        v.co = n * 0.5 * k
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if face:
        lim = size[1] * face
        for v in bm.verts:
            v.co.y = max(-lim, min(lim, v.co.y))
        lz = size[2] * 0.47
        for v in bm.verts:
            v.co.z = max(-lz, min(lz, v.co.z))
    if flat_bottom and not face:
        zmin = min(v.co.z for v in bm.verts)
        cut = zmin + size[2] * 0.12
        for v in bm.verts:
            v.co.z = max(v.co.z, cut)
    r = (RNG.uniform(0, math.tau) if yaw is None else yaw)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=Vector(), matrix=Matrix.Rotation(r, 3, "Z"))
    zmin = min(v.co.z for v in bm.verts)
    bmesh.ops.translate(bm, vec=Vector((c[0], c[1], c[2] - zmin)), verts=bm.verts)  # c is where its bottom sits
    return _obj(name, bm, mat, smooth=False, part=part)


def tube(name, pts, r, mat, seg=6, part=True, smooth=True):
    """a round tube along a polyline (ropes, branches, pipes); r may be a list (tapering)"""
    pts = [Vector(p) for p in pts]
    rs = r if isinstance(r, (list, tuple)) else [r] * len(pts)
    bm = bmesh.new()
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        u = t.cross(a).normalized()
        v = t.cross(u)
        rings.append([bm.verts.new(p + (u * math.cos(k / seg * math.tau) + v * math.sin(k / seg * math.tau)) * rs[i]) for k in range(seg)])
    for a_, b_ in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((a_[k], a_[(k + 1) % seg], b_[(k + 1) % seg], b_[k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(name, bm, mat, smooth=smooth, part=part)


def blob(name, c, r, mat, seed=0, rough=0.35, sub=2, squash=0.8, part=True):
    """a leafy clump (a crown, a shrub): a lumpy smooth sphere"""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    off = Vector((seed * 3.1, seed * 1.7, seed * 0.3))
    for v in bm.verts:
        n = v.co.normalized()
        v.co = n * r * (1 + rough * noise.noise(n * 2.2 + off))
        v.co.z *= squash
    bmesh.ops.translate(bm, vec=Vector(c), verts=bm.verts)
    return _obj(name, bm, mat, smooth=True, part=part)


def grid_mesh(name, x0, x1, y0, y1, nx, ny, zfn, mat, part=True, smooth=True):
    """a height field z = zfn(x, y) (ground, hills, a thatch skin)"""
    bm = bmesh.new()
    vs = [[bm.verts.new((x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny, 0)) for j in range(ny + 1)] for i in range(nx + 1)]
    for i in range(nx + 1):
        for j in range(ny + 1):
            v = vs[i][j]
            v.co.z = zfn(v.co.x, v.co.y)
    for i in range(nx):
        for j in range(ny):
            bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
    return _obj(name, bm, mat, smooth=smooth, part=part, origin=((x0 + x1) / 2, (y0 + y1) / 2, 0))


def lathe(name, x, y, z, profile, mat, seg=20, part=True):
    """a turned shape from a profile [(r, h), ...] bottom to top (jars, cups, pots, lamp shades), closed at both ends"""
    bm = bmesh.new()
    rings = []
    for r, h in profile:
        rings.append([bm.verts.new((x + r * math.cos(k / seg * math.tau), y + r * math.sin(k / seg * math.tau), z + h)) for k in range(seg)])
    for a_, b_ in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((a_[k], a_[(k + 1) % seg], b_[(k + 1) % seg], b_[k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(name, bm, mat, smooth=True, part=part)


def shell(name, x0, x1, y0, y1, nx, ny, ztop, thick, mat, part=True, smooth=True):
    """a closed slab that follows a height field: top z = ztop(x, y), bottom thick below it (thatch bundles,
    curved roofs, a terrain block). thick may be a number or a function of (x, y)."""
    th = thick if callable(thick) else (lambda x, y: thick)
    bm = bmesh.new()
    P = [[(x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny) for j in range(ny + 1)] for i in range(nx + 1)]
    top = [[bm.verts.new((x, y, ztop(x, y))) for (x, y) in row] for row in P]
    bot = [[bm.verts.new((x, y, ztop(x, y) - th(x, y))) for (x, y) in row] for row in P]
    for i in range(nx):
        for j in range(ny):
            bm.faces.new((top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]))
            bm.faces.new((bot[i][j], bot[i][j + 1], bot[i + 1][j + 1], bot[i + 1][j]))
    ring = [(i, 0) for i in range(nx)] + [(nx, j) for j in range(ny)] + [(i, ny) for i in range(nx, 0, -1)] + [(0, j) for j in range(ny, 0, -1)]
    for k in range(len(ring)):
        (i, j), (i2, j2) = ring[k], ring[(k + 1) % len(ring)]
        bm.faces.new((top[i][j], bot[i][j], bot[i2][j2], top[i2][j2]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(name, bm, mat, smooth=smooth, part=part)


def light(name, kind, loc, energy, color=(1.0, 0.85, 0.65), size=0.1, rot=None, spot=None):
    """a light the film switches on after the wave ('lights' stage unless another is current)"""
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    if kind in ("POINT", "SPOT"):
        ld.shadow_soft_size = size
    elif kind == "AREA":
        ld.size = size
    if kind == "SPOT" and spot:
        ld.spot_size = math.radians(spot)
        ld.spot_blend = 0.6
    o = bpy.data.objects.new(name, ld)
    o.location = loc
    if rot:
        o.rotation_euler = rot
    ROOT.objects.link(o)
    LIGHTS.append((o, STAGE[0]))
    return o


# ---------------------------------------------------------------- node helpers
def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N["Principled BSDF"]
    return m, N, L, b


def inp(node, names, value):
    for n in (names if isinstance(names, (list, tuple)) else [names]):
        if n in node.inputs:
            node.inputs[n].default_value = value
            return
    raise KeyError(names)


def sock(node, ident, out=False):
    for s in (node.outputs if out else node.inputs):
        if s.identifier == ident:
            return s
    raise KeyError(ident)


def math_node(N, L, op, a, b=None):
    m = N.new("ShaderNodeMath")
    m.operation = op
    for k, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[k].default_value = v
        else:
            L.new(v, m.inputs[k])
    return m.outputs[0]


def mix_rgb(N, L, fac, a, b, blend="MIX", clamp=True):
    m = N.new("ShaderNodeMix")
    m.data_type = "RGBA"
    m.blend_type = blend
    m.clamp_factor = clamp
    if isinstance(fac, (int, float)):
        m.inputs[0].default_value = fac
    else:
        L.new(fac, m.inputs[0])
    for s, v in ((sock(m, "A_Color"), a), (sock(m, "B_Color"), b)):
        if isinstance(v, tuple):
            s.default_value = (*v, 1) if len(v) == 3 else v
        else:
            L.new(v, s)
    return sock(m, "Result_Color", out=True)


def ramp(N, L, fac, stops):
    r = N.new("ShaderNodeValToRGB")
    cr = r.color_ramp
    cr.elements[0].position, cr.elements[0].color = stops[0][0], (*stops[0][1], 1)
    cr.elements[1].position, cr.elements[1].color = stops[-1][0], (*stops[-1][1], 1)
    for p, c in stops[1:-1]:
        e = cr.elements.new(p)
        e.color = (*c, 1)
    L.new(fac, r.inputs["Fac"])
    return r.outputs["Color"]


def coords(N, L, scale=(1, 1, 1)):
    """object coordinates (the texture rides with a flying part), optionally stretched"""
    tc = N.new("ShaderNodeTexCoord")
    if tuple(scale) == (1, 1, 1):
        return tc.outputs["Object"]
    vm = N.new("ShaderNodeVectorMath")
    vm.operation = "MULTIPLY"
    L.new(tc.outputs["Object"], vm.inputs[0])
    vm.inputs[1].default_value = scale
    return vm.outputs[0]


def noise_tex(N, L, vec, scale, detail=4.0, rough=0.55, out="Fac"):
    n = N.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    if vec is not None:
        L.new(vec, n.inputs["Vector"])
    return n.outputs[out]


def bump(N, L, b, height, strength, dist=0.004):
    bp = N.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = strength
    bp.inputs["Distance"].default_value = dist
    L.new(height, bp.inputs["Height"])
    L.new(bp.outputs["Normal"], b.inputs["Normal"])


def _lin(c):
    """sRGB 0-1 (what a reference image shows) -> linear (what the shader wants)"""
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


# ---------------------------------------------------------------- procedural materials (colours are sRGB, as picked)
_MATS = {}


def _cached(key, fn):
    if key not in _MATS:
        _MATS[key] = fn()
    return _MATS[key]


def pbr(name, color, rough=0.6, metal=0.0, spec=0.5):
    def make():
        m, N, L, b = new_mat(name)
        inp(b, "Base Color", (*_lin(color), 1))
        inp(b, "Roughness", rough)
        inp(b, "Metallic", metal)
        inp(b, ["Specular IOR Level", "Specular"], spec)
        return m
    return _cached(name, make)


def wood(name, color=(0.55, 0.38, 0.22), grain=14.0, rough=0.55, dark=0.55, axis="X"):
    """long grain along the part's local axis (a board's length)"""
    def make():
        m, N, L, b = new_mat(name)
        sc = {"X": (0.08, 1, 1), "Y": (1, 0.08, 1), "Z": (1, 1, 0.08)}[axis]
        v = coords(N, L, sc)
        w = N.new("ShaderNodeTexWave")
        w.wave_type = "BANDS"
        w.bands_direction = {"X": "Y", "Y": "X", "Z": "X"}[axis]  # stripes run along the board
        w.inputs["Scale"].default_value = grain
        w.inputs["Distortion"].default_value = 4.0
        w.inputs["Detail"].default_value = 3.0
        w.inputs["Detail Scale"].default_value = 1.5
        L.new(v, w.inputs["Vector"])
        n = noise_tex(N, L, v, 3.0, 6, 0.6)
        mixf = math_node(N, L, "MULTIPLY", w.outputs["Fac"], n)
        c = _lin(color)
        col = ramp(N, L, mixf, [(0.0, tuple(x * dark for x in c)), (0.5, c), (1.0, tuple(min(1, x * 1.18) for x in c))])
        L.new(col, b.inputs["Base Color"])
        inp(b, "Roughness", rough)
        inp(b, ["Specular IOR Level", "Specular"], 0.35)
        bump(N, L, b, mixf, 0.08)
        return m
    return _cached(name, make)


def stone(name, color=(0.22, 0.22, 0.23), pores=0.6, rough=0.85, moss=0.0):
    """porous volcanic stone (basalt) or any rough stone: voronoi pits + noise; moss tints the tops"""
    def make():
        m, N, L, b = new_mat(name)
        v = coords(N, L)
        vo = N.new("ShaderNodeTexVoronoi")
        vo.feature = "F1"
        vo.inputs["Scale"].default_value = 38.0
        L.new(v, vo.inputs["Vector"])
        pits = math_node(N, L, "POWER", vo.outputs["Distance"], 0.6)
        n = noise_tex(N, L, v, 6.0, 8, 0.65)
        c = _lin(color)
        col = ramp(N, L, n, [(0.3, tuple(x * 0.7 for x in c)), (0.55, c), (0.8, tuple(min(1, x * 1.35) for x in c))])
        if moss > 0:
            geo = N.new("ShaderNodeNewGeometry")
            sep = N.new("ShaderNodeSeparateXYZ")
            L.new(geo.outputs["Normal"], sep.inputs[0])
            up = math_node(N, L, "MULTIPLY", math_node(N, L, "SUBTRACT", sep.outputs["Z"], 0.45), 2.0)
            mk = math_node(N, L, "MULTIPLY", math_node(N, L, "MULTIPLY", up, noise_tex(N, L, v, 2.5, 4, 0.6)), moss * 2)
            col = mix_rgb(N, L, mk, col, _lin((0.30, 0.36, 0.16)))
        L.new(col, b.inputs["Base Color"])
        inp(b, "Roughness", rough)
        bump(N, L, b, math_node(N, L, "ADD", pits, math_node(N, L, "MULTIPLY", n, 0.5)), pores * 0.6, 0.01)
        return m
    return _cached(name, make)


def plaster(name, color=(0.86, 0.84, 0.79), rough=0.9):
    def make():
        m, N, L, b = new_mat(name)
        v = coords(N, L)
        n = noise_tex(N, L, v, 9.0, 6, 0.6)
        c = _lin(color)
        L.new(ramp(N, L, n, [(0.35, tuple(x * 0.93 for x in c)), (0.65, c)]), b.inputs["Base Color"])
        inp(b, "Roughness", rough)
        bump(N, L, b, n, 0.05)
        return m
    return _cached(name, make)


def metal(name, color=(0.32, 0.33, 0.34), rough=0.38):
    def make():
        m, N, L, b = new_mat(name)
        n = noise_tex(N, L, coords(N, L), 4.0, 3, 0.5)
        c = _lin(color)
        L.new(ramp(N, L, n, [(0.3, tuple(x * 0.85 for x in c)), (0.7, c)]), b.inputs["Base Color"])
        inp(b, "Metallic", 1.0)
        inp(b, "Roughness", rough)
        return m
    return _cached(name, make)


def glass(name="glass", tint=(0.92, 0.95, 0.95)):
    """thin glazing: Transparent mixed with Glossy by Fresnel, no refraction (refraction turns panes into lenses)"""
    def make():
        m, N, L, b = new_mat(name)
        out = N["Material Output"]
        N.remove(b)
        fr = N.new("ShaderNodeFresnel")
        fr.inputs["IOR"].default_value = 1.5
        tr = N.new("ShaderNodeBsdfTransparent")
        tr.inputs["Color"].default_value = (*_lin(tint), 1)
        gl = N.new("ShaderNodeBsdfGlossy")
        gl.inputs["Roughness"].default_value = 0.03
        mx = N.new("ShaderNodeMixShader")
        L.new(fr.outputs[0], mx.inputs[0])
        L.new(tr.outputs[0], mx.inputs[1])
        L.new(gl.outputs[0], mx.inputs[2])
        L.new(mx.outputs[0], out.inputs["Surface"])
        return m
    return _cached(name, make)


def fibre(name, color=(0.78, 0.66, 0.42), along="Z", rough=0.95, streak=40.0):
    """straw, thatch, rope, woven mats: long streaks along one axis"""
    def make():
        m, N, L, b = new_mat(name)
        sc = {"X": (0.06, 1, 1), "Y": (1, 0.06, 1), "Z": (1, 1, 0.06)}[along]
        v = coords(N, L, sc)
        n = noise_tex(N, L, v, streak, 4, 0.7)
        c = _lin(color)
        L.new(ramp(N, L, n, [(0.25, tuple(x * 0.55 for x in c)), (0.55, c), (0.8, tuple(min(1, x * 1.2) for x in c))]), b.inputs["Base Color"])
        inp(b, "Roughness", rough)
        inp(b, ["Specular IOR Level", "Specular"], 0.2)
        bump(N, L, b, n, 0.35)
        return m
    return _cached(name, make)


def fabric(name, color=(0.7, 0.66, 0.58), rough=0.95):
    def make():
        m, N, L, b = new_mat(name)
        inp(b, "Base Color", (*_lin(color), 1))
        inp(b, "Roughness", rough)
        inp(b, "Sheen Weight", 0.4)
        inp(b, ["Specular IOR Level", "Specular"], 0.2)
        bump(N, L, b, noise_tex(N, L, coords(N, L), 120.0, 2, 0.5), 0.05)
        return m
    return _cached(name, make)


def leaf(name, color=(0.16, 0.30, 0.10), rough=0.6):
    """a leafy crown: lumpy colour, a little translucency"""
    def make():
        m, N, L, b = new_mat(name)
        v = coords(N, L)
        n = noise_tex(N, L, v, 7.0, 6, 0.7)
        c = _lin(color)
        L.new(ramp(N, L, n, [(0.3, tuple(x * 0.5 for x in c)), (0.6, c), (0.8, tuple(min(1, x * 1.6) for x in c))]), b.inputs["Base Color"])
        inp(b, "Roughness", rough)
        inp(b, "Subsurface Weight", 0.15)
        bump(N, L, b, noise_tex(N, L, v, 22.0, 3, 0.7), 0.6, 0.03)
        return m
    return _cached(name, make)


def ground(name, color=(0.34, 0.40, 0.18), dirt=(0.30, 0.24, 0.17), patch=0.4):
    """grass with patches of earth, in world space (the ground is never a flying part)"""
    def make():
        m, N, L, b = new_mat(name)
        tc = N.new("ShaderNodeTexCoord")
        v = tc.outputs["Object"]
        n = noise_tex(N, L, v, 0.25, 6, 0.6)
        fine = noise_tex(N, L, v, 3.0, 8, 0.7)
        g, d = _lin(color), _lin(dirt)
        grass = ramp(N, L, fine, [(0.3, tuple(x * 0.6 for x in g)), (0.7, tuple(min(1, x * 1.25) for x in g))])
        mk = math_node(N, L, "GREATER_THAN", n, 1.0 - patch * 0.5)
        L.new(mix_rgb(N, L, mk, grass, d), b.inputs["Base Color"])
        inp(b, "Roughness", 0.95)
        inp(b, ["Specular IOR Level", "Specular"], 0.25)
        bump(N, L, b, fine, 0.4, 0.02)
        return m
    return _cached(name, make)


def water(name="water", color=(0.10, 0.22, 0.28)):
    def make():
        m, N, L, b = new_mat(name)
        inp(b, "Base Color", (*_lin(color), 1))
        inp(b, "Roughness", 0.06)
        inp(b, ["Specular IOR Level", "Specular"], 0.6)
        bump(N, L, b, noise_tex(N, L, coords(N, L, (1, 1, 1)), 1.2, 4, 0.5), 0.15, 0.05)
        return m
    return _cached(name, make)


def glow(name, color=(1.0, 0.78, 0.5), strength=6.0, base=(0.9, 0.86, 0.78)):
    """a lamp shade, a lit window, a screen: emission the film switches on with the lights"""
    def make():
        m, N, L, b = new_mat(name)
        inp(b, "Base Color", (*_lin(base), 1))
        inp(b, "Roughness", 0.7)
        inp(b, "Emission Color", (*_lin(color), 1))
        inp(b, "Emission Strength", strength)
        EMISSIVE.append(b.inputs["Emission Strength"])
        return m
    return _cached(name, make)


def scan(name, polyhaven_id, fallback, scale=1.0):
    """a Poly Haven CC0 texture set (fetched by scripts/fetch-assets.py into $PBF_ASSETS/<id>/); the procedural
    fallback material when it is not on disk, so a fresh copy still builds"""
    d = os.path.join(ASSETS, polyhaven_id)
    files = {k: os.path.join(d, f"{polyhaven_id}_{k}_1k.jpg") for k in ("diff", "rough", "nor_gl")}
    if not os.path.exists(files["diff"]):
        return fallback

    def make():
        m, N, L, b = new_mat(name)
        v = coords(N, L, (scale, scale, scale))
        for k, target in (("diff", "Base Color"), ("rough", "Roughness"), ("nor_gl", None)):
            if not os.path.exists(files[k]):
                continue
            t = N.new("ShaderNodeTexImage")
            t.image = bpy.data.images.load(files[k], check_existing=True)
            t.projection = "BOX"
            t.projection_blend = 0.3
            if k != "diff":
                t.image.colorspace_settings.name = "Non-Color"
            L.new(v, t.inputs["Vector"])
            if target:
                L.new(t.outputs["Color"], b.inputs[target])
            else:
                nm = N.new("ShaderNodeNormalMap")
                L.new(t.outputs["Color"], nm.inputs["Color"])
                L.new(nm.outputs["Normal"], b.inputs["Normal"])
        return m
    return _cached(name, make)


# ---------------------------------------------------------------- sky and light
LOOKS = {  # sun elevation / azimuth (deg), sun strength, sky strength, sun colour
    "day": dict(elev=38, az=135, sun=3.2, sky=1.0, col=(1.0, 0.96, 0.9), ev=0.0),
    "golden": dict(elev=11, az=250, sun=3.6, sky=0.8, col=(1.0, 0.78, 0.52), ev=0.3),
    "dusk": dict(elev=-1.5, az=255, sun=0.0, sky=1.6, col=(1.0, 0.6, 0.4), ev=1.2),
}
SUN = None


def sky(look="golden", az=None):
    """a physical sky and a matching sun lamp. Returns the look's dict (its 'ev' is a starting exposure)."""
    global SUN
    lk = dict(LOOKS[look])
    if az is not None:
        lk["az"] = az
    scene = bpy.context.scene
    N, L = scene.world.node_tree.nodes, scene.world.node_tree.links
    for n in list(N):
        N.remove(n)
    out = N.new("ShaderNodeOutputWorld")
    bg = N.new("ShaderNodeBackground")
    bg.name = "Background"
    s = N.new("ShaderNodeTexSky")
    s.sky_type = "MULTIPLE_SCATTERING"
    s.sun_disc = look != "dusk"
    s.sun_elevation = math.radians(lk["elev"])
    s.sun_rotation = math.radians(lk["az"])
    s.altitude = 200.0
    L.new(s.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = lk["sky"] * 0.12
    L.new(bg.outputs[0], out.inputs["Surface"])
    if lk["sun"] > 0:
        ld = bpy.data.lights.new("sun", "SUN")
        ld.energy = lk["sun"]
        ld.color = lk["col"]
        ld.angle = math.radians(1.5)
        SUN = bpy.data.objects.new("sun", ld)
        el, az = math.radians(lk["elev"]), math.radians(lk["az"])
        d = Vector((math.cos(el) * math.sin(az), -math.cos(el) * math.cos(az), math.sin(el)))  # towards the sun
        SUN.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        ROOT.objects.link(SUN)
    return lk


# ---------------------------------------------------------------- cameras and stills
def camera(name, loc, target, lens=35.0, roll=0.0):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = 36.0
    cd.clip_start = 0.05
    cd.clip_end = 5000.0
    o = bpy.data.objects.new(name, cd)
    ROOT.objects.link(o)
    aim(o, loc, target, roll)
    return o


def aim(o, loc, target, roll=0.0):
    o.location = Vector(loc)
    d = Vector(target) - Vector(loc)
    q = d.to_track_quat("-Z", "Y")
    if roll:
        q = q @ Matrix.Rotation(roll, 4, "Z").to_quaternion()
    o.rotation_mode = "XYZ"
    o.rotation_euler = q.to_euler()


def outdir(*parts):
    d = os.path.join(os.environ.get("PBF_OUT", "pbf-out"), *parts)
    os.makedirs(d, exist_ok=True)
    return d


def finish(opts, shots, name=None):
    """film mode: do nothing (film.py takes the scene). Otherwise render the named stills to pbf-out/<name>/stills/."""
    audit()
    if FILM:
        return
    name = name or os.path.basename(os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("-P") + 1])))
    scene = bpy.context.scene
    od = outdir(name, "stills")
    for sname in shots:
        if sname not in SHOTS:
            print(f"pbf: no shot '{sname}' (have {', '.join(SHOTS)})")
            continue
        s = SHOTS[sname]
        cam = camera("cam_" + sname, s["loc"], s["target"], s["lens"])
        scene.camera = cam
        scene.view_settings.exposure = float(opts.get("exposure", s.get("ev", 0.0)))
        scene.render.filepath = os.path.join(od, f"{sname}.png")
        bpy.ops.render.render(write_still=True)
        print(f"pbf: still {scene.render.filepath}")
    if opts.get("blend"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir(name), "scene.blend"))


# ---------------------------------------------------------------- the audit: counts, floaters, sizes
def audit(write=True):
    """Every part: a stage, a size, and contact with something (another part or the ground at z<=0.01).
    A floater is a part whose box, grown by 5 mm, touches nothing: a beam that misses its post, a stone in mid-air."""
    dg = bpy.context.evaluated_depsgraph_get()
    rows, boxes = [], []
    for o, st in PARTS:
        if o.name not in bpy.data.objects:
            continue
        ws = [o.matrix_world @ Vector(c) for c in o.bound_box]
        lo = Vector((min(v.x for v in ws), min(v.y for v in ws), min(v.z for v in ws)))
        hi = Vector((max(v.x for v in ws), max(v.y for v in ws), max(v.z for v in ws)))
        boxes.append((o, st, lo, hi))
    cell = 1.0
    grid = {}
    for i, (o, st, lo, hi) in enumerate(boxes):
        for gx in range(int(math.floor(lo.x / cell)), int(math.floor(hi.x / cell)) + 1):
            for gy in range(int(math.floor(lo.y / cell)), int(math.floor(hi.y / cell)) + 1):
                grid.setdefault((gx, gy), []).append(i)
    eps = 0.005
    floaters, tiny = [], []
    for i, (o, st, lo, hi) in enumerate(boxes):
        size = hi - lo
        if max(size) < 0.003:
            tiny.append(o.name)
        if lo.z <= 0.01 or o.get("free"):
            continue
        near = set()
        for gx in range(int(math.floor(lo.x / cell)), int(math.floor(hi.x / cell)) + 1):
            for gy in range(int(math.floor(lo.y / cell)), int(math.floor(hi.y / cell)) + 1):
                near.update(grid.get((gx, gy), ()))
        ok = False
        for j in near:
            if j == i:
                continue
            _, _, l2, h2 = boxes[j]
            if all(lo[k] - eps <= h2[k] and l2[k] <= hi[k] + eps for k in range(3)):
                ok = True
                break
        if not ok:
            floaters.append(o.name)
    counts = {}
    for _, st in PARTS:
        counts[st] = counts.get(st, 0) + 1
    print(f"pbf: {len(PARTS)} parts " + ", ".join(f"{k} {v}" for k, v in counts.items()))
    if floaters:
        print(f"pbf: {len(floaters)} FLOATING parts (touch nothing): {', '.join(floaters[:12])}{' ...' if len(floaters) > 12 else ''}")
    if tiny:
        print(f"pbf: {len(tiny)} parts under 3 mm: {', '.join(tiny[:8])}")
    rep = dict(parts=len(PARTS), stages=counts, floaters=floaters, tiny=tiny, lights=len(LIGHTS), points=POINTS)
    if write:
        try:
            name = os.environ.get("PBF_NAME") or os.path.basename(os.path.dirname(os.path.abspath(sys.argv[sys.argv.index("-P") + 1])))
            json.dump(rep, open(os.path.join(outdir(name), "audit.json"), "w"), indent=1)
        except (ValueError, IndexError):
            pass
    return rep
