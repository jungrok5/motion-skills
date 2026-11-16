"""Measuring the room: where a thing rests, how far it floats, how deep it is sunk into its neighbour.

Everything works on closed shells in world space. A thing (one object) is a set of pieces — the closed shells its
Part was built from — and a point is inside the thing when it is inside any piece. That is why open meshes are
refused: an open mesh has no inside.
"""
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from . import geo

UP = Vector((0, 0, 1))
DOWN = Vector((0, 0, -1))
_RAYS = [Vector(v).normalized() for v in ((0.3137, 0.5519, 0.7727), (-0.6191, 0.2713, 0.7369), (0.2389, -0.7103, 0.6621))]   # odd directions: rays along axes graze box faces


class Piece:
    __slots__ = ('v', 'tris', 'bvh', 'lo', 'hi', 'open_edges')

    def __init__(self, v, polys):
        self.v = v
        tris = []
        for p in polys:
            for k in range(1, len(p) - 1):
                tris.append((p[0], p[k], p[k + 1]))
        self.tris = tris
        self.bvh = BVHTree.FromPolygons([tuple(x) for x in v], tris, epsilon=0.0)
        self.lo, self.hi = v.min(0), v.max(0)
        count = {}
        for p in polys:
            for a, b in zip(p, p[1:] + p[:1]):
                k = (a, b) if a < b else (b, a)
                count[k] = count.get(k, 0) + 1
        self.open_edges = sum(1 for c in count.values() if c != 2)

    def inside(self, p):
        """Is the point inside this closed shell? Ray parity, three odd directions, majority vote: one ray can
        slip through the diagonal of a quad or graze an edge and miscount."""
        if p[0] < self.lo[0] or p[0] > self.hi[0] or p[1] < self.lo[1] or p[1] > self.hi[1] or p[2] < self.lo[2] or p[2] > self.hi[2]:
            return False
        votes = 0
        for d in _RAYS:
            o = Vector(p)
            n = 0
            for _ in range(64):
                hit = self.bvh.ray_cast(o, d)
                if hit[0] is None:
                    break
                n += 1
                o = hit[0] + d * 1e-6
            votes += n % 2
        return votes >= 2

    def depth(self, p):
        """How far inside this shell the point is (0 when outside)."""
        if not self.inside(p):
            return 0.0
        return self.bvh.find_nearest(Vector(p))[3]


