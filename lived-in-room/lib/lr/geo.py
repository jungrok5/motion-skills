"""Modelling for rooms: every thing in the room is built from numbers, at real size, in metres.

One thing = one `Part` = one Blender object. A Part is authored in the thing's own frame:

    origin  the centre of its footprint; z = 0 is the surface it will stand on
            (a thing that hangs or sticks is authored with its BACK on the plane y = 0 and its hanging point at the origin)
    front   -Y  (a thing with rot 0 faces south; the room turns it to face where it should)
    up      +Z

Every piece you add is a CLOSED shell (boxes are chamfered boxes, sheets have a thickness, lathes are capped). The
physical audit depends on that: an open mesh has no inside, so nothing can be measured against it.
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

TAU = math.tau
FACES = ('front', 'back', 'left', 'right', 'top', 'bottom')


def xf(at=(0, 0, 0), rot=(0, 0, 0)):
    """Matrix for a piece: rot = (rx, ry, rz) in DEGREES about the piece's own `at` point."""
    r = Euler(tuple(math.radians(a) for a in rot), 'XYZ').to_matrix().to_4x4()
    return Matrix.Translation(Vector(at)) @ r


# ---- 2D outlines (counter-clockwise lists of (x, y)) ---------------------------------------------
def circle(r, n=24, cx=0.0, cy=0.0, phase=0.0):
    return [(cx + r * math.cos(phase + TAU * i / n), cy + r * math.sin(phase + TAU * i / n)) for i in range(n)]


def rrect(w, h, r, n=4, cx=0.0, cy=0.0):
    """Rounded rectangle w × h, corner radius r."""
    r = min(r, w / 2 - 1e-6, h / 2 - 1e-6)
    out = []
    for qx, qy, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        ox, oy = cx + qx * (w / 2 - r), cy + qy * (h / 2 - r)
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            out.append((ox + r * math.cos(a), oy + r * math.sin(a)))
    return out


def rprofile(r0, r1, z0, z1, b=0.0):
    """Closed lathe profile of a (chamfered) rectangle in the (r, z) plane: a ring, a disc (r0 = 0), a rim."""
    b = min(b, (r1 - r0) / 2 - 1e-6, (z1 - z0) / 2 - 1e-6) if b else 0.0
    if r0 <= 1e-9:
        return [(0, z0), (r1 - b, z0), (r1, z0 + b), (r1, z1 - b), (r1 - b, z1), (0, z1)] if b else [(0, z0), (r1, z0), (r1, z1), (0, z1)]
    p = [(r0, z0), (r1 - b, z0), (r1, z0 + b), (r1, z1 - b), (r1 - b, z1), (r0, z1)] if b else [(r0, z0), (r1, z0), (r1, z1), (r0, z1)]
    return p + [p[0]]


