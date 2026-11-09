"""Parts shared by the shots of APERTURE. Everything is built from numbers, in metres (1 mm = 0.001)."""
import math

from pf import draw, geo, mat

MM = 0.001
TAU = math.tau

# iris geometry (mm)
N_BLADES = 9
R_PIVOT = 19.5      # pivot circle
R_IN = 12.6         # inner edge of a blade (the hole when fully open)
R_OUT = 23.0        # outer edge: wide crescents, so the stopped-down iris has no gaps
SPAN = (-9.0, 104.0)  # degrees of arc a blade covers, measured from its pivot
T_BLADE = 0.12      # blade thickness
R_MIN = 2.4         # smallest clear radius the blades can make without opening gaps (checked numerically)


def blade_outline():
    """One blade in its pivot's frame: pivot at the origin, lens axis at (-R_PIVOT, 0). An arc of ring with round ends."""
    a0, a1 = math.radians(SPAN[0]), math.radians(SPAN[1])
    n = 40
    pts = []
    for i in range(n + 1):                                   # outer edge, a0 → a1
        a = a0 + (a1 - a0) * i / n
        pts.append((-R_PIVOT + R_OUT * math.cos(a), R_OUT * math.sin(a)))
    rm, rr = (R_IN + R_OUT) / 2, (R_OUT - R_IN) / 2
    cx, cy = -R_PIVOT + rm * math.cos(a1), rm * math.sin(a1)  # round tip
    for i in range(1, 12):
        b = a1 + math.pi * i / 12
        pts.append((cx + rr * math.cos(b), cy + rr * math.sin(b)))
    for i in range(n + 1):                                   # inner edge, a1 → a0
        a = a1 + (a0 - a1) * i / n
        pts.append((-R_PIVOT + R_IN * math.cos(a), R_IN * math.sin(a)))
    cx, cy = -R_PIVOT + rm * math.cos(a0), rm * math.sin(a0)  # round heel
    for i in range(1, 12):
        b = a0 + math.pi + math.pi * i / 12
        pts.append((cx + rr * math.cos(b), cy + rr * math.sin(b)))
    return [(x * MM, y * MM) for x, y in pts]


def opening(phi):
    """Radius (mm) of the clear hole when every blade is turned by phi radians about its pivot."""
    a0, a1 = math.radians(SPAN[0]), math.radians(SPAN[1])
    best = 1e9
    c, s = math.cos(phi), math.sin(phi)
    for i in range(200):
        a = a0 + (a1 - a0) * i / 199
        x, y = -R_PIVOT + R_IN * math.cos(a), R_IN * math.sin(a)
        xr, yr = x * c - y * s, x * s + y * c
        best = min(best, math.hypot(xr + R_PIVOT, yr))
    return best


