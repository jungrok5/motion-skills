"""WADER — the starter. A 22 m four-legged walker that crosses shallow water like a heron: tall three-segment legs,
a long ladder neck, a sensor head with blue lights and whiskers that trail. White ceramic over black carbon.

The numbers are MACHINE; the parts are build(k). The legs come from the stock builders (stock.limb), everything
that makes it *this* machine (hull, carapace, neck boom, head) is built here — a new topic writes its own.
"""
import math
from mbr.spec import mirror
from mbr.geom import Mesh, T, RX, RY, RZ
from mbr import stock

LEG = dict(role='leg', kind='mammal', width=0.74, drum=0.74, ball=0.42, digits=3, digit_len=1.55, act=[1, 1, 1],
           style='ceramic')

MACHINE = {
    'name': 'wader', 'title': 'WADER',
    'figure': 1.75, 'figure_at': (10.5, -7.0, 0.0),
    'body': {'z': 16.8},
    'palette': {
        'shell': ('ceramic', '#e9e7e2'), 'frame': ('carbon', '#131416'), 'metal': ('graphite', '#2a2c30'),
        'joint': ('graphite', '#33353a'), 'steel': ('steel', '#c8cbd0'), 'cable': ('rubber', '#18191b'),
        'rubber': ('rubber', '#101010'), 'glass': ('glass', '#06080c'), 'light': ('emit', '#2f6dff', 9.0),
    },
    'limbs': [
        dict(LEG, name='FL', at=(3.3, 1.5, -1.15), segs=[6.9, 6.1, 3.5], knee=1, gamma=11, home=(4.5, 2.7)),
        dict(LEG, name='RL', at=(-3.5, 1.7, -1.15), segs=[6.9, 6.1, 3.5], knee=-1, gamma=11, home=(-4.9, 3.1)),
    ],
    'neck': {'at': (5.3, 0.0, 0.55), 'links': [[2.3, 64], [2.2, 56], [2.0, 44], [1.8, 30]]},
    'head': {'len': 3.6},
    'extras': [
        dict(name='whisker_L1', type='lag', parent='head', at=(0.32, 0.6, 0.18), dir=(0.35, -0.75, 0.55), len=2.6, lag=0.22, gain=0.9),
        dict(name='whisker_R1', type='lag', parent='head', at=(-0.32, 0.6, 0.18), dir=(-0.35, -0.75, 0.55), len=2.6, lag=0.22, gain=0.9),
        dict(name='whisker_L2', type='lag', parent='head', at=(0.3, -0.2, 0.42), dir=(0.35, -0.3, 0.9), len=1.8, lag=0.3, gain=1.0),
        dict(name='whisker_R2', type='lag', parent='head', at=(-0.3, -0.2, 0.42), dir=(-0.35, -0.3, 0.9), len=1.8, lag=0.3, gain=1.0),
    ],
    'gait': {'cycle': 5.2, 'duty': 0.68, 'stride': 5.0, 'lift': 1.7, 'pattern': 'lateral', 'crouch': 0.55,
             'dip': 0.32, 'dip_time': 0.42, 'sway': 0.7, 'roll': 2.0, 'nod': 1.6, 'yaw': 0.8, 'swing_gamma': 26,
             'foot_pitch': 16, 'toe_curl': 28, 'neck_rock': 2.5, 'neck_sway': 3.0, 'loop_cycles': 1},
    'idle': {'period': 12.0, 'breath': 0.14, 'shift': 0.22, 'scan': 14.0, 'crouch': 0.15},
    'moves': {
        # Lowers to probe the ground in front of it: gathers (rises, lifts its head), front legs fold as the body
        # tips nose-down, the neck reaches, holds and looks, then pushes up past rest and settles back.
        'probe': {'dur': 11.0, 'main': 'body.dz', 'keys': {
            'body.dz':    [(0, -0.15), (0.8, 0.22), (4.0, -3.4), (6.6, -3.4), (9.0, 0.3), (10.0, -0.25), (11.0, -0.15)],
            'body.pitch': [(0, 0), (0.8, -2.5), (4.0, 13.0), (6.6, 13.0), (9.0, -1.8), (10.0, 0.6), (11.0, 0)],
            'neck.pitch': [(0, 0), (0.8, -6), (4.3, 34), (6.6, 34), (9.2, -4), (10.2, 1), (11.0, 0)],
            'head.pitch': [(0, 0), (0.8, -8), (4.4, 38), (5.4, 30), (6.6, 36), (9.2, -6), (10.4, 1), (11.0, 0)],
            'head.yaw':   [(0, 0), (4.4, 0), (5.2, 22), (6.0, -16), (6.6, 0), (11.0, 0)],
            'light':      [(0, 1.0), (4.2, 1.0), (4.6, 0.5), (4.9, 1.0), (11.0, 1.0)],
        }},
        # Wakes up: the head hangs dark, lifts, the lights stutter on, it looks left, right, and settles.
        'wake': {'dur': 9.0, 'flicker': (2.4, 3.1), 'keys': {
            'body.dz':    [(0, -0.6), (1.6, -0.75), (3.0, 0.1), (3.8, -0.1), (9.0, -0.15)],
            'neck.pitch': [(0, 26), (1.2, 28), (3.0, -4), (3.8, 1), (9.0, 0)],
            'head.pitch': [(0, 34), (1.4, 37), (3.2, -6), (4.0, 2), (9.0, 0)],
            'head.yaw':   [(0, 0), (3.6, 0), (4.1, -6), (5.0, 48), (5.5, 46), (6.9, -38), (7.4, -36), (8.6, 0), (9.0, 0)],
            'neck.yaw':   [(0, 0), (3.8, 0), (5.0, 10), (6.9, -8), (8.6, 0), (9.0, 0)],
            'light':      [(0, 0.0), (2.4, 0.0), (3.1, 1.0), (9.0, 1.0)],
        }},
    },
    'plates': [
        {'name': 'hip', 'bone': 'thigh_FL', 'at': (0, 0, 0), 'dir': (0.25, -1.0, 0.1), 'size': 3.4},
        {'name': 'knee', 'bone': 'shin_FL', 'at': (0, 0, 0), 'dir': (0.55, -1.0, 0.05), 'size': 3.6},
        {'name': 'ankle', 'bone': 'tarsus_FL', 'at': (0, 0, 0), 'dir': (0.4, -1.0, 0.1), 'size': 2.8},
        {'name': 'foot', 'bone': 'foot_FL', 'at': (0, 0, -0.1), 'dir': (0.7, -1.0, 0.35), 'size': 3.8},
        {'name': 'head', 'bone': 'head', 'at': (0, 1.2, 0), 'dir': (-0.6, -1.0, 0.15), 'size': 5.2},
        {'name': 'neck', 'bone': 'neck_01', 'at': (0, 0.4, 0), 'dir': (0.3, -1.0, 0.05), 'size': 4.6},
        {'name': 'rear knee', 'bone': 'shin_RL', 'at': (0, 0, 0), 'dir': (-0.5, -1.0, 0.05), 'size': 3.6},
        {'name': 'belly', 'bone': 'body', 'at': (0, 0, -1.0), 'dir': (0.2, -0.6, -0.8), 'size': 9.0},
    ],
}
MACHINE['limbs'] += [mirror(l) for l in list(MACHINE['limbs'])]


