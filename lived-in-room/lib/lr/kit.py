"""The words every room needs: boards, books, cups, lamps, screens, cloth, cables. Each builder returns ONE object
(not yet in the room — hand it to r.put / r.hang / r.stick / r.suspend / r.lean / r.fix with its kind and why).

These are generic on purpose. The things that make a room THIS person's room — their instrument, their tools, the
thing their grandmother made — are built in the project's props.py from the same Part calls. Sizes are arguments:
look the real ones up and pass them.
"""
import math

from PIL import Image

from . import draw, geo, mat
from .geo import Part

TAU = math.tau
__all__ = ['Part']          # kit.Part is the same builder as lr.geo.Part: small one-off things are made inline


def _m(x, default):
    return x if x is not None else default()


# ---- furniture --------------------------------------------------------------------------------------
def shelf_unit(w=0.8, h=1.8, d=0.3, shelves=5, board=0.018, body=None, back=True, name='shelf'):
    """Open shelving. The object knows its shelves: r.put(thing, on=unit, level=i, rel=(u, v)) lands on shelf i
    (0 = the lowest) and refuses a thing taller than the gap."""
    m = _m(body, lambda: mat.wood())
    p = Part(name)
    for sx in (-1, 1):
        p.box((board, d, h), at=(sx * (w / 2 - board / 2), 0, 0), mat=m, bevel=0.001)
    pitch = (h - board) / shelves
    for k in range(shelves + 1):
        p.box((w - 2 * board, d, board), at=(0, 0, k * pitch), mat=m, bevel=0.001)
    if back:
        p.box((w - 2 * board, 0.004, h - 2 * board), at=(0, d / 2 - 0.002, board), mat=m, bevel=0)
    ob = p.build()
    ob['lr_levels'] = [k * pitch + board for k in range(shelves)]
    ob['lr_clear'] = [pitch - board] * shelves
    return ob


def wall_shelf(w=0.8, d=0.2, board=0.018, body=None, brackets=2, name='wall shelf'):
    """One board on brackets, for r.fix(wall=…): back on y = 0, origin at the middle of the board's underside."""
    m = _m(body, lambda: mat.wood())
    steel = mat.metal('#d8d8d6', rough=0.5)
    p = Part(name)
    p.box((w, d, board), at=(0, -d / 2, 0), mat=m, bevel=0.0015)
    for i in range(brackets):
        x = -w / 2 + w * (i + 0.5) / brackets
        p.box((0.02, d * 0.8, 0.003), at=(x, -d * 0.4, -0.003), mat=steel, bevel=0)
        p.box((0.02, 0.003, d * 0.6), at=(x, -0.0015, -d * 0.6), mat=steel, bevel=0)
    ob = p.build()
    return ob


def desk(w=1.2, d=0.6, h=0.72, top=0.025, top_mat=None, leg_mat=None, legs='panel', name='desk'):
    """A table: legs='panel' (two side boards and a back rail) or 'post' (four posts)."""
    mt = _m(top_mat, lambda: mat.wood())
    ml = _m(leg_mat, lambda: mt)
    p = Part(name)
    p.box((w, d, top), at=(0, 0, h - top), mat=mt, bevel=0.002)
    if legs == 'panel':
        for sx in (-1, 1):
            p.box((0.022, d - 0.04, h - top), at=(sx * (w / 2 - 0.03), 0, 0), mat=ml, bevel=0.001)
        p.box((w - 0.082, 0.018, 0.3), at=(0, d / 2 - 0.05, h - top - 0.3), mat=ml, bevel=0.001)
    else:
        t = 0.04 if legs == 'post' else legs
        for sx in (-1, 1):
            for sy in (-1, 1):
                p.box((t, t, h - top), at=(sx * (w / 2 - t / 2 - 0.02), sy * (d / 2 - t / 2 - 0.02), 0), mat=ml, bevel=0.002)
    return p.build()


def drawers(w=0.4, d=0.5, h=0.6, n=3, ajar=(), body=None, front=None, name='drawers'):
    """A drawer unit. ajar = how far each drawer (top first) was left open, in metres: (0, 0.03, 0)."""
    mb = _m(body, lambda: mat.paint('#d9d6cf', rough=0.45))
    mf = _m(front, lambda: mb)
    steel = mat.metal('#9a9a98', rough=0.35)
    p = Part(name)
    p.box((w, d, h), mat=mb, bevel=0.002)
    hh = (h - 0.02) / n
    for i in range(n):
        a = ajar[i] if i < len(ajar) else 0.0
        z = h - 0.01 - (i + 1) * hh
        if a > 0:
            p.box((w - 0.03, a + 0.01, hh - 0.03), at=(0, -d / 2 - a / 2 + 0.005, z + 0.015), mat=mb, bevel=0)
        p.box((w - 0.006, 0.018, hh - 0.004), at=(0, -d / 2 - 0.009 - a, z + 0.002), mat=mf, bevel=0.0015)
        p.box((w * 0.3, 0.012, 0.008), at=(0, -d / 2 - 0.024 - a, z + hh * 0.72), mat=steel, bevel=0.002)
    return p.build()


