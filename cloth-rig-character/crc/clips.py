"""Clips, made one at a time (source workflow: idle with a blink > turn > walk), then played as one sequence.

A clip is a function of local time that returns a pose dict (see pose.solve). Clips chain: each starts where the
previous one left the root, and a short cross-fade joins them. Cloth is NOT animated here: the skirt, bow, scarf,
tails get their motion from spring.py, from how the body moves.

Clip types (spec "motion": {"clips": [...]}):
  idle  {dur, blinks: [t...], sway: 1, look: deg}
  turn  {dur, to: yaw | by: deg}          step-turn; head leads, cloth flares and lags
  walk  {dur, cycle: s, stride: x, bounce: 1, arms: 1}   root moves forward, feet planted (IK)
  spin  {dur, by: 360}                    twirl on the spot (skirt flare showcase)
  wave  {dur, side: 'R'}                  idle with one arm waving
  hop   {dur, height}                     a small hop in place
Add a clip in project parts.py:  from crc.clips import clip ; @clip('bow_greet') def f(ctx, c, t, root): ...
Yaw 0 faces -Y (toward a front camera); +90 faces +X (screen right in the front view).
"""
import math
from mathutils import Vector

CLIPS = {}


def clip(name):
    def deco(fn):
        CLIPS[name] = fn
        return fn
    return deco


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def ease5(t):
    t = max(0.0, min(1.0, t))
    return t * t * t * (t * (6 * t - 15) + 10)


def pulse(t, at, close=0.06, hold=0.06, open_=0.09):
    """Blink: lids close fast, stay shut a moment (so a 24 fps frame always lands on it), open a bit slower."""
    x = t - at
    if x < 0 or x > close + hold + open_:
        return 0.0
    if x < close:
        return ease(x / close)
    if x < close + hold:
        return 1.0
    return 1 - ease((x - close - hold) / open_)


class MotionCtx:
    def __init__(self, body, surfaces, spec):
        self.body = body
        self.spec = spec
        self.surfaces = surfaces
        self.arm_rest = self._arm_clearance()
        b = body
        self.leg_len = (b.thigh + b.shin)

    def _outer(self, z, th):
        best = 0.0
        for sf in self.surfaces:
            pr = sf['prof']
            if not (pr[-1][1] <= z <= pr[0][1]):
                continue
            for (r0, z0), (r1, z1) in zip(pr, pr[1:]):
                if z1 <= z <= z0:
                    f = (z0 - z) / max(z0 - z1, 1e-9)
                    best = max(best, (r0 + (r1 - r0) * f) * math.hypot(math.cos(th), sf['sy'] * math.sin(th)))
                    break
        return best

    def _arm_clearance(self):
        """Smallest arm raise (deg) that keeps the elbow and hand outside the skirt / body, plus a margin."""
        b = self.body
        j = b.joints()
        sh = j['shoulder.L']
        for deg in range(6, 70):
            a = math.radians(deg)
            d = Vector((math.sin(a), 0, -math.cos(a)))
            ok = True
            for L in (b.upper_arm, b.upper_arm + b.forearm * 0.5, b.upper_arm + b.forearm, b.upper_arm + b.forearm + b.hand * 0.8):
                q = sh + d * L
                need = max(self._outer(q.z, 0.0), b.torso(q.z)[0]) + b.limb_r * 1.3
                if q.x < need:
                    ok = False
                    break
            if ok:
                return deg + 3
        return 60

    def stand_feet(self, root, out=6.0):
        """World ankle targets for standing still at root (x, y, yaw)."""
        b = self.body
        x, y, yaw = root
        ya = math.radians(yaw)
        res = {}
        for s, sx in (('L', 1), ('R', -1)):
            lx = sx * b.hip_x * 1.15
            wx = x + lx * math.cos(ya)
            wy = y + lx * math.sin(ya)
            res[s] = (wx, wy, b.foot_z, 0.0, yaw + sx * out)
        return res

    def base(self, root):
        f = self.stand_feet(root)
        ar = self.arm_rest
        return {
            'root': root,
            'hips': (0.0, 0.0, -0.014 * self.body.H, 0.0, 0.0, 0.0),
            'spine': (0, 0, 0), 'chest': (0, 0, 0), 'neck': (0, 0, 0), 'head': (0, 0, 0),
            'arm.L': (ar, 4.0, 14.0), 'arm.R': (ar, 4.0, 14.0),
            'leg.L': f['L'], 'leg.R': f['R'], 'blink': 0.0,
        }