def build(k):
    stock.limbs(k)
    hull(k)
    stock.neck(k, width=1.1, style='ceramic')
    head(k)
    for e in k.M['extras']:
        stock.whisker(k, 'Whisker' + e['name'][7:], e['name'], e['len'], 0.035)


def hull(k):
    """Body: a carbon keel with two transverse hip girders, a belly frame, a ceramic carapace, a neck boom, lights."""
    S = k.st
    to_x = RZ(-90)            # lofts run along +Y; turn them to run along the body's +X
    m = Mesh()
    m.loft([(-5.6, 0.5, 0.5, 2.4, 0, 0.1), (-4.0, 0.95, 0.85, 2.6, 0, 0.1), (0.0, 1.15, 0.95, 2.8, 0, 0.0),
            (4.2, 0.95, 0.85, 2.6, 0, 0.1), (5.8, 0.55, 0.6, 2.4, 0, 0.3)], 28, 0, M=to_x)
    for x in (3.3, -3.5):               # hip girders the leg lugs bolt to
        m.box(1.3, 3.0, 0.9, 1, c=(x, 0, -0.75))              # girder under the keel
        for sy in (-1, 1):
            m.box(1.1, 0.5, 0.75, 1, c=(x, sy * 1.45, -0.72))  # the hip lugs bolt to its ends
    k.part('Keel', m, 'body', ('frame', 'metal'), stage=S('body'), frame='body', bevel=0.04)
    # belly frame: two longerons and ribs under the keel
    m = Mesh()
    for y in (-0.42, 0.42):
        m.taper(10.0, 0.16, 0.3, M=T(-5.0, y, -0.9) @ RZ(-90))
    for x in (-2.2, 0.0, 2.2):
        m.box(0.22, 1.0, 0.25, 0, c=(x, 0, -0.9))
        m.tube((x, -0.42, -0.9), (x, 0.0, -0.62), 0.06, 8, 1)
        m.tube((x, 0.42, -0.9), (x, 0.0, -0.62), 0.06, 8, 1)
    k.part('BellyFrame', m, 'body', ('metal', 'steel'), stage=S('body'), frame='body', bevel=0.01)
    # dorsal carapace: a long ceramic shell, split in two along the spine, lifted off the keel on posts
    for side in (1, -1):
        m = Mesh()
        a0, a1 = (0.5 * math.pi, 1.0 * math.pi) if side > 0 else (0.0, 0.5 * math.pi)
        secs = [(-6.6, 1.1, 0.8, 2.2, 0, 0.7), (-4.8, 2.25, 1.65, 2.5, 0, 0.85), (-1.8, 2.7, 2.15, 2.7, 0, 0.9),
                (1.6, 2.5, 1.95, 2.6, 0, 0.9), (3.5, 1.75, 1.35, 2.4, 0, 0.85), (4.4, 0.75, 0.7, 2.2, 0, 0.8)]
        m.shell(secs, a0, a1, 0.12, 14, 0, M=to_x)
        k.part(f'Carapace{"L" if side > 0 else "R"}', m, 'body', ('shell',), stage=S('shells'), frame='body',
               bevel=0.03)
    m = Mesh()
    for x in (-4.0, -1.5, 1.2, 3.4):
        for y in (-0.55, 0.55):
            m.tube((x, y, 0.6), (x, y * 1.3, 1.55), 0.09, 8, 0)
    k.part('CarapacePosts', m, 'body', ('frame',), stage=S('body'), frame='body', bevel=0.01)
    # neck boom up to the first neck drum, with the fork the neck turns in
    nk = k.kin.neck_at
    m = Mesh()
    m.taper(1.7, 0.9, 0.8, 0.75, 0.7, 0, M=T(nk.x - 1.6, 0, nk.z - 0.15) @ RZ(-90))
    for sy in (-1, 1):
        m.cyl(0.5, 0.18, 'Y', 28, 0, c=(nk.x, sy * 0.47, nk.z))
        m.ring(0.5, 0.3, 0.06, 'Y', 28, 1, c=(nk.x, sy * 0.57, nk.z))
    k.part('NeckBoom', m, 'body', ('frame', 'steel'), stage=S('body'), frame='body', bevel=0.02)
    # tail fin with a sensor cluster
    m = Mesh()
    m.shell([(-7.4, 0.08, 0.5, 2.2, 0, 0.9), (-6.6, 0.25, 0.75, 2.4, 0, 0.7), (-5.5, 0.35, 0.8, 2.4, 0, 0.5)],
            -0.5 * math.pi, 1.5 * math.pi, 0.06, 12, 0, M=to_x)
    k.part('TailFin', m, 'body', ('shell',), stage=S('shells'), frame='body', bevel=0.01)
    # under-carapace lights: a dotted strip each side
    m = Mesh()
    for side in (1, -1):
        for i in range(9):
            x = -4.2 + i * 0.95
            m.cyl(0.07, 0.12, 'Z', 10, 0, c=(x, side * (2.2 - 0.1 * abs(i - 4) ** 1.3 * 0.4), 0.72))
    k.part('BellyLights', m, 'body', ('light',), stage=S('lights'), frame='body')


