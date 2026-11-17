"""Stock part builders: real mechanisms, in two finishes.

  style 'ceramic'    — the source's look: a black carbon compression beam per segment, white ceramic covers over it,
                       graphite joint drums with bolted flanges and ceramic caps, steel pins, tendon cables on spreaders
                       down the back of each segment (a guyed mast), rubber hoses, polished rods.
  style 'industrial' — painted box beams with stiffener ribs and bolt rows, galvanized forks, no covers, cable trays.

Every joint is a mechanism, never a sphere pushed into a cylinder:
  * a fork (two cheek plates on the upper part) holds the lower part's drum between them on a steel pin;
  * a hydraulic actuator spans each powered hinge: barrel on the upper part, rod on the lower, each on its own bone,
    eyes on pins in lugs that are welded to the beams;
  * feet: a steel ball at the end of the last segment sits in a socket hub, toes hinge on the hub.

A project calls these from its build(k) and adds what its topic needs (the body, the head, cargo, masts...). Every
stock builder takes overrides from the limb spec (`width`, `drum`, `style`) so a new machine is not re-skinned stock.
"""
import math
from mathutils import Matrix
from .geom import Mesh, T, RX, RZ
from .kin import up_length

PI = math.pi


def dims(l):
    w = float(l.s.get('width', 0.5))
    r = float(l.s.get('drum', 0.95 * w)) / 2
    return w, r


def joint_r(l, j):
    """Drum radius at joint j (0 = hip ... n-1); the first joint is a little bigger."""
    w, r = dims(l)
    return r * (1.25 if j == 0 else (1.0 if j == 1 else 0.8))


# ---- pieces ---------------------------------------------------------------------------------------------------------
def fork(m, y, r, inner, t, mat, ext=1.6):
    """Two cheek plates either side (±X) of a pin at local (0, y, 0); they reach `ext`·r back up the part."""
    for sx in (-1, 1):
        x = sx * (inner + t / 2)
        m.cyl(r * 1.08, t, 'X', 28, mat, c=(x, y, 0))
        m.box(t, ext * r, 2 * r * 0.98, mat, c=(x, y - ext * r / 2, 0))


def drum(m, y, r, length, mats, bolts=8):
    """A joint drum on the pin axis at (0, y, 0): body, two flanges with bolt rings, a cap each side."""
    joint, steel, cap = mats
    m.cyl(r, length, 'X', 32, joint, c=(0, y, 0))
    for sx in (-1, 1):
        m.ring(r * 1.04, r * 0.55, length * 0.12, 'X', 32, joint, c=(sx * length * 0.47, y, 0))


def pin(m, y, r_pin, length, mat):
    """A steel pin; its ends stop flush with the cheeks' outer faces (the flange caps cover them)."""
    m.cyl(r_pin, length, 'X', 16, mat, c=(0, y, 0))


def flange_caps(m, y, r, x_out, mats, nb=10):
    """Outer face of a fork cheek: a bolted flange ring and a ceramic (or painted) cap."""
    joint, steel, cap = mats
    for sx in (-1, 1):
        x = sx * x_out
        m.ring(r * 1.0, r * 0.62, r * 0.12, 'X', 36, joint, c=(x + sx * r * 0.06, y, 0))
        m.bolts(r * 0.81, nb, r * 0.06, r * 0.08, 'X', steel, M=T(x + sx * r * 0.12, y, 0) @ (RZ(180) if sx < 0 else Matrix.Identity(4)))
        m.cyl(r * 0.6, r * 0.16, 'X', 32, cap, c=(x + sx * r * 0.08, y, 0), r2=r * 0.5 if sx > 0 else None)


