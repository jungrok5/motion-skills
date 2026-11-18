"""The body: proportions -> joint positions, the torso surface garments wrap, the body bones and their limits.

Units are metres. Ground is z = 0, the character faces -Y, its left side is +X ('.L').
A stylized hero; heads ~4 (chibi) to ~7 (the source's adult proportions). Everything here is a function of the spec's
body block, so a new character changes numbers, not code.
"""
import math
from mathutils import Vector


def smooth(a, b, t):
    t = max(0.0, min(1.0, t))
    t = t * t * (3 - 2 * t)
    return a + (b - a) * t


class Body:
    """heads ~4 = big-head chibi, ~7 = the source's 'simple stylized proportions' (an adult, small head, long legs).
    Every proportion is a blend between the two ends by `heads`, so a hero anywhere between works."""

    def __init__(self, spec):
        b = spec.get('body', {})
        self.H = H = float(b.get('height', 1.75))
        self.heads = n = float(b.get('heads', 6.8))
        self.build = w = float(b.get('build', 1.0))          # width multiplier
        self.legs = lf = float(b.get('legs', 1.0))           # leg length multiplier
        a = max(0.0, min(1.0, (n - 4.2) / 2.8))               # 0 = chibi, 1 = adult
        self.adult = a
        L = lambda c, d: c + (d - c) * a
        self.headH = hh = H / n
        bodyH = H - hh
        self.foot_z = L(0.052, 0.042) * H
        self.hip_z = hip = self.foot_z + (L(0.415, 0.6) * bodyH - self.foot_z) * lf + 0.02 * (1 - lf)
        self.shoulder_z = sh = bodyH - L(0.022, 0.045) * H
        self.waist_z = hip + 0.42 * (sh - hip)
        self.chest_z = sh - L(0.242, 0.30) * (sh - hip)
        self.chin_z = bodyH
        self.head_c = Vector((0, 0.004, bodyH + hh * 0.5))
        self.head_r = Vector((hh * L(0.52, 0.40) * float(b.get('headWidth', 1.0)), hh * L(0.5, 0.46), hh * 0.52))
        self.shoulder_x = L(0.083, 0.112) * H * w
        self.hip_x = L(0.042, 0.052) * H * w
        arm = L(0.80, 1.22) * (sh - hip) * float(b.get('arms', 1.0))
        self.upper_arm = arm * 0.50
        self.forearm = arm * 0.43
        self.hand = arm * 0.20
        leg = hip - self.foot_z
        self.thigh = leg * 0.51
        self.shin = leg * 0.49
        self.foot_len = L(0.085, 0.132) * H * float(b.get('feet', 1.0))
        self.limb_r = L(0.025, 0.021) * H * w      # arm radius at shoulder
        self.leg_r = L(0.030, 0.034) * H * w       # thigh radius
        self.neck_r = L(0.032, 0.029) * H * w
        self.arm_rest_deg = L(14, 7)
        self.skin = b.get('skin', '#f2d3bd')
        # torso cross-section keys: (z, rx, ry)
        self.torso_keys = [
            (hip - 0.045 * H, L(0.060, 0.082) * H * w, L(0.050, 0.060) * H * w),
            (hip + 0.010 * H, L(0.074, 0.088) * H * w, L(0.058, 0.063) * H * w),
            (self.waist_z, L(0.060, 0.074) * H * w, L(0.049, 0.052) * H * w),
            (self.chest_z, L(0.070, 0.086) * H * w, L(0.054, 0.060) * H * w),
            (sh - 0.012 * H, L(0.071, 0.096) * H * w, L(0.047, 0.052) * H * w),
            (sh + 0.012 * H, L(0.032, 0.040) * H * w, L(0.030, 0.034) * H * w),
        ]

    # -- surfaces garments wrap ------------------------------------------------------------------
    def torso(self, z):
        """(rx, ry) of the torso at height z (smoothly interpolated, clamped at the ends)."""
        k = self.torso_keys
        if z <= k[0][0]:
            return k[0][1], k[0][2]
        if z >= k[-1][0]:
            return k[-1][1], k[-1][2]
        for (z0, ax, ay), (z1, bx, by) in zip(k, k[1:]):
            if z0 <= z <= z1:
                t = (z - z0) / (z1 - z0)
                return smooth(ax, bx, t), smooth(ay, by, t)

    def head_surface_z(self, x, y):
        """z of the top of the head ellipsoid above (x, y), or None."""
        c, r = self.head_c, self.head_r
        q = 1 - ((x - c.x) / r.x) ** 2 - ((y - c.y) / r.y) ** 2
        return None if q < 0 else c.z + r.z * math.sqrt(q)

    # -- joints ----------------------------------------------------------------------------------
    def joints(self):
        H = self.H
        j = {}
        j['root'] = Vector((0, 0, 0))
        j['hips'] = Vector((0, 0, self.hip_z))
        j['spine'] = Vector((0, 0, self.hip_z + 0.06 * H))
        j['chest'] = Vector((0, 0, self.waist_z + 0.02 * H))
        j['neck'] = Vector((0, 0, self.shoulder_z))
        j['head'] = Vector((0, 0.002, self.chin_z - 0.006 * H))
        j['head_end'] = Vector((0, 0.002, self.H))
        a = math.radians(self.arm_rest_deg)       # rest arm angle out from vertical
        for s, sx in (('L', 1), ('R', -1)):
            sh = Vector((sx * self.shoulder_x, 0.004, self.shoulder_z - 0.022 * H))
            d = Vector((sx * math.sin(a), 0, -math.cos(a)))
            el = sh + d * self.upper_arm + Vector((0, -0.004, 0))
            wr = el + d * self.forearm + Vector((0, -0.004, 0))
            j['shoulder.' + s] = sh
            j['elbow.' + s] = el
            j['wrist.' + s] = wr
            j['hand_end.' + s] = wr + d * self.hand
            hp = Vector((sx * self.hip_x, 0, self.hip_z - 0.012 * H))
            an = Vector((sx * self.hip_x * 1.05, 0.0, self.foot_z))
            kn = (hp + an) * 0.5 + Vector((0, -0.008 * H, 0))
            # keep bone lengths exact
            j['hip.' + s] = hp
            j['knee.' + s] = kn
            j['ankle.' + s] = an
            j['toe.' + s] = an + Vector((0, -self.foot_len * 0.82, -self.foot_z * 0.62))
        # eye pivots (for blink bones), on the front of the head
        er = self.head_r
        for s, sx in (('L', 1), ('R', -1)):
            ex, ez = sx * 0.36, -0.16
            ey = -math.sqrt(max(0.0, 1 - ex * ex - ez * ez)) * 0.975      # on the face surface, so eyes read in profile
            p = self.head_c + Vector((er.x * ex, er.y * ey, er.z * ez))
            j['eye.' + s] = p
        return j

    def bones(self):
        """[(name, head, tail, parent)] for the body skeleton."""
        j = self.joints()
        H = self.H
        out = [
            ('root', j['root'], j['root'] + Vector((0, 0.12 * H, 0)), None),
            ('hips', j['hips'], j['spine'], 'root'),
            ('spine', j['spine'], j['chest'], 'hips'),
            ('chest', j['chest'], j['neck'], 'spine'),
            ('neck', j['neck'], j['head'], 'chest'),
            ('head', j['head'], j['head_end'], 'neck'),
        ]
        for s in ('L', 'R'):
            out += [
                ('upper_arm.' + s, j['shoulder.' + s], j['elbow.' + s], 'chest'),
                ('forearm.' + s, j['elbow.' + s], j['wrist.' + s], 'upper_arm.' + s),
                ('hand.' + s, j['wrist.' + s], j['hand_end.' + s], 'forearm.' + s),
                ('thigh.' + s, j['hip.' + s], j['knee.' + s], 'hips'),
                ('shin.' + s, j['knee.' + s], j['ankle.' + s], 'thigh.' + s),
                ('foot.' + s, j['ankle.' + s], j['toe.' + s], 'shin.' + s),
                ('eye.' + s, j['eye.' + s], j['eye.' + s] + Vector((0, -0.03 * H, 0)), 'head'),
            ]
        return out


# Joint limits the check enforces (degrees). Measured semantically in check.py, not as raw Euler channels.
LIMITS = {
    'neck_yaw': 90,          # head vs chest, left/right
    'neck_pitch': 45,        # head vs chest, forward/back
    'waist_yaw': 45,         # chest vs hips
    'knee_bend': (0, 150),   # shin folds BACK only (knee points forward)
    'elbow_bend': (0, 150),  # forearm folds FORWARD only
    'hip_back': 75,          # thigh behind the body
    'wrist': 80,
}
