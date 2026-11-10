"""Procedural modelling: every object in a film is built here from numbers. No model files.

The builders that carry most hard-surface work:
  lathe()   a profile (r, z) turned round an axis: barrels, rings, knobs, lenses, wheels, bottles, towers
  prism()   a 2D outline (with holes) extruded with a real bevel: gears, blades, plates, brackets, letters
  tube()    a path swept with a round section: wires, pipes, rims, springs
  box()/cyl()/sphere()/grid()   primitives, always with a bevel: nothing real has a razor edge
Everything returns a bpy object linked to the scene, with smooth shading split at hard angles.
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

TAU = math.tau


# ---- object plumbing ----------------------------------------------------------------------------
def link(ob, parent=None, loc=None, rot=None, scale=None, mat=None):
    if ob.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(ob)
    if parent is not None:
        ob.parent = parent
    if loc is not None:
        ob.location = loc
    if rot is not None:
        ob.rotation_euler = rot
    if scale is not None:
        ob.scale = (scale,) * 3 if isinstance(scale, (int, float)) else scale
    if mat is not None and ob.data is not None:
        ob.data.materials.clear()
        for m in (mat if isinstance(mat, (list, tuple)) else [mat]):
            ob.data.materials.append(m)
    return ob


def empty(name, loc=(0, 0, 0), parent=None):
    return link(bpy.data.objects.new(name, None), parent=parent, loc=loc)


def shade(ob, angle=35.0):
    """Smooth shading with hard edges kept where faces meet at more than `angle` degrees."""
    me = ob.data
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(angle))
    return ob


def mesh(name, verts, faces, uvs=None, angle=35.0, recalc=True, **kw):
    """Object from vertex and face lists (numpy or lists). uvs: one (u, v) per face corner, in face order."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(map(float, v)) for v in verts], [], [tuple(map(int, f)) for f in faces])
    if uvs is not None:
        layer = me.uv_layers.new(name='UVMap')
        layer.data.foreach_set('uv', np.asarray(uvs, dtype=np.float32).ravel())
    if recalc:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
    me.update()
    ob = bpy.data.objects.new(name, me)
    link(ob, **kw)
    if angle is not None:
        shade(ob, angle)
    return ob


def apply(ob):
    """Bake the modifier stack (bevel, subdivision, boolean, solidify …) into the mesh."""
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    if old.users == 0:
        bpy.data.meshes.remove(old)
    return ob


def bevel(ob, width=0.002, seg=3, angle=30.0, keep=False):
    """Round every edge sharper than `angle`. The single most important step toward a photograph:
    a bevel is where an object catches its highlight."""
    m = ob.modifiers.new('bevel', 'BEVEL')
    m.width = width
    m.segments = seg
    m.limit_method = 'ANGLE'
    m.angle_limit = math.radians(angle)
    m.harden_normals = True
    m.miter_outer = 'MITER_ARC'
    if not keep:
        apply(ob)
        shade(ob, max(angle, 35))
    return ob


def subsurf(ob, levels=2, keep=False):
    m = ob.modifiers.new('subsurf', 'SUBSURF')
    m.levels = m.render_levels = levels
    if not keep:
        apply(ob)
    return ob


def solidify(ob, thickness, offset=-1.0, keep=False):
    m = ob.modifiers.new('solid', 'SOLIDIFY')
    m.thickness = thickness
    m.offset = offset
    m.use_even_offset = True
    if not keep:
        apply(ob)
    return ob


def boolean(ob, cutter, op='DIFFERENCE', keep_cutter=False):
    """Cut `cutter` out of `ob` (or UNION / INTERSECT). The cutter is removed unless keep_cutter."""
    m = ob.modifiers.new('bool', 'BOOLEAN')
    m.operation = op
    m.object = cutter
    m.solver = 'EXACT'
    apply(ob)
    me = ob.data
    slots = list(me.materials)
    if any(x is None for x in slots):                     # the cut faces arrive on the cutter's (empty) slot:
        keep = [i for i, x in enumerate(slots) if x is not None]     # give them the part's own material
        remap = {old: new for new, old in enumerate(keep)}
        for poly in me.polygons:
            poly.material_index = remap.get(poly.material_index, 0)
        me.materials.clear()
        for i in keep:
            me.materials.append(slots[i])
    if not keep_cutter:
        remove(cutter)
    return ob