def low_table(w=0.6, d=0.4, h=0.28, top_mat=None, leg_mat=None, name='low table'):
    """A folding floor table: a board on two bent-tube legs."""
    mt = _m(top_mat, lambda: mat.wood('#b98a55', '#8a5f35'))
    ml = _m(leg_mat, lambda: mat.metal('#2b2b2c', rough=0.45))
    p = Part(name)
    p.box((w, d, 0.016), at=(0, 0, h - 0.016), mat=mt, bevel=0.003)
    for sx in (-1, 1):
        x = sx * (w / 2 - 0.06)
        p.tube([(x, -d / 2 + 0.05, h - 0.016), (x, -d / 2 + 0.03, 0.008), (x, d / 2 - 0.03, 0.008), (x, d / 2 - 0.05, h - 0.016)], 0.008, mat=ml, seg=8)
    return p.ground(center=False).build()


def stool(r=0.17, h=0.44, seat_mat=None, leg_mat=None, legs=3, name='stool'):
    ms = _m(seat_mat, lambda: mat.wood('#c9a678', '#a17c4f'))
    ml = _m(leg_mat, lambda: ms)
    p = Part(name)
    p.cyl(r, 0.035, at=(0, 0, h - 0.035), mat=ms, bevel=0.006, seg=28)
    for i in range(legs):
        a = TAU * i / legs + 0.4
        top, foot = (0.72 * r * math.cos(a), 0.72 * r * math.sin(a), h - 0.03), (1.05 * r * math.cos(a), 1.05 * r * math.sin(a), 0.012)
        p.tube([top, foot], 0.013, mat=ml, seg=8)
    return p.ground(center=False).build()


# ---- books and paper -------------------------------------------------------------------------------
def book(w=0.022, d=0.15, h=0.21, cover='#3a5a40', title=None, author='', publisher='', fg='#f1ead8', band=None,
         pages='#ece5d2', lying=False, hard=False, name='book', spine_px=None):
    """A book. Upright: thickness w along X, spine on the front (-Y), height h. lying=True: flat, spine still to the
    front, front cover up. title=None leaves the spine plain — letter only the spines the camera gets close to."""
    t = 0.0025 if hard else 0.0008
    mc = mat.paper(cover, rough=0.6, dirt=0.2)
    mp = mat.paper(pages, rough=0.9, dirt=0.3)
    sp = None
    if title:
        px = spine_px or (max(24, int(w * 2600)), max(200, int(h * 2600)))
        img = draw.spine(title, px[0], px[1], bg=cover, fg=fg, author=author, publisher=publisher, band=band)
        sp = mat.picture(f'spine {title}', img, rough=0.6, dirt=0.15)
    inset = 0.003 if hard else 0.0
    p = Part(name)
    p.box((t, d, h), at=(-w / 2 + t / 2, 0, 0), mat=mc, bevel=0)
    p.box((t, d, h), at=(w / 2 - t / 2, 0, 0), mat=mc, bevel=0)
    p.box((w - 2 * t, t, h), at=(0, -d / 2 + t / 2, 0), mat=mc, bevel=0, faces={'front': sp} if sp else None)
    p.box((w - 2 * t, d - t - inset, h - 2 * inset), at=(0, (t - inset) / 2, inset), mat=mp, bevel=0)
    if lying:
        p.turn((0, 90, 0))
        p.ground()
    ob = p.build()
    ob['lr_w'] = h if lying else w
    return ob


def shelve(r, unit, level, books, start=0.012, gap=0.0006, inset=0.012, jitter=0.01, kind='book', why='', stop=None):
    """Stand a row of books (objects from kit.book) on a shelf, left to right, spines near the front edge but not
    lined up (nobody pushes every book in the same). Returns the items; stops when the shelf is full."""
    lo, hi = geo.Part.bounds(_Dummy(unit))
    W, D = hi[0] - lo[0], hi[1] - lo[1]
    rnd = r.rng(f'shelve/{unit.name}/{level}')
    x = start + 0.02
    out = []
    for b in books:
        bw, bd = b.dimensions.x, b.dimensions.y
        if x + bw > (stop if stop is not None else W - 0.02 - start):
            geo.remove(b)
            continue
        v = (inset + rnd.uniform(0, jitter) + bd / 2) / D
        out.append(r.put(b, unit, rel=((x + bw / 2) / W, v), level=level, kind=kind, why=why))
        x += bw + gap
    return out, x


class _Dummy:
    """Lets Part.bounds read an object's local vertices."""
    def __init__(self, ob):
        self.v = [tuple(v.co) for v in ob.data.vertices]


def paper(w=0.21, h=0.297, image=None, color='#f3efe4', name='paper', t=0.0004):
    """A sheet lying flat (a note, a printout, a map). image = Pillow image for its face."""
    m = mat.picture(name, image, rough=0.85, dirt=0.1) if image is not None else None
    p = Part(name)
    p.sheet(w, h, mat=mat.paper(color), image=m, t=t, flat=True)
    return p.build()


def poster(w, h, image, name='poster', t=0.0004, rough=0.7):
    """A print for r.stick(): back on y = 0, origin at its centre."""
    p = Part(name)
    p.sheet(w, h, at=(0, 0, -h / 2), mat=mat.paper('#f1ede2'), image=mat.picture(name, image, rough=rough, dirt=0.1), t=t)
    return p.build()


