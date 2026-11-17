"""Parts: the character is built one part at a time, in the order the spec lists them (that order IS the layering:
dress -> sash and bow -> boots -> hat). Every builder registers its mesh pieces, how they bind to bones, and any
cloth chains (extra bone rows inside skirts, ribbons, scarves, tails) that make the cloth swing.

Add a part for a new character in the project, not here:  project/parts.py

    from pch.parts import part, P
    @part('norigae')
    def norigae(ctx, p):
        ...  ctx.add(obj, bones=[...]) ; ctx.chain('tassel', 'hips', points, stiff=.2)

Builders get (ctx, p): ctx.body (proportions + joints), ctx.add, ctx.chain, ctx.mat, ctx.shell(); p = the spec dict.
"""
import math
from mathutils import Vector, Matrix, Euler
from . import geom
from .materials import material
from . import paint as PT

TAU = math.pi * 2
PARTS = {}


def part(name):
    def deco(fn):
        PARTS[name] = fn
        return fn
    return deco


def P(p, key, default):
    v = p.get(key, default)
    return type(default)(v) if isinstance(default, (int, float)) and not isinstance(default, bool) else v


class Ctx:
    def __init__(self, body, spec):
        self.body = body
        self.spec = spec
        self.pieces = []       # dicts: obj, bones / rigid, part
        self.chains = []       # dicts: name, parent, points, params, bones
        self.layer = 0
        self.part_name = ''
        self.j = body.joints()
        self.surfaces = []     # outer cloth surfaces (skirts) other parts must stay outside of

    def outer_r(self, z, th):
        """Radius of the outermost registered surface at height z in direction th (0 = +X, pi/2 = back), or 0."""
        best = 0.0
        for sf in self.surfaces:
            pr = sf['prof']
            if not (pr[-1][1] <= z <= pr[0][1]):
                continue
            for (r0, z0), (r1, z1) in zip(pr, pr[1:]):
                if z1 <= z <= z0:
                    f = (z0 - z) / max(z0 - z1, 1e-9)
                    r = r0 + (r1 - r0) * f
                    best = max(best, r * math.hypot(math.cos(th), sf['sy'] * math.sin(th)))
                    break
        return best

    def mat(self, spec, name=None):
        return material(spec, name)

    def painted(self, mat, ob):
        """Every cloth / skin / straw material is hand-painted unless it says "paint": false (or glows / is glossy,
        like eyes). Style-wide stroke defaults come from spec.style.paint; a material's own "paint" overrides them."""
        if isinstance(mat, str):
            mat = {'color': mat}
        if not isinstance(mat, dict):
            return mat
        own = mat.get('paint', None)
        if own is False or mat.get('emit') or float(mat.get('coat', 0)) >= 0.5:
            return {k: v for k, v in mat.items() if k != 'paint'}
        st = self.spec.get('style', {})
        if own is None and not st.get('paintAll', True):
            return mat
        pnt = dict(st.get('paint', {}))
        if isinstance(own, dict):
            pnt.update(own)
        su, sv = PT.uv_scale(ob.data)
        if su * sv < 4e-4:             # tiny pieces (buttons, glints): plain colour
            return {k: v for k, v in mat.items() if k != 'paint'}
        m = dict(mat)
        m.pop('pattern', None)
        m['paint'] = pnt
        m['_uvs'] = (round(su, 2), round(sv, 2))
        return m

    def add(self, ob, mat=None, bones=None, rigid=None, name=None):
        if name:
            ob.name = name
        if mat is not None:
            ob.data.materials.clear()
            ob.data.materials.append(material(self.painted(mat, ob)) if not hasattr(mat, 'node_tree') else mat)
        self.pieces.append({'obj': ob, 'bones': bones, 'rigid': rigid, 'part': self.part_name})
        return ob

    def shell(self, extra=0.0):
        """How far outside the body this layer sits (later parts in the list sit further out)."""
        k = 1 - 0.35 * self.body.adult
        return (0.004 * self.body.H + 0.0045 * self.body.H * self.layer) * k + extra

    def chain(self, name, parent, points, **params):
        """Register a cloth chain: bones name.0 .. name.(n-2) from points[0] to points[-1], parented under 'parent'.
        params: stiff (0..1 pull back to the animated rest shape), damp, gravity, drag, cone (deg), radius,
        collide (list of body capsules: 'legs', 'torso', 'arms')."""
        pts = [Vector(p) for p in points]
        bones = [f'{name}.{i}' for i in range(len(pts) - 1)]
        self.chains.append({'name': name, 'parent': parent, 'points': pts, 'bones': bones, 'params': params,
                            'part': self.part_name})
        return bones


# ------------------------------------------------------------------------------------------------ body + head
@part('body')
def body_part(ctx, p):
    b, j, H = ctx.body, ctx.j, ctx.body.H
    skin = {'color': b.skin, 'rough': 0.5, 'sss': 0.15}
    legs = p.get('legs', skin)
    # torso (mostly covered, but it fills gaps)
    keys = b.torso_keys
    prof = [(0.0001, keys[-1][0] + 0.004 * H)] + [(k[1], k[0]) for k in reversed(keys)] + [(0.0001, keys[0][0] - 0.02 * H)]
    torso = geom.lathe('torso', [(r, z) for r, z in prof], segs=28)
    for v in torso.data.vertices:
        rx_, ry_ = b.torso(v.co.z)
        v.co.x *= 0.985
        v.co.y *= ry_ / rx_ * 0.97
    ctx.add(torso, skin, bones=['hips', 'spine', 'chest', 'neck'])
    neck = geom.tube('neck', [j['neck'] - Vector((0, 0, 0.01 * H)), j['head'] + Vector((0, 0, 0.03 * H))],
                     [b.neck_r, b.neck_r * 0.9], segs=14)
    ctx.add(neck, skin, bones=['chest', 'neck', 'head'])
    for s in ('L', 'R'):
        sh, el, wr = j['shoulder.' + s], j['elbow.' + s], j['wrist.' + s]
        r = b.limb_r
        arm = geom.tube('arm.' + s, [sh + (sh - el).normalized() * 0.01, el, wr], [r, r * 0.82, r * 0.7], segs=14)
        ctx.add(arm, p.get('arms', skin), bones=['upper_arm.' + s, 'forearm.' + s, 'hand.' + s])
        he = j['hand_end.' + s]
        hand = geom.ellipsoid('hand.' + s, wr + (he - wr) * 0.45, (r * 1.05, r * 0.8, (he - wr).length * 0.55), segs=14, rings=10)
        ctx.add(hand, skin, rigid='hand.' + s)
        hp, kn, an = j['hip.' + s], j['knee.' + s], j['ankle.' + s]
        lr = b.leg_r
        leg = geom.tube('leg.' + s, [hp + Vector((0, 0, 0.03 * H)), kn, an - Vector((0, 0, 0.01 * H))],
                        [lr, lr * 0.72, lr * 0.55], segs=16)
        ctx.add(leg, legs, bones=['thigh.' + s, 'shin.' + s, 'foot.' + s])
        if not p.get('noFeet'):
            ft = j['toe.' + s]
            foot = geom.ellipsoid('foot.' + s, (an + ft) * 0.5 + Vector((0, 0, 0.004 * H)),
                                  (lr * 0.7, b.foot_len * 0.55, b.foot_z * 0.6), segs=14, rings=10)
            ctx.add(foot, legs, rigid='foot.' + s)