def remove(ob):
    me = ob.data
    bpy.data.objects.remove(ob, do_unlink=True)
    if me is not None and me.users == 0 and isinstance(me, bpy.types.Mesh):
        bpy.data.meshes.remove(me)


def clone(ob, name=None, linked=True, **kw):
    """A copy that shares the mesh (cheap to render: one BVH, many instances)."""
    c = ob.copy()
    if not linked and ob.data is not None:
        c.data = ob.data.copy()
    c.name = name or ob.name
    c.animation_data_clear()
    return link(c, **kw)


def radial(ob, n, parent=None, radius=None, start=0.0, face=True, name=None):
    """n copies round the Z axis of `parent` (or the world). Returns the copies; the original becomes the first."""
    out = []
    r0 = radius if radius is not None else math.hypot(ob.location.x, ob.location.y)
    z = ob.location.z
    for i in range(n):
        a = start + TAU * i / n
        c = ob if i == 0 else clone(ob, f'{name or ob.name}.{i:02d}')
        if parent is not None:
            c.parent = parent
        c.location = (r0 * math.cos(a), r0 * math.sin(a), z)
        if face:
            c.rotation_euler = (ob.rotation_euler.x, ob.rotation_euler.y, a)
        out.append(c)
    return out


def join(objs, name=None):
    """Merge objects into the first one (materials kept per face)."""
    ctx = bpy.context
    for o in ctx.scene.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    with ctx.temp_override(active_object=objs[0], selected_editable_objects=list(objs), selected_objects=list(objs)):
        bpy.ops.object.join()
    if name:
        objs[0].name = name
    return objs[0]


def group(name, objs, loc=(0, 0, 0)):
    """An empty that carries a set of parts: move, turn and animate the assembly as one thing."""
    e = empty(name, loc)
    for o in objs:
        if o.parent is None:
            o.parent = e
    return e


def origin_to(ob, point):
    """Move the pivot to a world point without moving the geometry (hinges, hands, lids)."""
    p = Vector(point)
    d = ob.matrix_world.inverted() @ p
    ob.data.transform(Matrix.Translation(-d))
    ob.location = ob.location + (ob.matrix_world.to_3x3() @ d)
    return ob


# ---- 2D outlines (lists of (x, y)) ---------------------------------------------------------------
def circle(r, n=64, phase=0.0, cx=0.0, cy=0.0):
    return [(cx + r * math.cos(phase + TAU * i / n), cy + r * math.sin(phase + TAU * i / n)) for i in range(n)]


def arc(r, a0, a1, n=24, cx=0.0, cy=0.0):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / (n - 1)), cy + r * math.sin(a0 + (a1 - a0) * i / (n - 1)))
            for i in range(n)]


def rrect(w, h, r, n=8, cx=0.0, cy=0.0):
    """Rounded rectangle outline, counter-clockwise."""
    r = min(r, w / 2, h / 2)
    pts = []
    for (sx, sy, a0) in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        ox, oy = cx + sx * (w / 2 - r), cy + sy * (h / 2 - r)
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((ox + r * math.cos(a), oy + r * math.sin(a)))
    return pts


def gear(teeth, r_out, r_root, tip=0.36, root=0.34, n_flank=3, phase=0.0):
    """Gear outline: `tip` and `root` are the fractions of the pitch taken by the flat tip and the flat root."""
    pts = []
    pitch = TAU / teeth
    fl = (1 - tip - root) / 2
    for i in range(teeth):
        a = phase + i * pitch
        for k in range(n_flank + 1):                       # rising flank
            u = k / n_flank
            s = u * u * (3 - 2 * u)
            pts.append(_pol(r_root + (r_out - r_root) * s, a + pitch * (root / 2 + fl * u)))
        for k in range(1, n_flank + 1):                    # falling flank
            u = k / n_flank
            s = u * u * (3 - 2 * u)
            pts.append(_pol(r_out - (r_out - r_root) * s, a + pitch * (root / 2 + fl + tip + fl * u)))
    return pts


def _pol(r, a):
    return (r * math.cos(a), r * math.sin(a))


def transform2(pts, dx=0.0, dy=0.0, rot=0.0, s=1.0):
    c, n = math.cos(rot), math.sin(rot)
    return [((x * c - y * n) * s + dx, (x * n + y * c) * s + dy) for x, y in pts]


