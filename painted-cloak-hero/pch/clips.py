"""Clips: each one is made and reviewed on its own (source step 6: "idle and walk cycles, with the cloak bones lagging
behind the body"). Loops (idle, walk, run) are seamless: every motion in them repeats exactly over the clip, the
walk's root advances at a constant speed (baked in place; the review floor scrolls under it), and the cloak is
simulated to its steady state so the last frame meets the first. One-shots (turn) start and end at rest.

A clip is a function of time that returns a pose dict (see pose.solve). Cloth is NOT animated here: the cloak, hair
tails and scarves get their motion from spring.py, from how the body moved a few frames ago.

Clip types (spec "motion": {"clips": [...]}):
  idle  {dur, blinks: [t...], sway: 1, look: deg, breath: 1}      loop; breathes, shifts weight, blinks
  walk  {dur (= one stride cycle), stride, bounce, arms, lean}    loop; feet planted (IK), root speed constant
  run   {dur, stride, bounce, arms, lean}                          loop; flight phase, arms bent
  turn  {dur, by: deg, move: s}                                    one-shot step-turn on the spot: wind-up, turn
                                                                   over stepping feet, recovery; cloak swings wide
Add a clip in project parts.py:  from pch.clips import clip, LOOPS ; @clip('limp') def f(m, c, t, root): ...
Yaw 0 faces -Y (toward a front camera); +90 faces +X (screen right in the front view).
"""
import math
from mathutils import Vector

CLIPS = {}
LOOPS = {'idle', 'walk', 'run'}       # clip types baked as seamless loops (add a project loop: LOOPS.add('limp'))


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
        for deg in range(2 if b.adult > 0.5 else 6, 70):
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
    """A loop of c['dur'] seconds: every term repeats a whole number of times in the loop (seamless), on different
    periods (breath 2-3x, weight shift 1x, head 1x + 3x) so it never reads as one metronome."""
    p = m.base(root)
    H = m.body.H
    D = float(c.get('dur', 4.0))
    sway = float(c.get('sway', 1.0))
    nb = max(1, round(D / float(c.get('breathPeriod', 1.9))))
    w = math.sin(math.tau * t / D)                       # weight shift, once a loop
    br = math.sin(math.tau * nb * t / D)                 # breath
    k = float(c.get('breath', 1.0))
    p['hips'] = (0.007 * H * w * sway, 0.0, -0.012 * H - 0.0018 * H * (1 - math.cos(math.tau * 2 * t / D)) * sway,
                 0.0, -1.6 * w * sway, 1.2 * w * sway)
    p['spine'] = (1.1 * br * k, 1.0 * w * sway, -0.8 * w * sway)
    p['chest'] = (1.8 * br * k, 0.6 * w * sway, 0)
    look = float(c.get('look', 0.0))
    p['head'] = (-2.0 + 1.4 * math.sin(math.tau * t / D + 1.1) - 0.8 * br * k,
                 2.0 * math.sin(math.tau * t / D + 0.4), look + 4.0 * math.sin(math.tau * t / D + 2.0) + 1.2 * math.sin(math.tau * 3 * t / D))
    ar = m.arm_rest
    p['arm.L'] = (ar + 1.4 * br * k + 1.0 * w, 4.0 + 2 * w, 14.0 + 3 * (1 + w))
    p['arm.R'] = (ar + 1.4 * br * k - 1.0 * w, 4.0 - 2 * w, 14.0 + 3 * (1 - w))
    p['blink'] = max([pulse(t % D, b) for b in c.get('blinks', [1.3])] + [0.0])
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
    """Step-turn on the spot, then stand and recover (the cloak keeps swinging after the body has stopped)."""
    mv = float(c.get('move', min(1.3, c['dur'] * 0.6)))
    cc = dict(c, dur=mv)
    delta = _turn_delta(c, root)
    if t <= mv:
        return _turn_core(m, cc, t, root, delta)
    p = _turn_core(m, cc, mv, root, delta)
    x = t - mv                                   # recovery: a small settle of the hips and chest, then breathing
    H = m.body.H
    k = math.exp(-x / 0.25) * math.sin(x * 9)
    p['hips'] = (p['hips'][0], p['hips'][1], p['hips'][2] - 0.004 * H * k, p['hips'][3] + 2 * k, p['hips'][4], p['hips'][5])
    p['chest'] = (p['chest'][0] - 1.5 * k, p['chest'][1], p['chest'][2] - 4 * k * (1 if delta > 0 else -1))
    return p


def _turn_delta(c, root):
    if 'by' in c or 'to' not in c:
        return float(c.get('by', 180))
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


