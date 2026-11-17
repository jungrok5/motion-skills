"""Mesh builders (bmesh). Blender is Z-up; the character faces -Y, its left hand is +X.

Every builder returns a bpy mesh object linked to the active collection, shaded smooth, with a UV map:
u runs around (or along) the part, v runs down (or across) it, so pattern textures wrap naturally.
"""
import math
import bpy
import bmesh
from mathutils import Vector, Matrix

TAU = math.pi * 2


def _finish(bm, name, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def _uv(bm):
    return bm.loops.layers.uv.verify()


def lathe(name, profile, segs=32, sx=1.0, sy=1.0, center=(0, 0, 0), cap_top=False, cap_bottom=False,
          shape=None, uv_repeat=(1, 1)):
    """Revolve a profile around Z.

    profile: [(r, z), ...] from top to bottom (r may be 0 at a pole).
    sx, sy: cross-section scale (sy < 1 = flatter front-to-back).
    shape(theta, z, r) -> (dr, dy): optional per-vertex tweak (radius add, y offset). theta = 0 at +X, -pi/2 at front (-Y).
    """
    bm = bmesh.new()
    uv = _uv(bm)
    cx, cy, cz = center
    rings = []
    for (r, z) in profile:
        ring = []
        for i in range(segs):
            th = TAU * i / segs
            rr, dy = r, 0.0
            if shape:
                d = shape(th, z, r)
                rr += d[0]
                dy = d[1]
            ring.append(bm.verts.new((cx + math.cos(th) * rr * sx, cy + math.sin(th) * rr * sy + dy, cz + z)))
        rings.append(ring)
    n = len(rings)
    for j in range(n - 1):
        for i in range(segs):
            a, b = rings[j][i], rings[j][(i + 1) % segs]
            c, d = rings[j + 1][(i + 1) % segs], rings[j + 1][i]
            try:
                f = bm.faces.new((a, d, c, b))
            except ValueError:
                continue
            u0, u1 = i / segs * uv_repeat[0], (i + 1) / segs * uv_repeat[0]
            v0, v1 = j / (n - 1) * uv_repeat[1], (j + 1) / (n - 1) * uv_repeat[1]
            for loop, (u, v) in zip(f.loops, ((u0, v0), (u0, v1), (u1, v1), (u1, v0))):
                loop[uv].uv = (u, 1 - v)
    if cap_top and profile[0][0] > 1e-5:
        bm.faces.new(list(reversed(rings[0])))
    if cap_bottom and profile[-1][0] > 1e-5:
        bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(bm, name)


def ellipsoid(name, center, radii, segs=24, rings=14, rot=None):
    """UV sphere scaled by radii, optionally rotated (Matrix 3x3 or Euler)."""
    prof = []
    for j in range(rings + 1):
        a = math.pi * j / rings
        prof.append((math.sin(a), math.cos(a)))
    ob = lathe(name, prof, segs=segs)
    me = ob.data
    R = rot.to_matrix() if hasattr(rot, 'to_matrix') else (rot or Matrix.Identity(3))
    for v in me.vertices:
        p = Vector((v.co.x * radii[0], v.co.y * radii[1], v.co.z * radii[2]))
        v.co = R @ p + Vector(center)
    return ob


def tube(name, points, radii, segs=16, cap=True, flat=1.0, up=(0, 0, 1)):
    """Sweep a circle (radius per point) along a polyline. flat < 1 squashes the section along the 'up' side axis."""
    pts = [Vector(p) for p in points]
    if isinstance(radii, (int, float)):
        radii = [radii] * len(pts)
    bm = bmesh.new()
    uv = _uv(bm)
    rings = []
    prev_side = None
    upv = Vector(up)
    for k, p in enumerate(pts):
        if k == 0:
            t = (pts[1] - pts[0]).normalized()
        elif k == len(pts) - 1:
            t = (pts[-1] - pts[-2]).normalized()
        else:
            t = ((pts[k + 1] - pts[k]).normalized() + (pts[k] - pts[k - 1]).normalized()).normalized()
        side = t.cross(upv)
        if side.length < 1e-4:
            side = t.cross(Vector((1, 0, 0)))
        side.normalize()
        if prev_side is not None and side.dot(prev_side) < 0:
            side = -side
        prev_side = side
        n2 = side.cross(t).normalized()
        ring = []
        for i in range(segs):
            th = TAU * i / segs
            off = side * math.cos(th) * radii[k] + n2 * math.sin(th) * radii[k] * flat
            ring.append(bm.verts.new(p + off))
        rings.append(ring)
    n = len(rings)
    for j in range(n - 1):
        for i in range(segs):
            a, b = rings[j][i], rings[j][(i + 1) % segs]
            c, d = rings[j + 1][(i + 1) % segs], rings[j + 1][i]
            f = bm.faces.new((a, b, c, d))
            u0, u1 = i / segs, (i + 1) / segs
            v0, v1 = j / (n - 1), (j + 1) / (n - 1)
            for loop, (u, v) in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))):
                loop[uv].uv = (u, 1 - v)
    if cap:
        for ring, end in ((rings[0], 0), (rings[-1], 1)):
            c = bm.verts.new(sum((v.co for v in ring), Vector()) / len(ring))
            for i in range(segs):
                a, b = ring[i], ring[(i + 1) % segs]
                bm.faces.new((c, b, a) if end == 0 else (c, a, b))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(bm, name)