def phi_for(radius_mm):
    """Blade angle that leaves a hole of the given radius (bisection on opening())."""
    radius_mm = max(radius_mm, R_MIN)
    lo, hi = 0.0, math.radians(55)
    for _ in range(40):
        mid = (lo + hi) / 2
        if opening(mid) > radius_mm:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def iris(s, name='iris', housing=True, barrel=True, mats=None, label='APERTURE  1:1.4  f=50mm      No 090721      MADE WITH PYTHON     '):
    """Nine-blade iris on the Z axis, centred on the origin, front toward +Z. Returns (root empty, blades).
    Turn each blade about its local Z by phi_for(r) to stop down — see set_iris()."""
    m = mats or materials()
    root = geo.empty(name)
    proto = geo.prism(name + '_blade', blade_outline(), T_BLADE * MM, bevel=0.035 * MM, bevel_seg=2, mat=m['blade'])
    blades = []
    for i in range(N_BLADES):
        a = TAU * i / N_BLADES
        piv = geo.empty(f'{name}_pivot{i}', (R_PIVOT * MM * math.cos(a), R_PIVOT * MM * math.sin(a), 0), parent=root)
        piv.rotation_euler = (0, 0, a)
        tilt = geo.empty(f'{name}_tilt{i}', parent=piv)
        tilt.rotation_euler = (math.radians(-0.8), 0, 0)      # each blade climbs over the next, like a real stack
        b = proto if i == 0 else geo.clone(proto, f'{name}_blade{i}')
        b.parent = tilt
        blades.append(b)
    if housing:
        # retaining ring in front of the blades: turned brass, engraved and paint-filled, two spanner notches
        im, d, ppm = strip(20.15, 3.7)
        draw.text(d, (im.width / 2, im.height / 2), label, round(2.3 * ppm), fill=(236, 230, 214), tracking=0.16)
        ring_m = mat.engraved(name + '_ring', '#b08a48', draw.save(s, name + '_ring', im), ('disc', 18.3 * MM, 22.0 * MM),
                              rough=0.3, grain=0.9, wear=0.35, scale=45, tarnish='#96743a', depth=0.8)
        ring = geo.lathe(name + '_ring', geo.rrect_profile(17.0 * MM, 25.0 * MM, 0.5 * MM, 1.9 * MM, 0.22 * MM, 4),
                         seg=240, mat=ring_m, parent=root)
        for k in (0, 1):
            cut = geo.box(name + '_notch', (1.6 * MM, 1.3 * MM, 1.2 * MM),
                          loc=((1 - 2 * k) * 17.2 * MM * math.cos(1.1), (1 - 2 * k) * 17.2 * MM * math.sin(1.1), 1.9 * MM))
            cut.rotation_euler = (0, 0, 1.1)
            geo.boolean(ring, cut)
        geo.shade(ring, 35)
        # the stepped black seat under it and the plate behind the blades
        geo.lathe(name + '_seat', [(15.0 * MM, 0.35 * MM), (17.0 * MM, 0.35 * MM), (17.0 * MM, 1.2 * MM),
                                   (16.2 * MM, 1.2 * MM), (15.8 * MM, 0.8 * MM), (15.0 * MM, 0.8 * MM)],
                  seg=200, mat=m['black'], parent=root)
        geo.lathe(name + '_back', geo.rrect_profile(13.6 * MM, 25.0 * MM, -1.4 * MM, -0.5 * MM, 0.15 * MM), seg=200,
                  mat=m['black'], parent=root)
        # slotted brass screws holding the ring
        head = geo.cyl(name + '_screw', 0.95 * MM, 0.55 * MM, seg=28, bevel_w=0.14 * MM, mat=m['steel'])
        geo.boolean(head, geo.box(name + '_slot', (2.4 * MM, 0.26 * MM, 0.4 * MM), loc=(0, 0, 0.3 * MM)))
        geo.shade(head, 35)
        rs = s.rng('screws')
        for i in range(5):
            a = 0.35 + TAU * i / 5
            c = head if i == 0 else geo.clone(head, f'{name}_screw{i}')
            c.parent = root
            c.location = (23.5 * MM * math.cos(a), 23.5 * MM * math.sin(a), 1.95 * MM)
            c.rotation_euler = (0, 0, rs.uniform(0, TAU))
        # the barrel wall round it: black, with the fine anti-reflection threads of a real lens
        prof = [(25.0 * MM, -6 * MM)]
        z = -6.0 if barrel else 1e9
        while z < 9.0:
            prof += [(25.0 * MM, z * MM), (25.45 * MM, (z + 0.3) * MM)]
            z += 0.6
        prof += [(25.0 * MM, 9 * MM), (30.0 * MM, 9 * MM), (30.0 * MM, -6 * MM)]
        if barrel:
            geo.lathe(name + '_barrel', prof, seg=200, mat=m['black'], parent=root, angle=50)
    return root, blades


def set_iris(s, blades, radius_fn):
    """Animate the iris: radius_fn(f) → clear radius in mm at frame f."""
    for b in blades:
        s.animate(b, lambda f, b=b: {'rotation_euler': (0, 0, phi_for(radius_fn(f)))})


