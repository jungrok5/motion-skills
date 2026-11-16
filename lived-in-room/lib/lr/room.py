"""The room: its skeleton, and the register of every thing in it with HOW THAT THING IS HELD UP.

Coordinates: metres. The inside south-west corner of the floor is (0, 0, 0); X runs east (the room's width W),
Y north (its depth D), Z up (its height H). Walls are 'N' (y = D), 'S' (y = 0), 'E' (x = W), 'W' (x = 0). A position
on a wall is (u, z): u metres from the wall's LEFT end as you face it from inside the room, z above the floor.

Nothing enters the room without a support type — the audit measures each thing against the rule of its type:

    place    rests on something below it            r.put(), r.stack()
    hang     hangs from a nail, hook or peg         r.hang()
    stick    taped / glued / magnet, flat to a face r.stick()
    suspend  hangs from the ceiling on a cord       r.suspend()
    lean     foot on the floor, top against a wall  r.lean()
    fix      screwed, built in, plugged in          r.fix()
"""
import math

import numpy as np
from mathutils import Vector

from . import geo, mat, phys, util
from .openings import OpeningsMixin
from .shoot import ShootMixin

SUPPORTS = ('place', 'hang', 'stick', 'suspend', 'lean', 'fix')
WALLS = ('N', 'E', 'S', 'W')
METHODS = ('model', 'generate', 'split', 'image', 'scan')


class PlacementError(Exception):
    pass


class Item:
    """One registered thing."""
    __slots__ = ('ob', 'name', 'kind', 'support', 'on', 'zone', 'why', 'soft', 'cls', 'note')

    def __init__(self, ob, kind, support, on=(), zone='', why='', soft=0.0, cls='thing', note=''):
        self.ob, self.name, self.kind, self.support = ob, ob.name, kind, support
        self.on = [o for o in on if o]
        self.zone, self.why, self.soft, self.cls, self.note = zone, why, soft, cls, note

    def __repr__(self):
        return f'<{self.name} {self.kind}/{self.support}>'