def _add(t, i, v):
    t = list(t)
    t[i] += v
    return tuple(t)


@clip('idle')
def idle(m, c, t, root):
    p = m.base(root)
    H = m.body.H
    sway = float(c.get('sway', 1.0))
    w = math.sin(math.tau * t / 2.6)
    p['hips'] = (0.006 * H * w * sway, 0.0, -0.014 * H - 0.002 * H * (1 - math.cos(math.tau * t / 1.3)) * sway,
                 0.0, -1.5 * w * sway, 0.0)
    br = math.sin(math.tau * t / 3.0)
    p['spine'] = (1.0 * br, 1.0 * w * sway, 0)
    p['chest'] = (1.5 * br, 0.6 * w * sway, 0)
    look = float(c.get('look', 0.0))
    p['head'] = (-2.0 + 1.5 * math.sin(math.tau * t / 3.7), 3.0 * math.sin(math.tau * t / 4.3), look)
    ar = m.arm_rest
    p['arm.L'] = (ar + 1.5 * br, 4.0 + 2 * w, 14.0)
    p['arm.R'] = (ar + 1.5 * br, 4.0 - 2 * w, 14.0)
    p['blink'] = max([pulse(t, b) for b in c.get('blinks', [0.9])] + [0.0])
    return p


@clip('wave')
def wave(m, c, t, root):
    p = idle(m, c, t, root)
    s = c.get('side', 'R')
    k = ease(t / 0.4) * ease((c['dur'] - t) / 0.4)
    ar = m.arm_rest
    p['arm.' + s] = (ar + (150 - ar) * k, 10 * k, 14 + 40 * k + 25 * k * math.sin(math.tau * t * 2.2))
    p['head'] = _add(p['head'], 1, (6 if s == 'R' else -6) * k)
    return p


def _turn_core(m, c, t, root, delta, steps=True):
    dur = c['dur']
    u = t / dur
    x, y, yaw0 = root
    # anticipation: a slight wind-up against the turn, then the turn with a soft overshoot
    wind = -0.06 * math.sin(math.pi * min(1, u / 0.22)) if u < 0.22 else 0.0
    prog = ease5((u - 0.12) / 0.78) + wind
    yaw = yaw0 + delta * prog
    p = m.base((x, y, yaw))
    H = m.body.H
    lead = ease5((u - 0.02) / 0.7) + wind
    head_yaw = max(-50, min(50, delta * (lead - prog)))
    p['head'] = (-2, 0, head_yaw)
    p['chest'] = (0, 0, max(-25, min(25, delta * (ease5((u - 0.06) / 0.74) - prog))))
    dip = math.sin(math.pi * min(1, u / 0.25)) if u < 0.25 else 0.0
    p['hips'] = (0, 0, -0.014 * H - 0.012 * H * dip, 4 * dip, 0, 0)
    omega = abs(delta) * (ease5((u + 0.02 - 0.12) / 0.78) - ease5((u - 0.02 - 0.12) / 0.78)) / 0.04  # deg / unit
    flare = min(18, omega * 0.02)
    ar = m.arm_rest
    p['arm.L'] = (ar + flare, 4, 14 + flare)
    p['arm.R'] = (ar + flare, 4, 14 + flare)
    if steps:
        # two small steps: the foot on the turning side goes first
        first = 'L' if delta > 0 else 'R'
        second = 'R' if first == 'L' else 'L'
        f0 = m.stand_feet((x, y, yaw0))
        f1 = m.stand_feet((x, y, yaw0 + delta))
        for s, (a, b) in ((first, (0.12, 0.55)), (second, (0.42, 0.88))):
            k = ease((u - a) / (b - a))
            lift = math.sin(math.pi * k) * 0.05 * H if 0 < k < 1 else 0.0
            A, B = f0[s], f1[s]
            p['leg.' + s] = (A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, m.body.foot_z + lift,
                             8 * math.sin(math.pi * k), A[4] + (B[4] - A[4]) * k)
    return p