def materials():
    """The metals of the lens. scale=45: the detail is sized for parts a few centimetres across, seen in macro."""
    return dict(
        blade=mat.metal('blade', '#17181c', rough=0.24, brushed='linear', grain=1.2, wear=0.25, scale=45,
                        tarnish='#1c2028'),
        brass=mat.metal('brass', '#c9a25a', rough=0.24, brushed='radial', grain=0.9, wear=0.12, scale=45),
        steel=mat.metal('steel', '#c2c5c9', rough=0.22, brushed='radial', grain=0.4, wear=0.3, scale=45),
        black=mat.metal('black_anod', '#0c0c0e', rough=0.45, brushed='radial', grain=0.8, wear=0.4, scale=45),
        chrome=mat.metal('chrome', '#d9dbde', rough=0.12, brushed='radial', grain=0.25, wear=0.4, scale=45),
        satin=mat.metal('satin', '#c4c7cb', rough=0.3, brushed='linear', grain=0.9, wear=0.3, scale=30),
        lacquer=mat.paint('lacquer', '#0a0a0b', rough=0.28, coat=0.7, peel=0.5, wear=0.3, scale=20),
        leather=mat.leather('leather', '#030303', rough=0.62, cell=1100.0, depth=0.9, spec=0.22),
    )


# ---- the lens ------------------------------------------------------------------------------------
def sag(R, rho):
    return abs(R) - math.sqrt(R * R - rho * rho)


def element(name, r, R1, R2, z_front, tc, glass_m, edge_m, n=28, parent=None):
    """A glass element on the Z axis. R1 = front radius of curvature, R2 = back; positive = bulging outward
    (convex), negative = hollow. z_front = where the front vertex sits (mm), tc = centre thickness (mm)."""
    zf = lambda rho: z_front - math.copysign(sag(R1, rho), R1)
    zb = lambda rho: z_front - tc + math.copysign(sag(R2, rho), R2)
    prof = [(r * i / n * MM, zf(r * i / n) * MM) for i in range(n + 1)]
    prof += [(r * i / n * MM, zb(r * i / n) * MM) for i in range(n, -1, -1)]
    ob = geo.lathe(name, prof, seg=128, closed=False, angle=40, mat=[glass_m, edge_m], parent=parent)
    me = ob.data
    lim = (r * MM) ** 2 * 0.998
    for poly in me.polygons:                                  # the ground, blackened edge of the glass
        if all(me.vertices[v].co.x ** 2 + me.vertices[v].co.y ** 2 >= lim for v in poly.vertices):
            poly.material_index = 1
    return ob, zf(r), zb(r)


def strip(r_mm, band_mm, w=8192):
    """A canvas that wraps once round a part of radius r_mm and is band_mm tall, at the same px/mm both ways
    (so letters keep their shape). Returns (image, draw, px_per_mm)."""
    ppm = w / (TAU * r_mm)
    im, d = draw.canvas(w, max(8, round(band_mm * ppm)))
    return im, d, ppm


def _at(deg, w=8192):
    return (0.5 + deg / 360.0) * w