# ---- builders -----------------------------------------------------------------------------------
def lathe(name, profile, seg=96, closed=True, rmod=None, angle=35.0, uv_scale=(1.0, 1.0), **kw):
    """Turn a profile [(r, z), …] round the Z axis.

    closed=True joins the last point back to the first (a solid ring or a solid of revolution whose first and
    last points sit on the axis). Points with r == 0 become a single pole vertex.
    rmod(theta, r, z, i) → r lets the surface vary round the axis: knurling, flutes, scallops, lobes.
    UVs: u runs once round the axis, v along the profile (0..1), so a strip image wraps the part like a label.
    """
    prof = [(float(r), float(z)) for r, z in profile]
    n = len(prof)
    lens = [0.0]
    for i in range(1, n):
        lens.append(lens[-1] + math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]))
    total = lens[-1] + (math.hypot(prof[0][0] - prof[-1][0], prof[0][1] - prof[-1][1]) if closed else 0) or 1.0
    verts, ring = [], []
    for i, (r, z) in enumerate(prof):
        if r <= 1e-9:
            ring.append([len(verts)] * seg)
            verts.append((0.0, 0.0, z))
            continue
        ids = []
        for j in range(seg):
            th = TAU * j / seg
            rr = rmod(th, r, z, i) if rmod else r
            ids.append(len(verts))
            verts.append((rr * math.cos(th), rr * math.sin(th), z))
        ring.append(ids)
    faces, uvs = [], []
    last = n if closed else n - 1
    for i in range(last):
        a, b = ring[i], ring[(i + 1) % n]
        va = lens[i] / total
        vb = (lens[i + 1] if i + 1 < n else total) / total
        for j in range(seg):
            k = (j + 1) % seg
            quad = [a[j], a[k], b[k], b[j]]
            uv = [(j / seg, va), ((j + 1) / seg, va), ((j + 1) / seg, vb), (j / seg, vb)]
            keep, keep_uv = [], []
            for q, t in zip(quad, uv):
                if q not in keep:
                    keep.append(q)
                    keep_uv.append((t[0] * uv_scale[0], t[1] * uv_scale[1]))
            if len(keep) >= 3:
                faces.append(keep)
                uvs.extend(keep_uv)
    return mesh(name, verts, faces, uvs=uvs, angle=angle, recalc=True, **kw)


def prism(name, outline, depth, holes=(), bevel=0.0, bevel_seg=3, angle=35.0, **kw):
    """Extrude a 2D outline (list of (x, y), with optional holes) to `depth`, centred on Z, with rounded edges.
    The bevel is real geometry and stays inside the outline, so parts keep their drawn size."""
    cu = bpy.data.curves.new(name + '_c', 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    b = min(bevel, depth / 2 * 0.98)
    cu.extrude = depth / 2 - b
    cu.bevel_depth = b
    cu.bevel_resolution = bevel_seg if b > 0 else 0
    cu.offset = -b
    for pts in [outline, *holes]:
        sp = cu.splines.new('POLY')
        sp.points.add(len(pts) - 1)
        sp.use_cyclic_u = True
        for p, (x, y) in zip(sp.points, pts):
            p.co = (x, y, 0, 1)
    tmp = bpy.data.objects.new(name + '_c', cu)
    bpy.context.scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg), depsgraph=dg)
    me.name = name
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(cu)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    link(ob, **kw)
    return shade(ob, angle)


def tube(name, path, radius, seg=12, closed=False, smooth_path=True, caps=True, taper=None, **kw):
    """Sweep a round section along 3D points: wires, pipes, rims, coil springs (pass a helix)."""
    cu = bpy.data.curves.new(name + '_c', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = max(1, seg // 4)
    cu.use_fill_caps = caps
    cu.resolution_u = 8 if smooth_path else 1
    sp = cu.splines.new('NURBS' if smooth_path else 'POLY')
    sp.points.add(len(path) - 1)
    for i, (p, q) in enumerate(zip(sp.points, path)):
        p.co = (q[0], q[1], q[2], 1)
        if taper is not None:
            p.radius = taper(i / (len(path) - 1))
    sp.use_cyclic_u = closed
    if smooth_path:
        sp.use_endpoint_u = not closed
        sp.order_u = min(4, len(path))
    tmp = bpy.data.objects.new(name + '_c', cu)
    bpy.context.scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg), depsgraph=dg)
    me.name = name
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(cu)
    ob = bpy.data.objects.new(name, me)
    link(ob, **kw)
    return shade(ob, 60)