def note(image=None, w=0.076, h=0.076, color='#f6e36b', curl=7.0, name='note'):
    """A sticky note for r.stick(): glued along its top edge (the origin), the rest standing a few degrees off the
    surface — which is what lets r.flutter() move it."""
    im = image if image is not None else Image.new('RGB', (64, 64), color)
    p = Part(name)
    p.sheet(w, h, at=(0, 0, -h), rot=(0, 0, 0), mat=mat.paper(color), image=mat.picture(name, im, rough=0.8), t=0.0003)
    p.turn((-curl, 0, 0))
    return p.build()


def frame(w, h, image, border=0.018, depth=0.02, frame_mat=None, name='frame'):
    """A framed picture for r.hang(): back on y = 0, origin at the top centre of the back (where the nail goes)."""
    mf = _m(frame_mat, lambda: mat.wood('#3b2a1c', '#22170f', rough=0.4))
    p = Part(name)
    p.box((w - 2 * border + 0.004, 0.004, h - 2 * border + 0.004), at=(0, -0.006, -h + border - 0.002), mat=mat.paper('#e9e4d6'),
          bevel=0, faces={'front': mat.picture(name, image, rough=0.5)})
    for sx in (-1, 1):
        p.box((border, depth, h), at=(sx * (w / 2 - border / 2), -depth / 2, -h), mat=mf, bevel=0.002)
    for z in (-h, -border):
        p.box((w - 2 * border, depth, border), at=(0, -depth / 2, z), mat=mf, bevel=0.002)
    p.box((w - 2 * border, 0.003, h - 2 * border), at=(0, -0.0015, -h + border), mat=mat.paper('#b9a57f'), bevel=0)
    return p.build()


def carton(w=0.4, d=0.3, h=0.25, name='carton', tape=True):
    """A cardboard box, taped shut."""
    card = mat.paper('#b08d5f', rough=0.9, dirt=0.4)
    p = Part(name)
    p.box((w, d, h), mat=card, bevel=0.002)
    if tape:
        p.box((w + 0.002, 0.05, 0.0006), at=(0, 0, h), mat=mat.plastic('#c9b98a', rough=0.25), bevel=0)
    return p.build()


# ---- vessels ---------------------------------------------------------------------------------------
def mug(r=0.041, h=0.094, body=None, handle=True, fill=0.0, liquid='#3a2412', name='mug'):
    """A cup with real walls (hollow). fill = 0..1 of what is left in it."""
    m = _m(body, lambda: mat.ceramic())
    t = 0.004
    p = Part(name)
    p.lathe([(0, 0), (r * 0.9, 0), (r, 0.006), (r, h - 0.002), (r - t / 2, h), (r - t, h - 0.002), (r - t, 0.008), (0, 0.008)], mat=m, seg=28)
    if handle:
        p.tube([(r - 0.002, 0, h * 0.78), (r + 0.022, 0, h * 0.74), (r + 0.028, 0, h * 0.5), (r + 0.02, 0, h * 0.26), (r - 0.002, 0, h * 0.22)], 0.0048, mat=m, seg=8)
    if fill > 0:
        p.cyl(r - t - 0.0003, max(0.002, (h - 0.012) * fill), at=(0, 0, 0.0085), mat=mat.liquid(liquid), seg=28)
    return p.build()


def bottle(r=0.032, h=0.215, fill=0.45, liquid='#7a5a20', label=None, cap='#f2f2f0', glassy=None, name='bottle'):
    """A half-litre bottle, partly drunk: fill = 0..1. label = Pillow image wrapped round the body."""
    g = _m(glassy, lambda: mat.glass('#eef6f2', rough=0.04))
    p = Part(name)
    body_h, neck_r = h * 0.72, r * 0.42
    prof = [(0, 0), (r * 0.9, 0), (r, 0.01), (r, body_h), (r * 0.8, body_h + h * 0.1), (neck_r, h * 0.9), (neck_r, h - 0.012), (0, h - 0.012)]
    p.lathe(prof, mat=g, seg=24)
    if label is not None:
        lm = mat.picture(name + ' label', label, rough=0.4)
        p.lathe([(r + 0.0004, body_h * 0.3), (r + 0.0004, body_h * 0.8), (r + 0.0001, body_h * 0.8), (r + 0.0001, body_h * 0.3), (r + 0.0004, body_h * 0.3)],
                mat=lm, seg=24, label=lm, label_z=(body_h * 0.3, body_h * 0.8))
    if fill > 0:
        p.cyl(r - 0.0015, max(0.004, body_h * fill), at=(0, 0, 0.002), mat=mat.liquid(liquid), seg=24)
    p.cyl(neck_r + 0.003, 0.014, at=(0, 0, h - 0.014), mat=mat.plastic(cap), seg=20, bevel=0.002)
    return p.build()


def can(r=0.033, h=0.122, label=None, color='#c8cdd2', name='can'):
    m = mat.metal(color, rough=0.3)
    lm = mat.picture(name + ' label', label, rough=0.35) if label is not None else None
    p = Part(name)
    p.lathe([(0, 0), (r * 0.82, 0), (r, 0.008), (r, h - 0.01), (r * 0.82, h), (0, h)], mat=m, seg=24, label=lm, label_z=(0.008, h - 0.01))
    return p.build()