def head(k):
    """Sensor pod: a long ceramic upper shell over a black chin, a glass visor band, a row of blue sensor lights each
    side, a yaw bearing ring underneath where the last neck link meets it."""
    S = k.st
    L = k.M['head']['len']
    # head bone frame: X right, Y forward, Z up; origin at the neck tip
    m = Mesh()
    m.loft([(-0.9, 0.42, 0.45, 2.3, 0, 0.15), (-0.2, 0.55, 0.55, 2.4, 0, 0.2), (1.0, 0.52, 0.5, 2.5, 0, 0.18),
            (2.2, 0.36, 0.34, 2.3, 0, 0.1), (3.3, 0.12, 0.12, 2.0, 0, 0.0), (3.7, 0.02, 0.03, 2.0, 0, 0.0)], 28, 0)
    k.part('HeadCore', m, 'head', ('frame',), stage=S('head'), bevel=0.01)
    m = Mesh()
    m.shell([(-1.0, 0.5, 0.56, 2.4, 0, 0.17), (-0.2, 0.62, 0.62, 2.5, 0, 0.21), (1.0, 0.58, 0.56, 2.6, 0, 0.19),
             (2.2, 0.42, 0.38, 2.4, 0, 0.1), (3.3, 0.16, 0.15, 2.1, 0, 0.0)], 0.12 * math.pi, 0.88 * math.pi, 0.06, 18, 0)
    k.part('HeadShell', m, 'head', ('shell',), stage=S('shells'), bevel=0.01)
    m = Mesh()
    m.shell([(0.15, 0.61, 0.57, 2.5, 0, 0.12), (0.9, 0.56, 0.52, 2.6, 0, 0.12), (2.0, 0.42, 0.37, 2.4, 0, 0.06)],
            -0.06 * math.pi, 0.07 * math.pi, 0.03, 4, 0)
    m.shell([(0.15, 0.61, 0.57, 2.5, 0, 0.12), (0.9, 0.56, 0.52, 2.6, 0, 0.12), (2.0, 0.42, 0.37, 2.4, 0, 0.06)],
            0.93 * math.pi, 1.06 * math.pi, 0.03, 4, 0)
    k.part('Visor', m, 'head', ('glass',), stage=S('head'))
    m = Mesh()
    for sx in (-1, 1):
        for i in range(6):
            y = -0.2 + i * 0.36
            r = 0.055 + 0.01 * (i % 2)
            m.cyl(r, 0.08, 'X', 12, 0, c=(sx * (0.55 - 0.035 * i * i * 0.18), y, 0.14))
    k.part('SensorLights', m, 'head', ('light',), stage=S('lights'))
    m = Mesh()
    m.cyl(0.52, 0.22, 'Z', 32, 0, c=(0, 0, -0.32))
    m.bolts(0.44, 12, 0.03, 0.05, 'Z', 1, c=(0, 0, -0.2))
    k.part('HeadBearing', m, 'head', ('joint', 'steel'), stage=S('head'), bevel=0.01)