@part('head')
def head_part(ctx, p):
    b, H = ctx.body, ctx.body.H
    c, r = b.head_c, b.head_r
    skin = {'color': b.skin, 'rough': 0.45, 'sss': 0.2}
    prof = []
    n = 22
    for i in range(n + 1):
        a = math.pi * i / n
        jaw = max(0.0, (a - math.pi * 0.55) / (math.pi * 0.45))
        prof.append((math.sin(a) * (1 - 0.22 * jaw ** 1.4), math.cos(a) * (1 + 0.04 * jaw)))
    head = geom.lathe('head', prof, segs=36, sx=r.x, sy=r.y)
    geom.transform(head, Matrix.Translation(c) @ Matrix.Diagonal((1, 1, r.z, 1)))
    ctx.add(head, skin, rigid='head')
    f = ctx.spec.get('face', {})
    eye_col = f.get('eyes', '#2a1c16')
    iris2 = f.get('iris', '#6b4a3a')
    es = float(f.get('eyeSize', 1.0))
    for s, sx in (('L', 1), ('R', -1)):
        e = ctx.j['eye.' + s]
        yaw = Euler((0, 0, sx * math.radians(22)))
        rad = (r.x * 0.15 * es, r.y * 0.075, r.z * 0.2 * es)
        eye = geom.ellipsoid('eye.' + s, e, rad, segs=20, rings=12, rot=yaw)
        ctx.add(eye, {'color': eye_col, 'rough': 0.15, 'coat': 0.6}, rigid='eye.' + s)
        lo = geom.ellipsoid('iris.' + s, e + yaw.to_matrix() @ Vector((0, -rad[1] * 0.55, -rad[2] * 0.32)),
                            (rad[0] * 0.7, rad[1] * 0.5, rad[2] * 0.45), segs=16, rings=10, rot=yaw)
        ctx.add(lo, {'color': iris2, 'rough': 0.2}, rigid='eye.' + s)
        hl = geom.ellipsoid('glint.' + s, e + yaw.to_matrix() @ Vector((sx * rad[0] * 0.35, -rad[1] * 0.95, rad[2] * 0.38)),
                            (rad[0] * 0.28, rad[1] * 0.3, rad[2] * 0.24), segs=12, rings=8, rot=yaw)
        ctx.add(hl, {'color': '#ffffff', 'emit': 1.5}, rigid='eye.' + s)
        hl2 = geom.ellipsoid('glint2.' + s, e + yaw.to_matrix() @ Vector((-sx * rad[0] * 0.3, -rad[1] * 0.95, -rad[2] * 0.4)),
                             (rad[0] * 0.12, rad[1] * 0.3, rad[2] * 0.1), segs=10, rings=6, rot=yaw)
        ctx.add(hl2, {'color': '#ffffff', 'emit': 1.0}, rigid='eye.' + s)
        # brow
        bc = e + Vector((sx * r.x * 0.02, -0.006 * H, rad[2] + r.z * 0.12))
        brow = geom.tube('brow.' + s, [bc + Vector((sx * -rad[0] * 0.9, 0.01 * H, -0.004 * H)), bc,
                                       bc + Vector((sx * rad[0] * 0.9, 0.012 * H, -0.002 * H))],
                         [0.0035 * H, 0.005 * H, 0.0035 * H], segs=8)
        ctx.add(brow, f.get('brows', '#3a2a20'), rigid='head')
        # blush
        if f.get('blush'):
            bl = geom.ellipsoid('blush.' + s, c + Vector((sx * r.x * 0.62, -r.y * 0.66, -r.z * 0.42)),
                                (r.x * 0.15, r.y * 0.06, r.z * 0.08), segs=14, rings=8, rot=Euler((0, 0, sx * math.radians(38))))
            ctx.add(bl, {'color': f['blush'], 'rough': 0.7}, rigid='head')
    # mouth: a small smile
    m0 = c + Vector((0, -r.y * 0.93, -r.z * 0.52))
    w = r.x * 0.12 * float(f.get('mouthWidth', 1.0))
    mouth = geom.tube('mouth', [m0 + Vector((-w, 0.004 * H, 0.006 * H)), m0, m0 + Vector((w, 0.004 * H, 0.006 * H))],
                      0.003 * H, segs=8)
    ctx.add(mouth, f.get('mouth', '#9c4848'), rigid='head')
    nose = geom.ellipsoid('nose', c + Vector((0, -r.y * 0.99, -r.z * 0.3)), (r.x * 0.05, r.y * 0.04, r.z * 0.04), segs=10, rings=6)
    ctx.add(nose, skin, rigid='head')
    if p.get('ears', True):
        for s, sx in (('L', 1), ('R', -1)):
            ear = geom.ellipsoid('ear.' + s, c + Vector((sx * r.x * 0.98, 0.0, -r.z * 0.18)), (r.x * 0.1, r.y * 0.16, r.z * 0.2), segs=12, rings=8)
            ctx.add(ear, skin, rigid='head')


# ------------------------------------------------------------------------------------------------ hair
@part('hair_bob')
def hair_bob(ctx, p):
    """A bob: a shell over the head with a window cut for the face; bangs to the brow line.
    length: 0 = ear lobe, 1 = shoulder. volume: shell thickness. bangs: edge height (r units above centre, 0.1).
    faceWidth: how far round the cheeks the face shows."""
    b, H = ctx.body, ctx.body.H
    c, r = b.head_c, b.head_r
    vol = P(p, 'volume', 1.0)
    length = P(p, 'length', 0.45)
    bottom = c.z - r.z * (0.55 + 0.75 * length)
    brow = c.z + r.z * P(p, 'bangs', 0.1)       # bangs edge above the head centre (lower = longer bangs)
    off = r.x * 0.1 * vol
    prof = []
    n = 26
    for i in range(n + 1):
        a = math.pi * 0.98 * i / n
        z = c.z + math.cos(a) * (r.z + off)
        if z < bottom:
            break
        rr = math.sin(a) * (r.x + off)
        prof.append((rr, z - c.z))
    prof = _densify(prof, 3)
    # flare a little and curl in at the ends
    prof.append((prof[-1][0] * 0.97, bottom - c.z))
    prof.append((prof[-1][0] * 0.86, bottom - c.z + 0.012 * H))

    def shape(th, z, rr):
        front = max(0.0, -math.sin(th))       # 1 at the front
        return (0.0, -0.002 * H * front)
    hair = geom.lathe('hair', prof, segs=96, sx=1.0, sy=(r.y + off) / (r.x + off), center=(c.x, c.y + 0.004 * H, c.z), shape=shape)
    # face window: front verts below the bangs line, between the cheeks, are tucked inside the head (a smooth
    # edge, not a stair-step of deleted faces); faces fully inside are then removed
    fw = P(p, 'faceWidth', 1.0)

    def tuck(v):
        """0 = keep, 1 = fully inside the head. Continuous, so the hair edge across the cheek is a smooth curve."""
        ang = abs(math.degrees(math.atan2(v.x - c.x, -(v.y - c.y))))     # 0 = straight ahead
        tz = max(0.0, min(1.0, (v.z - (c.z - r.z * 0.35)) / (0.55 * r.z)))
        lim = 92 * fw - 40 * tz * tz * (3 - 2 * tz)     # wide at the cheeks (face shows in profile), narrow at the temples
        ka = (lim - ang) / 10.0
        kz = (brow - v.z) / (0.05 * r.z)
        k = max(0.0, min(1.0, min(ka, kz) + 0.5))
        return k * k * (3 - 2 * k)
    tucked = set()
    for v in hair.data.vertices:
        k = tuck(v.co)
        if k > 0:
            d = v.co - c
            v.co = c + d * (1 - 0.22 * k)
            if k > 0.999:
                tucked.add(v.index)
    me = hair.data
    import bmesh as _bm
    bm = _bm.new()
    bm.from_mesh(me)
    kill = [f for f in bm.faces if all(v.index in tucked for v in f.verts)]
    _bm.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(me)
    bm.free()
    geom.solidify(hair, 0.012 * H * vol)
    ctx.add(hair, {'color': p.get('color', '#2b211c'), 'rough': 0.5, 'coat': 0.08, 'sheen': 0.3}, rigid='head')