@clip('turn')
def turn(m, c, t, root):
    return _turn_core(m, c, t, root, _turn_delta(c, root))


def _turn_delta(c, root):
    if 'by' in c:
        return float(c['by'])
    d = float(c.get('to', 90)) - root[2]
    return (d + 180) % 360 - 180


@clip('spin')
def spin(m, c, t, root):
    c = dict(c)
    c.setdefault('by', 360)
    p = _turn_core(m, c, t, root, float(c['by']), steps=True)
    u = t / c['dur']
    k = math.sin(math.pi * u)
    ar = m.arm_rest
    p['arm.L'] = (ar + 35 * k, 0, 20 + 20 * k)
    p['arm.R'] = (ar + 35 * k, 0, 20 + 20 * k)
    return p


@clip('hop')
def hop(m, c, t, root):
    p = idle(m, c, t, root)
    H = m.body.H
    u = t / c['dur']
    h = float(c.get('height', 0.08)) * H
    crouch = math.sin(math.pi * min(1, u / 0.3)) if u < 0.3 else (math.sin(math.pi * (u - 0.75) / 0.25) if u > 0.75 else 0)
    air = math.sin(math.pi * (u - 0.3) / 0.45) if 0.3 <= u <= 0.75 else 0.0
    up = air * h
    p['hips'] = (0, 0, -0.014 * H - 0.03 * H * crouch + up, 8 * crouch, 0, 0)
    for s in ('L', 'R'):
        L = list(p['leg.' + s])
        L[2] += up
        L[3] = 15 * air
        p['leg.' + s] = tuple(L)
    ar = m.arm_rest
    p['arm.L'] = (ar + 25 * air, -20 * crouch + 15 * air, 30 * crouch + 20)
    p['arm.R'] = (ar + 25 * air, -20 * crouch + 15 * air, 30 * crouch + 20)
    return p


def _walk_params(m, c):
    L = m.leg_len
    beta = 0.6
    S = float(c.get('stride', 0.42)) * L          # step length
    T = float(c.get('cycle', 0.78))               # two steps
    v = 2 * S / T
    # hips low enough that the front foot reaches the ground at contact
    reach = 0.945 * L
    hz = math.sqrt(max(1e-6, reach ** 2 - (S * beta) ** 2))
    rest = m.body.hip_z - 0.012 * m.body.H - m.body.foot_z
    return beta, S, T, v, hz - rest