class Room(OpeningsMixin, ShootMixin):
    def __init__(self, project, version, scene, q, quality='preview'):
        self.project, self.v, self.scene, self.q, self.quality = project, version, scene, q, quality
        self.cfg = project.cfg
        self.fps = project.fps
        self.n = project.frames(version)
        self.items = {}
        self.inventory = {e['id']: e for e in project.inventory}
        self.W = self.D = self.H = None
        self.wall_t = {}
        self.openings = {w: [] for w in WALLS}
        self._walls_built = False
        self._shapes = {}
        self._allow = set()
        self._names = {}
        self._zone = ''
        self.problems = []          # things found while building that check.py reports
        self.doorway = None
        self.h = {}                 # handles: what layout.py leaves for film.py (a lamp to light, a hand to tick)
        self._shoot_init()

    # -- time and chance --------------------------------------------------------------------------------
    def sec(self, f):
        return (f - 1) / self.fps

    def rng(self, tag=''):
        """Seeded randomness that does NOT depend on the version: night and dawn are the same room."""
        return util.rng(f'{self.project.seed}/{tag}')

    # -- register ---------------------------------------------------------------------------------------
    def zone(self, name):
        """Name the part of the room the following things belong to (the desk, the shelf wall, the floor by the
        door). The review looks at the room zone by zone."""
        self._zone = name
        return self

    def name(self, base):
        """A unique object name: 'tape', 'tape.002', …"""
        n = self._names.get(base, 0) + 1
        self._names[base] = n
        return base if n == 1 else f'{base}.{n:03d}'

    def add(self, ob, kind, support, on=(), why='', soft=0.0, cls='thing', zone=None, note=''):
        """Register a thing. kind = an id in inventory.py; support = how it is held; on = what holds it."""
        if support not in SUPPORTS:
            raise ValueError(f'{ob.name}: support "{support}" (use one of {SUPPORTS})')
        if kind not in self.inventory:
            raise KeyError(f'{ob.name}: kind "{kind}" is not in inventory.py — list the thing there first '
                           f'(name, size, how it is made, how it is held, what it is for)')
        if ob.name in self.items:
            raise ValueError(f'two things are called "{ob.name}"')
        names = [self._nm(o) for o in (on if isinstance(on, (list, tuple)) else [on])]
        it = Item(ob, kind, support, names, self._zone if zone is None else zone, why, soft, cls, note)
        self.items[ob.name] = it
        ob['lr_kind'], ob['lr_support'], ob['lr_zone'] = kind, support, it.zone
        return it

    def allow(self, a, b):
        """Declare that two things are meant to pass through each other (a plug in its socket, a nail through a
        hanger, a cord through a lampshade). Everything else that intersects is a fault."""
        self._allow.add(frozenset((self._nm(a), self._nm(b))))

    def _nm(self, x):
        if x is None:
            return None
        if isinstance(x, str):
            if x == 'ceiling' or x == 'floor' or x.startswith('wall '):
                return x
            if x in WALLS:
                return 'wall ' + x
            return x
        if isinstance(x, Item):
            return x.name
        return x.name

    def ob(self, x):
        n = self._nm(x)
        if n not in self.items:
            raise KeyError(f'no thing called "{n}" in the room')
        return self.items[n].ob

    def shape(self, x):
        ob = x if hasattr(x, 'matrix_world') else self.ob(x)
        sig = tuple(round(v, 6) for row in ob.matrix_world for v in row) + (len(ob.data.vertices),)
        hit = self._shapes.get(ob.name)
        if hit is None or hit[0] != sig:
            hit = self._shapes[ob.name] = (sig, phys.Shape(ob))
        return hit[1]

    # -- skeleton ---------------------------------------------------------------------------------------
    def shell(self, size, wall=0.2, slab=0.15, floor=None, walls=None, ceiling=None):
        """The box of the room: inside width (X) × depth (Y) × height (Z). wall = thickness, one number or
        {'N': …, 'E': …, 'S': …, 'W': …}. Builds floor and ceiling now; the walls are built by r.walls() after every
        window and door has been cut (the project driver calls it for you after skeleton.build)."""
        self.W, self.D, self.H = map(float, size)
        self.wall_t = {w: float(wall[w] if isinstance(wall, dict) else wall) for w in WALLS}
        self._mat_wall = walls or mat.wall('#e8e2d4')
        tw, te, ts, tn = self.wall_t['W'], self.wall_t['E'], self.wall_t['S'], self.wall_t['N']
        p = geo.Part('floor')
        p.box((self.W + tw + te, self.D + ts + tn, slab), at=((self.W + te - tw) / 2, (self.D + tn - ts) / 2, -slab),
              mat=floor or mat.planks(), bevel=0)
        self.add(p.build(), 'floor', 'fix', cls='skeleton', zone='skeleton')
        p = geo.Part('ceiling')
        p.box((self.W + tw + te, self.D + ts + tn, slab), at=((self.W + te - tw) / 2, (self.D + tn - ts) / 2, self.H),
              mat=ceiling or mat.wall('#f2efe8', weave=0.4, dirt=0.15), bevel=0)
        self.add(p.build(), 'ceiling', 'fix', cls='skeleton', zone='skeleton')
        return self

    def wall_len(self, w):
        return self.W if w in 'NS' else self.D

    def wall_pt(self, w, u, z=0.0, d=0.0):
        """World point at (u, z) on wall w, d metres out from the wall into the room (d < 0 = inside the wall)."""
        if w == 'N':
            return Vector((u, self.D - d, z))
        if w == 'S':
            return Vector((self.W - u, d, z))
        if w == 'E':
            return Vector((self.W - d, self.D - u, z))
        if w == 'W':
            return Vector((d, u, z))
        raise ValueError(f'wall "{w}" (use N, E, S or W)')

    def wall_rz(self, w):
        """Turn (degrees about Z) that makes a thing's front (-Y) face into the room from wall w."""
        return {'N': 0.0, 'S': 180.0, 'E': -90.0, 'W': 90.0}[w]

    def wall_normal(self, w):
        return {'N': Vector((0, -1, 0)), 'S': Vector((0, 1, 0)), 'E': Vector((-1, 0, 0)), 'W': Vector((1, 0, 0))}[w]

    def opening(self, w, u, z, width, height):
        """Cut a rectangular hole in wall w: left edge at u, bottom at z."""
        if self._walls_built:
            raise RuntimeError('cut openings before r.walls()')
        L = self.wall_len(w)
        if u < 0.02 or u + width > L - 0.02 or z < 0 or z + height > self.H - 0.02:
            raise ValueError(f'opening on wall {w} does not fit: u {u:.3f}..{u + width:.3f} of {L:.3f}, z {z:.3f}..{z + height:.3f} of {self.H:.3f}')
        for a in self.openings[w]:
            if u < a[0] + a[2] + 0.05 and a[0] < u + width + 0.05:
                raise ValueError(f'two openings on wall {w} overlap or leave less than 5 cm of wall between them')
        self.openings[w].append((u, z, width, height))

    def walls(self):
        """Build the four walls as solids round their openings."""
        if self._walls_built:
            return
        self._walls_built = True
        tw, te = self.wall_t['W'], self.wall_t['E']
        for w in WALLS:
            t = self.wall_t[w]
            L = self.wall_len(w)
            ext0, ext1 = (tw, te) if w == 'N' else (te, tw) if w == 'S' else (0.0, 0.0)     # N/S walls close the corners
            p = geo.Part('wall ' + w)
            rz = self.wall_rz(w)

            def piece(u0, u1, z0, z1):
                if u1 - u0 < 1e-4 or z1 - z0 < 1e-4:
                    return
                c = self.wall_pt(w, (u0 + u1) / 2, z0, -t / 2)
                p.box((u1 - u0, t, z1 - z0), at=tuple(c), rot=(0, 0, rz), mat=self._mat_wall, bevel=0)
            cur = -ext0
            for (u, z, ow, oh) in sorted(self.openings[w]):
                piece(cur, u, 0, self.H)
                piece(u, u + ow, 0, z)
                piece(u, u + ow, z + oh, self.H)
                cur = u + ow
            piece(cur, L + ext1, 0, self.H)
            self.add(p.build(), 'wall', 'fix', cls='skeleton', zone='skeleton')

    def skirting(self, height=0.06, thick=0.009, material=None, skip=()):
        """A board along the foot of every wall, broken at doors. skip = walls without one."""
        m = material or mat.paint('#d8d2c4', rough=0.5)
        p = geo.Part('skirting')
        for w in WALLS:
            if w in skip:
                continue
            cur = 0.0
            runs = []
            for (u, z, ow, oh) in sorted(self.openings[w]):
                if z < height:                                   # a door: break the run
                    runs.append((cur, u))
                    cur = u + ow
            runs.append((cur, self.wall_len(w)))
            for u0, u1 in runs:
                a0 = thick if u0 == 0.0 else 0.0                 # leave the corner to the neighbouring wall's board
                if u1 - u0 - a0 > 0.02:
                    c = self.wall_pt(w, (u0 + a0 + u1) / 2, 0, thick / 2)
                    p.box((u1 - u0 - a0, thick, height), at=tuple(c), rot=(0, 0, self.wall_rz(w)), mat=m, bevel=0.002)
        it = self.add(p.build(), 'skirting', 'fix', on=['floor'], cls='skeleton', zone='skeleton')
        return it

    def cornice(self, height=0.04, depth=0.02, material=None):
        """A moulding where wall meets ceiling. Leave it out where the building type has none."""
        m = material or mat.paint('#eeeae0', rough=0.5)
        p = geo.Part('cornice')
        for w in WALLS:
            a0 = depth
            c = self.wall_pt(w, (a0 + self.wall_len(w)) / 2, self.H - height, depth / 2)
            p.box((self.wall_len(w) - a0, depth, height), at=tuple(c), rot=(0, 0, self.wall_rz(w)), mat=m, bevel=0.004)
        return self.add(p.build(), 'cornice', 'fix', on=['ceiling'], cls='skeleton', zone='skeleton')

    # -- supports ---------------------------------------------------------------------------------------
    def _supports(self, on):
        lst = on if isinstance(on, (list, tuple)) else [on]
        out = []
        for o in lst:
            n = self._nm(o)
            if n not in self.items:
                raise KeyError(f'support "{n}" is not in the room yet (build and register it first)')
            out.append(self.items[n])
        return out

    def _point_on(self, sup, rel):
        """rel = (u, v) on a support's own top: u left → right as you face its front, v front → back, both 0..1."""
        ob = sup.ob
        me = ob.data
        a = np.empty(len(me.vertices) * 3)
        me.vertices.foreach_get('co', a)
        a = a.reshape(-1, 3)
        lo, hi = a.min(0), a.max(0)
        p = ob.matrix_world @ Vector((lo[0] + rel[0] * (hi[0] - lo[0]), lo[1] + rel[1] * (hi[1] - lo[1]), hi[2]))
        return p

    def put(self, ob, on, at=None, rel=None, rz=0.0, askew=0.0, level=None, kind=None, why='', soft=0.0, tilt=(0.0, 0.0), under=None, **reg):
        """PLACE: lower a thing straight down until it rests on `on` (a thing, a list of things, or 'floor').
        at = world (x, y); or rel = (u, v) on the support's top in the support's own frame, in which case rz is
        relative to the support's facing. askew = up to that many degrees of seeded turn (nobody squares a
        keyboard to the desk edge). level = index of a shelf inside the support (kit.shelf_unit).
        tilt = (rx, ry) degrees for a thing that lies on its side or back."""
        sups = self._supports(on)
        s0 = sups[0]
        base_rz = 0.0
        if rel is not None:
            p = self._point_on(s0, rel)
            x, y = p.x, p.y
            base_rz = math.degrees(s0.ob.rotation_euler.z)
        elif at is not None:
            x, y = at[0], at[1]
        else:
            raise ValueError(f'{ob.name}: give at=(x, y) or rel=(u, v)')
        if askew:
            rz = rz + self.rng('askew/' + ob.name).uniform(-askew, askew)
        geo.place(ob, (x, y, 0.0), rot=(tilt[0], tilt[1], base_rz + rz))
        sh = phys.Shape(ob)
        shapes = [self.shape(s.ob) for s in sups]
        start = None
        if level is not None:
            lv = list(s0.ob.get('lr_levels', []))
            if not lv or level >= len(lv):
                raise PlacementError(f'{ob.name}: {s0.name} has no shelf {level} (it has {len(lv)})')
            z_board = (s0.ob.matrix_world @ Vector((0, 0, lv[level]))).z
            clear = s0.ob.get('lr_clear', [0.3] * len(lv))[level]
            height = sh.hi[2] - sh.lo[2]
            if height > clear + 1e-4:
                raise PlacementError(f'{ob.name} is {height * 1000:.0f} mm tall; shelf {level} of {s0.name} has {clear * 1000:.0f} mm clear')
            start = z_board + clear - 0.002
        if under is not None:
            start = under                                             # look for the support below this height only
        z, hits = _rest(sh, shapes, start)
        if z is None:
            raise PlacementError(f'{ob.name}: nothing of {[s.name for s in sups]} is under it at ({x:.3f}, {y:.3f})')
        geo.place(ob, (x, y, z - sh.lo[2]))
        return self.add(ob, kind or ob.get('lr_kind_hint', ''), 'place', [s.name for s in sups], why, soft, **reg)

    def against(self, ob, wall, u, gap=0.01, on='floor', turn=0.0, **kw):
        """PLACE a piece of furniture on the floor with its back to a wall: its middle at u along the wall, `gap`
        metres off it (furniture is never tight to the wall: there is a skirting board, and a cable)."""
        d = max(v.co.y for v in ob.data.vertices)
        p = self.wall_pt(wall, u, 0.0, d + gap)
        return self.put(ob, on, at=(p.x, p.y), rz=self.wall_rz(wall) + turn, **kw)

    def stack(self, obs, on, at=None, rel=None, rz=0.0, askew=5.0, drift=0.006, kind=None, why='', **reg):
        """PLACE a pile: each thing on the one before, each a little off square."""
        out, below = [], on
        rnd = self.rng('stack/' + obs[0].name)
        px = py = None
        for i, ob in enumerate(obs):
            if i == 0:
                it = self.put(ob, below, at=at, rel=rel, rz=rz, askew=askew, kind=kind, why=why, **reg)
                px, py = it.ob.location.x, it.ob.location.y
            else:
                it = self.put(ob, below, at=(px + rnd.uniform(-drift, drift), py + rnd.uniform(-drift, drift)),
                              rz=math.degrees(obs[0].rotation_euler.z) + rnd.uniform(-askew, askew), kind=kind, why=why, **reg)
            out.append(it)
            below = it
        return out

    def hang(self, ob, wall=None, u=None, z=None, hook='nail', frm=None, at=None, kind=None, why='', drop=0.0, out=None, **reg):
        """HANG: from a nail / hook / peg on a wall at (u, z), or from an existing thing `frm` at world point `at` (a
        peg of a coat rail, a rod, a door handle). The thing is authored with its back on y = 0 and its hanging point
        at the origin. hook = 'nail' (flat things: the back lies on the wall), 'hook' (a screw-in cup hook, the thing
        hangs 20 mm off the wall) or 'peg' (a 60 mm peg, 45 mm off: for things with depth — headphones, a bag).
        out = override how far off the wall the hanging point is. The fixing is created and registered."""
        if frm is not None:
            holder = self._supports(frm)[0]
            geo.place(ob, tuple(Vector(at) - Vector((0, 0, drop))), rz=reg.pop('rz', math.degrees(holder.ob.rotation_euler.z)))
            it = self.add(ob, kind or '', 'hang', [holder.name], why, **reg)
            self.allow(ob, holder.ob)
            return it
        off = {'nail': 0.0, 'hook': 0.02, 'peg': 0.045}[hook] if out is None else out
        p = self.wall_pt(wall, u, z)
        nrm = self.wall_normal(wall)
        rz = self.wall_rz(wall)
        h = geo.Part(self.name('hook'))
        steel = mat.metal('#8f8f8f', rough=0.4)
        if hook == 'nail':
            h.cyl(0.0012, 0.03 + off, at=(0, 0.016, 0), rot=(90, 0, 0), mat=steel, seg=8)       # 16 mm in the wall, the rest out
            h.cyl(0.003, 0.001, at=(0, -0.014 - off, 0), rot=(90, 0, 0), mat=steel, seg=8)
        elif hook == 'hook':                                                                     # a screw-in cup hook
            h.cyl(0.0018, 0.03, at=(0, 0.018, 0), rot=(90, 0, 0), mat=steel, seg=8)
            h.tube([(0, -0.012, 0), (0, -off, -0.004), (0, -off - 0.006, 0.002), (0, -off - 0.006, 0.012)], 0.0018, mat=steel, seg=6)
        else:                                                                                    # a wooden peg, tipped up a little
            h.tube([(0, 0.02, -0.002), (0, 0, 0), (0, -off - 0.015, 0.004)], 0.006, mat=mat.wood('#a47848', '#6b4526'), seg=8)
        hob = h.build()
        geo.place(hob, tuple(p), rz=rz)
        self.add(hob, 'hook', 'fix', ['wall ' + wall], cls='fixing', note='embedded')
        self.allow(hob, 'wall ' + wall)
        geo.place(ob, tuple(p + nrm * off - Vector((0, 0, drop))), rz=rz)
        it = self.add(ob, kind or '', 'hang', [hob.name, 'wall ' + wall], why, **reg)
        self.allow(ob, hob)
        return it

    def stick(self, ob, wall=None, u=None, z=None, on=None, point=None, normal=None, roll=0.0, kind=None, why='', **reg):
        """STICK: flat against a wall at (u, z), or against a face of another thing at world `point` with outward
        `normal` (a sticky note on a monitor's edge, a sticker on a case). Authored with its back on y = 0, origin at
        the middle of the glued area. roll = degrees of tilt in the plane (posters are never dead level)."""
        if wall is not None:
            p, nrm, held = self.wall_pt(wall, u, z), self.wall_normal(wall), 'wall ' + wall
        else:
            p, nrm, held = Vector(point), Vector(normal).normalized(), self._supports(on)[0].name
        if abs(nrm.z) > 0.999:                                    # lying on a horizontal face: front up
            geo.place(ob, tuple(p), rot=(-90.0 if nrm.z > 0 else 90.0, 0, roll))
        else:
            geo.place(ob, tuple(p), rot=(0, roll, math.degrees(math.atan2(nrm.x, -nrm.y))))
        return self.add(ob, kind or '', 'stick', [held], why, **reg)

    def suspend(self, ob, x, y, drop, cord=0.0025, rose=0.045, cord_mat=None, kind=None, why='', sag=0.0, **reg):
        """SUSPEND: from the ceiling on a cord, the thing's top `drop` metres below the ceiling. Authored with its
        origin at the top centre (where the cord enters). Builds the cord and its ceiling rose."""
        m = cord_mat or mat.plastic('#1a1a1a', rough=0.5)
        c = geo.Part(self.name('cord'))
        c.tube([(0, 0, 0.004), (0, 0, -drop + 0.002)], cord, mat=m, seg=6)
        if rose:
            c.cyl(rose, 0.022, at=(0, 0, -0.022), mat=mat.plastic('#e9e6df', rough=0.5), bevel=0.004)
        cob = c.build()
        geo.place(cob, (x, y, self.H))
        self.add(cob, 'cord', 'fix', ['ceiling'], cls='fixing')
        self.allow(cob, 'ceiling')
        geo.place(ob, (x, y, self.H - drop), rz=reg.pop('rz', 0.0))
        it = self.add(ob, kind or '', 'suspend', [cob.name], why, **reg)
        self.allow(ob, cob)
        return it

    def lean(self, ob, wall, u, foot=0.12, on='floor', kind=None, why='', turn=0.0, **reg):
        """LEAN: stand a thing with its foot `foot` metres out from wall and tip it back until its top rests against
        the wall. Authored upright, origin under it, back toward +Y. turn = degrees it is twisted off square."""
        sups = self._supports(on)
        wsh = self.shape('wall ' + wall)
        nrm = self.wall_normal(wall)
        rz = self.wall_rz(wall) + turn
        lo, hi = ob.data.vertices[0].co.copy(), ob.data.vertices[0].co.copy()
        for v in ob.data.vertices:
            lo = Vector(map(min, lo, v.co))
            hi = Vector(map(max, hi, v.co))
        h = hi.z - lo.z
        ang = math.degrees(math.asin(max(0.0, min(0.95, foot / max(h, 1e-6)))))
        p = self.wall_pt(wall, u, 0.0, foot + (hi.y - lo.y))
        geo.place(ob, tuple(p), rot=(-ang, 0, rz))
        sh = phys.Shape(ob)
        reach = max(float(np.dot(sh.v, -np.array(nrm)).max()), -1e9)          # how far it gets toward the wall
        wall_at = float(np.dot(np.array(self.wall_pt(wall, u, 0.0)), -np.array(nrm)))
        p = p + nrm * (reach - wall_at)                                         # back off until it only touches
        geo.place(ob, tuple(p))
        sh = phys.Shape(ob)
        z, hits = _rest(sh, [self.shape(s.ob) for s in sups], None)
        if z is None:
            raise PlacementError(f'{ob.name}: nothing under its foot')
        geo.place(ob, (p.x, p.y, ob.location.z + z - sh.lo[2]))
        del wsh
        return self.add(ob, kind or '', 'lean', [s.name for s in sups] + ['wall ' + wall], why, **reg)

    def fix(self, ob, to, wall=None, u=None, z=None, d=0.0, loc=None, rz=None, rot=None, kind=None, why='', embed=False, **reg):
        """FIX: screwed on, built in, plugged in. On a wall: back on the wall face at (u, z) (d = how far the back
        sits off the wall; negative = let into it). Anywhere else: loc and rz / rot. embed=True when it is meant to
        go into what holds it (a socket box, a pipe sleeve, a bracket screw)."""
        held = [self._nm(t) for t in (to if isinstance(to, (list, tuple)) else [to])]
        if wall is not None:
            geo.place(ob, tuple(self.wall_pt(wall, u, z, d)), rz=self.wall_rz(wall) if rz is None else rz)
            if 'wall ' + wall not in held:
                held.append('wall ' + wall)
        else:
            geo.place(ob, loc, rz=rz, rot=rot)
        it = self.add(ob, kind or '', 'fix', held, why, **reg)
        if embed:
            for hname in held:
                self.allow(ob, hname)
        return it

    # -- lived-in ---------------------------------------------------------------------------------------
    def nudge(self, tag, amount):
        """A seeded number in ±amount: the 3 cm a drawer was left open, the 4° a frame hangs off level."""
        return self.rng('nudge/' + tag).uniform(-amount, amount)

    # -- numbers for the checks ---------------------------------------------------------------------------
    def counts(self):
        c = {}
        for it in self.items.values():
            c[it.kind] = c.get(it.kind, 0) + 1
        return c

    def model_hash(self):
        """A fingerprint of every mesh and where it is: night and dawn must give the same one."""
        import hashlib
        h = hashlib.sha1()
        for n in sorted(self.items):
            ob = self.items[n].ob
            h.update(n.encode())
            h.update(str(len(ob.data.vertices)).encode())
            h.update(np.round(np.array(ob.matrix_world), 5).tobytes())
        return h.hexdigest()[:16]


def _rest(shape, supports, start):
    if start is None:
        return phys.rest_height(shape, supports)
    pts = shape.footprint()
    best, hits = None, 0
    for p in pts:
        for s in supports:
            z = s.cast_down((p[0], p[1], start))
            if z is not None:
                hits += 1
                if best is None or z > best:
                    best = z
    return best, hits