@part('hair_tail')
def hair_tail(ctx, p):
    """A ponytail or braid hanging from the back of the head, with a cloth chain so it swings.
    style: 'tail' | 'braid'. from: 'nape' | 'crown' | 'side.L' | 'side.R'. length in body heights."""
    b, H = ctx.body, ctx.body.H
    c, r = b.head_c, b.head_r
    where = p.get('from', 'nape')
    sx = 1 if where.endswith('.L') else -1 if where.endswith('.R') else 0
    if where == 'crown':
        a = c + Vector((0, r.y * 0.85, r.z * 0.55))
    elif sx:
        a = c + Vector((sx * r.x * 0.9, r.y * 0.25, r.z * 0.25))
    else:
        a = c + Vector((0, r.y * 0.92, -r.z * 0.45))
    L = P(p, 'length', 0.35) * H
    segs = int(P(p, 'segments', 5))
    pts = []
    for i in range(segs + 1):
        t = i / segs
        pts.append(a + Vector((sx * 0.03 * H * math.sin(t * 2), 0.05 * H * math.sin(min(1, t * 1.6) * math.pi / 2) * (1 if not sx else 0.4),
                               -L * t)))
    col = {'color': p.get('color', '#2b211c'), 'rough': 0.5, 'coat': 0.08, 'sheen': 0.3}
    rad = P(p, 'thick', 0.045) * H
    name = p.get('name', 'tail' + ('.' + where.split('.')[-1] if sx else ''))
    bones = ctx.chain(name, 'head', pts, stiff=P(p, 'stiff', 0.12), damp=0.12, gravity=1.0, cone=70, radius=rad,
                      collide=['torso'])
    objs = []
    if p.get('style', 'tail') == 'braid':
        k = int(segs * 3.5)
        for i in range(k):
            t = (i + 0.5) / k
            q = _along(pts, t)
            w = rad * (1.0 - 0.35 * t)
            side = 1 if i % 2 else -1
            objs.append(geom.ellipsoid(f'{name}_b{i}', q + Vector((side * w * 0.25, 0, 0)), (w * 0.85, w * 0.75, L / k * 0.85),
                                       segs=12, rings=8, rot=Euler((0, side * 0.35, 0))))
    else:
        radii = [rad * (0.8 + 0.5 * math.sin(min(1, t / segs * 1.3) * math.pi)) * (1 - 0.6 * (t / segs) ** 2) for t in range(segs + 1)]
        objs.append(geom.tube(name, pts, radii, segs=16))
    ob = geom.join(objs, name)
    ctx.add(ob, col, bones=bones)
    tie = geom.ellipsoid(name + '_tie', pts[0] + (pts[1] - pts[0]) * 0.15, (rad * 0.9, rad * 0.9, rad * 0.5), segs=14, rings=8)
    ctx.add(tie, p.get('tie', '#c23b3b'), rigid='head')
    if p.get('ribbon'):
        # a ribbon at the end (daenggi): two short tails under a knot, chained to the last bone
        end = _along(pts, 0.93)
        rb = p['ribbon']
        rw = rb.get('width', 0.05) * H
        rl = rb.get('length', 0.12) * H
        knot = geom.ellipsoid(name + '_knot', end, (rw * 0.45, rw * 0.35, rw * 0.35), segs=12, rings=8)
        ctx.add(knot, rb.get('color', '#b3202a'), bones=[bones[-1]])
        tpts = [end + Vector((0, 0.004 * H, -rl * t)) for t in (0, .33, .66, 1)]
        tb = ctx.chain(name + '_rb', bones[-1], tpts, stiff=0.1, damp=0.1, gravity=1.0, cone=60, radius=rw * 0.4, collide=[])
        tail = geom.ribbon(name + '_rbtail', tpts, [rw, rw * 1.05, rw * 1.1, rw * 1.2], normal=(0, 1, 0), thickness=0.004 * H)
        ctx.add(tail, rb.get('color', '#b3202a'), bones=tb)


def _outside(ctx, q, margin):
    """Push point q radially out so it sits outside every skirt built so far."""
    th = math.atan2(q.y, q.x)
    need = ctx.outer_r(q.z, th) + margin
    rad = math.hypot(q.x, q.y)
    if rad < need and rad > 1e-6:
        q = Vector((q.x * need / rad, q.y * need / rad, q.z))
    return q


def _densify(prof, k):
    out = []
    for a, b in zip(prof, prof[1:]):
        for i in range(k):
            f = i / k
            out.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f))
    out.append(prof[-1])
    return out


def _along(pts, t):
    """Point at fraction t along a polyline."""
    segs = list(zip(pts, pts[1:]))
    L = sum((b - a).length for a, b in segs)
    d = t * L
    for a, b in segs:
        l = (b - a).length
        if d <= l:
            return a + (b - a) * (d / l)
        d -= l
    return pts[-1].copy()


# ------------------------------------------------------------------------------------------------ garments
def _cloth(p, default='#444444'):
    m = {'color': p.get('color', default), 'rough': P(p, 'rough', 0.75), 'sheen': P(p, 'sheen', 0.4)}
    if p.get('pattern'):
        m['pattern'] = p['pattern']
    if 'paint' in p:
        m['paint'] = p['paint']
    return m


