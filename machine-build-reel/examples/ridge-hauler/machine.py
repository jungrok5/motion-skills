"""RIDGE HAULER — the worked example on a topic the source does not have.

A 9 m six-legged cargo walker that carries a 20 ft shipping container over rocky mountain ground where no truck
goes. Insect legs (a yawing coxa, femur up, tibia down — the knee rides high), a tripod gait (three feet always
down), an industrial finish (safety-yellow paint, galvanized forks, black rubber), a crew cab up front on a yaw
bearing, a radar on a mast that spins, amber beacons. Its big move is to kneel and set the container down.

Everything that makes it this machine is designed here (BRIEF.md, PARTS.md): the stock limb builders are used in
their 'industrial' finish; the chassis, container, cab, mast and radar are this file's own parts.
"""
import math
from mbr.spec import mirror
from mbr.geom import Mesh, T, RX, RY, RZ
from mbr import stock

DESCRIPTION = ('a 9 m six-legged mountain cargo walker carrying a 20 ft shipping container, insect-like legs, '
               'safety-yellow paint, galvanized steel, a crew cab and a radar mast')

LEG = dict(role='leg', kind='insect', coxa=1.35, segs=[4.3, 5.1], knee=1, width=0.5, drum=0.56, ball=0.3,
           digits=3, digit_len=0.95, act=[1, 1], style='industrial')