def lens(s, name='lens', mats=None):
    """The whole 50 mm lens on the Z axis: mount at z = 0, front element toward +Z. Returns (root, parts) where
    parts[name] = dict(ob=…, z=(z0, z1) in mm, e=offset in mm along Z in the exploded view)."""
    m = mats or materials()
    root = geo.empty(name)
    P = {}

    def add(key, ob, z0, z1):
        ob.parent = root
        P[key] = dict(ob=ob, z=(z0, z1), e=0.0)
        return ob

    white, orange, red = (236, 232, 222), (236, 138, 44), (214, 40, 30)

    # mount: chrome ring with three bayonet lugs
    mount = geo.lathe(name + '_mount', [(19.5 * MM, -5 * MM), (23.2 * MM, -5 * MM), (23.2 * MM, -0.6 * MM), (27.5 * MM, -0.6 * MM),
                                        (27.5 * MM, 0), (19.5 * MM, 0)], seg=160, mat=m['chrome'])
    geo.bevel(mount, 0.15 * MM, 2)
    for i in range(3):
        a0 = TAU * i / 3
        lug = geo.prism(f'{name}_lug{i}', [(x * MM, y * MM) for x, y in geo.arc(23.0, a0, a0 + 0.9, 12) + geo.arc(25.4, a0 + 0.9, a0, 12)],
                        1.3 * MM, bevel=0.12 * MM, mat=m['chrome'], parent=mount, loc=(0, 0, -4.2 * MM))
    add('mount', mount, -5, 0)

    # rear barrel
    rb = geo.lathe(name + '_rear', [(27.0 * MM, 0.2 * MM), (30.0 * MM, 0.2 * MM), (31.5 * MM, 1.8 * MM), (31.5 * MM, 9 * MM), (27.0 * MM, 9 * MM)],
                   seg=160, mat=m['black'])
    geo.bevel(rb, 0.18 * MM, 2)
    add('rear', rb, 0, 9)

    # aperture ring: engraved stops, two scalloped grips
    im, d, ppm = strip(33.0, 5.3)
    for k, t in enumerate(('1.4', '2', '2.8', '4', '5.6', '8', '11', '16')):
        draw.text(d, (_at(-31.5 + 9 * k), im.height / 2), t, round(2.9 * ppm), fill=white)
    def scallop(th, r, z, i):
        if r < 32.6 * MM:
            return r
        a = math.degrees(math.atan2(math.sin(th), math.cos(th)))
        side = abs(abs(a) - 115)
        if side > 42:
            return r
        fade = util_smooth(1 - side / 42)
        return r - 1.25 * MM * fade * (0.5 - 0.5 * math.cos(math.radians(a) * 36))
    ar = geo.lathe(name + '_stops', geo.rrect_profile(27.5 * MM, 33.0 * MM, 9.5 * MM, 17.0 * MM, 0.35 * MM, 3), seg=720, rmod=scallop,
                   mat=mat.engraved(name + '_stops', '#0d0d0f', draw.save(s, 'stops', im), ('cyl', 10.6 * MM, 15.9 * MM),
                                    rough=0.42, grain=0.8, wear=0.35, scale=45, depth=0.6))
    add('stops', ar, 9.5, 17)

    # index ring: satin chrome with the red index and the depth-of-field scale
    im, d, ppm = strip(32.2, 3.8)
    hgt = im.height
    d.polygon([(_at(0) - 0.8 * ppm, 0.25 * hgt), (_at(0) + 0.8 * ppm, 0.25 * hgt), (_at(0), 0.8 * hgt)], fill=red)
    for a, t in ((9, '4'), (18, '8'), (27, '16')):
        for sg in (-1, 1):
            d.line([(_at(sg * a), 0.12 * hgt), (_at(sg * a), 0.5 * hgt)], fill=(24, 24, 26), width=max(2, round(0.22 * ppm)))
            draw.text(d, (_at(sg * a), 0.74 * hgt), t, round(1.5 * ppm), fill=(24, 24, 26))
    ir = geo.lathe(name + '_index', geo.rrect_profile(27.5 * MM, 32.2 * MM, 17.4 * MM, 21.6 * MM, 0.3 * MM, 3), seg=240,
                   mat=mat.engraved(name + '_index', '#c9ccd0', draw.save(s, 'index', im), ('cyl', 17.6 * MM, 21.4 * MM),
                                    rough=0.3, grain=0.9, wear=0.08, scale=45, depth=0.5, fill_rough=0.45))
    add('index', ir, 17.4, 21.6)

    # focus ring: distance scale (metres white, feet orange) and a ribbed grip
    im, d, ppm = strip(32.6, 5.7)
    hgt = im.height
    for k, (tm, tf) in enumerate((('0.45', '1.5'), ('0.5', '1.7'), ('0.6', '2'), ('0.7', '2.3'), ('0.8', '2.6'), ('1', '3.3'),
                                  ('1.2', '4'), ('1.5', '5'), ('2', '7'), ('3', '10'), ('5', '15'), ('10', '30'), ('\u221e', '\u221e'))):
        a = -84 + 14 * k
        draw.text(d, (_at(a), 0.27 * hgt), tf, round(2.0 * ppm), fill=orange)
        draw.text(d, (_at(a), 0.72 * hgt), tm, round(2.5 * ppm), fill=white)
    draw.text(d, (_at(100), 0.27 * hgt), 'ft', round(2.0 * ppm), fill=orange)
    draw.text(d, (_at(100), 0.72 * hgt), 'm', round(2.4 * ppm), fill=white)
    def ribs(th, r, z, i):
        if r < 33.9 * MM or not (29.5 * MM < z < 39.6 * MM):
            return r
        return r - 0.75 * MM * (0.5 - 0.5 * max(-1.0, min(1.0, math.cos(th * 96) * 2.4)))
    prof = [(28.2 * MM, 22.0 * MM), (32.6 * MM, 22.0 * MM), (32.6 * MM, 28.2 * MM), (33.4 * MM, 28.8 * MM), (34.0 * MM, 29.4 * MM)]
    prof += [(34.0 * MM, (29.6 + 0.5 * k) * MM) for k in range(21)]
    prof += [(34.0 * MM, 39.8 * MM), (33.3 * MM, 40.4 * MM), (28.2 * MM, 40.4 * MM)]
    fr = geo.lathe(name + '_focus', prof, seg=960, rmod=ribs, angle=40,
                   mat=mat.engraved(name + '_focus', '#0c0c0e', draw.save(s, 'focus', im), ('cyl', 22.3 * MM, 28.0 * MM),
                                    rough=0.42, grain=0.8, wear=0.35, scale=45, depth=0.6))
    add('focus', fr, 22, 40.4)

    # front barrel with the filter thread, and the name ring round the front element
    prof = [(28.6 * MM, 40.8 * MM), (32.0 * MM, 40.8 * MM), (32.0 * MM, 47.5 * MM), (30.4 * MM, 47.5 * MM)]
    z = 47.2
    while z > 44.6:
        prof += [(30.4 * MM, z * MM), (29.9 * MM, (z - 0.25) * MM)]
        z -= 0.5
    prof += [(30.4 * MM, 44.4 * MM), (28.6 * MM, 44.4 * MM)]
    fb = geo.lathe(name + '_front', prof, seg=240, mat=m['black'], angle=50)
    im, d, ppm = strip(25.1, 5.0)
    draw.text(d, (im.width / 2, im.height / 2), 'APERTURE   1:1.4 / 50          \u00d858          No 090721          ', round(2.9 * ppm),
              fill=white, tracking=0.14)
    nr = geo.lathe(name + '_name', [(21.6 * MM, 43.2 * MM), (28.6 * MM, 44.4 * MM), (28.6 * MM, 43.6 * MM), (21.6 * MM, 42.4 * MM)], seg=240,
                   mat=mat.engraved(name + '_name', '#0c0c0e', draw.save(s, 'name', im), ('disc', 22.6 * MM, 27.6 * MM),
                                    rough=0.4, grain=0.6, wear=0.3, scale=45, depth=0.5), parent=fb)
    add('front', fb, 40.8, 47.5)

    # helicoid: the brass focusing thread hidden inside
    prof = [(25.6 * MM, 10.0 * MM)]
    z = 10.0
    while z < 38.0:
        prof += [(27.3 * MM, z * MM), (26.7 * MM, (z + 0.45) * MM)]
        z += 0.9
    prof += [(27.3 * MM, 38.0 * MM), (25.6 * MM, 38.0 * MM)]
    add('helicoid', geo.lathe(name + '_helicoid', prof, seg=200, mat=m['brass'], angle=50), 10, 38)
    add('tube', geo.lathe(name + '_tube', geo.rrect_profile(22.2 * MM, 25.5 * MM, 0.5 * MM, 43.0 * MM, 0.2 * MM), seg=128,
                          mat=m['black']), 0.5, 43)

    # iris unit
    iroot, blades = iris(s, name + '_iris', barrel=False, mats=m)
    iroot.location = (0, 0, 21.0 * MM)
    add('iris', iroot, 19.6, 23.0)

    # glass: six elements, each coating a different thickness so every surface reflects its own colour
    edge = mat.matte(name + '_edge', '#060606', 0.6)
    spec = [('g1', 21.4, 36, -120, 42.6, 7.4, 115), ('g2', 18.5, 26, -40, 33.6, 4.6, 205), ('g3', 16.0, -60, -22, 27.6, 1.8, 150),
            ('g4', 15.0, -24, 80, 17.4, 1.8, 240), ('g5', 16.0, 70, 30, 13.6, 4.4, 130), ('g6', 15.0, 44, 60, 6.4, 4.6, 190)]
    for key, r, R1, R2, zf, tc, coat in spec:
        ob, z_e0, z_e1 = element(f'{name}_{key}', r, R1, R2, zf, tc,
                                 mat.glass(f'{name}_{key}', ior=1.62 if key in ('g3', 'g4') else 1.52, coating=coat), edge)
        add(key, ob, zf - tc - 1.5, zf + 0.5)

    order = ['mount', 'rear', 'g6', 'g5', 'stops', 'g4', 'index', 'iris', 'g3', 'helicoid', 'g2', 'focus', 'g1', 'front']
    cursor, centres = 0.0, {}
    for key in order:
        z0, z1 = P[key]['z']
        centres[key] = cursor + (z1 - z0) / 2
        cursor += (z1 - z0) + 7.0
    shift = centres['iris'] - sum(P['iris']['z']) / 2
    for key in order:
        P[key]['e'] = centres[key] - shift - sum(P[key]['z']) / 2
    P['tube']['e'] = P['helicoid']['e']          # the inner tube rides inside the helicoid
    return root, P, blades