@clip('walk')
def walk(m, c, t, root):
    b = m.body
    H = b.H
    beta, S, T, v, drop = _walk_params(m, c)
    ramp = 0.5 * T
    dist = v * t * t / (2 * ramp) if t < ramp else v * (t - ramp / 2)
    x0, y0, yaw = root
    ya = math.radians(yaw)
    fwd = Vector((math.sin(ya), -math.cos(ya), 0))
    side = Vector((math.cos(ya), math.sin(ya), 0))     # character's left
    pos = Vector((x0, y0, 0)) + fwd * dist
    p = m.base((pos.x, pos.y, yaw))
    u = dist / (2 * S)
    bounce = float(c.get('bounce', 1.0))
    arms = float(c.get('arms', 1.0))
    start = ease(t / ramp)
    for s, sx, off in (('L', 1, beta / 2), ('R', -1, beta / 2 + 0.5)):
        ph = u + off
        k = math.floor(ph)
        phi = ph - k
        # contact positions along the path (distance), so the stance foot stays planted
        c_k = (k - off + beta / 2) * 2 * S        # hip passes over the foot at mid-stance
        if phi < beta:
            f = c_k
            lift = 0.0
            sw = 0.0
        else:
            w = (phi - beta) / (1 - beta)
            f = c_k + 2 * S * ease(w)
            lift = math.sin(math.pi * w) * 0.07 * H
            sw = w
        # first half-step from standing: do not swing back behind the start
        f = max(f, -S * beta * 0.0) if t < T else f
        lat = sx * b.hip_x * 1.1
        q = Vector((x0, y0, 0)) + fwd * f + side * lat
        if phi < 0.12:
            pitch = -14 * (1 - phi / 0.12)
        elif beta - 0.18 < phi < beta + 0.12:
            pitch = 28 * math.sin(math.pi * (phi - (beta - 0.18)) / 0.30)
        elif phi > 0.88:
            pitch = -14 * (phi - 0.88) / 0.12
        else:
            pitch = 0.0
        z = b.foot_z + lift + (b.foot_len * 0.75 * math.sin(math.radians(pitch)) if pitch > 0 else 0.0)
        p['leg.' + s] = (q.x, q.y, z, pitch, yaw + sx * 4)
    ph = math.tau * (u + 0.0)
    bob = 0.010 * H * bounce * math.cos(2 * ph)
    p['hips'] = (0.006 * H * math.cos(ph) * start, 0.0, drop + bob * start, 5 * start, -2.5 * math.cos(ph) * start,
                 -6 * math.sin(ph) * start)
    p['spine'] = (2 * start, 1.0 * math.cos(ph) * start, 3 * math.sin(ph) * start)
    p['chest'] = (1 * start, 0, 4 * math.sin(ph) * start)
    p['head'] = (-3, -1.5 * math.cos(ph) * start, -3 * math.sin(ph) * start)
    ar = m.arm_rest
    sw = 22 * arms * start
    p['arm.L'] = (ar + 2, -sw * math.cos(ph), 18 + 10 * max(0, -math.cos(ph)))
    p['arm.R'] = (ar + 2, sw * math.cos(ph), 18 + 10 * max(0, math.cos(ph)))
    p['blink'] = max([pulse(t, bt) for bt in c.get('blinks', [])] + [0.0])
    return p


def end_root(m, c, root):
    t = c['dur']
    p = CLIPS[c['type']](m, c, t, root)
    if c['type'] in ('turn', 'spin'):
        x, y, yaw0 = root
        return (x, y, yaw0 + (_turn_delta(c, root) if c['type'] == 'turn' else float(c.get('by', 360))))
    return p['root']


def lerp_pose(a, b, k):
    out = {}
    for key in a:
        va, vb = a[key], b[key]
        if isinstance(va, (int, float)):
            out[key] = va + (vb - va) * k
        else:
            out[key] = tuple(x + (y - x) * k for x, y in zip(va, vb))
    return out


class Sequence:
    """The clips in order, each starting at the previous clip's end root; cross-fade 'blend' seconds."""

    def __init__(self, m, clips, start, blend=0.25):
        self.m = m
        self.items = []
        root = (float(start.get('x', 0)), float(start.get('y', 0)), float(start.get('yaw', 0)))
        t0 = 0.0
        for c in clips:
            c = dict(c)
            if c['type'] not in CLIPS:
                raise KeyError(f"unknown clip {c['type']!r}; known: {sorted(CLIPS)}")
            c['dur'] = float(c.get('dur', 2.0))
            self.items.append((t0, c, root))
            root = end_root(m, c, root)
            t0 += c['dur']
        self.duration = t0
        self.blend = blend

    def clip_at(self, t):
        for i, (t0, c, root) in enumerate(self.items):
            if t < t0 + c['dur'] or i == len(self.items) - 1:
                return i
        return len(self.items) - 1

    def pose(self, t):
        i = self.clip_at(t)
        t0, c, root = self.items[i]
        p = CLIPS[c['type']](self.m, c, min(t - t0, c['dur']), root)
        if i > 0 and t - t0 < self.blend:
            pt0, pc, proot = self.items[i - 1]
            prev = CLIPS[pc['type']](self.m, pc, pc['dur'], proot)
            k = ease((t - t0) / self.blend)
            p = lerp_pose(prev, p, k)
        return p

    def label(self, t):
        i = self.clip_at(t)
        return self.items[i][1].get('label', self.items[i][1]['type'])