MACHINE = {
    'name': 'ridge-hauler', 'title': 'RIDGE HAULER',
    'figure': 1.75, 'figure_at': (5.2, -6.2, 0.0),
    'body': {'z': 5.0},
    'palette': {
        'accent': ('paint', '#e2a91c'), 'metal': ('galvanized', '#a3a8ab'), 'frame': ('carbon', '#2a2c2f'),
        'joint': ('graphite', '#3b3e42'), 'steel': ('steel', '#c9ccd0'), 'rubber': ('rubber', '#111111'),
        'cable': ('rubber', '#1b1b1c'), 'glass': ('glass', '#0d1218'), 'light': ('emit', '#ff9a2a', 10.0),
        'shell': ('paint', '#d9d6cf'), 'cargo': ('paint', '#2f5f8a'),
    },
    'limbs': [
        dict(LEG, name='FL', at=(2.7, 1.45, -0.35), home=(4.7, 4.5)),
        dict(LEG, name='ML', at=(0.0, 1.55, -0.35), home=(0.0, 5.4)),
        dict(LEG, name='RL', at=(-2.7, 1.45, -0.35), home=(-4.7, 4.5)),
    ],
    'neck': {'at': (4.05, 0.0, 0.05), 'links': [[0.9, 12]]},
    'head': {'len': 2.4},
    'extras': [
        dict(name='radar', type='spin', parent='body', at=(-1.6, 0.0, 4.25), dir=(1, 0, 0), axis=(0, 0, 1),
             xdir=(0, -1, 0), rate=90.0, len=1.0),
        dict(name='whip_L', type='lag', parent='head', at=(0.75, 0.2, 1.05), dir=(0.05, -0.35, 1.0), len=2.2,
             lag=0.18, gain=1.2, max_deg=18),
        dict(name='whip_R', type='lag', parent='head', at=(-0.75, 0.2, 1.05), dir=(-0.05, -0.35, 1.0), len=2.2,
             lag=0.18, gain=1.2, max_deg=18),
    ],
    'gait': {'cycle': 2.6, 'duty': 0.6, 'stride': 2.0, 'lift': 0.85, 'pattern': 'tripod', 'crouch': 0.15,
             'dip': 0.14, 'dip_time': 0.22, 'sway': 0.12, 'roll': 1.2, 'nod': 0.8, 'yaw': 0.6, 'swing_gamma': 0,
             'foot_pitch': 8, 'toe_curl': 22, 'neck_rock': 0.0, 'neck_sway': 1.0, 'loop_cycles': 2},
    'idle': {'period': 12.0, 'breath': 0.05, 'shift': 0.08, 'scan': 18.0, 'crouch': 0.05},
    'moves': {
        # Sets the container down: braces (rises a little, cab tips up), all six knees fold together and the
        # chassis comes down level, the cab looks the load over left and right, then it pushes back up past its
        # ride height and settles.
        'kneel': {'dur': 10.0, 'main': 'body.dz', 'keys': {
            'body.dz':    [(0, -0.05), (0.8, 0.2), (3.6, -1.75), (6.6, -1.75), (8.5, 0.14), (9.3, -0.1), (10.0, -0.05)],
            'body.pitch': [(0, 0), (0.8, -1.5), (3.6, 1.2), (6.6, 1.2), (8.5, -0.8), (10.0, 0)],
            'head.pitch': [(0, 0), (0.8, -6), (3.8, 10), (6.4, 10), (8.6, -3), (10.0, 0)],
            'head.yaw':   [(0, 0), (4.0, 0), (4.9, 28), (5.7, -24), (6.4, 0), (10.0, 0)],
            'extra.radar': [(0, 0), (10.0, 540)],
            'light':      [(0, 1.0), (10.0, 1.0)],
        }},
        # Starts cold and settled, the beacons stutter on, the cab lifts and looks round, the radar spins up.
        'wake': {'dur': 8.0, 'flicker': (1.8, 2.5), 'keys': {
            'body.dz':    [(0, -0.6), (1.2, -0.72), (2.8, 0.12), (3.6, -0.06), (8.0, -0.05)],
            'head.pitch': [(0, 14), (1.2, 16), (3.0, -5), (3.8, 1), (8.0, 0)],
            'head.yaw':   [(0, 0), (3.6, 0), (4.0, -5), (5.0, 34), (6.6, -30), (7.6, 0), (8.0, 0)],
            'extra.radar': [(0, 0), (2.6, 0), (8.0, 400)],
            'light':      [(0, 0.0), (1.8, 0.0), (2.5, 1.0), (8.0, 1.0)],
        }},
    },
    'plates': [
        {'name': 'coxa', 'bone': 'hip_FL', 'at': (0, 0.6, 0), 'dir': (0.3, -1.0, -0.25), 'size': 2.6},
        {'name': 'knee', 'bone': 'shin_FL', 'at': (0, 0, 0), 'dir': (0.5, -1.0, 0.1), 'size': 2.4},
        {'name': 'foot', 'bone': 'foot_ML', 'at': (0, 0, 0), 'dir': (0.4, -1.0, 0.35), 'size': 2.0},
        {'name': 'cab', 'bone': 'head', 'at': (0, 0.9, 0.4), 'dir': (-0.6, -1.0, -0.1), 'size': 4.4},
        {'name': 'radar', 'bone': 'radar', 'at': (0, 0, 0.3), 'dir': (0.5, -1.0, -0.2), 'size': 3.4},
        {'name': 'hip hydraulics', 'bone': 'thigh_RL', 'at': (0, 0.3, 0), 'dir': (-0.3, -1.0, -0.15), 'size': 2.8},
        {'name': 'container lock', 'bone': 'body', 'at': (2.6, -1.3, 0.75), 'dir': (0.4, -1.0, -0.1), 'size': 2.4},
        {'name': 'chassis', 'bone': 'body', 'at': (0, 0, -0.6), 'dir': (0.2, -0.6, -0.75), 'size': 7.0},
    ],
    'reel': {'move': 'kneel', 'walk_yaw': -58.0, 'move_yaw': -42.0},
}
MACHINE['limbs'] += [mirror(l) for l in list(MACHINE['limbs'])]


def build(k):
    stock.limbs(k, style='industrial')
    chassis(k)
    container(k)
    mast(k)
    cab(k)
    stock.neck(k, width=0.9, style='industrial')
    for side in ('L', 'R'):
        stock.whisker(k, f'Whip{side}', f'whip_{side}', 2.2, 0.03, mat='rubber')