def pot(r=0.12, h=0.11, body=None, lid=True, name='pot'):
    """A cooking pot with two ear handles (and its lid)."""
    m = _m(body, lambda: mat.metal('#c9a23a', rough=0.35))
    p = Part(name)
    p.lathe([(0, 0), (r * 0.94, 0), (r, 0.01), (r, h), (r - 0.002, h), (r - 0.002, 0.006), (0, 0.006)], mat=m, seg=28)
    for sx in (-1, 1):
        p.box((0.03, 0.05, 0.006), at=(sx * (r + 0.012), 0, h - 0.02), mat=m, bevel=0.002)
    if lid:
        p.lathe([(0, h + 0.012), (r * 0.6, h + 0.009), (r + 0.004, h + 0.001), (r + 0.004, h), (0, h)], mat=m, seg=28)
        p.cyl(0.012, 0.016, at=(0, 0, h + 0.011), mat=mat.plastic('#161616'), seg=12, bevel=0.003)
    return p.build()


def cup_of_pens(r=0.036, h=0.1, n=5, body=None, colors=('#1a1a1c', '#1f3f8a', '#b3261e', '#e0b23a', '#2c2c2e'), seed=0, name='pen cup'):
    """A pot of pens: the pens lean on the rim, each at its own angle."""
    import random
    rnd = random.Random(f'{name}/{seed}')
    m = _m(body, lambda: mat.ceramic('#3c4a56'))
    p = Part(name)
    p.lathe([(0, 0), (r, 0), (r, h), (r - 0.004, h), (r - 0.004, 0.006), (0, 0.006)], mat=m, seg=24)
    for i in range(n):
        a = TAU * i / n + rnd.uniform(-0.4, 0.4)
        foot = ((r - 0.012) * math.cos(a + math.pi) * 0.6, (r - 0.012) * math.sin(a + math.pi) * 0.6, 0.0075)
        L = rnd.uniform(0.135, 0.165)
        rim = ((r - 0.0085) * math.cos(a), (r - 0.0085) * math.sin(a), h + 0.001)
        dx, dy, dz = rim[0] - foot[0], rim[1] - foot[1], rim[2] - foot[2]
        k = L / math.sqrt(dx * dx + dy * dy + dz * dz)
        tip = (foot[0] + dx * k, foot[1] + dy * k, foot[2] + dz * k)
        p.tube([foot, tip], 0.0038, mat=mat.plastic(colors[i % len(colors)], rough=0.35), seg=6)
    return p.build()


def bin(r=0.12, h=0.28, body=None, name='bin'):
    """A waste bin (hollow: things can be put in it)."""
    m = _m(body, lambda: mat.plastic('#3a3d42', rough=0.5))
    p = Part(name)
    p.lathe([(0, 0), (r * 0.82, 0), (r, h), (r - 0.003, h), (r * 0.82 - 0.003, 0.004), (0, 0.004)], mat=m, seg=24)
    return p.build()


def plant(pot_r=0.07, pot_h=0.12, leaves=9, leaf=0.22, pot_mat=None, leaf_color='#2f5d34', seed=0, name='plant'):
    """A pot plant with long arching leaves (a snake plant, a spider plant): each leaf a tapering blade."""
    import random
    rnd = random.Random(f'{name}/{seed}')
    mp = _m(pot_mat, lambda: mat.ceramic('#b9673f', rough=0.5))
    ml = mat.plastic(leaf_color, rough=0.45, dirt=0.1)
    p = Part(name)
    p.lathe([(0, 0), (pot_r * 0.72, 0), (pot_r, pot_h), (pot_r - 0.006, pot_h), (pot_r * 0.72 - 0.004, 0.008), (0, 0.008)], mat=mp, seg=20)
    p.cyl(pot_r - 0.0065, 0.02, at=(0, 0, pot_h - 0.03), mat=mat.paint('#2a1e14', rough=0.95), seg=20)
    for i in range(leaves):
        a = TAU * i / leaves + rnd.uniform(-0.3, 0.3)
        L = leaf * rnd.uniform(0.6, 1.1)
        lean = rnd.uniform(0.15, 0.55)
        rings = []
        for k in range(6):
            s = k / 5
            wv = 0.016 * (1 - s) ** 0.7 + 0.002
            c = (math.cos(a) * (0.012 + lean * L * s * s), math.sin(a) * (0.012 + lean * L * s * s), pot_h - 0.012 + L * s * (1 - 0.25 * lean * s))
            nx, ny = -math.sin(a), math.cos(a)
            rings.append([(c[0] + nx * wv, c[1] + ny * wv, c[2]), (c[0] + math.cos(a) * 0.0012, c[1] + math.sin(a) * 0.0012, c[2] + 0.001),
                          (c[0] - nx * wv, c[1] - ny * wv, c[2]), (c[0] - math.cos(a) * 0.0012, c[1] - math.sin(a) * 0.0012, c[2] - 0.001)])
        p.skin(rings, mat=ml)
    ob = p.build()
    ob['lr_com'] = (0.0, 0.0, pot_h / 2)
    return ob


