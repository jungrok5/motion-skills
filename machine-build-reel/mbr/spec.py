"""The machine spec: a project's `machine.py` defines MACHINE (a dict, the numbers) and build(k) (the parts, as code).

    MACHINE = {
      'name': 'wader', 'title': 'WADER', 'figure': 1.75,
      'body':  {'z': 17.0, 'box': (9, 3, 3)},                 # rest height of the body origin; rough hull size (framing)
      'palette': {...},                                        # roles -> material presets (materials.py)
      'limbs': [ {name, role 'leg'|'arm', kind 'mammal'|'insect'|'arm', at (body space), segs [..], knee ±1,
                  gamma (3-seg tarsus lean), coxa, hip_drop, home (x, y) on the ground (legs) / (x, y, z) body space
                  (arms), ball, digits, digit_len, width, drum, act [0/1 per joint], limits {joint: [lo, hi]}} ],
      'neck':  {'at': (x, y, z), 'links': [[length, angle_deg_from_horizontal], ...]},
      'head':  {'len': 3.0},
      'extras': [ {name, type 'fixed'|'spin'|'lag', parent, at, dir, len, ...} ],
      'gait':  {cycle, duty, stride, lift, pattern 'lateral'|'tripod'|'wave' or offsets{}, crouch, dip, dip_time,
                sway, roll, nod, yaw, swing_gamma, foot_pitch, toe_curl, neck_rock, neck_sway, arm_swing, loop_cycles},
      'idle':  {period, breath, shift, scan, crouch},
      'moves': {name: {'dur': s, 'keys': {channel: [(t, v), ...]}, 'flicker': (t0, t1)}},
      'plates': [ {name, bone, at (bone-local point), dir (view direction, world), size (m across)} ],
      'reel':  {...}  (see reel.py)
    }

`mirror(limb)` makes the right-hand copy of a left limb (name suffix L -> R, y negated).
"""
import copy
import importlib.util
import os
import sys

REQUIRED = ('name', 'body', 'limbs', 'gait', 'idle')


def mirror(l, suffix=('L', 'R')):
    r = copy.deepcopy(l)
    a, b = suffix
    r['name'] = l['name'][:-len(a)] + b if l['name'].endswith(a) else l['name'] + b
    x, y, z = l['at']
    r['at'] = (x, -y, z)
    h = list(l['home'])
    h[1] = -h[1]
    r['home'] = tuple(h)
    return r


def load(path):
    """Import a project's machine.py (fresh every call) and return (MACHINE normalised, module)."""
    path = os.path.abspath(path)
    name = f'_machine_{abs(hash(path)) % 10**8}'
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    sys.path.insert(0, os.path.dirname(path))
    try:
        spec.loader.exec_module(mod)
    finally:
        sys.path.pop(0)
    M = normalise(copy.deepcopy(mod.MACHINE))
    return M, mod


def normalise(M):
    for k in REQUIRED:
        if k not in M:
            raise ValueError(f'MACHINE is missing {k!r}')
    M.setdefault('title', M['name'].upper())
    M.setdefault('figure', 1.75)
    M.setdefault('palette', {})
    M.setdefault('neck', {})
    M.setdefault('head', {})
    M.setdefault('extras', [])
    M.setdefault('moves', {})
    M.setdefault('plates', [])
    M.setdefault('reel', {})
    M.setdefault('fps', 24)
    g = M['gait']
    for k, v in dict(cycle=4.0, duty=0.65, stride=3.0, lift=1.0, crouch=0.0, dip=0.2, dip_time=0.3, sway=0.3,
                     roll=1.5, nod=1.0, yaw=0.5, swing_gamma=20.0, foot_pitch=15.0, toe_curl=25.0, neck_rock=1.5,
                     neck_sway=2.0, arm_swing=0.6, loop_cycles=1, surge=0.0).items():
        g.setdefault(k, v)
    M['idle'].setdefault('period', 12.0)
    names = set()
    for l in M['limbs']:
        if l['name'] in names:
            raise ValueError(f"two limbs named {l['name']!r}")
        names.add(l['name'])
        l.setdefault('role', 'leg')
        l.setdefault('width', 0.5)
        l.setdefault('drum', 0.95 * l['width'])
        if l.get('kind', 'arm' if l['role'] == 'arm' else 'mammal') != 'insect':
            l.setdefault('hip_drop', 1.35 * 1.25 * l['drum'] / 2)
        if 'home' not in l:
            raise ValueError(f"limb {l['name']}: needs 'home' (where its foot / hand rests)")
    return M
