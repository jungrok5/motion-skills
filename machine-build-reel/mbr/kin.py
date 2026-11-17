"""Kinematics: every bone's world matrix as a pure function of a motion command (no Blender state).

World: +X forward, +Y left, +Z up, metres, ground at z = 0. The armature sits at the world origin, so armature space =
world space.

Limbs (legs and arms) are planar chains. Each limb has:
  * a first joint that turns the chain's plane toward the target —
      kind 'mammal' / 'arm': abduction about the body's X axis (the plane holds the fore-aft axis),
      kind 'insect': yaw about the body's Z axis (a coxa of length `coxa` sticks out radially, the plane is vertical);
  * 2 or 3 segments in that plane, solved closed-form:
      2 segments: law of cosines, the middle joint on side `knee` (+1 = toward the plane's +u: forward for a mammal,
                  up-and-out for an insect; -1 = backward, e.g. an elbow);
      3 segments: the last segment (tarsus) leans `gamma` degrees off vertical away from the knee side, then the
                  first two are solved to its top (digitigrade / heron leg).
  * an end effector (foot / hand) with digits (toes / fingers) that curl.

Bone frames: X = the hinge pin axis, Y = along the segment (upper joint -> lower joint), Z = X × Y (the segment's
in-plane "front"). Parts are built in these frames (see geom.py).

Actuators: a two-part hydraulic cylinder across a hinge — the barrel rides the upper segment, the rod the lower one,
each aimed at the other's anchor. Anchor points are found by `actuators.search` and stored in the spec at build time.
"""
import math
from mathutils import Matrix, Vector, Quaternion

D2R = math.pi / 180.0
SEG_NAMES = {2: ('thigh', 'shin'), 3: ('thigh', 'shin', 'tarsus')}
ARM_SEG_NAMES = ('upperarm', 'forearm')
JOINT_NAMES = {2: ('hip', 'knee'), 3: ('hip', 'knee', 'ankle')}
ARM_JOINT_NAMES = ('shoulder', 'elbow')


def frame(x, y, p):
    """4x4 from X and Y axes (re-orthogonalised on Y) and a position."""
    y = Vector(y).normalized()
    x = Vector(x)
    x = (x - y * x.dot(y)).normalized()
    z = x.cross(y)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = Vector(p)
    return m


def euler(roll, pitch, yaw):
    """Body rotation from degrees: yaw about Z, then pitch about Y (positive = nose down), then roll about X."""
    return (Matrix.Rotation(yaw * D2R, 4, 'Z') @ Matrix.Rotation(pitch * D2R, 4, 'Y') @
            Matrix.Rotation(roll * D2R, 4, 'X'))


def two_bone(tx, tz, L1, L2, side):
    """Planar 2-bone IK from (0,0) to (tx,tz). Returns the middle joint and how far the target was clamped (m)."""
    d = math.hypot(tx, tz)
    lo, hi = abs(L1 - L2) * 1.001 + 1e-6, (L1 + L2) * 0.9995
    clamp = 0.0
    if d > hi:
        clamp = d - hi
        tx, tz = tx * hi / d, tz * hi / d
        d = hi
    elif d < lo:
        clamp = lo - d
        if d < 1e-9:
            tx, tz, d = 0.0, -lo, lo
        else:
            tx, tz = tx * lo / d, tz * lo / d
            d = lo
    a = math.atan2(tz, tx)
    c = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)
    b = math.acos(max(-1.0, min(1.0, c)))
    k = a + side * b
    return (L1 * math.cos(k), L1 * math.sin(k)), (tx, tz), clamp