def ribbon(name, points, widths, normal=(0, 1, 0), thickness=0.006, twist=None):
    """A flat strip with thickness along a polyline. normal = the face direction of the strip (its flat side).
    twist: optional list of angles (radians) rotating the strip around its path."""
    pts = [Vector(p) for p in points]
    if isinstance(widths, (int, float)):
        widths = [widths] * len(pts)
    nrm = Vector(normal).normalized()
    bm = bmesh.new()
    uv = _uv(bm)
    rows = []
    for k, p in enumerate(pts):
        if k == 0:
            t = (pts[1] - pts[0]).normalized()
        elif k == len(pts) - 1:
            t = (pts[-1] - pts[-2]).normalized()
        else:
            t = ((pts[k + 1] - pts[k]).normalized() + (pts[k] - pts[k - 1]).normalized()).normalized()
        side = t.cross(nrm)
        if side.length < 1e-4:
            side = t.cross(Vector((0, 0, 1)))
        side.normalize()
        n2 = side.cross(t).normalized()
        if twist:
            q = Matrix.Rotation(twist[k], 3, t)
            side, n2 = q @ side, q @ n2
        w = widths[k] / 2
        h = thickness / 2
        rows.append([bm.verts.new(p + side * sx * w + n2 * sz * h) for (sx, sz) in ((-1, 1), (1, 1), (1, -1), (-1, -1))])
    n = len(rows)
    for j in range(n - 1):
        for i in range(4):
            a, b = rows[j][i], rows[j][(i + 1) % 4]
            c, d = rows[j + 1][(i + 1) % 4], rows[j + 1][i]
            f = bm.faces.new((a, b, c, d))
            u0, u1 = (0, 1) if i % 2 == 0 else (1, 0)
            v0, v1 = j / (n - 1), (j + 1) / (n - 1)
            for loop, (u, v) in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))):
                loop[uv].uv = (u, 1 - v)
    bm.faces.new(list(reversed(rows[0])))
    bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(bm, name)


def loop_ribbon(name, center, size, normal, up=(0, 0, 1), width=0.03, thickness=0.006, segs=18, pinch=0.25):
    """A closed ribbon loop (one bow loop): a teardrop ring in the plane spanned by 'out' and 'up'."""
    c = Vector(center)
    nrm = Vector(normal).normalized()
    upv = Vector(up).normalized()
    out = upv.cross(nrm).normalized()
    pts = []
    for i in range(segs + 1):
        a = TAU * i / segs
        x = (1 - math.cos(a)) * 0.5 * size[0]
        z = math.sin(a) * size[1] * (pinch + (1 - pinch) * (1 - math.cos(a)) * 0.5)
        pts.append(c + out * x + upv * z)
    return ribbon(name, pts, width, normal=nrm, thickness=thickness)


def join(objs, name):
    """Join mesh objects into one (keeps UVs and materials)."""
    objs = [o for o in objs if o]
    if len(objs) == 1:
        objs[0].name = name
        return objs[0]
    ctx = bpy.context
    for o in ctx.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    ctx.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    objs[0].data.name = name
    return objs[0]


def delete_faces(ob, pred):
    """Delete faces whose centre satisfies pred(Vector)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    kill = [f for f in bm.faces if pred(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()


def transform(ob, M):
    ob.data.transform(M)
    ob.data.update()


def solidify(ob, thickness):
    """Give an open shell real thickness (applied, so it exports to glTF)."""
    m = ob.modifiers.new('solid', 'SOLIDIFY')
    m.thickness = thickness
    m.offset = -1
    ctx = bpy.context
    ctx.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=m.name)
