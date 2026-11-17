"""Motion: every action is a pure function t -> command (see kin.Kin.pose). Same t, same pose; nothing is simulated.

Actions
  walk   loop. A stateless gait: each limb has a phase offset; a foot is planted (world-fixed) for `duty` of the cycle
         and swings for the rest with a quick lift and a slow set-down; the body travels at the speed that keeps the
         planted feet still (v = stride / (duty * cycle)), sinks into each landing, sways and rolls toward the side
         that carries it and nods while a front foot is in the air; the neck rocks with each step while the head stays
         level; arms swing against their own side's front leg.
  idle   loop. Feet planted; the machine breathes (hydraulic settle), shifts its weight, the head scans, lights pulse.
         Every term repeats a whole number of times in the loop.
  moves  one-shots written as KEY POSES: channel -> [(t, value), ...] interpolated with ease-in-out per segment
         (the method: video reference -> key poses -> numbers -> interpolation). Feet stay planted.
         Channels: body.dx dy dz roll pitch yaw · neck.pitch neck.yaw · head.pitch head.yaw head.roll · light ·
         hand.<limb> (x, y, z offsets in body space) · curl.<limb> · gamma.<limb> · extra.<name>.
"""
import math
from mathutils import Vector

TAU = 2 * math.pi

PATTERNS = {
    # phase offsets by limb order around the body (front-left, front-right, ..., rear-left, rear-right)
    'lateral': {'RL': 0.0, 'FL': 0.25, 'RR': 0.5, 'FR': 0.75},          # four-beat walk (giraffe, heron-like)
    'tripod': None,                                                     # hexapod: alternating triangles
    'wave': None,                                                       # back-to-front ripple each side
}


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * x * (x * (6 * x - 15) + 10)


def ease_io(x):
    x = max(0.0, min(1.0, x))
    return 0.5 - 0.5 * math.cos(math.pi * x)


def track(keys, t):
    """Piecewise ease-in-out between key poses: keys = [(t, v), ...] sorted; v float or tuple."""
    if not keys:
        return 0.0
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            s = smooth((t - t0) / max(1e-9, t1 - t0))
            if isinstance(v0, (tuple, list)):
                return tuple(a + (b - a) * s for a, b in zip(v0, v1))
            return v0 + (v1 - v0) * s
    return keys[-1][1]