def _walk_params(m, c, run=False):
    L = m.leg_len
    beta = float(c.get('stance', 0.36 if run else 0.6))
    S = float(c.get('stride', 0.78 if run else 0.42)) * L          # step length
    T = float(c.get('dur', 0.64 if run else 1.0))                  # one loop = two steps
    v = 2 * S / T
    # hips low enough that the front foot reaches the ground at contact
    reach = (0.93 if run else 0.945) * L
    hz = math.sqrt(max(1e-6, reach ** 2 - (S * min(beta, 0.6) * (0.55 if run else 1)) ** 2))
    rest = m.body.hip_z - 0.012 * m.body.H - m.body.foot_z
    return beta, S, T, v, hz - rest


def speed(m, c):
    """Root speed (m/s) of a locomotion loop, 0 for clips that stay on the spot."""
    if c['type'] in ('walk', 'run'):
        return _walk_params(m, c, c['type'] == 'run')[3]
    return 0.0


def _locomotion(m, c, t, root, run):
    b = m.body
    H = b.H
    beta, S, T, v, drop = _walk_params(m, c, run)
    dist = v * t
    x0, y0, yaw = root
    ya = math.radians(yaw)
    fwd = Vector((math.sin(ya), -math.cos(ya), 0))
    side = Vector((math.cos(ya), math.sin(ya), 0))     # character's left
    pos = Vector((x0, y0, 0)) + fwd * dist
    p = m.base((pos.x, pos.y, yaw))
    u = dist / (2 * S)
    bounce = float(c.get('bounce', 1.0))
    arms = float(c.get('arms', 1.0))
    liftk = 0.13 if run else 0.07
    for s, sx, off in (('L', 1, beta / 2), ('R', -1, beta / 2 + 0.5)):
        ph = u + off
        k = math.floor(ph)
        phi = ph - k
        c_k = (k - off + beta / 2) * 2 * S        # hip passes over the foot at mid-stance
        if phi < beta:
            f = c_k
            lift = 0.0
        else:
            w = (phi - beta) / (1 - beta)
            f = c_k + 2 * S * ease(w)
            lift = math.sin(math.pi * w) * liftk * H * (1.0 if not run else (0.6 + 0.4 * math.sin(math.pi * w)))
        lat = sx * b.hip_x * (0.8 if run else 1.1)
        q = Vector((x0, y0, 0)) + fwd * f + side * lat
        if phi < 0.12:
            pitch = -14 * (1 - phi / 0.12)
        elif beta - 0.18 < phi < beta + 0.12:
            pitch = 28 * math.sin(math.pi * (phi - (beta - 0.18)) / 0.30)
        elif phi > 0.88:
            pitch = -14 * (phi - 0.88) / 0.12
        else:
            pitch = 0.0
        if run and phi >= beta:
            pitch = max(pitch, 20 * math.sin(math.pi * (phi - beta) / (1 - beta)))
        z = b.foot_z + lift + (b.foot_len * 0.75 * math.sin(math.radians(pitch)) if pitch > 0 else 0.0)
        p['leg.' + s] = (q.x, q.y, z, pitch, yaw + sx * 4)
    ph = math.tau * u
    lean = float(c.get('lean', 9 if run else 4))
    if run:
        bob = 0.022 * H * bounce * -math.cos(2 * (ph - math.tau * beta / 2))
    else:
        bob = 0.010 * H * bounce * math.cos(2 * ph)
    p['hips'] = (0.006 * H * math.cos(ph), 0.0, drop + bob, lean * 0.7, -2.5 * math.cos(ph),
                 -(9 if run else 6) * math.sin(ph))
    p['spine'] = (lean * 0.4, 1.0 * math.cos(ph), (5 if run else 3) * math.sin(ph))
    p['chest'] = (lean * 0.2, 0, (6 if run else 4) * math.sin(ph))
    p['head'] = (-3 - lean * 0.6, -1.5 * math.cos(ph), -3 * math.sin(ph) - (2 if run else 0) * math.sin(ph))
    ar = m.arm_rest
    sw = (34 if run else 22) * arms
    eb = 75 if run else 18
    p['arm.L'] = (ar + 2, -sw * math.cos(ph), eb + 10 * max(0, -math.cos(ph)))
    p['arm.R'] = (ar + 2, sw * math.cos(ph), eb + 10 * max(0, math.cos(ph)))
    p['blink'] = max([pulse(t % T, bt) for bt in c.get('blinks', [])] + [0.0])
    return p


@clip('walk')
def walk(m, c, t, root):
    return _locomotion(m, c, t, root, False)


@clip('run')
def run(m, c, t, root):
    return _locomotion(m, c, t, root, True)
