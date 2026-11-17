"""Follow-through for the cloth chains — the cloak never moves with the body, it follows it, a few frames late.

Delay ('lag', frames at the hem): each joint's goal is where the body's rest shape put it `lag * i / n` frames ago
(i = joint index down the chain, n = joints), so the shoulder line moves now, the middle a frame or two later and the
hem `lag` frames later. That delay is what makes it read as fabric. On top of the delayed goals:

Each chain joint is a particle (Verlet, world space, fixed sub-steps => deterministic). Every step it is
  - carried by its own inertia (what makes the cloth lag and flare),
  - pulled back toward where the animated rest shape would put it ('stiff'),
  - pulled down by gravity, slowed by 'damp' and air 'drag',
  - held at its bone length from the joint above,
  - kept inside a cone around the rest direction ('cone', degrees) so it can never flip,
  - pushed out of the body capsules it collides with (legs, torso) and out of skirts ('skirt'), above the floor.
Then each chain bone is aimed at its particle. The result is baked as keyframes, so the glTF plays it everywhere.
"""
import math
from mathutils import Vector, Matrix
from .pose import aim

G = 9.81


def _closest_on_seg(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-12)))
    return a + ab * t


class ChainSim:
    def __init__(self, sk, chains, body, surfaces, fps, substeps=6):
        self.sk = sk
        self.chains = chains
        self.body = body
        self.surfaces = surfaces
        self.fps = fps
        self.sub = substeps
        self.state = {}
        self.hist = []          # per frame: {parent bone: delta}, for the delayed goals
        self.parents = sorted({c['parent'] for c in chains})
        self.stats = {c['name']: {'max_dev': 0.0, 'sum_dev': 0.0, 'n': 0} for c in chains}

    def _params(self, c):
        p = c['params']
        k = float(p.get('stiff', 0.1))
        d = float(p.get('damp', 0.1))
        return {
            'k': 1 - (1 - min(0.99, k)) ** (1 / self.sub),
            'd': 1 - (1 - min(0.99, d)) ** (1 / self.sub),
            'g': float(p.get('gravity', 0.7)),
            'drag': 1 - (1 - min(0.9, float(p.get('drag', 0.03)))) ** (1 / self.sub),
            'cone': math.radians(float(p.get('cone', 60))),
            'r': float(p.get('radius', 0.01)),
            'collide': p.get('collide', []),
            'ring': float(p['theta']) if 'theta' in p else None,
            'twist': math.radians(float(p.get('twist', 16))),
            'fold': math.radians(float(p.get('fold', 8))),
        }

    def _ring_limit(self, D, c, d, gd, pr):
        """Skirt / cape rows: free to flare outward, but only a little sideways twist and inward fold, so rows never
        cross each other (a twirl would otherwise wrap the skirt round the legs)."""
        M3 = D[c['parent']].to_3x3()
        th = pr['ring']
        rh = M3 @ Vector((math.cos(th), math.sin(th), 0))
        th_ = M3 @ Vector((-math.sin(th), math.cos(th), 0))
        zh = M3 @ Vector((0, 0, 1))
        L = d.length
        dt, dr, dz = d.dot(th_), d.dot(rh), d.dot(zh)
        tw = max(-pr['twist'], min(pr['twist'], math.atan2(dt, math.hypot(dr, dz))))
        phi = math.atan2(dr, -dz)
        phi0 = math.atan2(gd.dot(rh), -gd.dot(zh))
        phi = max(phi0 - pr['fold'], min(min(phi0 + pr['cone'], math.radians(100)), phi))
        return (rh * math.sin(phi) - zh * math.cos(phi)) * math.cos(tw) * L + th_ * math.sin(tw) * L

    def _colliders(self, D):
        sk, b = self.sk, self.body
        caps = {'legs': [], 'torso': [], 'arms': []}
        for s in ('L', 'R'):
            hip, knee = D['thigh.' + s] @ sk.head['thigh.' + s], D['thigh.' + s] @ sk.tail['thigh.' + s]
            ank = D['shin.' + s] @ sk.tail['shin.' + s]
            caps['legs'].append((hip, knee, b.leg_r * 1.35))
            caps['legs'].append((knee, ank, b.leg_r * 1.15))
            caps['arms'].append((D['upper_arm.' + s] @ sk.head['upper_arm.' + s], D['forearm.' + s] @ sk.tail['forearm.' + s], b.limb_r * 1.2))
        hips_p = D['hips'] @ (sk.head['hips'] - Vector((0, 0, 0.03 * b.H)))
        neck_p = D['chest'] @ sk.tail['chest']
        caps['torso'].append((hips_p, neck_p, b.torso(b.waist_z)[1] * 1.15))
        return caps

    def _push_skirts(self, D, q, r):
        """Keep q outside every registered skirt surface (in the skirt's bone frame)."""
        for sf in self.surfaces:
            M = D[sf['bone']]
            loc = M.inverted() @ q
            pr = sf['prof']
            if not (pr[-1][1] <= loc.z <= pr[0][1]):
                continue
            th = math.atan2(loc.y, loc.x)
            need = 0.0
            for (r0, z0), (r1, z1) in zip(pr, pr[1:]):
                if z1 <= loc.z <= z0:
                    f = (z0 - loc.z) / max(z0 - z1, 1e-9)
                    need = (r0 + (r1 - r0) * f) * math.hypot(math.cos(th), sf['sy'] * math.sin(th)) + r
                    break
            rad = math.hypot(loc.x, loc.y)
            if 1e-6 < rad < need:
                loc.x *= need / rad
                loc.y *= need / rad
                q = M @ loc
        return q

    def delayed(self, bone, d):
        """The bone's delta d frames ago (fractional; clamped to the oldest frame kept)."""
        h = self.hist
        x = max(0.0, len(h) - 1 - d)
        i0 = int(math.floor(x))
        i1 = min(len(h) - 1, i0 + 1)
        f = x - i0
        A, B = h[i0][bone], h[i1][bone]
        if f < 1e-6 or i0 == i1:
            return A
        qa, qb = A.to_quaternion(), B.to_quaternion()
        R = qa.slerp(qb, f).to_matrix().to_4x4()
        R.translation = A.translation.lerp(B.translation, f)
        return R

    def goals(self, D, c):
        Dp = D[c['parent']]
        lag = float(c['params'].get('lag', 0.0))
        n = len(c['points']) - 1
        if lag > 0 and self.hist:
            g = [Dp @ c['points'][0]] + [self.delayed(c['parent'], lag * i / n) @ c['points'][i] for i in range(1, n + 1)]
        else:
            g = [Dp @ p for p in c['points']]
        akick = float(c['params'].get('armKick', 0.0))
        if akick:
            # the arms swing inside the cloak: columns on each side are carried by the arm on that side (a function of
            # the pose, not a collision, so a loop stays periodic — colliding with a swinging arm made the front edges
            # flap differently every cycle)
            sk = self.sk
            th = float(c['params'].get('theta', 0.0))
            n = len(g) - 1
            for s, sx in (('L', 1), ('R', -1)):
                w = max(0.0, sx * math.cos(th)) ** 1.2
                if w < 0.02:
                    continue
                el_rest = Dp @ sk.tail['upper_arm.' + s]
                wr_rest = Dp @ sk.tail['forearm.' + s]
                del_ = D['upper_arm.' + s] @ sk.tail['upper_arm.' + s] - el_rest
                dwr = D['forearm.' + s] @ sk.tail['forearm.' + s] - wr_rest
                z_el, z_wr = el_rest.z, wr_rest.z
                for i in range(1, n + 1):
                    z = g[i].z
                    if z >= z_el:
                        k = max(0.0, 1 - (z - z_el) / max(1e-3, (Dp @ sk.head['upper_arm.' + s]).z - z_el))
                        dv = del_ * k
                    elif z >= z_wr:
                        f = (z_el - z) / max(1e-3, z_el - z_wr)
                        dv = del_ * (1 - f) + dwr * f
                    else:
                        dv = dwr * max(0.0, 1 - (z_wr - z) / 0.35)
                    dv = dv.copy()
                    dv.z = min(0.0, dv.z) * 0.3
                    g[i] = g[i] + dv * (akick * w)
        kick = float(c['params'].get('kick', 0.0))
        if kick:
            # skirt rows are carried by the legs: each row's goal moves with the knee / ankle on its side
            sk = self.sk
            th = float(c['params'].get('theta', 0.0))
            n = len(g) - 1
            for s, sx in (('L', 1), ('R', -1)):
                w = (0.5 + 0.5 * sx * math.cos(th)) ** 1.5
                if w < 0.02:
                    continue
                for key, bone in (('knee', 'thigh.' + s), ('ankle', 'shin.' + s)):
                    rest = Dp @ sk.tail[bone]                 # where it would be if the leg hung straight from the hips
                    now = D[bone] @ sk.tail[bone]
                    dv = now - rest
                    dv.z = 0.0
                    amt = 0.55 if key == 'knee' else 0.45
                    for i in range(1, n + 1):
                        g[i] = g[i] + dv * (kick * w * amt * (i / n))
        return g

    def step(self, D, first=False, warm=0):
        """Advance one frame given the body deltas D (with chain parents already posed). Mutates D for chain bones."""
        dt = 1.0 / self.fps / self.sub
        if first:
            self.hist = []
        self.hist.append({p: D[p].copy() for p in self.parents})
        if len(self.hist) > 4 * self.fps:
            self.hist.pop(0)
        caps = self._colliders(D)
        for c in self.chains:
            pr = self._params(c)
            goal = self.goals(D, c)
            if c['name'] not in self.state or first:
                self.state[c['name']] = ([g.copy() for g in goal], [g.copy() for g in goal])
            pos, prev = self.state[c['name']]
            lens = [(c['points'][i + 1] - c['points'][i]).length for i in range(len(c['points']) - 1)]
            for it in range(self.sub * (1 + warm)):
                # the anchor follows its parent exactly (sub-step interpolation not needed at 24-30 fps x 6)
                pos[0] = goal[0].copy()
                prev[0] = goal[0].copy()
                for i in range(1, len(pos)):
                    v = (pos[i] - prev[i]) * (1 - pr['d']) * (1 - pr['drag'])
                    prev[i] = pos[i].copy()
                    acc = Vector((0, 0, -G * pr['g'])) * dt * dt
                    # gravity compensation: at rest the pull toward the goal cancels gravity exactly, so the cloth
                    # hangs in its designed shape and gravity only shows when it moves
                    lift = Vector((0, 0, G * pr['g'] * dt * dt / max(pr['k'], 1e-4)))
                    pos[i] = pos[i] + v + acc + (goal[i] + lift - pos[i]) * pr['k']
                for i in range(1, len(pos)):
                    a = pos[i - 1]
                    d = pos[i] - a
                    gd = (goal[i] - goal[i - 1])
                    if d.length < 1e-9:
                        d = gd.copy()
                    if pr['ring'] is not None:
                        d = self._ring_limit(D, c, d, gd, pr)
                    # cone limit around the rest (goal) direction
                    ang = d.angle(gd) if gd.length > 1e-9 else 0.0
                    if ang > pr['cone']:
                        axis = gd.cross(d)
                        if axis.length > 1e-9:
                            d = Matrix.Rotation(pr['cone'], 3, axis.normalized()) @ gd.normalized()
                    q = a + d.normalized() * lens[i - 1]
                    for kind in pr['collide']:
                        if kind == 'skirt':
                            q = self._push_skirts(D, q, pr['r'])
                            continue
                        for (ca, cb, cr) in caps.get(kind, []):
                            cp = _closest_on_seg(q, ca, cb)
                            dd = q - cp
                            rr = cr + pr['r']
                            if dd.length < rr:
                                q = cp + (dd.normalized() if dd.length > 1e-9 else Vector((0, 0, 1))) * rr
                    if q.z < 0.004:
                        q.z = 0.004
                    # re-apply the length after collisions
                    q = a + (q - a).normalized() * lens[i - 1]
                    pos[i] = q
            # aim the chain bones at the particles
            for i, bn in enumerate(c['bones']):
                D[bn] = aim(self.sk, D, bn, pos[i + 1])
            dev = max((pos[i] - goal[i]).length for i in range(1, len(pos)))
            st = self.stats[c['name']]
            st['max_dev'] = max(st['max_dev'], dev)
            st['sum_dev'] += dev
            st['n'] += 1
        return D