def util_smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


# ---- the camera body ---------------------------------------------------------------------------------
BODY_W, BODY_D, BODY_H = 140.0, 33.0, 52.0      # leather-covered middle of the body (mm)
MOUNT_X, MOUNT_Z = 6.0, -3.0                     # lens axis on the front of the body


def body(s, name='body', mats=None, with_lens=True):
    """A 35 mm rangefinder body, front toward -Y, standing on z = 0. Returns (root, lens_root, parts, blades):
    the lens is built with it (with_lens) and sits on the mount; move lens_root to take it off."""
    m = mats or materials()
    root = geo.empty(name)
    zc = 8.0 + BODY_H / 2                         # centre height of the leather section
    outline = [(x * MM, y * MM) for x, y in geo.rrect(BODY_W, BODY_D, 11.0, 10)]
    geo.prism(name + '_shell', outline, BODY_H * MM, bevel=0.5 * MM, mat=m['leather'], parent=root, loc=(0, 0, zc * MM))
    top_o = [(x * MM, y * MM) for x, y in geo.rrect(BODY_W + 0.8, BODY_D + 0.8, 11.4, 10)]
    geo.prism(name + '_base', top_o, 8.0 * MM, bevel=0.9 * MM, bevel_seg=4, mat=m['lacquer'], parent=root, loc=(0, 0, 4.0 * MM))
    top_z = 8.0 + BODY_H + 8.5
    geo.prism(name + '_top', top_o, 17.0 * MM, bevel=1.1 * MM, bevel_seg=4, mat=m['lacquer'], parent=root, loc=(0, 0, top_z * MM))
    tz = (8.0 + BODY_H + 17.0) * MM               # top surface

    # speed dial with engraved numbers, shutter button in its collar, advance lever, rewind knob, accessory shoe
    im, d, ppm = strip(6.4, 3.6, 4096)
    for k, t in enumerate(('B', '1', '2', '4', '8', '15', '30', '60', '125', '250', '500', '1000')):
        draw.text(d, ((k + 0.5) / 12 * im.width, im.height / 2), t, round((1.9 if len(t) < 4 else 1.5) * ppm),
                  fill=(236, 232, 222) if t != '60' else (214, 60, 40))
    knurl = lambda th, r, z, i: r - (0.35 * MM * (0.5 - 0.5 * math.cos(th * 60)) if r > 8.9 * MM and abs(z) < 2.2 * MM else 0)
    geo.lathe(name + '_dial', geo.rrect_profile(0, 9.2 * MM, -2.8 * MM, 2.8 * MM, 0.4 * MM, 3)[:-4] + [(0, 2.8 * MM)], seg=360, closed=False,
              rmod=knurl, parent=root, loc=(34 * MM, 1 * MM, tz + 2.8 * MM),
              mat=mat.engraved(name + '_dial', '#0c0c0e', draw.save(s, 'dial', im), ('disc', 4.6 * MM, 8.2 * MM), rough=0.35,
                               grain=0.6, wear=0.3, scale=45, depth=0.5))
    geo.cyl(name + '_collar', 6.4 * MM, 3.0 * MM, seg=64, bevel_w=0.5 * MM, mat=m['chrome'], parent=root, loc=(52 * MM, -3 * MM, tz + 1.5 * MM))
    geo.cyl(name + '_button', 3.6 * MM, 3.4 * MM, seg=48, bevel_w=0.8 * MM, mat=m['chrome'], parent=root, loc=(52 * MM, -3 * MM, tz + 3.4 * MM))
    lever = [(x * MM, y * MM) for x, y in geo.arc(7.5, 0.5, TAU - 0.9, 28) + [(22, -9.5), (27, -7.5), (27.5, -3.5), (9, 2.5)]]
    geo.prism(name + '_lever', lever, 2.6 * MM, bevel=0.6 * MM, mat=m['lacquer'], parent=root, loc=(52 * MM, -3 * MM, tz + 1.3 * MM)
              ).rotation_euler = (0, 0, math.radians(200))
    geo.lathe(name + '_rewind', geo.rrect_profile(0, 8.6 * MM, -3.2 * MM, 3.2 * MM, 0.5 * MM, 3)[:-4] + [(0, 3.2 * MM)], seg=360, closed=False,
              rmod=knurl, mat=m['chrome'], parent=root, loc=(-52 * MM, 0, tz + 3.2 * MM))
    geo.box(name + '_shoe', (19 * MM, 18 * MM, 1.4 * MM), bevel_w=0.3 * MM, mat=m['chrome'], parent=root, loc=(-4 * MM, 3 * MM, tz + 0.7 * MM))
    for sx in (-1, 1):
        geo.box(name + '_rail', (2.0 * MM, 18 * MM, 2.6 * MM), bevel_w=0.3 * MM, mat=m['chrome'], parent=root,
                loc=((-4 + sx * 9.5) * MM, 3 * MM, tz + 2.0 * MM))

    # windows in the front of the top plate: viewfinder, frame-line window, rangefinder
    fy = -(BODY_D / 2 + 0.4) * MM
    glass = mat.glass(name + '_window', tint='#c8d6e0', ior=1.5, coating=140)
    for key, x, w, h in (('vf', -50, 17, 11), ('fl', -12, 14, 8), ('rf', 30, 9, 7)):
        geo.box(f'{name}_{key}_frame', (w * MM + 2.4 * MM, 1.6 * MM, h * MM + 2.4 * MM), bevel_w=0.5 * MM, mat=m['black'], parent=root,
                loc=(x * MM, fy - 0.1 * MM, top_z * MM))
        geo.box(f'{name}_{key}', (w * MM, 1.2 * MM, h * MM), bevel_w=0.3 * MM, mat=glass if key != 'fl' else mat.plastic(name + '_frost', '#d8dce0', 0.6),
                parent=root, loc=(x * MM, fy - 0.75 * MM, top_z * MM))
    # mount ring, release button, strap lugs
    geo.lathe(name + '_mountring', geo.rrect_profile(24.0 * MM, 31.5 * MM, 0, 3.2 * MM, 0.5 * MM, 3), seg=160, mat=m['chrome'], parent=root,
              loc=(MOUNT_X * MM, fy, (zc + MOUNT_Z) * MM)).rotation_euler = (math.radians(90), 0, 0)
    geo.cyl(name + '_release', 3.2 * MM, 3.0 * MM, seg=40, bevel_w=0.6 * MM, mat=m['chrome'], parent=root,
            loc=((MOUNT_X + 37) * MM, fy - 1.0 * MM, (zc + MOUNT_Z - 12) * MM)).rotation_euler = (math.radians(90), 0, 0)
    for sx in (-1, 1):
        geo.cyl(f'{name}_lug', 2.6 * MM, 3.0 * MM, seg=32, bevel_w=0.6 * MM, mat=m['chrome'], parent=root,
                loc=(sx * (BODY_W / 2 + 1.0) * MM, 0, (top_z - 3) * MM)).rotation_euler = (0, math.radians(90), 0)
    lroot = P = blades = None
    if with_lens:
        lroot, P, blades = lens(s, name + '_lens', m)
        lroot.parent = root
        lroot.location = (MOUNT_X * MM, fy - 3.2 * MM, (zc + MOUNT_Z) * MM)
        lroot.rotation_euler = (math.radians(90), 0, 0)
    return root, lroot, P, blades


def lens_axis_height():
    return (8.0 + BODY_H / 2 + MOUNT_Z) * MM