def chassis(k):
    """A galvanized ladder frame: two box rails, cross members at each leg pair, diagonal bracing, the coxa
    pedestals, a deck plate, side lockers, a tool rail; amber beacons at the four corners."""
    S = k.st
    m = Mesh()
    for y in (-1.15, 1.15):
        m.box(8.6, 0.42, 0.62, 0, c=(0.0, y, -0.15))
    for x in (-2.7, 0.0, 2.7):
        m.box(0.7, 3.4, 0.5, 0, c=(x, 0, -0.2))
        for y in (-1, 1):
            m.cyl(0.62, 0.32, 'Z', 28, 0, c=(x, y * 1.5, -0.05))      # coxa pedestal
    for x0, x1 in ((-4.0, -2.7), (-2.7, 0.0), (0.0, 2.7), (2.7, 4.0)):
        m.tube((x0, -1.1, -0.35), (x1, 1.1, -0.35), 0.07, 8, 1)
        m.tube((x0, 1.1, -0.35), (x1, -1.1, -0.35), 0.07, 8, 1)
    m.box(8.0, 2.6, 0.08, 1, c=(0, 0, 0.17))
    k.part('Chassis', m, 'body', ('metal', 'steel'), stage=S('body'), frame='body', bevel=0.03)
    m = Mesh()
    for side in (-1, 1):
        for x in (-3.5, 3.5):
            m.box(0.9, 0.5, 0.75, 0, c=(x, side * 1.55, -0.32))
            m.box(0.82, 0.04, 0.6, 1, c=(x, side * 1.81, -0.32))
    m.box(0.5, 2.4, 0.5, 0, c=(-4.35, 0, -0.1))
    k.part('Lockers', m, 'body', ('accent', 'frame'), stage=S('body'), frame='body', bevel=0.02)
    m = Mesh()
    for (x, y) in ((3.25, 1.32), (3.25, -1.32), (-4.55, 1.1), (-4.55, -1.1)):
        m.cyl(0.13, 0.22, 'Z', 14, 0, c=(x, y, 0.32))
    k.part('Beacons', m, 'body', ('light',), stage=S('lights'), frame='body')


def container(k):
    """A 20 ft ISO container (6.06 × 2.44 × 2.59 m): corrugated walls, corner castings, doors at the back, held by
    twist locks on four posts."""
    S = k.st
    L, Wc, Hc = 6.06, 2.44, 2.59
    x0, z0 = -0.4, 0.75
    m = Mesh()
    m.box(L - 0.2, Wc - 0.12, Hc - 0.2, 0, c=(x0, 0, z0 + Hc / 2))
    n = 30
    for i in range(n):
        x = x0 - L / 2 + 0.3 + (L - 0.6) * (i + 0.5) / n
        for y in (-1, 1):
            m.box(0.09, 0.07, Hc - 0.34, 0, c=(x, y * (Wc / 2 - 0.05), z0 + Hc / 2))
    for xs in (-1, 1):
        for ys in (-1, 1):
            for zs in (0, 1):
                m.box(0.18, 0.16, 0.12, 1, c=(x0 + xs * (L / 2 - 0.09), ys * (Wc / 2 - 0.08), z0 + 0.06 + zs * (Hc - 0.12)))
    for ys in (-1, 1):
        for zz in (0.08, Hc - 0.08):
            m.box(L, 0.12, 0.16, 1, c=(x0, ys * (Wc / 2 - 0.06), z0 + zz))
    for yy in (-0.62, 0.62):          # door bars at the back
        for dy in (-0.18, 0.18):
            m.tube((x0 - L / 2 - 0.04, yy + dy, z0 + 0.25), (x0 - L / 2 - 0.04, yy + dy, z0 + Hc - 0.25), 0.025, 8, 1)
    k.part('Container', m, 'body', ('cargo', 'frame'), stage=S('shells'), frame='body', bevel=0.012)
    m = Mesh()
    for xs in (-1, 1):
        for ys in (-1, 1):
            x, y = x0 + xs * (L / 2 - 0.4), ys * (Wc / 2 - 0.1)
            m.box(0.3, 0.3, 0.55, 0, c=(x, y, 0.47))
            m.cyl(0.08, 0.2, 'Z', 8, 1, c=(x, y, 0.78))
    k.part('TwistLocks', m, 'body', ('accent', 'steel'), stage=S('hydraulics'), frame='body', bevel=0.02)