# ---- the builder ----------------------------------------------------------------------------------
class Part:
    def __init__(self, name):
        self.name = name
        self.v, self.f, self.fm, self.fuv, self.fs, self.fp = [], [], [], [], [], []
        self.mats = []
        self.pieces = 0

    # -- plumbing ----------------------------------------------------------------------------------
    def _slot(self, mat):
        if mat is None:
            raise ValueError(f'{self.name}: a piece has no material (pass mat=…)')
        for i, m in enumerate(self.mats):
            if m is mat:
                return i
        self.mats.append(mat)
        return len(self.mats) - 1

    def add(self, verts, faces, mat, at=(0, 0, 0), rot=(0, 0, 0), smooth=False, uvs=None, mats=None, m=None):
        """A closed shell from vertex and face lists. uvs: {face index: [(u, v) per corner]}.
        mats: {face index: material} for faces that differ from `mat` (a label, a screen)."""
        M = m if m is not None else xf(at, rot)
        base = len(self.v)
        for p in verts:
            self.v.append(tuple(M @ Vector(p)))
        slot = self._slot(mat)
        for i, f in enumerate(faces):
            self.f.append(tuple(base + j for j in f))
            self.fm.append(self._slot(mats[i]) if mats and i in mats else slot)
            self.fuv.append(uvs.get(i) if uvs else None)
            self.fs.append(smooth)
            self.fp.append(self.pieces)
        self.pieces += 1
        return self

    # -- primitives --------------------------------------------------------------------------------
    def box(self, size, at=(0, 0, 0), rot=(0, 0, 0), mat=None, bevel=0.0015, faces=None, center=False):
        """A chamfered box sx × sy × sz standing on `at` (center=True: centred on it).
        faces = {'front': image_material | (image_material, (u0, v0, u1, v1)), …} puts a picture on a face; the
        picture is upright as seen from outside that face ('top' reads with the front edge at the bottom)."""
        sx, sy, sz = size
        b = max(0.0, min(bevel, 0.3 * min(sx, sy, sz)))
        hx, hy, hz = sx / 2, sy / 2, sz / 2
        V, idx = [], {}
        for a in (-1, 1):
            for c in (-1, 1):
                for e in (-1, 1):
                    idx[(a, c, e)] = len(V)
                    if b > 0:
                        V += [(a * hx, c * (hy - b), e * (hz - b)), (a * (hx - b), c * hy, e * (hz - b)), (a * (hx - b), c * (hy - b), e * hz)]
                    else:
                        V += [(a * hx, c * hy, e * hz)]
        k = (lambda s, axis: idx[s] + axis) if b > 0 else (lambda s, axis: idx[s])
        F, names = [], {}
        quads = {'right': (0, [(1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1)]),
                 'left': (0, [(-1, 1, -1), (-1, -1, -1), (-1, -1, 1), (-1, 1, 1)]),
                 'back': (1, [(1, 1, -1), (-1, 1, -1), (-1, 1, 1), (1, 1, 1)]),
                 'front': (1, [(-1, -1, -1), (1, -1, -1), (1, -1, 1), (-1, -1, 1)]),
                 'top': (2, [(-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]),
                 'bottom': (2, [(-1, 1, -1), (1, 1, -1), (1, -1, -1), (-1, -1, -1)])}
        for nm, (axis, corners) in quads.items():
            names[nm] = len(F)
            F.append([k(s, axis) for s in corners])
        if b > 0:
            for a in (-1, 1):                       # edge chamfers
                for c in (-1, 1):
                    F.append([k((a, c, -1), 0), k((a, c, 1), 0), k((a, c, 1), 1), k((a, c, -1), 1)])       # X|Y edge, along Z
                    F.append([k((a, -1, c), 0), k((a, 1, c), 0), k((a, 1, c), 2), k((a, -1, c), 2)])       # X|Z edge, along Y
                    F.append([k((-1, a, c), 1), k((1, a, c), 1), k((1, a, c), 2), k((-1, a, c), 2)])       # Y|Z edge, along X
            for s in idx:                           # corner triangles
                F.append([k(s, 0), k(s, 1), k(s, 2)])
        uvs, fmats = {}, {}
        ax = {'front': (0, 2, 1, 1), 'back': (0, 2, -1, 1), 'right': (1, 2, 1, 1), 'left': (1, 2, -1, 1),
              'top': (0, 1, 1, 1), 'bottom': (0, 1, 1, -1)}
        for nm, spec in (faces or {}).items():
            if nm not in names:
                raise ValueError(f'{self.name}: box face "{nm}" (use one of {FACES})')
            m_img, rect = spec if isinstance(spec, tuple) else (spec, (0, 0, 1, 1))
            fi = names[nm]
            iu, iv, su, sv = ax[nm]
            pts = [V[j] for j in F[fi]]
            us = [p[iu] * su for p in pts]
            vs = [p[iv] * sv for p in pts]
            u0, u1, v0, v1 = min(us), max(us), min(vs), max(vs)
            uvs[fi] = [(rect[0] + (u - u0) / max(u1 - u0, 1e-9) * (rect[2] - rect[0]),
                        rect[1] + (v - v0) / max(v1 - v0, 1e-9) * (rect[3] - rect[1])) for u, v in zip(us, vs)]
            fmats[fi] = m_img
        M = xf(at, rot) @ Matrix.Translation((0, 0, 0 if center else hz))
        return self.add(V, F, mat, uvs=uvs, mats=fmats, m=M)

    def sheet(self, w, h, at=(0, 0, 0), rot=(0, 0, 0), mat=None, image=None, t=0.0006, flat=False, edge=None):
        """A thin card. Upright (default): w × h in the XZ plane, back on y = 0, picture on the front (-Y), `at` is the
        middle of its bottom edge. flat=True: lying down, w × h in the XY plane, picture up, `at` its centre."""
        body = edge or mat or image
        if flat:
            return self.box((w, h, t), at, rot, body, bevel=0, faces={'top': image} if image else None)
        M = xf(at, rot) @ Matrix.Translation((0, -t / 2, 0))
        p = Part('_')
        p.box((w, t, h), mat=body, bevel=0, faces={'front': image} if image else None)
        fm = {i: p.mats[s] for i, s in enumerate(p.fm) if p.mats[s] is not body}
        return self.add(p.v, p.f, body, uvs={i: u for i, u in enumerate(p.fuv) if u}, mats=fm, m=M)

    def lathe(self, profile, at=(0, 0, 0), rot=(0, 0, 0), mat=None, seg=20, smooth=True, label=None, label_z=None):
        """Turn a profile [(r, z), …] round the Z axis. An open profile is capped at both ends (a solid of
        revolution); end it where it started for a hollow thing (a cup: outside up, over the rim, inside down).
        label = image material wrapped once round the part between label_z = (z0, z1) (default: the whole height);
        the picture's left edge is at the back so its middle faces the front."""
        prof = [(float(r), float(z)) for r, z in profile]
        closed = len(prof) > 2 and abs(prof[0][0] - prof[-1][0]) < 1e-9 and abs(prof[0][1] - prof[-1][1]) < 1e-9
        if closed:
            prof = prof[:-1]
        V, F, uvs, fmats = [], [], {}, {}
        ring = []                                             # per profile point: list of vertex indices (1 if on axis)
        for r, z in prof:
            if r <= 1e-9:
                ring.append([len(V)])
                V.append((0.0, 0.0, z))
            else:
                ring.append(list(range(len(V), len(V) + seg)))
                # start at the back (+Y) and go counter-clockwise seen from above: u = 0.5 lands on the front
                V += [(r * math.sin(-TAU * i / seg), r * math.cos(TAU * i / seg), z) for i in range(seg)]
        zs = [p[1] for p in prof]
        z0, z1 = label_z if label_z else (min(zs), max(zs))
        n = len(prof)
        for j in range(n if closed else n - 1):
            a, b2 = ring[j], ring[(j + 1) % n]
            za, zb = prof[j][1], prof[(j + 1) % n][1]
            lab = label is not None and min(za, zb) >= z0 - 1e-9 and max(za, zb) <= z1 + 1e-9 and len(a) > 1 and len(b2) > 1
            for i in range(seg):
                i2 = (i + 1) % seg
                if len(a) == 1 and len(b2) == 1:
                    continue
                if len(a) == 1:
                    F.append([a[0], b2[i], b2[i2]])
                elif len(b2) == 1:
                    F.append([a[i], a[i2], b2[0]])
                else:
                    F.append([a[i], a[i2], b2[i2], b2[i]])
                    if lab:
                        u0, u1 = i / seg, (i + 1) / seg
                        va, vb = (za - z0) / max(z1 - z0, 1e-9), (zb - z0) / max(z1 - z0, 1e-9)
                        uvs[len(F) - 1] = [(u0, va), (u1, va), (u1, vb), (u0, vb)]
                        fmats[len(F) - 1] = label
        if not closed:
            for end in (0, n - 1):
                if len(ring[end]) > 1:
                    F.append(list(ring[end]))
        return self.add(V, F, mat, at, rot, smooth=smooth, uvs=uvs, mats=fmats)

    def cyl(self, r, h, at=(0, 0, 0), rot=(0, 0, 0), mat=None, seg=20, bevel=0.0, r2=None, smooth=True):
        """A solid cylinder (or cone: r2 = top radius) standing on `at`."""
        r2 = r if r2 is None else r2
        b = max(0.0, min(bevel, 0.4 * min(r, r2, h)))
        prof = [(0, 0), (r - b, 0), (r, b), (r2, h - b), (r2 - b, h), (0, h)] if b else [(0, 0), (r, 0), (r2, h), (0, h)]
        return self.lathe(prof, at, rot, mat, seg, smooth)

    def pipe(self, r_out, r_in, h, at=(0, 0, 0), rot=(0, 0, 0), mat=None, seg=20):
        """A hollow cylinder (a ring, a sleeve, a lampshade wall)."""
        return self.lathe(rprofile(r_in, r_out, 0, h), at, rot, mat, seg)

    def sphere(self, r, at=(0, 0, 0), mat=None, seg=16, rings=8, squash=(1, 1, 1), rot=(0, 0, 0)):
        """A ball centred r above `at` (it stands on it). squash scales it per axis."""
        prof = [(r * math.sin(math.pi * j / rings), r - r * math.cos(math.pi * j / rings)) for j in range(rings + 1)]
        prof[0], prof[-1] = (0.0, 0.0), (0.0, 2 * r)
        p = Part('_')
        p.lathe(prof, mat=mat, seg=seg)
        V = [(x * squash[0], y * squash[1], z * squash[2]) for x, y, z in p.v]
        return self.add(V, p.f, mat, at, rot, smooth=True)

    def prism(self, outline, h, at=(0, 0, 0), rot=(0, 0, 0), mat=None, smooth=False, top=None):
        """Extrude a 2D outline [(x, y), …] upward by h. top = image material for the upper cap (UV = outline's box)."""
        n = len(outline)
        V = [(x, y, 0.0) for x, y in outline] + [(x, y, h) for x, y in outline]
        F = [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
        F.append(list(range(n - 1, -1, -1)))
        F.append(list(range(n, 2 * n)))
        uvs, fm = {}, {}
        if top is not None:
            xs, ys = [p[0] for p in outline], [p[1] for p in outline]
            uvs[len(F) - 1] = [((x - min(xs)) / (max(xs) - min(xs)), (y - min(ys)) / (max(ys) - min(ys))) for x, y in outline]
            fm[len(F) - 1] = top
        return self.add(V, F, mat, at, rot, smooth=smooth, uvs=uvs, mats=fm)

    def tube(self, path, r, mat=None, seg=8, at=(0, 0, 0), rot=(0, 0, 0)):
        """Sweep a round section along 3D points: a cable, a cord, a rail, a pipe, a wire hanger. Capped."""
        pts = [Vector(p) for p in path]
        if len(pts) < 2:
            raise ValueError(f'{self.name}: a tube needs two points')
        V, F = [], []
        t_prev, nrm = None, None
        for i, p in enumerate(pts):
            t = ((pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)])).normalized()
            if nrm is None:
                ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
                nrm = t.cross(ref).normalized()
            else:
                ax = t_prev.cross(t)
                if ax.length > 1e-9:
                    nrm = (Matrix.Rotation(t_prev.angle(t), 3, ax.normalized()) @ nrm).normalized()
            bi = t.cross(nrm).normalized()
            rr = r[i] if isinstance(r, (list, tuple)) else r
            V += [tuple(p + (nrm * math.cos(TAU * k / seg) + bi * math.sin(TAU * k / seg)) * rr) for k in range(seg)]
            t_prev = t
        for i in range(len(pts) - 1):
            for k in range(seg):
                a, b = i * seg + k, i * seg + (k + 1) % seg
                F.append([a, b, b + seg, a + seg])
        F.append(list(range(seg - 1, -1, -1)))
        F.append(list(range((len(pts) - 1) * seg, len(pts) * seg)))
        return self.add(V, F, mat, at, rot, smooth=True)

    def skin(self, rings, mat=None, at=(0, 0, 0), rot=(0, 0, 0), smooth=True, loop=False):
        """Join a row of closed rings (lists of 3D points, all the same length) into one shell, capped at both ends
        (loop=True joins the last ring back to the first instead). The general tool for cloth: each ring is the
        cross-section of a towel, a curtain, a strap at one place along its width."""
        m = len(rings[0])
        V = [tuple(p) for ring in rings for p in ring]
        F = []
        n = len(rings)
        for i in range(n if loop else n - 1):
            a0, b0 = i * m, ((i + 1) % n) * m
            for k in range(m):
                k2 = (k + 1) % m
                F.append([a0 + k, a0 + k2, b0 + k2, b0 + k])
        if not loop:
            F.append(list(range(m - 1, -1, -1)))
            F.append(list(range((n - 1) * m, n * m)))
        return self.add(V, F, mat, at, rot, smooth=smooth)

    def slab(self, w, d, top, mat=None, nx=12, ny=12, at=(0, 0, 0), rot=(0, 0, 0), image=None):
        """A soft slab w × d whose upper surface is top(x, y) → height (a cushion, a folded blanket, a mattress with a
        dent, a pile of laundry). Flat underneath, closed. x, y run -w/2..w/2, -d/2..d/2. image = material for the top
        (UV 0..1 across w × d)."""
        V, F, uvs, fm = [], [], {}, {}
        for j in range(ny + 1):
            for i in range(nx + 1):
                x, y = -w / 2 + w * i / nx, -d / 2 + d * j / ny
                V.append((x, y, max(1e-4, float(top(x, y)))))
        nt = len(V)
        for j in range(ny + 1):
            for i in range(nx + 1):
                V.append((-w / 2 + w * i / nx, -d / 2 + d * j / ny, 0.0))
        g = lambda i, j: j * (nx + 1) + i
        for j in range(ny):
            for i in range(nx):
                F.append([g(i, j), g(i + 1, j), g(i + 1, j + 1), g(i, j + 1)])
                if image is not None:
                    uvs[len(F) - 1] = [(i / nx, j / ny), ((i + 1) / nx, j / ny), ((i + 1) / nx, (j + 1) / ny), (i / nx, (j + 1) / ny)]
                    fm[len(F) - 1] = image
                F.append([nt + g(i, j + 1), nt + g(i + 1, j + 1), nt + g(i + 1, j), nt + g(i, j)])
        for i in range(nx):
            F.append([g(i + 1, 0), g(i, 0), nt + g(i, 0), nt + g(i + 1, 0)])
            F.append([g(i, ny), g(i + 1, ny), nt + g(i + 1, ny), nt + g(i, ny)])
        for j in range(ny):
            F.append([g(0, j), g(0, j + 1), nt + g(0, j + 1), nt + g(0, j)])
            F.append([g(nx, j + 1), g(nx, j), nt + g(nx, j), nt + g(nx, j + 1)])
        return self.add(V, F, mat, at, rot, smooth=True, uvs=uvs, mats=fm)

    def drape(self, width, front, back, over_r=0.008, mat=None, t=0.004, folds=3, sway=0.012, seed=0, nx=14, at=(0, 0, 0), rot=(0, 0, 0)):
        """Cloth hanging over a rail (a towel on a rack, a shirt over a chair back): `front` metres hang down the
        front (-Y), `back` down the back, the rail of radius over_r runs along X through `at`. Gravity makes it hang
        straight; `folds` vertical ripples grow toward the free edges."""
        import random
        rnd = random.Random(f'{self.name}/{seed}')
        ph = [rnd.uniform(0, TAU) for _ in range(4)]

        def section(x):
            u = x / width + 0.5
            R = over_r + t / 2
            mid = []
            for k in range(7):                                   # down the back, bottom → top
                s = 1 - k / 6
                wob = sway * s * math.sin(TAU * folds * u + ph[0]) * (0.6 + 0.4 * math.sin(3.1 * u + ph[1]))
                mid.append(Vector((x, R + wob, -back * s)))
            for k in range(1, 6):                                # over the rail
                a = math.pi * k / 6
                mid.append(Vector((x, R * math.cos(a), R * math.sin(a))))
            for k in range(7):                                   # down the front, top → bottom
                s = k / 6
                wob = sway * s * math.sin(TAU * folds * u + ph[2]) * (0.6 + 0.4 * math.sin(2.3 * u + ph[3]))
                mid.append(Vector((x, -R + wob, -front * s)))
            out_side, in_side = [], []
            for i, p in enumerate(mid):
                d = (mid[min(i + 1, len(mid) - 1)] - mid[max(i - 1, 0)]).normalized()
                nrm = Vector((0, -d.z, d.y))                    # points away from the rail on both hanging runs
                out_side.append(p + nrm * (t / 2))
                in_side.append(p - nrm * (t / 2))
            return out_side + in_side[::-1]
        rings = [section(-width / 2 + width * i / nx) for i in range(nx + 1)]
        return self.skin(rings, mat, at, rot)

    # -- result --------------------------------------------------------------------------------------
    def size(self):
        a = np.asarray(self.v, np.float64)
        return tuple(a.max(0) - a.min(0)) if len(a) else (0.0, 0.0, 0.0)

    def bounds(self):
        a = np.asarray(self.v, np.float64)
        return a.min(0), a.max(0)

    def shift(self, d):
        """Move every piece (to put the origin where the thing hangs or stands)."""
        self.v = [(x + d[0], y + d[1], z + d[2]) for x, y, z in self.v]
        return self

    def merge(self, other, at=(0, 0, 0), rot=(0, 0, 0)):
        """Take in every piece of another Part, moved by at / rot: build a sub-assembly on its own (a lamp head, a
        fan cage), tilt it as one, then add it."""
        M = xf(at, rot)
        base = len(self.v)
        self.v += [tuple(M @ Vector(p)) for p in other.v]
        slot = [self._slot(m) for m in other.mats]
        for f, fm, fuv, fs, fp in zip(other.f, other.fm, other.fuv, other.fs, other.fp):
            self.f.append(tuple(base + j for j in f))
            self.fm.append(slot[fm])
            self.fuv.append(fuv)
            self.fs.append(fs)
            self.fp.append(self.pieces + fp)
        self.pieces += other.pieces
        return self

    def turn(self, rot):
        """Rotate everything built so far about the origin (degrees, XYZ): lay an upright thing on its side."""
        M = xf((0, 0, 0), rot)
        self.v = [tuple(M @ Vector(p)) for p in self.v]
        return self

    def ground(self, center=True):
        """Put the origin under the thing: lowest point on z = 0, footprint centred on x / y."""
        lo, hi = self.bounds()
        return self.shift((-(lo[0] + hi[0]) / 2 if center else 0, -(lo[1] + hi[1]) / 2 if center else 0, -lo[2]))

    def build(self, angle=40.0):
        if not self.f:
            raise ValueError(f'{self.name}: nothing was added')
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.v, [], self.f)
        for m in self.mats:
            me.materials.append(m)
        me.polygons.foreach_set('material_index', self.fm)
        if any(u for u in self.fuv):
            layer = me.uv_layers.new(name='UVMap')
            flat = []
            for f, u in zip(self.f, self.fuv):
                flat += [c for uv in (u if u else [(0.0, 0.0)] * len(f)) for c in uv]
            layer.data.foreach_set('uv', flat)
        at = me.attributes.new('lr_piece', 'INT', 'FACE')
        at.data.foreach_set('value', self.fp)
        me.polygons.foreach_set('use_smooth', self.fs)
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        if any(self.fs):
            me.set_sharp_from_angle(angle=math.radians(angle))
        me.update()
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