class Limb:
    def __init__(self, spec):
        s = spec
        self.s = s
        self.name = s['name']
        self.role = s.get('role', 'leg')
        self.kind = s.get('kind', 'arm' if self.role == 'arm' else 'mammal')
        self.at = Vector(s['at'])
        self.segs = [float(x) for x in s['segs']]
        self.n = len(self.segs)
        assert self.n in (2, 3), f"limb {self.name}: 2 or 3 segments"
        self.knee = int(s.get('knee', -1 if self.role == 'arm' else 1))
        self.gamma = float(s.get('gamma', 10.0))
        self.coxa = float(s.get('coxa', 0.0))
        self.hip_drop = float(s.get('hip_drop', 0.0))
        self.side = 1 if self.at.y > 1e-6 else (-1 if self.at.y < -1e-6 else 0)
        if self.role == 'arm':
            self.seg_names = list(s.get('seg_names', ARM_SEG_NAMES))
            self.joint_names = list(s.get('joint_names', ARM_JOINT_NAMES))
            self.end = 'hand'
        else:
            self.seg_names = list(s.get('seg_names', SEG_NAMES[self.n]))
            self.joint_names = list(s.get('joint_names', JOINT_NAMES[self.n]))
            self.end = 'foot'
        self.ball = float(s.get('ball', 0.4))
        dg = s.get('digits', 3)
        self.digits = dg if isinstance(dg, list) else self.default_digits(int(dg))
        self.digit_len = float(s.get('digit_len', self.ball * 3.2))
        self.acts = s.get('act', [1] * self.n)
        self.anchors = s.get('anchors', {})       # filled by actuators.search
        self.limits = s.get('limits', {})

    def default_digits(self, n):
        """Spread angles (deg, 0 = the foot's forward) of n digits; a thumb/heel digit points back."""
        if n <= 0:
            return []
        if self.role == 'arm':
            return [-20.0, 20.0, 180.0][:n] if n <= 3 else [-30.0, -10.0, 10.0, 30.0, 180.0][:n]
        if n == 3:
            return [-38.0, 38.0, 180.0]
        if n == 4:
            return [-40.0, 0.0, 40.0, 180.0]
        return [360.0 * i / n for i in range(n)]

    def bone(self, i):
        return f'{self.seg_names[i]}_{self.name}'

    # ---- the plane --------------------------------------------------------------------------------------------------
    def plane(self, Bm, target_w):
        """Plane frame for a world target: origin O (chain root), axes u (in-plane horizontal), w (in-plane up),
        n = u × w (pin axis), all in world space; plus the first joint's angle (deg)."""
        R = Bm.to_3x3()
        A = Bm @ self.at
        tb = Bm.inverted() @ Vector(target_w)          # body space
        d = tb - self.at
        if self.kind == 'insect':
            psi = math.atan2(d.y, d.x)
            u_b = Vector((math.cos(psi), math.sin(psi), 0.0))
            w_b = Vector((0, 0, 1))
            O_b = self.at + u_b * self.coxa
            ang = psi / D2R
        else:
            phi = math.atan2(d.y, -d.z) if abs(d.z) > 1e-9 or abs(d.y) > 1e-9 else 0.0
            # keep the plane through the body X axis; w = Rx(phi) * Z
            u_b = Vector((1, 0, 0))
            w_b = Vector((0, -math.sin(phi), math.cos(phi)))
            O_b = self.at - w_b * self.hip_drop
            ang = phi / D2R
        u, w = (R @ u_b).normalized(), (R @ w_b).normalized()
        n = u.cross(w)
        return A, Bm @ O_b, u, w, n, ang

    def solve(self, Bm, target_w, gamma=None):
        """Joint positions (world) for the end-effector centre at target_w."""
        A, O, u, w, n, ang = self.plane(Bm, target_w)
        p = Vector(target_w) - O
        tx, tz = p.dot(u), p.dot(w)
        clamp = 0.0
        if self.n == 3:
            g = (self.gamma if gamma is None else gamma) * D2R
            ax, az = tx - self.knee * math.sin(g) * self.segs[2], tz + math.cos(g) * self.segs[2]
            k, (ax2, az2), clamp = two_bone(ax, az, self.segs[0], self.segs[1], self.knee)
            pts2 = [(0.0, 0.0), k, (ax2, az2), (ax2 + (tx - ax), az2 + (tz - az))]
        else:
            k, (ex, ez), clamp = two_bone(tx, tz, self.segs[0], self.segs[1], self.knee)
            pts2 = [(0.0, 0.0), k, (ex, ez)]
        J = [O + u * a + w * b for (a, b) in pts2]
        th = [math.atan2(pts2[i + 1][1] - pts2[i][1], pts2[i + 1][0] - pts2[i][0]) for i in range(self.n)]
        return dict(A=A, O=O, u=u, w=w, n=n, ang=ang, J=J, p2=pts2, th=th, clamp=clamp)

    def parent_dir2(self):
        """Direction (2D plane angle, rad) of the part the first segment hinges on (hip block / coxa)."""
        return 0.0 if self.kind == 'insect' else -math.pi / 2

    def hinge_angles(self, sol):
        """Relative hinge angles (deg) at each joint: segment angle minus its parent's. Positive = CCW in the plane."""
        th = [self.parent_dir2()] + sol['th']
        out = []
        for i in range(self.n):
            a = (th[i + 1] - th[i]) / D2R
            a = (a + 180.0) % 360.0 - 180.0
            out.append(a)
        return out

    def bend_signs(self, sol):
        """Sign of the bend between consecutive segments (cross product in the plane): must never flip."""
        th = sol['th']
        out = []
        for i in range(self.n - 1):
            out.append(math.sin(th[i + 1] - th[i]))
        return out