def mast(k):
    """Radar mast at the back of the deck; the radar dish rides its own spinning bone."""
    S = k.st
    m = Mesh()
    m.taper(3.95, 0.3, 0.3, 0.22, 0.22, 0, M=T(-1.6, 0.0, 0.2) @ RX(90))
    for z in (0.9, 1.8, 2.7, 3.5):
        m.ring(0.3, 0.16, 0.06, 'Z', 16, 1, c=(-1.6, 0.0, 0.2 + z))
    m.cyl(0.32, 0.18, 'Z', 24, 1, c=(-1.6, 0.0, 4.15))
    k.part('Mast', m, 'body', ('accent', 'steel'), stage=S('neck'), frame='body', bevel=0.01)
    # radar: a bone with Y forward (horizontal), Z up: a slotted bar antenna on a turntable
    m = Mesh()
    m.cyl(0.28, 0.25, 'Z', 24, 0, c=(0, 0, 0.12))
    m.box(0.35, 0.3, 0.3, 0, c=(0, 0, 0.35))
    m.box(3.0, 0.22, 0.36, 1, c=(0, 0.1, 0.62))
    for i in range(12):
        m.box(0.12, 0.03, 0.22, 2, c=(-1.35 + i * 0.245, 0.215, 0.62))
    k.part('Radar', m, 'radar', ('metal', 'shell', 'frame'), stage=S('head'), bevel=0.01)


def cab(k):
    """The crew cab on the head bone (X right, Y forward, Z up): a faceted shell with a wrap-around windscreen,
    roof bar with amber lights, a step and a grab rail."""
    S = k.st
    m = Mesh()
    m.loft([(-0.7, 1.05, 0.85, 3.2, 0, 0.35), (0.2, 1.15, 0.95, 3.4, 0, 0.42), (1.3, 1.1, 0.9, 3.2, 0, 0.38),
            (2.1, 0.85, 0.7, 2.8, 0, 0.25), (2.45, 0.55, 0.42, 2.4, 0, 0.18)], 28, 0)
    k.part('CabBody', m, 'head', ('accent',), stage=S('head'), bevel=0.03)
    m = Mesh()
    m.shell([(1.25, 1.12, 0.92, 3.2, 0, 0.42), (1.9, 0.93, 0.78, 2.9, 0, 0.32), (2.3, 0.66, 0.52, 2.5, 0, 0.22)],
            0.08 * math.pi, 0.92 * math.pi, 0.03, 14, 0)
    for sx in (-1, 1):
        m.box(0.04, 1.0, 0.5, 0, c=(sx * 1.13, 0.4, 0.65))
    k.part('Windscreen', m, 'head', ('glass',), stage=S('head'))
    m = Mesh()
    m.box(1.8, 0.16, 0.1, 0, c=(0, 0.6, 1.33))
    for sx in (-0.8, 0.8):
        m.tube((sx, 0.6, 1.28), (sx, 0.6, 1.2), 0.04, 8, 0)
    m.tube((-0.95, -0.6, 0.2), (-0.95, 1.2, 0.2), 0.035, 8, 2)
    m.tube((0.95, -0.6, 0.2), (0.95, 1.2, 0.2), 0.035, 8, 2)
    m.box(1.2, 0.35, 0.06, 0, c=(0, -0.6, -0.42))
    k.part('CabRails', m, 'head', ('frame', 'joint', 'steel'), stage=S('head'), bevel=0.01)
    m = Mesh()
    for sx in (-0.55, -0.2, 0.2, 0.55):
        m.cyl(0.07, 0.08, 'Y', 12, 0, c=(sx, 0.69, 1.33))
    for sx in (-0.75, 0.75):
        m.cyl(0.11, 0.06, 'Y', 14, 0, c=(sx, 2.42, 0.22))
    k.part('CabLights', m, 'head', ('light',), stage=S('lights'))
    m = Mesh()
    m.cyl(0.6, 0.25, 'Z', 32, 0, c=(0, 0, -0.42))
    m.bolts(0.5, 14, 0.03, 0.05, 'Z', 1, c=(0, 0, -0.3))
    k.part('CabBearing', m, 'head', ('joint', 'steel'), stage=S('head'), bevel=0.01)