# ---- object helpers ---------------------------------------------------------------------------
def world_verts(ob):
    """(N, 3) float64 world positions of an object's vertices."""
    me = ob.data
    a = np.empty(len(me.vertices) * 3, np.float64)
    me.vertices.foreach_get('co', a)
    a = a.reshape(-1, 3)
    M = np.array(ob.matrix_world, np.float64)
    return a @ M[:3, :3].T + M[:3, 3]


def bounds(ob):
    a = world_verts(ob)
    return a.min(0), a.max(0)


def place(ob, loc=None, rz=None, rot=None):
    """Set a transform and make it take effect now (matrix_world is otherwise stale until the next depsgraph pass)."""
    if loc is not None:
        ob.location = loc
    if rot is not None:
        ob.rotation_euler = tuple(math.radians(a) for a in rot)
    elif rz is not None:
        ob.rotation_euler = (0, 0, math.radians(rz))
    ob.matrix_world = ob.matrix_basis.copy() if ob.parent is None else ob.parent.matrix_world @ ob.matrix_parent_inverse @ ob.matrix_basis
    return ob


def remove(ob):
    me = ob.data
    bpy.data.objects.remove(ob, do_unlink=True)
    if me is not None and me.users == 0 and isinstance(me, bpy.types.Mesh):
        bpy.data.meshes.remove(me)