class Shape:
    """World-space collision shape of one object: its pieces, its box, its footprint."""

    def __init__(self, ob):
        self.ob = ob
        me = ob.data
        wv = geo.world_verts(ob)
        n = len(me.polygons)
        if 'lr_piece' in me.attributes and len(me.attributes['lr_piece'].data) == n:
            ids = np.empty(n, np.int32)
            me.attributes['lr_piece'].data.foreach_get('value', ids)
        else:
            ids = _islands(me)
        groups = {}
        for poly, pid in zip(me.polygons, ids):
            groups.setdefault(int(pid), []).append(tuple(poly.vertices))
        self.pieces = []
        for pid in sorted(groups):
            polys = groups[pid]
            used = sorted({i for p in polys for i in p})
            remap = {g: l for l, g in enumerate(used)}
            self.pieces.append(Piece(wv[used], [tuple(remap[i] for i in p) for p in polys]))
        self.v = wv
        self.lo, self.hi = wv.min(0), wv.max(0)
        self.open_edges = sum(p.open_edges for p in self.pieces)

    def footprint(self, band=0.002, step=0.03, cap=600):
        """Sample points ON the underside: the vertices within `band` of the lowest point, and a grid over every
        face that lies in that band (a board held up in the middle of its span has no vertex there). Points between
        the feet of a table are NOT part of its underside, so what stands under a table is not taken for its support."""
        z0 = self.lo[2]
        pts = [self.v[self.v[:, 2] <= z0 + band]]
        for pc in self.pieces:
            low = pc.v[:, 2] <= z0 + band
            if not low.any():
                continue
            for t in pc.tris:
                if low[t[0]] and low[t[1]] and low[t[2]]:
                    pts.append(np.asarray(_tri_samples(pc.v, t, step=step, cap=45)))
        pts = np.unique(np.round(np.vstack(pts), 5), axis=0)
        if len(pts) > cap:
            pts = pts[:: len(pts) // cap + 1]
        pts[:, 2] = z0
        return pts

    def cast_down(self, p, far=10.0):
        """Height of this shape's highest surface straight below a point (None when nothing is below)."""
        best = None
        o = Vector(p)
        for pc in self.pieces:
            if p[0] < pc.lo[0] - 1e-6 or p[0] > pc.hi[0] + 1e-6 or p[1] < pc.lo[1] - 1e-6 or p[1] > pc.hi[1] + 1e-6:
                continue
            hit = pc.bvh.ray_cast(o, DOWN, far)
            if hit[0] is not None and (best is None or hit[0].z > best):
                best = hit[0].z
        return best

    def nearest(self, p):
        """Distance from a point to this shape's surface."""
        v = Vector(p)
        return min(pc.bvh.find_nearest(v)[3] for pc in self.pieces)

    def depth(self, p):
        return max(pc.depth(p) for pc in self.pieces)


def _islands(me):
    """Piece ids for a mesh that was not built by Part (an imported one): connected components of faces."""
    parent = list(range(len(me.vertices)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for poly in me.polygons:
        vs = list(poly.vertices)
        r = find(vs[0])
        for x in vs[1:]:
            parent[find(x)] = r
    roots, ids = {}, []
    for poly in me.polygons:
        r = find(poly.vertices[0])
        ids.append(roots.setdefault(r, len(roots)))
    return np.asarray(ids, np.int32)


def overlap_box(a, b, pad=0.0):
    return bool(np.all(a.lo - pad <= b.hi) and np.all(b.lo - pad <= a.hi))


def rest_height(shape, supports, lift=0.5):
    """Where a thing comes to rest when it is lowered straight down onto `supports` (a list of Shapes): the highest
    surface under any point of its underside. Returns (z of its lowest point at rest, number of points that found
    something under them) — (None, 0) when nothing is below it at all."""
    pts = shape.footprint()
    top = max(s.hi[2] for s in supports) + lift
    best, hits = None, 0
    for p in pts:
        for s in supports:
            z = s.cast_down((p[0], p[1], top))
            if z is not None:
                hits += 1
                if best is None or z > best:
                    best = z
    return best, hits


def supports_of(shape, others, reach=None, declared=()):
    """For every underside point: how far it is above the nearest surface below (negative = sunk in) and what that
    surface belongs to. Only things that reach BELOW the underside can hold it up — what stands on a shelf inside a
    cabinet, or on top of the thing itself, is not its support (unless it is named in `declared`: a sheet of paper under another sheet). Returns (points, gaps, names)."""
    pts = shape.footprint()
    z0 = shape.lo[2]
    reach = min(0.03, 0.5 * (shape.hi[2] - shape.lo[2])) if reach is None else reach
    gaps, who = [], []
    for p in pts:
        best, name = None, None
        for o in others:
            if (o.lo[2] > z0 - 0.0008 and o.ob.name not in declared) or p[0] < o.lo[0] - 1e-6 or p[0] > o.hi[0] + 1e-6 or p[1] < o.lo[1] - 1e-6 or p[1] > o.hi[1] + 1e-6:
                continue
            z = o.cast_down((p[0], p[1], z0 + reach))
            if z is not None and (best is None or z > best):
                best, name = z, o.ob.name
        gaps.append(float('inf') if best is None else z0 - best)
        who.append(name)
    return pts, np.asarray(gaps), who


def gap_below(shape, others):
    """(gap, share of the underside that is held, what holds it): gap > 0 floats, gap < 0 is sunk in, ≈ 0 rests."""
    pts, g, who = supports_of(shape, others)
    finite = g[np.isfinite(g)]
    if not len(finite):
        return float('inf'), 0.0, None
    gap = float(finite.min())
    held = g <= gap + 0.0015
    names = [w for w, h in zip(who, held) if h and w]
    return gap, float(held.mean()), max(set(names), key=names.count) if names else None


def _tri_samples(v, tri, step=0.008, cap=45):
    a, b, c = v[tri[0]], v[tri[1]], v[tri[2]]
    n = int(min(8, max(1, np.ceil(max(np.linalg.norm(b - a), np.linalg.norm(c - a), np.linalg.norm(c - b)) / step))))
    out = []
    for i in range(n + 1):
        for j in range(n + 1 - i):
            u, w = i / n, j / n
            out.append(a * (1 - u - w) + b * u + c * w)
            if len(out) >= cap:
                return out
    return out


def penetration(sa, sb):
    """How deep two things are sunk into each other (0 when they only touch or are apart): the greatest distance
    from a point of one that lies INSIDE the other to that other's surface. Also catches one thing wholly inside
    another solid."""
    if not overlap_box(sa, sb):
        return 0.0
    worst = 0.0
    for pa in sa.pieces:
        for pb in sb.pieces:
            if not (np.all(pa.lo <= pb.hi) and np.all(pb.lo <= pa.hi)):
                continue
            pairs = pa.bvh.overlap(pb.bvh)
            if pairs:
                ta = {i for i, _ in pairs}
                tb = {j for _, j in pairs}
                for tris, src, dst in ((ta, pa, pb), (tb, pb, pa)):
                    for t in list(tris)[:400]:
                        for p in _tri_samples(src.v, src.tris[t]):
                            if p[0] < dst.lo[0] or p[0] > dst.hi[0] or p[1] < dst.lo[1] or p[1] > dst.hi[1] or p[2] < dst.lo[2] or p[2] > dst.hi[2]:
                                continue
                            d = dst.depth(p)
                            if d > worst:
                                worst = d
            else:                                              # no surface crossing: is one inside the other?
                for src, dst in ((pa, pb), (pb, pa)):
                    if np.all(src.lo >= dst.lo) and np.all(src.hi <= dst.hi):
                        d = dst.depth(src.v[0])
                        if d > worst:
                            worst = d
    return float(worst)


def distance(sa, sb, cap=400):
    """Closest approach of two things (vertex-to-surface both ways; 0 when they touch or cross)."""
    if penetration_quick(sa, sb):
        return 0.0
    best = float('inf')
    for src, dst in ((sa, sb), (sb, sa)):
        v = src.v if len(src.v) <= cap else src.v[:: max(1, len(src.v) // cap)]
        for p in v:
            d = dst.nearest(p)
            if d < best:
                best = d
    return float(best)


def penetration_quick(sa, sb):
    if not overlap_box(sa, sb):
        return False
    for pa in sa.pieces:
        for pb in sb.pieces:
            if np.all(pa.lo <= pb.hi) and np.all(pb.lo <= pa.hi) and pa.bvh.overlap(pb.bvh):
                return True
    return False