@part('top')
def top_part(ctx, p):
    """Bodice + sleeves. to: 'waist'|'chest'|'hips' (where it ends). sleeves: 'puff'|'short'|'long'|'wide'|'none'."""
    b, j, H = ctx.body, ctx.j, ctx.body.H
    off = ctx.shell()
    end = {'chest': b.chest_z - 0.01 * H, 'waist': b.waist_z - 0.012 * H, 'hips': b.hip_z - 0.01 * H}[p.get('to', 'waist')]
    top = b.shoulder_z + 0.012 * H
    prof = []
    n = 12
    for i in range(n + 1):
        z = top + (end - top) * i / n
        rx, ry = b.torso(z)
        prof.append((rx + off, z))
    # neckline: close the shoulders in toward the neck
    neck_r = b.neck_r * 1.06 + off
    prof = [(neck_r, top + 0.006 * H)] + prof
    sy = None
    mat = _cloth(p)

    def shape(th, z, r):
        rx, ry = b.torso(z)
        return (0.0, 0.0)
    body = geom.lathe('top', [(r, z) for r, z in prof], segs=32, sy=1.0, shape=None)
    # elliptical section matching torso depth
    for v in body.data.vertices:
        rx, ry = b.torso(v.co.z)
        v.co.y *= (ry + off) / (rx + off)
    if p.get('to') == 'chest' and p.get('front') == 'cross':
        pass
    ctx.add(body, mat, bones=['hips', 'spine', 'chest', 'neck', 'upper_arm.L', 'upper_arm.R'])
    sl = p.get('sleeves', 'puff')
    slmat = dict(mat)
    if p.get('sleevePattern'):
        slmat['pattern'] = p['sleevePattern']
    elif p.get('sleeveColor'):
        slmat = {'color': p['sleeveColor'], 'rough': mat['rough'], 'sheen': mat['sheen']}
    for s, sx in (('L', 1), ('R', -1)):
        sh, el, wr = j['shoulder.' + s], j['elbow.' + s], j['wrist.' + s]
        lr = b.limb_r
        if sl == 'puff':
            d = (el - sh)
            ob = geom.ellipsoid('sleeve.' + s, sh + d * 0.3 + Vector((sx * 0.004 * H, 0, 0.004 * H)),
                                (lr * 2.0, lr * 1.9, d.length * 0.42), segs=20, rings=12,
                                rot=Vector((0, 0, -1)).rotation_difference(d.normalized()))
            cuff = geom.tube('cuff.' + s, [sh + d * 0.55, sh + d * 0.62], lr * 1.3, segs=16)
            ctx.add(ob, slmat, bones=['chest', 'upper_arm.' + s])
            ctx.add(cuff, p.get('cuff', mat), bones=['upper_arm.' + s])
        elif sl in ('short', 'long', 'wide'):
            pts = [sh + (sh - el).normalized() * 0.012 * H, sh + (el - sh) * 0.5, el]
            rads = [lr * 1.55, lr * 1.4, lr * 1.3]
            bones = ['chest', 'upper_arm.' + s, 'forearm.' + s]
            if sl in ('long', 'wide'):
                pts += [el + (wr - el) * 0.5, wr + (wr - el).normalized() * 0.006 * H]
                if sl == 'wide':     # hanbok-like: the sleeve widens and curves under the arm
                    rads = [lr * 1.6, lr * 1.8, lr * 2.0, lr * 2.15, lr * 1.6]
                else:
                    rads += [lr * 1.2, lr * 1.15]
            ob = geom.tube('sleeve.' + s, pts, rads, segs=18, cap=False)
            geom.solidify(ob, 0.004 * H)
            ctx.add(ob, slmat, bones=bones)
            if p.get('cuff'):
                cpt = pts[-1]
                cuff = geom.tube('cuff.' + s, [cpt + (pts[-2] - cpt).normalized() * 0.018 * H, cpt], rads[-1] * 1.04, segs=18)
                ctx.add(cuff, p['cuff'], bones=[bones[-1]])
    if p.get('collar'):
        cz = top + 0.004 * H
        col = geom.lathe('collar', [(neck_r * 1.02, 0.006 * H), (neck_r * 1.55, -0.01 * H), (neck_r * 1.6, -0.016 * H)],
                         segs=28, center=(0, 0, cz), sy=0.85)
        geom.solidify(col, 0.003 * H)
        ctx.add(col, p['collar'], bones=['chest', 'neck'])
    if p.get('buttons'):
        n = int(p.get('buttonCount', 3))
        for i in range(n):
            z = top - 0.03 * H - (top - end - 0.04 * H) * i / max(1, n - 1)
            rx, ry = b.torso(z)
            bt = geom.ellipsoid(f'button{i}', (0, -(ry + off) - 0.003 * H, z), (0.009 * H, 0.004 * H, 0.009 * H), segs=12, rings=6)
            ctx.add(bt, p['buttons'], bones=['spine', 'chest'])


@part('skirt')
def skirt_part(ctx, p):
    """A bell skirt with a row of cloth chains around it (the trick that makes the walk read).
    from: 'waist'|'chest'|'hips'; length: hem height as a fraction of the leg (0 = ground, 1 = hip);
    flare: hem radius / waist radius; folds: number of soft godets; chains: how many bone rows; segments per row."""
    b, H = ctx.body, ctx.body.H
    off = ctx.shell()
    z0 = {'chest': b.chest_z + 0.01 * H, 'waist': b.waist_z, 'hips': b.hip_z + 0.012 * H}[p.get('from', 'waist')]
    zh = b.foot_z + (b.hip_z - b.foot_z) * P(p, 'length', 0.35)
    rx0, ry0 = b.torso(z0)
    r0 = rx0 + off
    flare = P(p, 'flare', 2.6)
    # the hem must clear the hips and the walking legs
    r1 = max(r0 * flare, b.hip_x + b.leg_r * 2.6 + (b.hip_z - zh) * 0.45)
    shape_k = P(p, 'bell', 0.6)    # 0 = A-line cone, 1 = round bell
    n = 16
    prof = []
    for i in range(n + 1):
        t = i / n
        z = z0 + (zh - z0) * t
        # bell: rises fast from the waist, then falls nearly straight; A-line: linear
        bell = math.sin(min(1, t * 1.25) * math.pi / 2) ** 0.75
        k = (1 - shape_k) * t + shape_k * bell
        r = r0 + (r1 - r0) * k
        rh = b.torso(z)[0] + off      # never inside the body
        prof.append((max(r, rh), z))
    folds = int(P(p, 'folds', 9))
    fa = P(p, 'foldDepth', 0.05)

    def shape(th, z, r):
        t = max(0, (z0 - z) / (z0 - zh))
        return (r * fa * t ** 1.5 * math.sin(folds * th + 0.6), 0.0)
    sy = P(p, 'depth', 0.9)
    sk = geom.lathe('skirt', prof, segs=folds * 8, sy=sy, shape=shape, uv_repeat=(1, 1))
    ctx.surfaces.append({'name': p.get('name', 'skirt'), 'bone': 'hips', 'prof': [(r * (1 + fa) + 0.004 * H, z) for r, z in prof], 'sy': sy})
    geom.solidify(sk, 0.004 * H)
    # cloth chains: N rows from the waist to the hem, following the skirt surface
    nc = int(P(p, 'chains', 10))
    ns = int(P(p, 'segments', 3))
    bones = []
    for c in range(nc):
        th = TAU * (c + 0.5) / nc
        pts = []
        for s in range(ns + 1):
            t = s / ns
            idx = t * n
            i0 = min(n - 1, int(idx))
            f = idx - i0
            r = prof[i0][0] * (1 - f) + prof[i0 + 1][0] * f
            z = prof[i0][1] * (1 - f) + prof[i0 + 1][1] * f
            r = r + shape(th, z, r)[0] - 0.002 * H
            pts.append((math.cos(th) * r, math.sin(th) * r * sy, z))
        bones += ctx.chain(f"{p.get('name', 'skirt')}_{c:02d}", 'hips', pts, stiff=P(p, 'stiff', 0.045),
                           damp=P(p, 'damp', 0.07), gravity=P(p, 'gravity', 0.5), drag=P(p, 'drag', 0.03),
                           cone=P(p, 'cone', 55), radius=0.01 * H, collide=['legs'], ring=p.get('name', 'skirt'),
                           kick=P(p, 'kick', 0.8), theta=th, twist=P(p, 'twist', 16), fold=P(p, 'fold', 8))
    ctx.add(sk, _cloth(p), bones=bones)
    if p.get('petticoat'):
        pc = geom.lathe('petticoat', [(r * 0.97, z - 0.012 * H) for r, z in prof[3:]], segs=48, sy=sy)
        geom.solidify(pc, 0.003 * H)
        ctx.add(pc, p['petticoat'], bones=bones)


@part('dress')
def dress_part(ctx, p):
    """One-piece dress = top + skirt in the same cloth."""
    t = dict(p)
    t.setdefault('to', 'waist')
    top_part(ctx, t)
    s = dict(p)
    s.setdefault('from', 'waist')
    ctx.layer += 0
    skirt_part(ctx, s)