def import_glb(path, name=None):
    """Bring in a mesh you did not model in code (a scan, a generated mesh, a downloaded model) as ONE object with
    its origin under it. It still has to pass the audit: run close_mesh() on it and read what it reports."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    if not meshes:
        raise ValueError(f'{path}: no mesh inside')
    for o in meshes:                                              # bake the file's own transforms
        o.data = o.data.copy()
        o.data.transform(o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
        o.parent = None
    with bpy.context.temp_override(active_object=meshes[0], selected_editable_objects=meshes, selected_objects=meshes):
        if len(meshes) > 1:
            bpy.ops.object.join()
    ob = meshes[0]
    for o in new:
        if o is not ob and o.name in bpy.data.objects:
            remove(o)
    lo, hi = bounds(ob)
    ob.data.transform(Matrix.Translation((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])))
    ob.name = name or ob.name
    return ob


def close_mesh(ob, merge=1e-5, max_hole_edges=64):
    """Make an imported mesh watertight enough to measure: weld doubles, fill holes, fix normals.
    Returns dict(open_edges_before, open_edges_after, filled). A mesh that is still open after this cannot be
    audited for intersections; remodel it or rebuild it in code."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=merge)
    before = sum(1 for e in bm.edges if not e.is_manifold)
    edges = [e for e in bm.edges if e.is_boundary]
    filled = 0
    if edges:
        res = bmesh.ops.holes_fill(bm, edges=edges, sides=max_hole_edges)
        filled = len(res.get('faces', []))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    after = sum(1 for e in bm.edges if not e.is_manifold)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return dict(open_edges_before=before, open_edges_after=after, filled=filled)