class Motion:
    def __init__(self, M, kin):
        self.M = M
        self.kin = kin
        g = M['gait']
        self.g = g
        self.T = float(g['cycle'])
        self.duty = float(g['duty'])
        self.S = float(g['stride'])
        self.v = self.S / (self.duty * self.T)
        self.legs = [l for l in kin.limbs if l.role == 'leg']
        self.arms = [l for l in kin.limbs if l.role == 'arm']
        self.off = self._offsets()
        self.home = {l.name: Vector((l.s['home'][0], l.s['home'][1], l.ball if l.role == 'leg' else l.s['home'][2]))
                     for l in kin.limbs}
        self.moves = M.get('moves', {})

    def _offsets(self):
        g = self.g
        if isinstance(g.get('offsets'), dict):
            return {k: float(v) for k, v in g['offsets'].items()}
        pat = g.get('pattern', 'lateral')
        legs = self.legs
        out = {}
        if pat == 'tripod':
            # sort each side front to back; alternate A/B along each side, opposite on the other side
            for side in (1, -1):
                s = sorted([l for l in legs if l.side == side], key=lambda l: -l.at.x)
                for i, l in enumerate(s):
                    out[l.name] = 0.5 * ((i + (0 if side > 0 else 1)) % 2)
        elif pat == 'wave':
            for side in (1, -1):
                s = sorted([l for l in legs if l.side == side], key=lambda l: l.at.x)      # rear first
                n = len(s)
                for i, l in enumerate(s):
                    out[l.name] = (i / max(1, n) * (1 - self.duty) * 1.0 + (0.0 if side > 0 else 0.5)) % 1.0
        else:        # lateral sequence: rear-left, front-left, rear-right, front-right (any count per side)
            for side, base in ((1, 0.0), (-1, 0.5)):
                s = sorted([l for l in legs if l.side == side], key=lambda l: l.at.x)        # rear first
                n = len(s)
                for i, l in enumerate(s):
                    out[l.name] = (base + 0.25 * i / max(1, n - 1) * (1 if n > 1 else 0)) % 1.0
        return out

    # ---- walk -------------------------------------------------------------------------------------------------------
    def phase(self, l, t):
        x = t / self.T - self.off[l.name]
        k = math.floor(x)
        return x - k, k

    def stance_w(self, p):
        """Soft 1 in stance, 0 in swing (edges ramp over 6 % of the cycle)."""
        e = 0.06
        b = self.duty
        if p < e:
            return 0.5 + 0.5 * p / e
        if p < b - e:
            return 1.0
        if p < b:
            return 0.5 + 0.5 * (b - p) / e
        if p > 1 - e:
            return 0.5 * (p - (1 - e)) / e
        return 0.0

    def land_x(self, l, k):
        tc = (k + self.off[l.name]) * self.T + self.duty * self.T / 2
        return self.v * tc + self.home[l.name].x

    def foot(self, l, t):
        g = self.g
        p, k = self.phase(l, t)
        h = self.home[l.name]
        if p < self.duty:
            return Vector((self.land_x(l, k), h.y, h.z)), 0.0, 0.0, 0.0, 'stance', 0.0
        s = (p - self.duty) / (1 - self.duty)
        x0, x1 = self.land_x(l, k), self.land_x(l, k + 1)
        # horizontal: leaves late, travels fast, eases into the set-down
        e = smooth(min(1.0, max(0.0, (s - 0.08) / 0.84)))
        x = x0 + (x1 - x0) * e
        # vertical: quick lift (peak at ~40 %), slow set-down (zero slope at contact)
        sp = s ** 0.75
        z = h.z + g['lift'] * math.sin(math.pi * sp) ** 1.4
        gam = g.get('swing_gamma', 20.0) * math.sin(math.pi * s) ** 1.2
        # toes droop and the foot tips only once it is clear of the ground (never through it)
        clear = min(1.0, max(0.0, (z - h.z) / max(1e-6, 1.1 * l.digit_len, 0.45 * g['lift']))) ** 1.5
        pitch = clear * g.get('foot_pitch', 18.0) * (1.0 if s < 0.55 else -0.6)
        curl = clear * g.get('toe_curl', 25.0)
        return Vector((x, h.y, z)), pitch, curl, gam, 'swing', s

    def walk(self, t, travel=True):
        g = self.g
        cmd = {'limbs': {}}
        support_y, support_w, front_air = 0.0, 0.0, 0.0
        dz = -g.get('crouch', 0.0)
        tau = g.get('dip_time', 0.3)
        nfront = max(1, sum(1 for l in self.legs if l.at.x > 0))
        for l in self.legs:
            p, k = self.phase(l, t)
            w = self.stance_w(p)
            support_y += w * l.side
            support_w += w
            if l.at.x > 0:
                front_air += (1 - w) / nfront
            # the body sinks into each landing and recovers (heavier = slower)
            for kk in (k, k - 1):
                tl = (kk + self.off[l.name]) * self.T
                d = t - tl
                if d >= 0:
                    dz -= g.get('dip', 0.2) / len(self.legs) * 2 * (d / tau) * math.exp(1 - d / tau)
        lat = support_y / max(1e-6, support_w)          # -1 .. 1, toward the side that carries it
        x = self.v * t if travel else 0.0
        surge = g.get('surge', 0.0) * math.sin(TAU * 2 * t / self.T)
        cmd['root'] = (x, 0.0, 0.0)
        cmd['body'] = (surge, g.get('sway', 0.3) * lat, dz, g.get('roll', 1.5) * lat,
                       g.get('nod', 1.0) * front_air, g.get('yaw', 0.6) * lat)
        for l in self.legs:
            P, pitch, curl, gam, ph, s = self.foot(l, t)
            if not travel:
                P = P - Vector((self.v * t, 0, 0))
            c = {'p': P, 'pitch': pitch, 'curl': curl, 'phase': ph, 's': s}
            if l.n == 3:
                c['gamma'] = l.gamma + gam
            cmd['limbs'][l.name] = c
        # arms swing against their own side's front leg
        fronts = {}
        for l in self.legs:
            if l.side and (l.side not in fronts or l.at.x > fronts[l.side].at.x):
                fronts[l.side] = l
        for a in self.arms:
            fl = fronts.get(a.side)
            sw = 0.0
            if fl:
                P, *_ = self.foot(fl, t)
                rel = (P.x - (self.v * t) - self.home[fl.name].x) / max(1e-6, self.S / 2)
                sw = -rel
            hb = self.home[a.name] + Vector((g.get('arm_swing', 0.6) * sw, 0, 0.15 * abs(sw)))
            cmd['limbs'][a.name] = {'p': self._body_pt(cmd, hb, travel, t), 'pitch': 0.0, 'curl': 10.0}
        cmd['neck'] = {'pitch': g.get('neck_rock', 1.5) * front_air, 'yaw': -g.get('neck_sway', 2.0) * lat}
        cmd['head'] = {'pitch': 0.0, 'yaw': g.get('neck_sway', 2.0) * lat * 0.8}
        cmd['light'] = 1.0
        return cmd

    def _body_pt(self, cmd, pb, travel, t):
        Rm, Bm = self.kin.body_matrix(cmd)
        return Bm @ pb

    # ---- idle -------------------------------------------------------------------------------------------------------
    def idle(self, t, scale=1.0):
        I = self.M['idle']
        L = float(I['period'])
        w = TAU / L
        breath = I.get('breath', 0.1) * scale
        shift = I.get('shift', 0.2) * scale
        scan = I.get('scan', 12.0) * scale
        dz = -I.get('crouch', 0.0) + breath * math.sin(3 * w * t)
        dy = shift * math.sin(2 * w * t + 0.4)
        pitch = 0.6 * scale * math.sin(3 * w * t + 1.1)
        roll = 0.8 * scale * math.sin(2 * w * t + 0.4)
        cmd = {'root': (0.0, 0.0, 0.0), 'body': (0.0, dy, dz, roll, pitch, 0.0), 'limbs': {}}
        for l in self.legs:
            cmd['limbs'][l.name] = {'p': self.home[l.name].copy(), 'pitch': 0.0, 'curl': 0.0, 'phase': 'stance'}
            if l.n == 3:
                cmd['limbs'][l.name]['gamma'] = l.gamma
        for a in self.arms:
            hb = self.home[a.name] + Vector((0.1 * scale * math.sin(w * t), 0, 0.12 * scale * math.sin(3 * w * t)))
            cmd['limbs'][a.name] = {'p': self._body_pt(cmd, hb, False, t), 'pitch': 0.0,
                                    'curl': 10.0 + 8 * scale * (0.5 + 0.5 * math.sin(2 * w * t))}
        yaw = scan * (0.7 * math.sin(w * t) + 0.3 * math.sin(5 * w * t + 0.7))
        cmd['neck'] = {'pitch': -1.5 * scale * math.sin(3 * w * t), 'yaw': yaw * 0.4}
        cmd['head'] = {'pitch': 2.5 * scale * math.sin(2 * w * t + 2.0), 'yaw': yaw * 0.6}
        cmd['light'] = 0.82 + 0.18 * (0.5 + 0.5 * math.sin(6 * w * t)) if scale > 0 else 1.0
        return cmd

    def rest(self, t=0.0):
        return self.idle(0.0, scale=0.0)

    # ---- moves (key poses) --------------------------------------------------------------------------------------
    def move(self, name, t):
        mv = self.moves[name]
        K = mv['keys']

        def ch(c, d=0.0):
            return track(K[c], t) if c in K else d
        cmd = self.rest()
        cmd['body'] = (ch('body.dx'), ch('body.dy'), ch('body.dz'), ch('body.roll'), ch('body.pitch'), ch('body.yaw'))
        for l in self.legs:
            c = cmd['limbs'][l.name]
            c['curl'] = ch(f'curl.{l.name}', 0.0)
            if l.n == 3:
                c['gamma'] = l.gamma + ch(f'gamma.{l.name}', 0.0)
        for a in self.arms:
            off = Vector(track(K[f'hand.{a.name}'], t)) if f'hand.{a.name}' in K else Vector((0, 0, 0))
            hb = self.home[a.name] + off
            cmd['limbs'][a.name] = {'p': self._body_pt(cmd, hb, False, t), 'pitch': ch(f'wrist.{a.name}'),
                                    'curl': ch(f'curl.{a.name}', 10.0)}
            if f'world.{a.name}' in K:       # a world-space reach target (e.g. the ground beside the figure)
                wgt = ch(f'worldw.{a.name}', 1.0)
                pw = Vector(track(K[f'world.{a.name}'], t))
                cmd['limbs'][a.name]['p'] = cmd['limbs'][a.name]['p'].lerp(pw, wgt)
        cmd['neck'] = {'pitch': ch('neck.pitch'), 'yaw': ch('neck.yaw')}
        cmd['head'] = {'pitch': ch('head.pitch'), 'yaw': ch('head.yaw'), 'roll': ch('head.roll')}
        cmd['light'] = ch('light', 1.0)
        if 'flicker' in mv:            # lights stutter on: (t0, t1) window of hard on/off steps
            t0, t1 = mv['flicker']
            if t0 <= t < t1:
                q = int((t - t0) * 14)
                cmd['light'] = [0.0, 0.7, 0.1, 0.0, 1.0, 0.3, 1.0, 0.0, 1.0][q % 9] * cmd['light']
        cmd['extras'] = {k.split('.', 1)[1]: track(v, t) for k, v in K.items() if k.startswith('extra.')}
        return cmd

    # ---- dispatch ---------------------------------------------------------------------------------------------------
    def actions(self):
        """name -> (duration s, loop?)"""
        out = {'walk': (self.T * self.g.get('loop_cycles', 1), True),
               'idle': (float(self.M['idle']['period']), True)}
        for k, mv in self.moves.items():
            out[k] = (float(mv['dur']), False)
        return out

    def cmd(self, action, t, travel=True):
        if action == 'walk':
            return self.walk(t, travel)
        if action == 'idle':
            return self.idle(t)
        if action == 'rest':
            return self.rest(t)
        return self.move(action, t)