def sphere(m, r, c, mat, segs=20):
    secs = []
    for i in range(segs // 2 + 1):
        a = -PI / 2 + PI * i / (segs // 2)
        secs.append((r * math.sin(a), max(1e-4, r * math.cos(a)), max(1e-4, r * math.cos(a)), 2.0, 0, 0))
    m.loft(secs, segs, mat, M=T(*c), cap0=False, cap1=False)


# ---- a limb ---------------------------------------------------------------------------------------------------------
def limb(k, l, style=None):
    style = style or l.s.get('style', 'ceramic')
    hip(k, l, style)
    for i in range(l.n):
        segment(k, l, i, style)
    if l.role == 'arm':
        hand(k, l, style)
    else:
        foot(k, l, style)
    actuators(k, l, style)


def limbs(k, style=None):
    for l in k.kin.limbs:
        limb(k, l, style)


def hip(k, l, style):
    w, r = dims(l)
    b = f'hip_{l.name}'
    rj = joint_r(l, 0)
    key = f'hip{l.kind}{w:.3f}{rj:.3f}{l.hip_drop:.3f}{l.coxa:.3f}{style}'
    m = Mesh()
    if l.kind == 'insect':
        # yaw drum about local Z (world up) at the body, coxa beam out along +Y, fork at its end for the femur pin
        m.cyl(rj * 1.1, w * 1.1, 'Z', 32, 0, c=(0, 0, 0))
        m.ring(rj * 1.18, rj * 0.7, w * 0.12, 'Z', 32, 0, c=(0, 0, w * 0.58))
        m.bolts(rj * 0.95, 10, rj * 0.06, rj * 0.09, 'Z', 1, c=(0, 0, w * 0.62))
        L = l.coxa
        m.taper(L - rj * 1.2, w * 1.0, w * 1.05, w * 0.95, w * 0.9, 2, y0=rj * 0.6)
        fork(m, L, rj, w * 0.5, w * 0.2, 2, ext=1.4)
        if style == 'industrial':
            for sx in (-1, 1):
                m.box(w * 0.06, L * 0.7, w * 0.5, 2, c=(sx * w * 0.53, L * 0.45, 0))
        mats = ('joint', 'steel', 'frame' if style == 'ceramic' else 'accent')
        k.part(f'Coxa_{l.name}', m, b, mats, stage=k.st('upper'), bevel=0.02 * w, share=key)
        # body ring the coxa turns in
        mr = Mesh()
        mr.ring(rj * 1.45, rj * 1.12, w * 0.5, 'Z', 36, 0, c=(0, 0, 0))
        mr.bolts(rj * 1.3, 12, rj * 0.05, rj * 0.08, 'Z', 1, c=(0, 0, w * 0.25))
        k.part(f'CoxaRing_{l.name}', mr, 'body', ('metal', 'steel'), stage=k.st('body'), frame=k.W[b], bevel=0.01 * w)
        return
    # mammal / arm: an abduction block on a fore-aft pin (local Z) between two body lugs, a fork at the bottom
    hd = l.hip_drop
    top = hd - up_length(l, 0) - 0.25 * w            # the block runs up into the body: the hip barrel's lug sits on it
    m.box(w * 1.25, hd - top, w * 1.3, 0, c=(0, (hd + top) / 2, 0))
    m.cyl(w * 0.42, w * 2.2, 'Z', 24, 1, c=(0, 0, 0))                      # abduction pin (fore-aft)
    fork(m, hd, rj, w * 0.5, w * 0.22, 0, ext=1.2)
    k.part(f'Hip_{l.name}', m, b, ('joint', 'steel'), stage=k.st('upper'), bevel=0.025 * w, share=key)
    lug = Mesh()
    for sz in (-1, 1):
        lug.box(w * 1.0, w * 1.4, w * 0.3, 0, c=(0, -w * 0.25, sz * w * 0.82))
        lug.cyl(w * 0.5, w * 0.12, 'Z', 6, 1, c=(0, 0, sz * w * 1.02))
    k.part(f'HipLug_{l.name}', lug, 'body', ('frame', 'steel'), stage=k.st('body'), frame=k.W[b], bevel=0.015 * w)


def segment(k, l, i, style):
    w, r = dims(l)
    b = l.bone(i)
    L = l.segs[i]
    rt = joint_r(l, i)
    last = i == l.n - 1
    rb = l.ball if last else joint_r(l, i + 1)
    ceramic = style == 'ceramic'
    taper = 0.78 if i == 0 else 0.7
    wd = w * (1.0 if i == 0 else 0.86 ** i)
    key = f'seg{i}{L:.3f}{w:.3f}{rt:.3f}{rb:.3f}{style}{l.role}{l.kind}'
    # the drum this segment turns on (its top), between the parent's fork cheeks, and the pin through both
    m = Mesh()
    drum(m, 0.0, rt * 0.92, w * 0.96, (0, 1, 2))
    pin(m, 0.0, rt * 0.32, w * 1.38, 1)
    y0 = rt * 0.7
    y1 = L - (rb * 2.0 if last else rb * 1.55)
    m.taper(y1 - y0, wd * 0.9, wd * 0.8, wd * 0.9 * taper, wd * 0.8 * taper, 3, y0=y0)
    if not last:
        fork(m, L, rb, w * 0.5, w * 0.2, 3, ext=1.75)
    else:
        # socket cup for the foot ball (or the wrist)
        m.cyl(rb * 0.8, rb * 1.1, 'Y', 28, 3, c=(0, L - rb * 1.45, 0), r2=rb * 0.55)
    if not ceramic:
        for sx in (-1, 1):            # stiffener ribs + bolt rows along the box beam
            m.box(wd * 0.05, (y1 - y0) * 0.86, wd * 0.6, 5, c=(sx * wd * 0.47, (y0 + y1) / 2, 0))
        for yy in [y0 + (y1 - y0) * f for f in (0.15, 0.35, 0.55, 0.75)]:
            m.box(wd * 1.0, wd * 0.08, wd * 0.9, 5, c=(0, yy, 0))
    k.part(f'{l.seg_names[i].capitalize()}_{l.name}', m, b,
           ('joint', 'steel', 'shell' if ceramic else 'metal', 'frame' if ceramic else 'accent', 'frame',
            'metal' if not ceramic else 'frame'),
           stage=k.st('upper' if i == 0 else 'lower'), bevel=0.02 * w, share=key)
    if not last:
        mc = Mesh()
        flange_caps(mc, L, rb, w * 0.5 + w * 0.2 + 0.001, (0, 1, 2))
        k.part(f'{l.seg_names[i].capitalize()}Flange_{l.name}', mc, b, ('joint', 'steel', 'shell' if ceramic else 'accent'),
               stage=k.st('hydraulics'), bevel=0.0, share=key + 'fl')
    if ceramic and L > 4 * w:
        ms = Mesh()
        a0, a1 = -0.12 * PI, 1.12 * PI
        # a close-fitting ceramic sleeve: full length between the joints, open only down the back for the tendons
        cover = (rt * 1.25 / L, 1 - (rb * 2.6 if not last else rb * 2.4) / L)
        secs = []
        N = 9
        for q in range(N + 1):
            f = cover[0] + (cover[1] - cover[0]) * q / N
            e = q / N
            bul = (math.sin(PI * min(1.0, e * 1.6)) if e < 0.32 else 1.0) * (1.0 if e < 0.78 else math.cos(PI / 2 * (e - 0.78) / 0.22) ** 0.7)
            tp = 1 - (1 - taper) * f
            rx = wd * (0.5 + 0.2 * bul) * tp
            rz = wd * (0.46 + 0.22 * bul) * tp
            secs.append((L * f, rx, rz, 2.5, 0.0, wd * 0.05 * bul))
        a0, a1 = -0.22 * PI, 1.22 * PI
        ms.shell(secs, a0, a1, wd * 0.07, 18, 0)
        k.part(f'{l.seg_names[i].capitalize()}Cover_{l.name}', ms, b, ('shell',), stage=k.st('shells'),
               bevel=0.012 * w, share=key + 'cv')
    if L > 5 * w:
        # tendons down the back on a spreader (guyed mast), or a cable tray on an industrial beam
        mt = Mesh()
        zb = -wd * 0.42
        if ceramic:
            for sx in (-0.28, 0.28):
                mid = (sx * wd, L * 0.5, zb - wd * 0.75)
                mt.sweep([(sx * wd, L * 0.1, zb), (sx * wd, L * 0.3, zb - wd * 0.5), mid,
                          (sx * wd, L * 0.7, zb - wd * 0.5), (sx * wd, L * 0.88, zb)], wd * 0.045, 8, 0)
            mt.box(wd * 0.7, wd * 0.12, wd * 0.85, 1, c=(0, L * 0.5, zb - wd * 0.36))
        else:
            mt.box(wd * 0.5, L * 0.5, wd * 0.08, 1, c=(0, L * 0.5, zb - wd * 0.12))
            for f in (0.3, 0.43, 0.57, 0.7):
                mt.box(wd * 0.5, wd * 0.06, wd * 0.2, 1, c=(0, L * f, zb - wd * 0.04))
        k.part(f'{l.seg_names[i].capitalize()}Tendon_{l.name}', mt, b, ('cable', 'steel'), stage=k.st('hydraulics'),
               share=key + 'td')
        mh = Mesh()
        xs = wd * 0.62
        pts = [(xs, L * f, wd * 0.15 * math.sin(f * 9.0)) for f in [0.18 + 0.64 * q / 12 for q in range(13)]]
        mh.sweep(pts, wd * 0.05, 8, 0)
        k.part(f'{l.seg_names[i].capitalize()}Hose_{l.name}', mh, b, ('cable',), stage=k.st('hydraulics'), share=key + 'hs')


def foot(k, l, style):
    rb = l.ball
    # the ball rides the last segment
    mb = Mesh()
    sphere(mb, rb * 0.78, (0, l.segs[-1], 0), 0)
    k.part(f'Ball_{l.name}', mb, l.bone(l.n - 1), ('steel',), stage=k.st('feet'), share=f'ball{rb:.3f}')
    # socket hub on the foot bone (origin = ball centre, Y forward, Z up)
    mh = Mesh()
    mh.cyl(rb * 0.98, rb * 0.5, 'Z', 32, 0, c=(0, 0, -rb * 0.5), r2=rb * 0.8)
    mh.ring(rb * 0.86, rb * 0.6, rb * 0.1, 'Z', 32, 1, c=(0, 0, -rb * 0.22))
    for a in l.digits:
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        c = (sa * rb * 0.75, ca * rb * 0.75, -rb * 0.42)
        for sx in (-1, 1):            # two cheeks hold each toe's pin
            mh.box(rb * 0.12, rb * 0.55, rb * 0.5, 0, M=T(*c) @ RZ(-a) @ T(sx * rb * 0.3, -rb * 0.1, 0))
    k.part(f'FootHub_{l.name}', mh, f'foot_{l.name}', ('joint', 'steel'), stage=k.st('feet'), bevel=0.02 * rb,
           share=f'hub{rb:.3f}{len(l.digits)}')
    for d in range(len(l.digits)):
        toe(k, l, d, style)


def toe(k, l, d, style, finger=False):
    rb = l.ball
    L = l.digit_len * (0.7 if (l.digits[d] == 180.0) else 1.0)
    th = rb * (0.42 if not finger else 0.36)
    m = Mesh()
    m.cyl(th * 0.62, th * 1.3, 'X', 20, 0, c=(0, 0, 0))
    m.taper(L * 0.62, th * 1.0, th * 0.95, th * 0.85, th * 0.8, 1, y0=th * 0.3, dz0=th * 0.2, dz1=th * 0.42)
    tip = T(0, L * 0.62, th * 0.42) @ RX(-14 if not finger else -30)
    m.taper(L * 0.4, th * 0.85, th * 0.8, th * 0.35, th * 0.3, 1, M=tip)
    if not finger:
        m.box(th * 0.8, L * 0.3, th * 0.25, 3, M=tip @ T(0, L * 0.2, -th * 0.45))
    if style == 'ceramic':
        m.shell([(L * f, th * 0.62, th * 0.6, 2.4, 0, th * 0.55) for f in (0.08, 0.3, 0.52)], 0.05 * PI, 0.95 * PI,
                th * 0.12, 10, 2)
    mats = ('joint', 'frame' if style == 'ceramic' else 'accent', 'shell' if style == 'ceramic' else 'metal', 'rubber')
    k.part(f'{"Finger" if finger else "Toe"}{d}_{l.name}', m, f'digit{d}_{l.name}', mats,
           stage=k.st('feet'), bevel=0.02 * th, share=f'toe{L:.3f}{th:.3f}{style}{finger}')


def hand(k, l, style):
    rb = l.ball
    m = Mesh()
    m.box(rb * 1.4, rb * 1.6, rb * 0.9, 0, c=(0, rb * 0.6, 0))
    m.cyl(rb * 0.6, rb * 1.6, 'X', 20, 1, c=(0, 0, 0))
    k.part(f'Palm_{l.name}', m, f'hand_{l.name}', ('joint', 'steel'), stage=k.st('lower'), bevel=0.03 * rb)
    for d in range(len(l.digits)):
        toe(k, l, d, style, finger=True)


def actuators(k, l, style):
    w, r = dims(l)
    for j in range(l.n):
        if not (l.acts[j] if j < len(l.acts) else 0):
            continue
        jn = l.joint_names[j]
        a = l.anchors.get(jn)
        if not a or 'Bl' not in a:
            continue
        rr = a['r']
        Bl, Rl = a['Bl'], a['Rl']
        e = 1.1 * rr
        cyl_b, rod_b = f'act_{jn}_{l.name}_cyl', f'act_{jn}_{l.name}_rod'
        mb = Mesh()
        mb.torus(rr * 0.8, rr * 0.28, 'X', 20, 8, 0, c=(0, 0, 0))
        mb.box(rr * 0.6, e * 0.9, rr * 0.9, 0, c=(0, e * 0.55, 0))
        mb.cyl(rr, Bl, 'Y', 24, 1, c=(0, e + Bl / 2, 0))
        mb.ring(rr * 1.12, rr * 0.55, rr * 0.35, 'Y', 24, 2, c=(0, e + Bl - rr * 0.15, 0))      # gland
        mb.ring(rr * 1.1, rr * 0.9, rr * 0.3, 'Y', 24, 0, c=(0, e + rr * 0.3, 0))
        mb.cyl(rr * 0.25, rr * 0.5, 'Z', 8, 2, c=(0, e + Bl * 0.82, rr * 1.05))                 # port
        k.part(f'Barrel_{jn}_{l.name}', mb, cyl_b, ('steel', 'frame' if style == 'ceramic' else 'accent', 'steel'),
               stage=k.st('hydraulics'), bevel=0.0, share=f'brl{Bl:.3f}{rr:.3f}{style}')
        mr = Mesh()
        mr.torus(rr * 0.8, rr * 0.28, 'X', 20, 8, 0, c=(0, 0, 0))
        mr.box(rr * 0.6, e * 0.9, rr * 0.9, 0, c=(0, e * 0.55, 0))
        mr.cyl(rr * 0.48, Rl, 'Y', 20, 1, c=(0, e + Rl / 2, 0))
        k.part(f'Rod_{jn}_{l.name}', mr, rod_b, ('steel', 'steel'), stage=k.st('hydraulics'),
               share=f'rod{Rl:.3f}{rr:.3f}')
        # lugs: from the beam out to each eye, a pair of cheeks and a pin
        up_b = f'hip_{l.name}' if j == 0 else l.bone(j - 1)
        L_up = (l.coxa if l.kind == 'insect' else l.hip_drop) if j == 0 else l.segs[j - 1]
        lug(k, f'LugUp_{jn}_{l.name}', up_b, (a['lat'], L_up - a['a_up'], a['h_up']), rr, w, style)
        lug(k, f'LugLo_{jn}_{l.name}', l.bone(j), (a['lat'], a['a_lo'], a['h_lo']), rr, w, style)


def lug(k, name, bone, p, rr, w, style):
    x, y, z = p
    m = Mesh()
    zb = math.copysign(min(abs(z), w * 0.35), z)
    span = abs(z - zb) + rr * 1.0
    zc = (z + zb) / 2 + math.copysign(rr * 0.25, z)
    for sx in (-1, 1):
        m.box(rr * 0.35, rr * 2.0, span, 0, c=(x + sx * rr * 0.9, y, zc))
        m.cyl(rr * 0.95, rr * 0.35, 'X', 20, 0, c=(x + sx * rr * 0.9, y, z))
    if abs(x) > w * 0.4:                 # a web back to the beam when the actuator sits beside it
        m.box(abs(x) - w * 0.35 + rr, rr * 1.6, rr * 0.6, 0, c=((x + math.copysign(w * 0.35, x)) / 2, y, zb))
    m.cyl(rr * 0.3, rr * 2.6, 'X', 12, 1, c=(x, y, z))
    k.part(name, m, bone, ('metal' if style == 'ceramic' else 'accent', 'steel'), stage=k.st('hydraulics'),
           bevel=0.01 * w)


# ---- neck and head ----------------------------------------------------------------------------------------------
def neck(k, width=0.9, style='ceramic', rung=0.7):
    """A ladder neck: twin side rails, rungs, a drum at each link's base, a cable bundle underneath, ceramic spine
    plates on top (ceramic style)."""
    links = k.kin.neck
    for i, (L, ang) in enumerate(links):
        b = f'neck_{i + 1:02d}'
        tp = 1.0 - 0.35 * i / max(1, len(links))
        W = width * tp
        m = Mesh()
        r = W * 0.45
        drum(m, 0.0, r, W * 0.7, (0, 1, 2))
        pin(m, 0.0, r * 0.3, W * 1.5, 1)
        for sx in (-1, 1):
            m.taper(L - r * 0.3, W * 0.14, W * 0.32, W * 0.12, W * 0.28, 3, M=T(sx * W * 0.42, 0, 0), y0=r * 0.2)
            m.cyl(r * 0.85, W * 0.14, 'X', 24, 3, c=(sx * W * 0.42, L, 0))
        nr = max(1, int(L / rung))
        for q in range(nr):
            yy = r + (L - 2 * r) * (q + 0.5) / nr
            m.cyl(W * 0.06, W * 0.84, 'X', 10, 1, c=(0, yy, -W * 0.05))
        mats = ('joint', 'steel', 'shell' if style == 'ceramic' else 'accent', 'frame' if style == 'ceramic' else 'metal')
        k.part(f'Neck{i + 1:02d}', m, b, mats, stage=k.st('neck'), bevel=0.015 * W)
        mc = Mesh()
        mc.sweep([(sx, L * f, -W * 0.38 - 0.05 * W * math.sin(f * 6)) for sx, f in
                  [(0.0, 0.0), (0.0, 0.25), (0.0, 0.5), (0.0, 0.75), (0.0, 1.0)]], W * 0.1, 10, 0)
        for sx in (-0.18, 0.18):
            mc.sweep([(sx * W, L * f, -W * 0.3) for f in (0.0, 0.5, 1.0)], W * 0.05, 8, 0)
        k.part(f'NeckCable{i + 1:02d}', mc, b, ('cable',), stage=k.st('neck'))
        if style == 'ceramic':
            ms = Mesh()
            ms.shell([(L * f, W * 0.5, W * 0.3, 2.4, 0, W * 0.18) for f in (0.24, 0.48, 0.72)], 0.12 * PI, 0.88 * PI,
                     W * 0.06, 12, 0)
            k.part(f'NeckPlate{i + 1:02d}', ms, b, ('shell',), stage=k.st('shells'), bevel=0.01 * W)


def whisker(k, name, bone, length, r0, mat='steel'):
    m = Mesh()
    m.cyl(r0 * 1.8, r0 * 3, 'Y', 10, 0, c=(0, r0 * 1.5, 0))
    m.tube((0, 0, 0), (0, length, 0), r0, 8, 0, r2=r0 * 0.25)
    k.part(name, m, bone, (mat,), stage=k.st('head'))