@part('coat')
def coat_part(ctx, p):
    """A coat / raincoat: long sleeves, A-line hem with chains, optional hood lump at the back and buttons."""
    t = dict(p)
    t.setdefault('to', 'waist')
    t.setdefault('sleeves', 'long')
    t.setdefault('buttons', p.get('buttons', '#333333'))
    top_part(ctx, t)
    s = dict(p)
    s.setdefault('from', 'waist')
    s.setdefault('bell', 0.15)
    s.setdefault('flare', 1.7)
    s.setdefault('folds', 6)
    s.setdefault('foldDepth', 0.03)
    s.setdefault('stiff', 0.14)
    s.setdefault('chains', 8)
    s['name'] = 'hem'
    skirt_part(ctx, s)
    b, H = ctx.body, ctx.body.H
    if p.get('hood'):
        hc = Vector((0, b.torso(b.shoulder_z)[1] + 0.03 * H, b.shoulder_z + 0.01 * H))
        hood = geom.ellipsoid('hood', hc, (0.075 * H, 0.04 * H, 0.05 * H), segs=20, rings=10)
        ctx.add(hood, _cloth(p), bones=['chest', 'neck'])


@part('sash')
def sash_part(ctx, p):
    """A band around the body (waist sash, belt, obi). at: 'waist'|'chest'|'hips'; width in body heights."""
    b, H = ctx.body, ctx.body.H
    off = ctx.shell()
    z = {'chest': b.chest_z, 'waist': b.waist_z, 'hips': b.hip_z + 0.02 * H}[p.get('at', 'waist')]
    w = P(p, 'width', 0.035) * H
    prof = []
    for k in range(5):
        zz = z + w / 2 - w * k / 4
        rx, ry = b.torso(zz)
        prof.append((rx + off, zz))
    band = geom.lathe('sash', prof, segs=40)
    for v in band.data.vertices:
        rx, ry = b.torso(v.co.z)
        v.co.y *= (ry + off) / (rx + off)
    geom.solidify(band, 0.006 * H)
    ctx.add(band, _cloth(p, '#ffffff'), bones=['hips', 'spine', 'chest'])


@part('bow')
def bow_part(ctx, p):
    """A tied bow: two loops + a knot + two long tails. The loops and the tails are cloth chains, so the bow lags
    behind the body on turns and swings on the walk. at: 'back'|'front'|'side.L'|'side.R' ; height: 'waist'|'chest'|'neck'."""
    b, H = ctx.body, ctx.body.H
    off = ctx.shell(0.006 * H)
    z = {'chest': b.chest_z, 'waist': b.waist_z, 'neck': b.shoulder_z - 0.01 * H, 'hips': b.hip_z + 0.02 * H}[p.get('height', 'waist')]
    rx, ry = b.torso(z)
    at = p.get('at', 'back')
    if at == 'back':
        c, nrm, parent = Vector((0, ry + off, z)), Vector((0, 1, 0)), 'spine'
    elif at == 'front':
        c, nrm, parent = Vector((p.get('x', 0.0) * H, -(ry + off), z)), Vector((0, -1, 0)), 'chest' if p.get('height') == 'chest' else 'spine'
    else:
        sx = 1 if at.endswith('L') else -1
        c, nrm, parent = Vector((sx * (rx + off), 0, z)), Vector((sx, 0, 0)), 'spine'
    size = P(p, 'size', 1.0) * H
    rw = P(p, 'width', 0.03) * H
    col = _cloth(p, '#ffffff')
    col['sheen'] = 0.6
    up = Vector((0, 0, 1))
    out = up.cross(nrm).normalized()
    knot = geom.ellipsoid('bow_knot', c + nrm * 0.006 * H, (rw * 0.55, rw * 0.35, rw * 0.55), segs=14, rings=8,
                          rot=Vector((0, 1, 0)).rotation_difference(nrm))
    ctx.add(knot, col, rigid=parent)
    for side in (1, -1):
        dirv = out * side
        lc = c + nrm * 0.008 * H
        ls = (0.075 * size, 0.035 * size)
        # loop chain: one springy bone from the knot to the loop's far end
        lb = ctx.chain(f'bow_loop{"L" if side > 0 else "R"}', parent, [lc, lc + dirv * ls[0] + up * 0.01 * size],
                       stiff=P(p, 'loopStiff', 0.1), damp=0.12, gravity=0.5, cone=40, radius=rw, collide=[])
        loop = geom.loop_ribbon('bow_loop', lc, ls, nrm.cross(up).cross(up) * 0 + nrm, up=up, width=rw, thickness=0.004 * H)
        # orient the loop out to this side
        if side < 0:
            geom.transform(loop, Matrix.Translation(lc) @ Matrix.Rotation(math.pi, 4, nrm) @ Matrix.Translation(-lc))
        ctx.add(loop, col, bones=lb)
        # tail chain
        L = P(p, 'tail', 0.22) * H
        ns = int(P(p, 'segments', 4))
        sp = P(p, 'spread', 0.35)
        tp = []
        for i in range(ns + 1):
            t = i / ns
            q = lc + dirv * (0.012 * size + L * sp * t * 0.6) + nrm * (0.01 * H * t) - up * (0.006 * H + L * t)
            th = math.atan2(q.y, q.x)
            need = ctx.outer_r(q.z, th) + 0.008 * H
            rad = math.hypot(q.x, q.y)
            if rad < need:
                q.x, q.y = q.x * need / rad, q.y * need / rad
            tp.append(q)
        tb = ctx.chain(f'bow_tail{"L" if side > 0 else "R"}', parent, tp, stiff=P(p, 'stiff', 0.06), damp=0.1,
                       gravity=P(p, 'gravity', 0.8), drag=0.06, cone=P(p, 'cone', 65), radius=rw * 0.5,
                       collide=['torso', 'skirt'])
        widths = [rw * (1 + 0.5 * i / ns) for i in range(ns + 1)]
        tail = geom.ribbon('bow_tail', tp, widths, normal=nrm, thickness=0.004 * H,
                           twist=[side * 0.25 * i / ns for i in range(ns + 1)])
        # notched end
        ctx.add(tail, col, bones=tb)


@part('boots')
def boots_part(ctx, p):
    """Boots / shoes. height: 0 = shoe, 1 = knee. toe: roundness."""
    b, j, H = ctx.body, ctx.j, ctx.body.H
    hgt = P(p, 'height', 0.45)
    for s in ('L', 'R'):
        an, kn, toe = j['ankle.' + s], j['knee.' + s], j['toe.' + s]
        lr = b.leg_r
        if hgt > 0.05:
            top = an + (kn - an) * hgt
            sh = geom.tube('boot_shaft.' + s, [an - Vector((0, 0, 0.006 * H)), an + (top - an) * 0.5, top],
                           [lr * 0.82, lr * 0.75, lr * 0.85 + 0.002 * H * hgt], segs=18)
            ctx.add(sh, _cloth(p, '#ffffff'), bones=['shin.' + s, 'foot.' + s])
            if p.get('cuff'):
                cf = geom.tube('boot_cuff.' + s, [top - Vector((0, 0, 0.012 * H)), top + Vector((0, 0, 0.004 * H))],
                               lr * 0.95 + 0.002 * H, segs=18)
                ctx.add(cf, p['cuff'], bones=['shin.' + s])
        fc = (an + toe) * 0.5 + Vector((0, -0.006 * H, -0.002 * H))
        shoe = geom.ellipsoid('shoe.' + s, fc, (lr * 0.95, b.foot_len * 0.62, b.foot_z * 0.85), segs=18, rings=10)
        for v in shoe.data.vertices:
            if v.co.z < b.foot_z * 0.12:
                v.co.z = b.foot_z * 0.12 - (b.foot_z * 0.12 - v.co.z) * 0.25   # flat sole
        ctx.add(shoe, _cloth(p, '#ffffff'), rigid='foot.' + s)
        sole = geom.ellipsoid('sole.' + s, (fc.x, fc.y, 0.004 * H), (lr * 0.98, b.foot_len * 0.63, 0.006 * H), segs=18, rings=6)
        ctx.add(sole, p.get('sole', '#d8d4cc'), rigid='foot.' + s)
        if p.get('upturn'):        # kkotsin / boat shoes: the toe curls up
            tip = geom.ellipsoid('shoe_tip.' + s, fc + Vector((0, -b.foot_len * 0.55, b.foot_z * 0.55)),
                                 (lr * 0.3, b.foot_len * 0.12, b.foot_z * 0.35), segs=10, rings=6,
                                 rot=Euler((math.radians(-35), 0, 0)))
            ctx.add(tip, _cloth(p, '#ffffff'), rigid='foot.' + s)