def helix(r, pitch, turns, n=24, z0=0.0, r1=None):
    """Points of a helix (a spring, a thread, a hairspring when pitch = 0 and r1 != r)."""
    m = max(2, int(turns * n))
    r1 = r if r1 is None else r1
    return [((r + (r1 - r) * i / m) * math.cos(TAU * turns * i / m),
             (r + (r1 - r) * i / m) * math.sin(TAU * turns * i / m), z0 + pitch * turns * i / m) for i in range(m + 1)]


def box(name, size, bevel_w=0.0, seg=3, **kw):
    """Box centred on the origin. bevel_w rounds its edges (give every box one)."""
    sx, sy, sz = (size,) * 3 if isinstance(size, (int, float)) else size
    v = [(x * sx / 2, y * sy / 2, z * sz / 2) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    ob = mesh(name, v, f, angle=35, **kw)
    if bevel_w > 0:
        bevel(ob, min(bevel_w, min(sx, sy, sz) * 0.49), seg)
    return ob


def cyl(name, r, h, seg=64, bevel_w=0.0, bevel_seg=3, **kw):
    """Solid cylinder on the Z axis, centred, with rounded rims."""
    b = min(bevel_w, r * 0.49, h * 0.49)
    prof = [(0, -h / 2)]
    if b > 0:
        for i in range(bevel_seg + 1):
            a = math.pi / 2 * i / bevel_seg
            prof.append((r - b + b * math.sin(a), -h / 2 + b - b * math.cos(a)))
        for i in range(bevel_seg + 1):
            a = math.pi / 2 * i / bevel_seg
            prof.append((r - b + b * math.cos(a), h / 2 - b + b * math.sin(a)))
    else:
        prof += [(r, -h / 2), (r, h / 2)]
    prof.append((0, h / 2))
    return lathe(name, prof, seg=seg, closed=False, **kw)


def ring(name, r_in, r_out, h, seg=96, bevel_w=0.0, bevel_seg=3, rmod=None, **kw):
    """A flat ring (washer, bezel, rim) with rounded edges: the rectangle (r_in..r_out) × h turned round Z."""
    return lathe(name, rrect_profile(r_in, r_out, -h / 2, h / 2, bevel_w, bevel_seg), seg=seg, closed=True,
                 rmod=rmod, **kw)


def rrect_profile(r0, r1, z0, z1, b=0.0, n=3):
    """Closed lathe profile of a rounded rectangle in the (r, z) plane."""
    b = min(b, (r1 - r0) * 0.49, (z1 - z0) * 0.49)
    if b <= 0:
        return [(r0, z0), (r1, z0), (r1, z1), (r0, z1)]
    pts = []
    for (cr, cz, a0) in ((r1 - b, z0 + b, -90), (r1 - b, z1 - b, 0), (r0 + b, z1 - b, 90), (r0 + b, z0 + b, 180)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cr + b * math.cos(a), cz + b * math.sin(a)))
    return pts


def sphere(name, r, seg=48, rings=24, **kw):
    prof = [(r * math.sin(math.pi * i / rings), -r * math.cos(math.pi * i / rings)) for i in range(rings + 1)]
    prof[0] = (0, -r)
    prof[-1] = (0, r)
    return lathe(name, prof, seg=seg, closed=False, angle=180, **kw)


def plane(name, sx, sy=None, **kw):
    sy = sx if sy is None else sy
    v = [(-sx / 2, -sy / 2, 0), (sx / 2, -sy / 2, 0), (sx / 2, sy / 2, 0), (-sx / 2, sy / 2, 0)]
    return mesh(name, v, [(0, 1, 2, 3)], uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], angle=None, recalc=False, **kw)


