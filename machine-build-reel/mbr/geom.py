"""Mesh building in part-local space.

Every part is built in the local frame of the bone it rides on:
  +Y runs along the bone (from its upper joint to its lower joint for a limb segment),
  +X is the joint's pin axis (the hinge),
  +Z is the in-plane perpendicular ("front" of a leg segment that hangs down).

`Mesh` collects vertices and quads with a material slot per face; primitives take an optional 4x4 `M` (mathutils
Matrix) that places them inside the part. `Mesh.make(name)` turns it into a bpy mesh. Nothing here depends on a scene,
so the same builder gives the same mesh every run (determinism).
"""
import math
import bpy
from mathutils import Matrix, Vector

TAU = math.pi * 2
I4 = Matrix.Identity(4)


def T(x=0.0, y=0.0, z=0.0):
    return Matrix.Translation((x, y, z))


def RX(deg):
    return Matrix.Rotation(math.radians(deg), 4, 'X')


def RY(deg):
    return Matrix.Rotation(math.radians(deg), 4, 'Y')


def RZ(deg):
    return Matrix.Rotation(math.radians(deg), 4, 'Z')


def look(p0, p1, up=(1, 0, 0)):
    """Matrix whose +Y runs from p0 to p1 (origin at p0), +X as close to `up` as possible."""
    p0, p1 = Vector(p0), Vector(p1)
    y = (p1 - p0)
    L = y.length
    y = y.normalized() if L > 1e-9 else Vector((0, 1, 0))
    x = Vector(up)
    x = (x - y * x.dot(y))
    if x.length < 1e-6:
        x = Vector((0, 0, 1)) - y * y.z
        if x.length < 1e-6:
            x = Vector((1, 0, 0))
    x.normalize()
    z = x.cross(y)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = p0
    return m, L


def superellipse(rx, rz, n, segs, a0=0.0, a1=TAU):
    """Points of |x/rx|^n + |z/rz|^n = 1 from angle a0 to a1 (radians, 0 = +X, pi/2 = +Z)."""
    pts = []
    closed = abs((a1 - a0) - TAU) < 1e-9
    cnt = segs if closed else segs + 1
    for i in range(cnt):
        a = a0 + (a1 - a0) * i / segs
        c, s = math.cos(a), math.sin(a)
        e = 2.0 / n
        x = rx * math.copysign(abs(c) ** e, c)
        z = rz * math.copysign(abs(s) ** e, s)
        pts.append((x, z))
    return pts, closed