@part('hat')
def hat_part(ctx, p):
    """A hat on the head. style: 'wide' (sun / straw hat) | 'cone' (conical sedge hat, satgat) | 'cap' | 'beanie' |
    'pointed'. tilt in degrees. The crown is painted round (strokes along u), the brim radially with a ragged,
    alpha-cut edge ("brimFringe": metres, 0 = clean) so straw reads as straw."""
    b, H = ctx.body, ctx.body.H
    c, r = b.head_c, b.head_r
    style = p.get('style', 'wide')
    tilt = math.radians(P(p, 'tilt', 6))
    base_z = c.z + r.z * P(p, 'sit', 0.3)
    rr = r.x * 1.12 + 0.008 * H
    mat = _cloth(p, '#e8c870')
    mat['sheen'] = 0.0
    paint = p.get('paint', {})
    if paint is not False:
        paint = dict(paint) if isinstance(paint, dict) else {}
    def pm(angle, fringe):
        if paint is False:
            return dict(mat, paint=False)
        q = dict(paint)
        q.setdefault('angle', angle)
        q.setdefault('len', [0.03, 0.08])
        q.setdefault('width', [0.008, 0.016])
        q.setdefault('cover', 2.4)
        if fringe:
            q.setdefault('fringe', {'depth': fringe, 'teeth': fringe * 0.5, 'edge': 'v0'})
        return dict(mat, paint=q)
    crowns, brims, bands = [], [], []
    fr = P(p, 'brimFringe', 0.02 if style in ('wide', 'cone') else 0.0)
    if style in ('wide', 'cap'):
        ch = r.z * P(p, 'crown', 1.0)
        crown = geom.lathe('hat_crown', [(0.0001, ch), (rr * 0.72, ch * 0.97), (rr * 0.9, ch * 0.8), (rr * 0.98, ch * 0.25), (rr, 0)],
                           segs=40, center=(0, c.y, base_z), cap_bottom=False)
        geom.solidify(crown, 0.004 * H)
        crowns.append(crown)
        bw = P(p, 'brim', 1.0) * (r.x * 0.95 if style == 'wide' else r.x * 0.5)
        brim = geom.lathe('hat_brim', [(rr * 0.98, 0.004 * H), (rr + bw * 0.35, 0.0015 * H), (rr + bw * 0.7, -bw * P(p, 'droop', 0.1) * 0.45),
                                       (rr + bw, -bw * P(p, 'droop', 0.1))], segs=64, center=(0, c.y, base_z))
        if style == 'cap':
            geom.delete_faces(brim, lambda v: v.y > c.y - rr * 0.6)
        geom.solidify(brim, 0.006 * H)
        brims.append(brim)
        if p.get('band', '#3a3a3a'):
            band = geom.lathe('hat_band', [(rr * 1.005, 0.03 * H), (rr * 1.01, 0.006 * H)], segs=40, center=(0, c.y, base_z))
            geom.solidify(band, 0.003 * H)
            ctx.add(band, p.get('band', '#3a3a3a'), rigid='head')
            bands.append(band)
    elif style == 'cone':
        # a shallow cone: apex above the crown, the rim well past the shoulders; a small inner crown holds it on
        R = rr + P(p, 'brim', 1.0) * r.x * 1.25
        ht = P(p, 'peak', 0.62) * r.z * 1.6
        prof = [(0.0001, ht), (R * 0.12, ht * 0.86), (R * 0.4, ht * 0.5), (R * 0.75, ht * 0.16), (R, -ht * 0.05)]
        cone = geom.lathe('hat_cone', prof, segs=72, center=(0, c.y, base_z + r.z * 0.12))
        geom.solidify(cone, 0.006 * H)
        brims.append(cone)
        inner = geom.lathe('hat_inner', [(rr * 0.9, r.z * 0.35), (rr, 0)], segs=36, center=(0, c.y, base_z))
        geom.solidify(inner, 0.004 * H)
        ctx.add(inner, p.get('band', '#5a3b22'), rigid='head')
        bands.append(inner)
        if p.get('ties'):
            for sx in (1, -1):
                tie = geom.tube('hat_tie', [Vector((sx * rr * 0.92, c.y, base_z)), Vector((sx * r.x * 0.75, c.y - r.y * 0.3, c.z - r.z * 0.7)),
                                            Vector((0, c.y - r.y * 0.62, c.z - r.z * 1.02))], 0.0035 * H, segs=8)
                ctx.add(tie, p['ties'], rigid='head')
                bands.append(tie)
    elif style == 'beanie':
        crown = geom.lathe('hat_crown', [(0.0001, r.z * 0.75), (rr * 0.8, r.z * 0.6), (rr, r.z * 0.2), (rr * 1.02, -r.z * 0.1)],
                           segs=40, center=(0, c.y, base_z - r.z * 0.1))
        geom.solidify(crown, 0.006 * H)
        crowns.append(crown)
        fr = 0.0
    else:   # pointed (wizard / witch)
        crown = geom.lathe('hat_crown', [(0.0001, r.z * 2.2), (rr * 0.35, r.z * 1.3), (rr * 0.8, r.z * 0.45), (rr, 0)],
                           segs=40, center=(0, c.y, base_z))
        geom.solidify(crown, 0.004 * H)
        crowns.append(crown)
        brim = geom.lathe('hat_brim', [(rr * 0.98, 0.002 * H), (rr + r.x * 0.8, -0.01 * H)], segs=48, center=(0, c.y, base_z))
        geom.solidify(brim, 0.005 * H)
        brims.append(brim)
    M = Matrix.Translation(c) @ Matrix.Rotation(-tilt, 4, 'X') @ Matrix.Rotation(math.radians(P(p, 'roll', 0)), 4, 'Y') @ Matrix.Translation(-c)
    for o in crowns + brims + bands:
        geom.transform(o, M)
    for o in crowns:
        ctx.add(o, pm(0, 0), rigid='head', name='hat_crown')
    for o in brims:
        ctx.add(o, pm(90, fr), rigid='head', name='hat_brim')