# ---- soft things -----------------------------------------------------------------------------------
def cushion(w=0.45, d=0.45, h=0.09, color='#7d8c6a', name='cushion', dent=0.0):
    """A cushion or floor pad: pillow-shaped, thinner at its seams. dent = how deep the middle is pressed in."""
    def top(x, y):
        ex, ey = 1 - (2 * x / w) ** 2, 1 - (2 * y / d) ** 2
        return 0.008 + (h - 0.008) * max(0.0, ex) ** 0.35 * max(0.0, ey) ** 0.35 - dent * max(0.0, ex) * max(0.0, ey)
    p = Part(name)
    p.slab(w, d, top, mat=mat.fabric(color), nx=14, ny=14)
    return p.build()


def mattress(w=1.0, d=2.0, h=0.07, color='#d8d2c2', name='mattress'):
    """A floor mattress / topper: a slab with soft edges and the slight unevenness of something slept on."""
    import random
    rnd = random.Random(name)
    ph = [rnd.uniform(0, TAU) for _ in range(3)]

    def top(x, y):
        ex, ey = min(1.0, (w / 2 - abs(x)) / 0.05), min(1.0, (d / 2 - abs(y)) / 0.05)
        edge = (max(0.0, ex) * max(0.0, ey)) ** 0.5
        return h * (0.55 + 0.45 * edge) + 0.004 * math.sin(5 * x + ph[0]) * math.sin(3.1 * y + ph[1])
    p = Part(name)
    p.slab(w, d, top, mat=mat.fabric(color, weave=0.6), nx=16, ny=28)
    return p.build()


def blanket(w=1.3, d=1.5, h=0.035, color='#6f7f95', stripe=None, folds=1.0, seed=0, name='blanket'):
    """A blanket thrown over something flat: a slab with wandering folds (put it on a mattress with soft=…)."""
    import random
    rnd = random.Random(f'{name}/{seed}')
    ph = [rnd.uniform(0, TAU) for _ in range(6)]

    def top(x, y):
        ex, ey = min(1.0, (w / 2 - abs(x)) / 0.04), min(1.0, (d / 2 - abs(y)) / 0.04)
        f = (math.sin(9 * x + 2.2 * y + ph[0]) * 0.5 + math.sin(4.3 * x - 6.1 * y + ph[1]) * 0.35 + math.sin(15 * x + ph[2]) * 0.15)
        return max(0.004, (h + 0.012 * folds * f) * (max(0.0, ex) * max(0.0, ey)) ** 0.4)
    p = Part(name)
    p.slab(w, d, top, mat=mat.fabric(color, stripe=stripe, stripe_w=0.09), nx=24, ny=26)
    return p.build()


def towel(width=0.34, front=0.42, back=0.3, rail_r=0.006, color='#d9cfc0', stripe=None, seed=0, name='towel'):
    """Cloth hanging over a rail: origin on the rail's axis, the rail running along X (see Part.drape)."""
    p = Part(name)
    p.drape(width, front, back, over_r=rail_r, mat=mat.fabric(color, stripe=stripe, weave=1.4), seed=seed)
    return p.build()


# ---- light fittings --------------------------------------------------------------------------------
def desk_lamp(h=0.42, reach=0.26, body=None, glow=None, name='desk lamp'):
    """An arm lamp. ob['lr_bulb'] = where its bulb is (local): put the light there with
    r.lamp(name, ob.matrix_world @ Vector(ob['lr_bulb']), …). glow = mat.emit for the bulb."""
    m = _m(body, lambda: mat.paint('#2f3a34', rough=0.4, coat=0.3))
    g = _m(glow, lambda: mat.emit('#ffd9a0', 0.0))
    p = Part(name)
    p.cyl(0.075, 0.018, mat=m, seg=28, bevel=0.004)
    p.tube([(0, 0.02, 0.018), (0, 0.05, h * 0.62), (0, -reach * 0.55, h), (0, -reach, h - 0.03)], 0.006, mat=m, seg=8)
    head = (0, -reach, h - 0.1)
    p.lathe([(0.014, 0.075), (0.02, 0.07), (0.07, 0.0), (0.068, 0.0), (0.018, 0.068), (0.014, 0.073), (0.014, 0.075)], at=head, mat=m, seg=24)
    p.sphere(0.022, at=(head[0], head[1], head[2] + 0.012), mat=g, seg=12, rings=6)
    ob = p.build()
    ob['lr_bulb'] = (head[0], head[1], head[2] + 0.03)
    ob['lr_com'] = (0.0, 0.0, 0.03)                               # the weight is in the base, not under the shade
    return ob


def floor_lamp(h=1.45, shade_r=0.17, shade_h=0.24, body=None, shade=None, glow=None, name='floor lamp'):
    """A standing lamp with a drum shade. ob['lr_bulb'] as for desk_lamp."""
    m = _m(body, lambda: mat.metal('#2a2a2b', rough=0.4))
    s = _m(shade, lambda: mat.fabric('#e8dcc2', weave=0.6, dirt=0.15))
    g = _m(glow, lambda: mat.emit('#ffd9a0', 0.0))
    p = Part(name)
    p.cyl(0.13, 0.022, mat=m, seg=28, bevel=0.005)
    p.tube([(0, 0, 0.02), (0, 0, h - shade_h * 0.55)], 0.009, mat=m, seg=8)
    z0 = h - shade_h
    p.lathe([(shade_r, z0), (shade_r * 0.92, h), (shade_r * 0.92 - 0.0015, h), (shade_r - 0.0015, z0), (shade_r, z0)], mat=s, seg=28)
    p.tube([(-shade_r * 0.95, 0, h - shade_h * 0.5), (shade_r * 0.95, 0, h - shade_h * 0.5)], 0.0025, mat=m, seg=6)
    p.sphere(0.028, at=(0, 0, h - shade_h * 0.6), mat=g, seg=12, rings=6)
    ob = p.build()
    ob['lr_bulb'] = (0, 0, h - shade_h * 0.5)
    ob['lr_com'] = (0.0, 0.0, 0.1)
    return ob