class Mesh:
    def __init__(self):
        self.v = []
        self.f = []
        self.m = []
        self.sharp = []

    def _add(self, verts, faces, mat, M):
        base = len(self.v)
        M = M or I4
        for p in verts:
            self.v.append(tuple(M @ Vector(p)))
        for fc in faces:
            self.f.append(tuple(base + i for i in fc))
            self.m.append(mat)
        return base

    # ---- primitives -------------------------------------------------------------------------------------------------
    def box(self, sx, sy, sz, mat=0, M=None, c=(0, 0, 0)):
        x, y, z = sx / 2, sy / 2, sz / 2
        cx, cy, cz = c
        v = [(cx + a * x, cy + b * y, cz + d * z) for a in (-1, 1) for b in (-1, 1) for d in (-1, 1)]
        f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
        return self._add(v, f, mat, M)

    def taper(self, L, w0, d0, w1=None, d1=None, mat=0, M=None, y0=0.0, dz0=0.0, dz1=0.0):
        """Box beam along +Y from y0 to y0+L; width along X (w), depth along Z (d); optional Z offset at each end."""
        w1 = w0 if w1 is None else w1
        d1 = d0 if d1 is None else d1
        v = []
        for (y, w, d, dz) in ((y0, w0, d0, dz0), (y0 + L, w1, d1, dz1)):
            for (a, b) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                v.append((a * w / 2, y, dz + b * d / 2))
        f = [(0, 1, 2, 3)[::-1], (4, 5, 6, 7)]
        for i in range(4):
            j = (i + 1) % 4
            f.append((i, j, 4 + j, 4 + i))
        return self._add(v, f, mat, M)

    def cyl(self, r, h, axis='X', segs=24, mat=0, M=None, c=(0, 0, 0), r2=None, cap=True):
        """Cylinder (or cone frustum if r2) centred at c, length h along axis."""
        r2 = r if r2 is None else r2
        v = []
        for (t, rr) in ((-h / 2, r), (h / 2, r2)):
            for i in range(segs):
                a = TAU * i / segs
                p = (t, rr * math.cos(a), rr * math.sin(a))
                v.append(p)
        f = []
        for i in range(segs):
            j = (i + 1) % segs
            f.append((i, j, segs + j, segs + i))
        if cap:
            f.append(tuple(range(segs))[::-1])
            f.append(tuple(range(segs, 2 * segs)))
        R = {'X': I4, 'Y': RZ(90), 'Z': RY(-90)}[axis]
        M2 = (M or I4) @ T(*c) @ R
        return self._add(v, f, mat, M2)

    def tube(self, p0, p1, r, segs=12, mat=0, M=None, r2=None, cap=True):
        m, L = look(p0, p1)
        return self.cyl(r, L, 'Y', segs, mat, (M or I4) @ m, c=(0, L / 2, 0), r2=r2, cap=cap)

    def ring(self, r_out, r_in, h, axis='X', segs=32, mat=0, M=None, c=(0, 0, 0)):
        """Flat washer / flange: annulus of thickness h."""
        v = []
        for (t) in (-h / 2, h / 2):
            for rr in (r_out, r_in):
                for i in range(segs):
                    a = TAU * i / segs
                    v.append((t, rr * math.cos(a), rr * math.sin(a)))
        f = []
        o0, i0, o1, i1 = 0, segs, 2 * segs, 3 * segs
        for i in range(segs):
            j = (i + 1) % segs
            f.append((o0 + i, o0 + j, o1 + j, o1 + i))      # outer wall
            f.append((i1 + i, i1 + j, i0 + j, i0 + i))      # inner wall
            f.append((i0 + i, i0 + j, o0 + j, o0 + i))      # face -
            f.append((o1 + i, o1 + j, i1 + j, i1 + i))      # face +
        R = {'X': I4, 'Y': RZ(90), 'Z': RY(-90)}[axis]
        return self._add(v, f, mat, (M or I4) @ T(*c) @ R)

    def torus(self, R, r, axis='X', segs=32, rsegs=10, mat=0, M=None, c=(0, 0, 0)):
        v = []
        for i in range(segs):
            a = TAU * i / segs
            for j in range(rsegs):
                b = TAU * j / rsegs
                rr = R + r * math.cos(b)
                v.append((r * math.sin(b), rr * math.cos(a), rr * math.sin(a)))
        f = []
        for i in range(segs):
            i2 = (i + 1) % segs
            for j in range(rsegs):
                j2 = (j + 1) % rsegs
                f.append((i * rsegs + j, i2 * rsegs + j, i2 * rsegs + j2, i * rsegs + j2))
        Rm = {'X': I4, 'Y': RZ(90), 'Z': RY(-90)}[axis]
        return self._add(v, f, mat, (M or I4) @ T(*c) @ Rm)

    def bolts(self, r_circle, n, r_bolt, h, axis='X', mat=0, M=None, c=(0, 0, 0), a0=0.0, segs=6):
        """A ring of hex bolt heads standing on a face (pointing along +axis)."""
        R = {'X': I4, 'Y': RZ(90), 'Z': RY(-90)}[axis]
        base = (M or I4) @ T(*c) @ R
        for i in range(n):
            a = a0 + TAU * i / n
            self.cyl(r_bolt, h, 'X', segs, mat, base, c=(h / 2, r_circle * math.cos(a), r_circle * math.sin(a)))

    def loft(self, sections, segs=24, mat=0, M=None, cap0=True, cap1=True, a0=0.0, a1=TAU):
        """Loft superellipse sections along +Y. sections: [(y, rx, rz, n, cx, cz)] (cx, cz = section centre)."""
        rings = []
        closed = True
        for (y, rx, rz, n, cx, cz) in sections:
            pts, closed = superellipse(max(rx, 1e-4), max(rz, 1e-4), n, segs, a0, a1)
            rings.append([(cx + x, y, cz + z) for (x, z) in pts])
        k = len(rings[0])
        v = [p for r in rings for p in r]
        f = []
        for j in range(len(rings) - 1):
            for i in range(k if closed else k - 1):
                i2 = (i + 1) % k
                f.append((j * k + i, j * k + i2, (j + 1) * k + i2, (j + 1) * k + i))
        if closed:
            if cap0:
                f.append(tuple(range(k)))
            if cap1:
                f.append(tuple(range((len(rings) - 1) * k, len(rings) * k))[::-1])
        return self._add(v, f, mat, M)

    def shell(self, sections, a0, a1, thick, segs=16, mat=0, M=None):
        """Thick partial superellipse shell (a ceramic cover): outer surface from the sections, inner offset by thick."""
        outer, inner = [], []
        for (y, rx, rz, n, cx, cz) in sections:
            po, _ = superellipse(max(rx, 1e-4), max(rz, 1e-4), n, segs, a0, a1)
            pi, _ = superellipse(max(rx - thick, 1e-4), max(rz - thick, 1e-4), n, segs, a0, a1)
            outer.append([(cx + x, y, cz + z) for (x, z) in po])
            inner.append([(cx + x, y, cz + z) for (x, z) in pi])
        k = segs + 1
        J = len(outer)
        v = [p for r in outer for p in r] + [p for r in inner for p in r]
        off = J * k
        f = []
        for j in range(J - 1):
            for i in range(k - 1):
                a, b = j * k + i, j * k + i + 1
                c, d = (j + 1) * k + i + 1, (j + 1) * k + i
                f.append((a, b, c, d))
                f.append((off + d, off + c, off + b, off + a))
        for j in range(J - 1):          # side edges
            for i in (0, k - 1):
                a, d = j * k + i, (j + 1) * k + i
                q = (a, d, off + d, off + a) if i == 0 else (a, off + a, off + d, d)
                f.append(q)
        for (j, flip) in ((0, False), (J - 1, True)):       # end edges
            for i in range(k - 1):
                a, b = j * k + i, j * k + i + 1
                q = (a, off + a, off + b, b)
                f.append(q[::-1] if flip else q)
        return self._add(v, f, mat, M)

    def sweep(self, pts, r, segs=10, mat=0, M=None):
        """Round tube along a polyline (hoses, cables), parallel-transported frames."""
        pts = [Vector(p) for p in pts]
        n = len(pts)
        tang = []
        for i in range(n):
            a = pts[max(i - 1, 0)]
            b = pts[min(i + 1, n - 1)]
            tang.append((b - a).normalized())
        ref = Vector((1, 0, 0)) if abs(tang[0].x) < 0.9 else Vector((0, 1, 0))
        nrm = (ref - tang[0] * ref.dot(tang[0])).normalized()
        v = []
        for i in range(n):
            t = tang[i]
            nrm = (nrm - t * nrm.dot(t))
            if nrm.length < 1e-6:
                nrm = t.orthogonal()
            nrm.normalize()
            bn = t.cross(nrm)
            for j in range(segs):
                a = TAU * j / segs
                v.append(tuple(pts[i] + (nrm * math.cos(a) + bn * math.sin(a)) * r))
        f = []
        for i in range(n - 1):
            for j in range(segs):
                j2 = (j + 1) % segs
                f.append((i * segs + j, i * segs + j2, (i + 1) * segs + j2, (i + 1) * segs + j))
        f.append(tuple(range(segs))[::-1])
        f.append(tuple(range((n - 1) * segs, n * segs)))
        return self._add(v, f, mat, M)

    def merge(self, other, M=None):
        base = len(self.v)
        M = M or I4
        for p in other.v:
            self.v.append(tuple(M @ Vector(p)))
        for fc, mm in zip(other.f, other.m):
            self.f.append(tuple(base + i for i in fc))
            self.m.append(mm)

    # ---- output -------------------------------------------------------------------------------------------------------
    def bounds(self):
        xs = [p[0] for p in self.v]
        ys = [p[1] for p in self.v]
        zs = [p[2] for p in self.v]
        return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))

    def make(self, name, smooth_deg=35.0):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        me.validate(clean_customdata=False)
        me.update()
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        if self.m and len(me.polygons) == len(self.m):
            me.polygons.foreach_set('material_index', self.m)
        me.shade_smooth()
        try:
            me.set_sharp_from_angle(angle=math.radians(smooth_deg))
        except Exception:
            pass
        return me