@part('scarf')
def scarf_part(ctx, p):
    """A scarf round the neck with two tails (cloth chains). tails: 'front'|'back'|'side'."""
    b, H = ctx.body, ctx.body.H
    z = b.shoulder_z + 0.012 * H
    rr = b.neck_r * 1.25 + ctx.shell()
    w = P(p, 'width', 0.045) * H
    mat = _cloth(p, '#c0392b')
    ring = geom.lathe('scarf_ring', [(rr, w * 0.6), (rr + w * 0.35, 0), (rr, -w * 0.6)], segs=36, center=(0, 0.004 * H, z), sy=0.9)
    geom.solidify(ring, 0.01 * H)
    ctx.add(ring, mat, bones=['chest', 'neck'])
    where = p.get('tails', 'front')
    L = P(p, 'length', 0.3) * H
    ns = int(P(p, 'segments', 5))
    tails = [(0.35, -1)] if where == 'front' else [(0.0, 1)]
    if p.get('two', True):
        tails = [(0.45, -1), (-0.15, -1)] if where == 'front' else [(0.15, 1), (-0.25, 1)]
    for k, (xo, fy) in enumerate(tails):
        a = Vector((xo * rr * 2, fy * (rr + 0.012 * H), z - 0.006 * H))
        pts = []
        ry = b.torso(z)[1]
        for i in range(ns + 1):
            t = i / ns
            zz = z - 0.006 * H - L * t
            rx_, ry_ = b.torso(zz)
            pts.append(Vector((a.x + 0.01 * H * t * (1 if xo > 0 else -1), fy * (ry_ + ctx.shell() + 0.014 * H + 0.012 * H * t), zz)))
        tb = ctx.chain(f'scarf_tail{k}', 'chest', pts, stiff=P(p, 'stiff', 0.07), damp=0.1, gravity=0.9, drag=0.06,
                       cone=70, radius=w * 0.3, collide=['torso'])
        tail = geom.ribbon(f'scarf_tail{k}', pts, w, normal=(0, fy, 0), thickness=0.008 * H)
        ctx.add(tail, mat, bones=tb)


@part('cape')
def cape_part(ctx, p):
    """A cape from the shoulders down the back, with N cloth chains."""
    b, H = ctx.body, ctx.body.H
    z0 = b.shoulder_z + 0.006 * H
    zh = b.foot_z + (b.hip_z - b.foot_z) * P(p, 'length', 0.3)
    off = ctx.shell(0.01 * H)
    nc = int(P(p, 'chains', 5))
    ns = int(P(p, 'segments', 4))
    span = math.radians(P(p, 'span', 200))
    rows = 14
    prof_r = lambda t: (b.torso(z0 - (z0 - zh) * t)[0] + off) * (1 + t * P(p, 'flare', 0.9))
    import bmesh as _bm
    cols = 32
    pts_grid = []
    for i in range(rows + 1):
        t = i / rows
        z = z0 + (zh - z0) * t
        r = prof_r(t)
        row = []
        for k in range(cols + 1):
            th = math.pi / 2 - span / 2 + span * k / cols   # centred on +Y (the back)
            q = Vector((math.cos(th) * r, math.sin(th) * r * 0.85 + 0.01 * H, z))
            row.append(_outside(ctx, q, 0.014 * H))
        pts_grid.append(row)
    bm = _bm.new()
    uv = bm.loops.layers.uv.verify()
    vs = [[bm.verts.new(q) for q in row] for row in pts_grid]
    for i in range(rows):
        for k in range(cols):
            f = bm.faces.new((vs[i][k], vs[i][k + 1], vs[i + 1][k + 1], vs[i + 1][k]))
            for loop, (u, v) in zip(f.loops, ((k / cols, i / rows), ((k + 1) / cols, i / rows), ((k + 1) / cols, (i + 1) / rows), (k / cols, (i + 1) / rows))):
                loop[uv].uv = (u, 1 - v)
    cape = geom._finish(bm, 'cape')
    geom.solidify(cape, 0.004 * H)
    bones = []
    for c in range(nc):
        th = math.pi / 2 - span / 2 + span * (c + 0.5) / nc
        pts = []
        for s in range(ns + 1):
            t = s / ns
            r = prof_r(t)
            q = Vector((math.cos(th) * r, math.sin(th) * r * 0.85 + 0.01 * H, z0 + (zh - z0) * t))
            pts.append(_outside(ctx, q, 0.01 * H))
        bones += ctx.chain(f'cape_{c:02d}', 'chest', pts, stiff=P(p, 'stiff', 0.06), damp=0.1, gravity=0.8,
                           drag=0.08, cone=60, radius=0.01 * H, collide=['legs', 'torso', 'skirt'], ring='cape',
                           theta=th, twist=P(p, 'twist', 25), fold=P(p, 'fold', 20))
    ctx.add(cape, _cloth(p, '#7a2230'), bones=bones)


@part('trousers')
def trousers_part(ctx, p):
    """Trousers as their own mesh over the legs: a seat from the waist to the crotch, then a leg each, a little
    loose (fit), ending at the ankle or tucked into boots. length: 1 = ankle, .5 = knee (breeches)."""
    b, j, H = ctx.body, ctx.j, ctx.body.H
    off = ctx.shell()
    fit = P(p, 'fit', 1.22)
    top = b.waist_z + 0.01 * H
    low = b.hip_z - 0.08 * H
    prof = []
    for k in range(7):
        z = top + (low - top) * k / 6
        rx, ry = b.torso(z)
        prof.append((rx + off, z))
    seat = geom.lathe('trouser_seat', prof, segs=32)
    for v in seat.data.vertices:
        rx, ry = b.torso(v.co.z)
        v.co.y *= (ry + off) / (rx + off)
    geom.solidify(seat, 0.003 * H)
    mat = _cloth(p, '#4a3a2c')
    ctx.add(seat, mat, bones=['hips', 'spine', 'thigh.L', 'thigh.R'])
    ln = P(p, 'length', 1.0)
    for s in ('L', 'R'):
        hp, kn, an = j['hip.' + s], j['knee.' + s], j['ankle.' + s]
        lr = b.leg_r
        end = kn + (an - kn) * min(1.0, ln * 2 - 1) if ln > 0.5 else hp + (kn - hp) * (ln * 2)
        pts = [hp + Vector((0, 0, 0.045 * H)), hp + (kn - hp) * 0.5, kn]
        rads = [lr * fit * 1.25 + off, lr * fit * 1.02 + off, lr * fit * 0.84 + off]
        if ln > 0.5:
            pts += [kn + (end - kn) * 0.55, end]
            rads += [lr * fit * 0.74 + off, lr * fit * 0.7 * P(p, 'cuff', 1.0) + off]
        leg = geom.tube('trouser_leg.' + s, pts, rads, segs=18, cap=False)
        geom.solidify(leg, 0.003 * H)
        ctx.add(leg, mat, bones=['hips', 'thigh.' + s, 'shin.' + s])