def pendant(shade_r=0.16, shade_h=0.14, body=None, glow=None, name='pendant'):
    """A hanging shade for r.suspend(): origin at the top centre (where the cord enters). ob['lr_bulb']."""
    m = _m(body, lambda: mat.paint('#e9e3d2', rough=0.4))
    g = _m(glow, lambda: mat.emit('#ffd9a0', 0.0))
    p = Part(name)
    p.cyl(0.02, 0.03, at=(0, 0, -0.03), mat=m, seg=16)
    p.lathe([(0.02, -0.03), (shade_r, -0.03 - shade_h), (shade_r - 0.002, -0.03 - shade_h), (0.018, -0.032), (0.02, -0.03)], mat=m, seg=28)
    p.sphere(0.026, at=(0, 0, -0.03 - shade_h * 0.75), mat=g, seg=12, rings=6)
    ob = p.build()
    ob['lr_bulb'] = (0, 0, -0.03 - shade_h * 0.6)
    return ob


def ceiling_panel(w=0.5, t=0.047, glow=None, body=None, name='ceiling light'):
    """A flat LED ceiling light for r.fix(to='ceiling', loc=(x, y, r.H)): origin on the ceiling, body hanging below."""
    m = _m(body, lambda: mat.plastic('#f1f0ec', rough=0.4))
    g = _m(glow, lambda: mat.emit('#fff6ea', 0.0))
    p = Part(name)
    p.box((w, w, t), at=(0, 0, -t), mat=m, bevel=0.006, faces={'bottom': g})
    return p.build()


# ---- electrics -------------------------------------------------------------------------------------
def outlet(gang=2, name='outlet', color='#f0eee8'):
    """A wall socket plate for r.fix(wall=…, embed=True): back on y = 0, origin at its centre."""
    m = mat.plastic(color, rough=0.35)
    dark = mat.plastic('#1c1c1d', rough=0.5)
    w = 0.07 * gang + 0.005
    p = Part(name)
    p.box((w, 0.009, 0.12), at=(0, -0.0045, -0.06), mat=m, bevel=0.002)
    p.box((w - 0.02, 0.03, 0.09), at=(0, 0.015, -0.045), mat=dark, bevel=0)            # the box let into the wall
    for i in range(gang):
        x = -w / 2 + 0.0375 + 0.07 * i
        p.cyl(0.019, 0.004, at=(x, -0.007, 0), rot=(90, 0, 0), mat=m, seg=20)
        for sx in (-1, 1):
            p.cyl(0.0025, 0.002, at=(x + sx * 0.0095, -0.0085, 0), rot=(90, 0, 0), mat=dark, seg=8)
    return p.build()


def switch(gang=1, name='switch', color='#f0eee8'):
    """A light switch plate for r.fix(wall=…, embed=True)."""
    m = mat.plastic(color, rough=0.35)
    p = Part(name)
    p.box((0.07, 0.008, 0.12), at=(0, -0.004, -0.06), mat=m, bevel=0.002)
    p.box((0.05, 0.03, 0.09), at=(0, 0.015, -0.045), mat=mat.plastic('#1c1c1d'), bevel=0)
    kw = 0.05 / gang
    for i in range(gang):
        p.box((kw - 0.003, 0.006, 0.07), at=(-0.025 + kw * (i + 0.5), -0.0105, -0.035), rot=(4, 0, 0), mat=m, bevel=0.0015)
    return p.build()


def power_strip(n=4, name='power strip', color='#efeee9'):
    """A multi-socket strip lying on a surface, its switch at one end. ob['lr_sockets'] = local points of the sockets."""
    m = mat.plastic(color, rough=0.4)
    L = 0.06 * n + 0.07
    p = Part(name)
    p.box((L, 0.055, 0.03), mat=m, bevel=0.004)
    socks = []
    for i in range(n):
        x = -L / 2 + 0.035 + 0.06 * i
        p.cyl(0.018, 0.003, at=(x, 0, 0.0285), mat=mat.plastic('#dcdad3'), seg=18)
        socks.append((x, 0, 0.0315))
    p.box((0.018, 0.026, 0.006), at=(L / 2 - 0.022, 0, 0.03), mat=mat.emit('#ff5a2a', 0.0, name=name + ' switch'), bevel=0.001)
    ob = p.build()
    ob['lr_sockets'] = [c for s in socks for c in s]
    return ob


def sag(p0, p1, drop=0.05, n=10):
    """Points of a cable hanging between two points (a parabola `drop` below the straight line at its middle)."""
    out = []
    for i in range(n + 1):
        s = i / n
        out.append((p0[0] + (p1[0] - p0[0]) * s, p0[1] + (p1[1] - p0[1]) * s, p0[2] + (p1[2] - p0[2]) * s - drop * 4 * s * (1 - s)))
    return out