def act_points(limb, sol, j, anc):
    """World points of the barrel anchor (on the upper part) and the rod anchor (on the lower part) of joint j.
    anc: a_up (distance back up the upper part from the joint), h_up (perpendicular offset, + = the plane's
    perpendicular side), a_lo / h_lo (the same down the lower part), lat (offset along the pin axis)."""
    u, w, n = sol['u'], sol['w'], sol['n']
    th_all = [limb.parent_dir2()] + sol['th']
    pivot = sol['J'][j]
    tu, tl = th_all[j], th_all[j + 1]

    def v2(t):
        return u * math.cos(t) + w * math.sin(t)

    def perp(t):
        return u * -math.sin(t) + w * math.cos(t)
    side = n * anc.get('lat', 0.0)
    up = pivot - v2(tu) * anc['a_up'] + perp(tu) * anc['h_up'] + side
    lo = pivot + v2(tl) * anc['a_lo'] + perp(tl) * anc['h_lo'] + side
    return up, lo, pivot


class Kin:
    """Bone list + rest pose + pose(t) for a normalised machine spec (see spec.py)."""

    def __init__(self, M):
        self.M = M
        self.limbs = [Limb(l) for l in M['limbs']]
        self.limb = {l.name: l for l in self.limbs}
        nk = M.get('neck') or {}
        self.neck = nk.get('links', [])
        self.neck_at = Vector(nk.get('at', (0, 0, 0)))
        self.head = M.get('head') or {}
        self.extras = M.get('extras', [])
        self.bones = []       # (name, parent, length)
        self._make_bones()

    def _make_bones(self):
        B = self.bones
        B.append(('root', None, 1.0))
        B.append(('body', 'root', 1.0))
        for l in self.limbs:
            B.append((f'hip_{l.name}', 'body', max(0.3, l.hip_drop or 0.6, l.coxa or 0.0)))
            par = f'hip_{l.name}'
            for i in range(l.n):
                B.append((l.bone(i), par, l.segs[i]))
                par = l.bone(i)
            B.append((f'{l.end}_{l.name}', par, l.ball * 1.5))
            for k in range(len(l.digits)):
                B.append((f'digit{k}_{l.name}', f'{l.end}_{l.name}', l.digit_len))
            for j in range(l.n):
                if l.acts[j] if j < len(l.acts) else 0:
                    jn = l.joint_names[j]
                    upb = f'hip_{l.name}' if j == 0 else l.bone(j - 1)
                    B.append((f'act_{jn}_{l.name}_cyl', upb, 1.0))
                    B.append((f'act_{jn}_{l.name}_rod', l.bone(j), 1.0))
        par = 'body'
        for i, lk in enumerate(self.neck):
            B.append((f'neck_{i + 1:02d}', par, lk[0]))
            par = f'neck_{i + 1:02d}'
        if self.head:
            B.append(('head', par, self.head.get('len', 1.0)))
        for e in self.extras:
            B.append((e['name'], e.get('parent', 'body'), e.get('len', 1.0)))
        self.parent = {b[0]: b[1] for b in B}
        self.length = {b[0]: b[2] for b in B}

    # ---- the pose -----------------------------------------------------------------------------------------------
    def body_matrix(self, cmd):
        rx, ry, ryaw = cmd.get('root', (0.0, 0.0, 0.0))
        dx, dy, dz, roll, pitch, yaw = cmd.get('body', (0, 0, 0, 0, 0, 0))
        Rm = Matrix.Translation((rx, ry, 0)) @ Matrix.Rotation(ryaw * D2R, 4, 'Z')
        Bm = Rm @ Matrix.Translation((dx, dy, self.M['body']['z'] + dz)) @ euler(roll, pitch, yaw)
        return Rm, Bm

    def pose(self, cmd, cmd_at=None, t=0.0):
        """World matrices of every bone (dict) + per-limb solutions (for checks)."""
        Rm, Bm = self.body_matrix(cmd)
        W = {'root': Rm.copy(), 'body': Bm.copy()}
        sols = {}
        heading = Rm.to_3x3() @ Vector((1, 0, 0))
        for l in self.limbs:
            c = cmd['limbs'][l.name]
            sol = l.solve(Bm, c['p'], c.get('gamma'))
            sols[l.name] = sol
            u, w, n = sol['u'], sol['w'], sol['n']
            # hip block (mammal: hangs down the plane; insect: the coxa sticks out along u)
            if l.kind == 'insect':
                W[f'hip_{l.name}'] = frame(n, u, sol['A'])
            else:
                W[f'hip_{l.name}'] = frame(n, -w, sol['A'])
            for i in range(l.n):
                W[l.bone(i)] = frame(n, sol['J'][i + 1] - sol['J'][i], sol['J'][i])
            # end effector: level in the world (foot) or following the forearm (hand), pitched by the command
            endp = sol['J'][-1]
            if l.role == 'arm':
                fwd = (sol['J'][-1] - sol['J'][-2]).normalized()
                pitch = c.get('pitch', 0.0)
                q = Quaternion(n, pitch * D2R)
                W[f'{l.end}_{l.name}'] = frame(n, q @ fwd, endp)
            else:
                fdir = (u - Vector((0, 0, u.z))).normalized() if l.kind == 'insect' else heading.copy()
                fdir.z = 0
                fdir.normalize()
                left = Vector((0, 0, 1)).cross(fdir)
                q = Quaternion(left, c.get('pitch', 0.0) * D2R)          # + = toe down
                fy = q @ fdir
                W[f'{l.end}_{l.name}'] = frame(-(q @ left), fy, endp)       # X right, Y forward, Z up
            Fm = W[f'{l.end}_{l.name}']
            curl = c.get('curl', 0.0)
            for k, a in enumerate(l.digits):
                W[f'digit{k}_{l.name}'] = self._digit(l, Fm, a, curl)
            for j in range(l.n):
                if not (l.acts[j] if j < len(l.acts) else 0):
                    continue
                jn = l.joint_names[j]
                anc = l.anchors.get(jn)
                if not anc:
                    anc = default_anchor(l, j)
                up, lo, _ = act_points(l, sol, j, anc)
                W[f'act_{jn}_{l.name}_cyl'] = frame(n, lo - up, up)
                W[f'act_{jn}_{l.name}_rod'] = frame(n, up - lo, lo)
        # neck: links pitch in the body's XZ plane, yaw distributed along the chain
        nk = cmd.get('neck', {})
        npitch, nyaw = nk.get('pitch', 0.0), nk.get('yaw', 0.0)
        m = len(self.neck)
        P = Bm @ self.neck_at
        Rb = Bm.to_3x3()
        yaw_acc = 0.0
        for i, (L, ang) in enumerate(self.neck):
            wgt = (i + 1) / (m * (m + 1) / 2)              # later links turn more
            yaw_acc += nyaw * wgt
            a = (ang - npitch * (i + 1) / m) * D2R          # + = lower (nose down); the last link takes all of it
            dirb = Matrix.Rotation(yaw_acc * D2R, 3, 'Z') @ Vector((math.cos(a), 0, math.sin(a)))
            pin = Matrix.Rotation(yaw_acc * D2R, 3, 'Z') @ Vector((0, -1, 0))     # X right, Z up
            d = Rb @ dirb
            W[f'neck_{i + 1:02d}'] = frame(Rb @ pin, d, P)
            P = P + d * L
        if self.head:
            hd = cmd.get('head', {})
            hp, hy, hr = hd.get('pitch', 0.0), hd.get('yaw', 0.0), hd.get('roll', 0.0)
            # head pitch is held in the world (it stays level while the body pitches) unless 'free'
            yaw_tot = Rm.to_euler().z / D2R + cmd.get('body', (0, 0, 0, 0, 0, 0))[5] + nyaw + hy
            Rh = (Matrix.Rotation(yaw_tot * D2R, 3, 'Z') @ Matrix.Rotation(hp * D2R, 3, 'Y') @
                  Matrix.Rotation(hr * D2R, 3, 'X'))
            fwd, left = Rh @ Vector((1, 0, 0)), Rh @ Vector((0, 1, 0))
            W['head'] = frame(-left, fwd, P)                  # X right, Y forward, Z up
        for e in self.extras:
            W[e['name']] = self._extra(e, W, cmd, cmd_at, t)
        return W, sols

    def _digit(self, l, Fm, a, curl):
        """A toe / finger: from the ball centre, pointing out at spread angle a and down so the tip meets the
        ground (feet) — then curled by `curl` degrees about its own pin."""
        R = Fm.to_3x3()
        fwd, right, up = R @ Vector((0, 1, 0)), R @ Vector((1, 0, 0)), R @ Vector((0, 0, 1))
        ca, sa = math.cos(a * D2R), math.sin(a * D2R)
        hdir = fwd * ca + right * sa           # a > 0 spreads toward the end effector's local +X
        if l.role == 'arm':
            down = math.radians(35.0)
            dirv = hdir * math.cos(down) - up * math.sin(down)
        else:
            # toe pins sit on the hub, a little below and outside the ball centre; the tips meet the ground
            drop = math.asin(max(-1.0, min(1.0, 0.58 * l.ball / l.digit_len)))
            dirv = hdir * math.cos(drop) - up * math.sin(drop)
        pin = dirv.cross(up).normalized() if abs(dirv.dot(up)) < 0.999 else right
        q = Quaternion(pin, -curl * D2R)
        dirv = q @ dirv
        base = Fm.translation + hdir * (l.ball * 0.75) - (up * (l.ball * 0.42) if l.role != 'arm' else up * 0)
        return frame(pin, dirv, base)

    def _extra(self, e, W, cmd, cmd_at, t):
        """Extra bones: 'fixed' (rides its parent), 'spin' (turns about its local Z at `rate` deg/s, or by the
        command's `extras[name]`), 'lag' (follow-through: points where its parent was `lag` seconds ago)."""
        par = W[e.get('parent', 'body')]
        Rp = par.to_3x3()
        rest = Matrix(e.get('_rest', Matrix.Identity(4)))
        typ = e.get('type', 'fixed')
        at = Vector(e.get('at', (0, 0, 0)))
        base = par @ at
        dirl = Vector(e.get('dir', (0, 0, 1))).normalized()
        if typ == 'spin':
            ang = cmd.get('extras', {}).get(e['name'], e.get('rate', 0.0) * t)
            axl = Vector(e.get('axis', (0, 0, 1))).normalized()
            q = Quaternion(Rp @ axl, ang * D2R)
            y = q @ (Rp @ dirl)
            x = q @ (Rp @ Vector(e.get('xdir', (1, 0, 0))))
            return frame(x, y, base)
        if typ == 'lag' and cmd_at is not None:
            lag = e.get('lag', 0.25)
            gain = e.get('gain', 1.0)
            Wp, _ = self.pose_light(cmd_at(t - lag), e.get('parent', 'body'))
            past = Wp @ at
            drift = (past - base) * gain
            L = e.get('len', 1.0)
            cap = L * math.sin(math.radians(e.get('max_deg', 22.0)))
            if drift.length > cap:                       # soft limit: a trailing part bends, it does not fold
                drift = drift * (cap * math.tanh(drift.length / cap) / drift.length)
            tip = base + (Rp @ dirl) * L + drift
            return frame(Rp @ Vector(e.get('xdir', (1, 0, 0))), tip - base, base)
        return frame(Rp @ Vector(e.get('xdir', (1, 0, 0))), Rp @ dirl, base)

    def pose_light(self, cmd, bone):
        """Just one bone's world matrix (used by lag extras looking back in time)."""
        W, _ = self.pose({**cmd, 'extras_off': True}, None)
        return W[bone], None


def default_anchor(l, j):
    w = float(l.s.get('width', 0.5))
    up_len = up_length(l, j)
    return {'a_up': 0.38 * up_len, 'h_up': 0.9 * w, 'a_lo': 0.22 * l.segs[j], 'h_lo': 0.9 * w, 'lat': 0.0}


def up_length(l, j):
    """Length of the part above joint j that a barrel can ride on (hip block / coxa for the first joint)."""
    if j > 0:
        return l.segs[j - 1]
    return max(l.coxa, 1e-3) if l.kind == 'insect' else max(2.0 * l.hip_drop, 0.2 * l.segs[0])