@part('cloak')
def cloak_part(ctx, p):
    """The hero's cloak: a mantle over both shoulders (bound to the chest) and a long body hanging from the shoulder
    line on N bone chains (columns). It is open at the front (opening, degrees) so the shirt shows; it hangs over
    the arms, so it collides with arms, torso and legs. Its chains lag the body by `lag` frames at the hem
    (references/RIG.md) — the source's point: the cloak never moves with the body, it follows it, a few frames late.
    length: hem height as a fraction of the leg (0 = floor). flare: hem width over shoulder width - 1.
    The default paint: long strokes down the cloak, a frayed hem (fringe)."""
    b, H = ctx.body, ctx.body.H
    off = ctx.shell(0.006 * H)
    zn = b.shoulder_z + 0.035 * H                     # collar top, round the neck
    zs = b.shoulder_z - 0.05 * H                      # where the cloak leaves the shoulder: chains start here
    zh = b.foot_z + (b.hip_z - b.foot_z) * P(p, 'length', 0.32)
    hem_back = P(p, 'hemCurve', 0.04) * H             # the hem hangs lower at the back than at the front edges
    opening = math.radians(P(p, 'opening', 70))
    span = 2 * math.pi - opening
    flare = P(p, 'flare', 0.35)
    rx_sh = b.shoulder_x + b.limb_r * 1.9 + off
    ry_sh = b.torso(b.chest_z)[1] + 0.026 * H + off
    rn = b.neck_r * 1.3 + off
    cols = 44
    jj = ctx.j
    arm_pts = [jj['shoulder.L'], jj['elbow.L'], jj['wrist.L'], jj['hand_end.L']]

    def arm_x(z):
        """How far out the hanging arm (and hand) reaches at height z, plus room: the cloak hangs clear of it."""
        for a, b_ in zip(arm_pts, arm_pts[1:]):
            if b_.z <= z <= a.z:
                f = (a.z - z) / max(1e-6, a.z - b_.z)
                return a.x + (b_.x - a.x) * f + b.limb_r * 2.4 + off
        return 0.0
    def ring(z, t_body):
        """(rx, ry) of the cloak at height z; t_body 0 at the shoulder line .. 1 at the hem. Over the shoulders the
        section is a quarter circle from the collar out to the shoulder (a round shoulder, not a shelf)."""
        if z >= zs:
            k = (zn - z) / (zn - zs)
            k = math.sqrt(max(0.0, 1 - (1 - k) ** 2))
            return rn + (rx_sh - rn) * k, rn + (ry_sh - rn) * k
        f = 1 + flare * t_body ** 1.2
        return max(rx_sh * f, arm_x(z)), ry_sh * (1 + flare * 0.6 * t_body ** 1.2)
    def point(th, z, t_body):
        rx, ry = ring(z, t_body)
        z = z - hem_back * t_body ** 2 * (0.5 + 0.5 * math.sin(th))
        q = Vector((math.cos(th) * rx, math.sin(th) * ry + 0.006 * H, z))
        return _outside(ctx, q, 0.012 * H)
    def th_of(k):
        return math.pi / 2 - span / 2 + span * k / cols       # centred on +Y (the back)
    import bmesh as _bm
    def sheet(name, zs_list, ts_list, v0, v1):
        bm = _bm.new()
        uv = bm.loops.layers.uv.verify()
        rows = len(zs_list) - 1
        vs = [[bm.verts.new(point(th_of(k), z, t)) for k in range(cols + 1)] for z, t in zip(zs_list, ts_list)]
        for i in range(rows):
            for k in range(cols):
                f = bm.faces.new((vs[i][k], vs[i][k + 1], vs[i + 1][k + 1], vs[i + 1][k]))
                va, vb = v0 + (v1 - v0) * i / rows, v0 + (v1 - v0) * (i + 1) / rows
                for loop, (u, v) in zip(f.loops, ((k / cols, va), ((k + 1) / cols, va), ((k + 1) / cols, vb), (k / cols, vb))):
                    loop[uv].uv = (u, v)
        ob = geom._finish(bm, name)
        geom.solidify(ob, 0.005 * H)
        return ob
    m_rows, b_rows = 6, 22
    zl = [zn + (zs - zn) * i / m_rows for i in range(m_rows)] + [zs + (zh - zs) * i / b_rows for i in range(b_rows + 1)]
    tl = [0.0] * m_rows + [i / b_rows for i in range(b_rows + 1)]
    mat = _cloth(p, '#2457c5')
    pnt = p.get('paint', {})
    if pnt is not False:
        pnt = dict(pnt) if isinstance(pnt, dict) else {}
        pnt.setdefault('angle', 90)
        pnt.setdefault('len', [0.14, 0.34])
        pnt.setdefault('width', [0.026, 0.05])
        pnt.setdefault('jitter', 10)
        pnt.setdefault('cover', 2.2)
        fd = P(p, 'fringe', 0.06)
        if fd > 0:
            pnt.setdefault('fringe', {'depth': fd, 'teeth': fd * 0.55, 'edge': 'v0'})
    mat['paint'] = pnt
    mat['rough'] = P(p, 'rough', 0.95)
    cloak = sheet('cloak', zl, tl, 1.0, 0.0)
    nc = int(P(p, 'chains', 9))
    ns = int(P(p, 'segments', 4))
    bones = []
    for c in range(nc):
        th = math.pi / 2 - span / 2 + span * (c + 0.5) / nc
        pts = [point(th, zs + (zh - zs) * s_ / ns, s_ / ns) for s_ in range(ns + 1)]
        for q in pts:
            q.x *= 0.985
            q.y = q.y - 0.004 * H if q.y > 0 else q.y + 0.004 * H
        bones += ctx.chain(f'cloak_{c:02d}', 'chest', pts, stiff=P(p, 'stiff', 0.08), damp=P(p, 'damp', 0.1),
                           gravity=P(p, 'gravity', 0.9), drag=P(p, 'drag', 0.08), cone=P(p, 'cone', 62),
                           radius=0.014 * H, collide=['legs', 'torso', 'skirt'], ring='cloak', theta=th, armKick=P(p, 'armKick', 0.9),
                           twist=P(p, 'twist', 30), fold=P(p, 'fold', 22), lag=P(p, 'lag', 3.0))
    blend = 0.05 * H

    def wfn(co):
        """Mantle (above the shoulder line) rides the chest; the neck ring blends to the neck; below the line the
        chains take over over a short band, so the shoulder has no seam and no lever."""
        if co.z >= zs + blend:
            k = max(0.0, min(1.0, (co.z - (zn - 0.02 * H)) / (0.02 * H)))
            return [('chest', 1 - 0.5 * k), ('neck', 0.5 * k)]
        if co.z >= zs - blend:
            f = (co.z - (zs - blend)) / (2 * blend)
            f = f * f * (3 - 2 * f)
            return [('chest', f)]
        return None
    ctx.add(cloak, mat, bones=['chest', 'neck'] + bones)
    ctx.pieces[-1]['wfn'] = wfn
    ctx.pieces[-1]['fixed'] = ('chest', 'neck')
    if p.get('clasp'):
        cl = geom.ellipsoid('cloak_clasp', point(-math.pi / 2 - opening / 2 * 0.9, zn - 0.012 * H, 0) + Vector((0, -0.006 * H, 0)),
                            (0.012 * H, 0.006 * H, 0.012 * H), segs=12, rings=8)
        ctx.add(cl, {'color': p['clasp'], 'rough': 0.35, 'paint': False}, rigid='chest')
        cl2 = geom.ellipsoid('cloak_clasp2', point(-math.pi / 2 + opening / 2 * 0.9, zn - 0.012 * H, 0) + Vector((0, -0.006 * H, 0)),
                             (0.012 * H, 0.006 * H, 0.012 * H), segs=12, rings=8)
        ctx.add(cl2, {'color': p['clasp'], 'rough': 0.35, 'paint': False}, rigid='chest')
        cord = geom.tube('cloak_cord', [point(-math.pi / 2 - opening / 2 * 0.9, zn - 0.012 * H, 0) + Vector((0, -0.008 * H, 0)),
                                        Vector((0, -(b.neck_r * 1.35 + off) - 0.016 * H, zn - 0.03 * H)),
                                        point(-math.pi / 2 + opening / 2 * 0.9, zn - 0.012 * H, 0) + Vector((0, -0.008 * H, 0))],
                         0.0028 * H, segs=8)
        ctx.add(cord, {'color': p.get('cord', p['clasp']), 'paint': False}, bones=['chest', 'neck'])


def build_parts(ctx, parts):
    """Build the implicit body + head, then every part in the spec's order (= layering order)."""
    ctx.part_name = 'body'
    body_part(ctx, ctx.spec.get('bodyPart', {}))
    ctx.part_name = 'head'
    head_part(ctx, ctx.spec.get('headPart', {}))
    garment = 0
    for p in parts:
        t = p['type']
        if t not in PARTS:
            raise KeyError(f'unknown part type {t!r}; known: {sorted(PARTS)} (add one in project parts.py with @part)')
        ctx.part_name = p.get('name', t)
        ctx.layer = garment
        PARTS[t](ctx, p)
        if t not in ('hair_bob', 'hair_tail', 'hat', 'boots', 'cloak'):
            garment += 1
    return ctx