def cable(pts, r=0.003, color='#18181a', name='cable', plug=False):
    """A cable through WORLD points (use sag() for the hanging parts; keep floor runs at z = r). The object's origin
    is the world origin: register it with r.fix(ob, to=[the things at both ends], loc=(0, 0, 0), embed=True)."""
    m = mat.rubber(color)
    p = Part(name)
    p.tube(pts, r, mat=m, seg=6)
    if plug:
        p.cyl(0.017, 0.03, at=tuple(pts[0]), mat=mat.plastic('#f0eee8'), seg=14, bevel=0.003)
    return p.build()


# ---- screens ---------------------------------------------------------------------------------------
def screen_pages(name, images, emission=1.5, rough=0.25):
    """One material that shows a list of Pillow images in turn (all the same size): hand it to a monitor as its
    screen and animate it with r.pages(material, len(images), hold=…)."""
    w, h = images[0].size
    atlas = Image.new('RGB', (w * len(images), h))
    for i, im in enumerate(images):
        atlas.paste(im.convert('RGB').resize((w, h)), (i * w, 0))
    m = mat.picture(name, atlas, rough=rough, emission=emission, repeat=True)
    node = next(n for n in m.node_tree.nodes if n.type == 'MAPPING')
    node.inputs['Scale'].default_value = (1.0 / len(images), 1.0, 1.0)
    m['lr_pages'] = len(images)
    return m


def monitor(w=0.54, h=0.32, screen=None, body=None, stand=0.1, depth=0.035, name='monitor'):
    """A desktop monitor on a stand. screen = a picture material (mat.picture(..., emission=…) or screen_pages)."""
    m = _m(body, lambda: mat.plastic('#17181a', rough=0.45))
    p = Part(name)
    p.box((0.2, 0.16, 0.012), mat=m, bevel=0.004)
    p.box((0.05, 0.03, stand + h * 0.4), at=(0, 0.04, 0.012), mat=m, bevel=0.003)
    p.box((w, depth, h), at=(0, 0.01, stand), mat=m, bevel=0.003, faces={'front': screen} if screen else None)
    ob = p.build()
    ob['lr_com'] = (0.0, 0.02, stand)
    return ob


def laptop(w=0.31, d=0.215, open_deg=108, screen=None, keys=None, body=None, name='laptop'):
    """An open laptop. screen / keys = picture materials for the display and the keyboard deck."""
    m = _m(body, lambda: mat.metal('#a8abb0', rough=0.38))
    p = Part(name)
    p.box((w, d, 0.014), mat=m, bevel=0.003, faces={'top': keys} if keys else None)
    p.box((w, 0.006, d), at=(0, d / 2 - 0.003, 0.014), rot=(-(open_deg - 90), 0, 0), mat=m, bevel=0.002, faces={'front': screen} if screen else None)
    return p.build()


def keyboard(w=0.363, d=0.14, h=0.033, keys=None, body=None, name='keyboard'):
    """A keyboard: a wedge-ish case with a picture of its keys on top."""
    m = _m(body, lambda: mat.plastic('#2a2b2e', rough=0.5))
    p = Part(name)
    p.box((w, d, h * 0.6), mat=m, bevel=0.004)
    p.box((w - 0.014, d - 0.014, h * 0.4), at=(0, 0, h * 0.6 - 0.0005), mat=m, bevel=0.003, faces={'top': keys} if keys else None)
    return p.build()


def mouse(body=None, name='mouse'):
    m = _m(body, lambda: mat.plastic('#1d1e20', rough=0.4))
    p = Part(name)
    p.sphere(0.02, mat=m, seg=14, rings=7, squash=(1.5, 2.6, 0.95))
    return p.ground().build()


def headphones(color='#141416', name='headphones'):
    """Over-ear headphones for r.hang(): origin at the top of the band's inside (where a hook carries them)."""
    m = mat.plastic(color, rough=0.45)
    pad = mat.fabric('#1d1d20', weave=0.5)
    p = Part(name)
    R = 0.085
    band = [(R * math.sin(a), 0, -R + R * math.cos(a)) for a in [math.radians(x) for x in range(-100, 101, 20)]]
    p.tube(band, 0.006, mat=m, seg=8)
    for sx in (-1, 1):
        x = sx * R * math.sin(math.radians(100))
        z = -R + R * math.cos(math.radians(100))
        p.cyl(0.042, 0.03, at=(x - sx * 0.004, 0, z - 0.03), rot=(0, sx * 90, 0), mat=m, seg=20, bevel=0.005)
        p.cyl(0.04, 0.016, at=(x - sx * 0.032, 0, z - 0.03), rot=(0, sx * 90, 0), mat=pad, seg=20, bevel=0.006)
    lo, hi = p.bounds()
    p.shift((0, 0, -0.006))                     # origin: the inside top of the band, where a peg carries it
    ob = p.build()
    ob['lr_depth'] = float(hi[1])             # how far its cups reach toward the wall: hang it at least this far out
    return ob