def grid(name, sx, sy, nx, ny, height=None, **kw):
    """A plane of nx × ny quads; height(X, Y) → Z works on numpy arrays (terrain, cloth, dunes, a rumpled sheet)."""
    xs = np.linspace(-sx / 2, sx / 2, nx + 1)
    ys = np.linspace(-sy / 2, sy / 2, ny + 1)
    X, Y = np.meshgrid(xs, ys)
    Z = height(X, Y) if height is not None else np.zeros_like(X)
    verts = np.stack([X.ravel(), Y.ravel(), np.asarray(Z, dtype=float).ravel()], 1)
    i = np.arange(nx * ny)
    a = i + i // nx
    faces = np.stack([a, a + 1, a + nx + 2, a + nx + 1], 1)
    U, V = np.meshgrid(np.linspace(0, 1, nx + 1), np.linspace(0, 1, ny + 1))
    uv = np.stack([U.ravel(), V.ravel()], 1)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts))
    me.vertices.foreach_set('co', verts.astype(np.float32).ravel())
    me.loops.add(len(faces) * 4)
    me.loops.foreach_set('vertex_index', faces.astype(np.int32).ravel())
    me.polygons.add(len(faces))
    me.polygons.foreach_set('loop_start', np.arange(0, len(faces) * 4, 4, dtype=np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(faces), 4, dtype=np.int32))
    me.uv_layers.new(name='UVMap').data.foreach_set('uv', uv[faces.ravel()].astype(np.float32).ravel())
    me.update()
    me.validate()
    ob = bpy.data.objects.new(name, me)
    link(ob, **kw)
    me.shade_smooth()
    return ob


def fbm2(X, Y, seed=0, octaves=5, lac=2.0, gain=0.5):
    """Value-noise fBm on numpy arrays, roughly -1..1. For terrain heights and anything that must not look drawn."""
    def h(ix, iy, s):
        v = np.sin(ix * 127.1 + iy * 311.7 + s * 74.7) * 43758.5453
        return v - np.floor(v)
    out = np.zeros_like(X, dtype=float)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        x, y = X * lac ** o, Y * lac ** o
        ix, iy = np.floor(x), np.floor(y)
        fx, fy = x - ix, y - iy
        ux, uy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        s = seed + o * 13.0
        v = (h(ix, iy, s) * (1 - ux) + h(ix + 1, iy, s) * ux) * (1 - uy) + \
            (h(ix, iy + 1, s) * (1 - ux) + h(ix + 1, iy + 1, s) * ux) * uy
        out += (v * 2 - 1) * amp
        tot += amp
        amp *= gain
    return out / tot


def text(name, body, size=1.0, depth=0.0, bevel_w=0.0, tracking=1.0, font=None, align='CENTER', **kw):
    """Real 3D lettering (titles live in the scene: they take the light, the focus and the grain of the shot).
    font: path to a .ttf/.otf; tracking: 1 = normal, 1.6 = the wide caps of a film title."""
    cu = bpy.data.curves.new(name + '_c', 'FONT')
    cu.body = body
    cu.size = size
    cu.extrude = depth / 2
    cu.bevel_depth = bevel_w
    cu.bevel_resolution = 2 if bevel_w > 0 else 0
    cu.space_character = tracking
    cu.align_x = align
    cu.align_y = 'CENTER'
    cu.resolution_u = 8
    if font:
        cu.font = bpy.data.fonts.load(font, check_existing=True)
    tmp = bpy.data.objects.new(name + '_c', cu)
    bpy.context.scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg), depsgraph=dg)
    me.name = name
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(cu)
    ob = bpy.data.objects.new(name, me)
    link(ob, **kw)
    return shade(ob, 40)


def scatter(name, count, bounds, size=(0.001, 0.003), seed=0, **kw):
    """One mesh of `count` tiny octahedra in a box ((x0, y0, z0), (x1, y1, z1)): dust in the air, grit on a floor.
    Out of focus each one becomes a bokeh disc, which is most of what makes a macro shot feel photographed."""
    rs = np.random.RandomState(seed)
    lo, hi = np.array(bounds[0], float), np.array(bounds[1], float)
    c = lo + rs.rand(count, 3) * (hi - lo)
    s = size[0] + rs.rand(count) ** 3 * (size[1] - size[0])
    base = np.array([(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)], float)
    fc = np.array([(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)])
    verts = (c[:, None, :] + base[None] * s[:, None, None]).reshape(-1, 3)
    faces = (fc[None] + (np.arange(count) * 6)[:, None, None]).reshape(-1, 3)
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts.tolist(), [], faces.tolist())
    me.update()
    ob = bpy.data.objects.new(name, me)
    link(ob, **kw)
    me.shade_smooth()
    return ob


def look_at(ob, target, roll=0.0, track='-Z', up='Y'):
    """Aim an object (camera, light, panel) at a world point."""
    d = Vector(target) - ob.matrix_world.translation if ob.parent else Vector(target) - Vector(ob.location)
    q = d.to_track_quat(track, up)
    if roll:
        q = q @ Euler((0, 0, roll)).to_quaternion()
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = q
    return ob