# ---- things that move ------------------------------------------------------------------------------
def clock(d=0.3, depth=0.04, rim='#1b1b1d', seconds=37, hm=(2, 14), name='clock'):
    """A wall clock for r.hang(): back on y = 0, origin at the centre of the back. Returns (clock, second_hand,
    pivot): fix the hand at clock.matrix_world @ pivot with the clock's rz, then r.tick(hand, axis=1, start=seconds).
    hm = the hour and minute it shows — make it the hour of the scene."""
    S = 512
    im, dr = draw.new(S, S, '#f2efe6')
    c = S / 2
    for i in range(60):
        a = TAU * i / 60
        r0 = c * (0.86 if i % 5 == 0 else 0.92)
        dr.line([c + r0 * math.sin(a), c - r0 * math.cos(a), c + c * 0.96 * math.sin(a), c - c * 0.96 * math.cos(a)], fill='#1c1c1c', width=6 if i % 5 == 0 else 2)
    for k in range(1, 13):
        a = TAU * k / 12
        draw.text(dr, (c + c * 0.72 * math.sin(a), c - c * 0.72 * math.cos(a)), str(k), size=46, weight=600, anchor='mm')
    for ang, ln, wd in ((TAU * ((hm[0] % 12) + hm[1] / 60) / 12, 0.48, 14), (TAU * hm[1] / 60, 0.74, 9)):
        dr.line([c, c, c + c * ln * math.sin(ang), c - c * ln * math.cos(ang)], fill='#121212', width=wd)
    dr.ellipse([c - 14, c - 14, c + 14, c + 14], fill='#121212')
    face = mat.picture(name + ' face', im, rough=0.6)
    body = mat.plastic(rim, rough=0.4)
    p = Part(name)
    p.cyl(d / 2, depth, at=(0, 0, 0), rot=(90, 0, 0), mat=body, seg=40, bevel=0.004)
    p.box((d * 0.66, 0.002, d * 0.66), at=(0, -depth - 0.001, -d * 0.33), mat=body, bevel=0, faces={'front': face})
    p.pipe(d / 2, d / 2 - 0.012, 0.012, at=(0, -depth, 0), rot=(90, 0, 0), mat=body, seg=40)
    ob = p.build()
    h = Part(name + ' second hand')
    red = mat.paint('#b3261e', rough=0.4, dirt=0)
    h.box((0.0025, 0.0012, d * 0.36), at=(0, 0, -d * 0.07), mat=red, bevel=0)
    h.cyl(0.006, 0.0025, at=(0, 0.00125, 0), rot=(90, 0, 0), mat=red, seg=12)
    hand = h.build()
    return ob, hand, (0.0, -depth - 0.0045, 0.0)


def fan(d=0.25, h=0.42, body=None, blades=3, tilt=12.0, name='fan'):
    """A desk fan / air circulator: a flat base, a stem, and a head tilted back by `tilt` degrees. Returns
    (body, rotor, pivot, tilt): fix the rotor at body.matrix_world @ Vector(pivot) with rot=(-tilt, 0, the body's rz)
    and r.spin(rotor, rpm, axis=1). The cage is a ring and spokes: the blades are seen through it."""
    import mathutils
    m = _m(body, lambda: mat.plastic('#ecebe6', rough=0.4))
    R = d / 2
    hub_z = h - R - 0.01
    p = Part(name)
    p.cyl(d * 0.42, 0.03, mat=m, seg=28, bevel=0.006)
    p.tube([(0, 0.02, 0.03), (0, 0.06, hub_z)], 0.014, mat=m, seg=10)
    head = Part('_head')                                              # built round the hub, then tilted as one
    for y in (-0.045, 0.02):
        ring = [(R * math.cos(TAU * i / 28), y, R * math.sin(TAU * i / 28)) for i in range(29)]
        head.tube(ring, 0.003, mat=m, seg=6)
    for i in range(12):
        a = TAU * i / 12
        head.tube([(0.02 * math.cos(a), -0.06, 0.02 * math.sin(a)), (R * math.cos(a), -0.045, R * math.sin(a)), (R * math.cos(a), 0.02, R * math.sin(a))],
                  0.0014, mat=m, seg=4)
    head.cyl(0.045, 0.075, at=(0, 0.1, 0), rot=(90, 0, 0), mat=m, seg=20, bevel=0.01)
    head.cyl(0.006, 0.03, at=(0, 0.03, 0), rot=(90, 0, 0), mat=m, seg=8)                  # the shaft the rotor sits on
    p.merge(head, at=(0, 0, hub_z), rot=(-tilt, 0, 0))
    ob = p.build()
    ob['lr_com'] = (0.0, 0.0, 0.05)
    r_ = Part(name + ' rotor')
    grey = mat.plastic('#3a3c40', rough=0.35)
    r_.cyl(0.026, 0.03, at=(0, 0.012, 0), rot=(90, 0, 0), mat=grey, seg=16, bevel=0.006)
    for i in range(blades):
        a = 360.0 * i / blades
        r_.box((R * 0.72, 0.003, 0.06), at=(R * 0.5 * math.cos(math.radians(a)), -0.006, R * 0.5 * math.sin(math.radians(a))),
               rot=(24, -a, 0), mat=grey, bevel=0, center=True)
    rotor = r_.build()
    piv = geo.xf((0, 0, hub_z), (-tilt, 0, 0)) @ mathutils.Vector((0, 0.0, 0))
    return ob, rotor, (piv.x, piv.y, piv.z), tilt
