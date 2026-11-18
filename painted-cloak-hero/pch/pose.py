"""Pose math, done in Python (mathutils) instead of Blender constraints, so every frame is deterministic and the
same numbers go to the bake, the checks and the glTF.

Every bone's pose is a rigid 'delta' D (armature space) applied to its rest matrix: posed = D @ rest.
Children inherit: D_child = D_parent @ (rotation about the child's rest head). A bone is either rotated by an
Euler (spine, head), aimed at a world point (arms, IK legs, cloth chains) or follows its parent.
"""
import math
from mathutils import Matrix, Vector, Quaternion, Euler

I4 = Matrix.Identity(4)


def rot_about(h, R):
    """4x4: rotation R (3x3) about point h."""
    return Matrix.Translation(h) @ R.to_4x4() @ Matrix.Translation(-h)


def euler_deg(p=0.0, r=0.0, y=0.0):
    """pitch (forward lean, about +X), roll (lean to the character's left, about +Y), yaw (about +Z)."""
    return (Matrix.Rotation(math.radians(y), 3, 'Z') @ Matrix.Rotation(math.radians(p), 3, 'X') @
            Matrix.Rotation(math.radians(r), 3, 'Y'))


class Skeleton:
    """Rest data read back from the Blender armature (so the math matches what Blender evaluates)."""

    def __init__(self, rig):
        self.rest = {}
        self.parent = {}
        self.head = {}
        self.tail = {}
        self.order = []
        for b in rig.data.bones:
            self.rest[b.name] = b.matrix_local.copy()
            self.parent[b.name] = b.parent.name if b.parent else None
            self.head[b.name] = b.head_local.copy()
            self.tail[b.name] = b.tail_local.copy()
            self.order.append(b.name)

    def dir0(self, b):
        return (self.tail[b] - self.head[b]).normalized()

    def length(self, b):
        return (self.tail[b] - self.head[b]).length

    def basis(self, D, b):
        """Pose-bone basis (local loc/rot/scale matrix) for delta D."""
        p = self.parent[b]
        Dp = D[p] if p else I4
        R = self.rest[b]
        return R.inverted() @ Dp.inverted() @ D[b] @ R

    def world_head(self, D, b):
        return D[b] @ self.head[b]

    def world_tail(self, D, b):
        return D[b] @ self.tail[b]


def aim(sk, D, b, target, twist=0.0):
    """Delta for bone b so that it points from its (inherited) head at world point target."""
    Dp = D[sk.parent[b]]
    h = sk.head[b]
    hw = Dp @ h
    dw = target - hw
    if dw.length < 1e-9:
        return Dp.copy()
    dloc = (Dp.to_3x3().inverted() @ dw).normalized()
    d0 = sk.dir0(b)
    q = d0.rotation_difference(dloc)
    R = q.to_matrix()
    if twist:
        R = Matrix.Rotation(twist, 3, dloc) @ R
    return Dp @ rot_about(h, R)


def aim_dir(sk, D, b, dirw, twist=0.0):
    hw = D[sk.parent[b]] @ sk.head[b]
    return aim(sk, D, b, hw + dirw, twist)


def two_bone_ik(a, target, l1, l2, pole):
    """Hip a, ankle target, lengths, pole direction (where the knee points). Returns (knee, ankle, reached)."""
    d = target - a
    dist = d.length
    reach = (l1 + l2) * 0.9995
    reached = dist <= reach
    dist_c = min(max(dist, abs(l1 - l2) + 1e-4), reach)
    dn = d.normalized()
    ankle = a + dn * dist_c
    # knee: law of cosines in the plane of d and the pole
    x = (l1 * l1 - l2 * l2 + dist_c * dist_c) / (2 * dist_c)
    h = math.sqrt(max(0.0, l1 * l1 - x * x))
    pl = pole - dn * pole.dot(dn)
    if pl.length < 1e-6:
        pl = Vector((0, -1, 0)) - dn * dn.y * -1
    pl.normalize()
    knee = a + dn * x + pl * h
    return knee, ankle, reached


def solve(sk, pose, body):
    """pose (dict from clips) -> {bone: delta}. Chains are left following their parents (spring.py aims them)."""
    D = {}
    rx, ry, ryaw = pose['root']
    D['root'] = Matrix.Translation((rx, ry, 0)) @ Matrix.Rotation(math.radians(ryaw), 4, 'Z')
    Rroot = D['root'].to_3x3()
    hx, hy, hz, hp, hr, hyaw = pose['hips']
    off = Rroot @ Vector((hx, hy, hz))
    D['hips'] = D['root'].copy()
    D['hips'] = Matrix.Translation(off) @ D['root'] @ rot_about(sk.head['hips'], euler_deg(hp, hr, hyaw))
    for b in ('spine', 'chest', 'neck', 'head'):
        p, r, y = pose.get(b, (0, 0, 0))
        D[b] = D[sk.parent[b]] @ rot_about(sk.head[b], euler_deg(p, r, y))
    Qc = D['chest'].to_3x3()
    fwd_c = Vector((0, -1, 0))
    for s, sx in (('L', 1), ('R', -1)):
        raise_, swing, elbow = pose['arm.' + s]
        a, sw = math.radians(raise_), math.radians(swing)
        d = Vector((sx * math.sin(a), -math.sin(sw) * math.cos(a), -math.cos(a) * math.cos(sw))).normalized()
        D['upper_arm.' + s] = aim_dir(sk, D, 'upper_arm.' + s, Qc @ d)
        ax = d.cross(fwd_c)
        if ax.length < 1e-6:
            ax = Vector((sx, 0, 0))
        fd = Matrix.Rotation(math.radians(elbow), 3, ax.normalized()) @ d
        D['forearm.' + s] = aim_dir(sk, D, 'forearm.' + s, Qc @ fd)
        wrist = math.radians(pose.get('wrist.' + s, 8.0))
        hd = Matrix.Rotation(wrist, 3, ax.normalized()) @ fd
        D['hand.' + s] = aim_dir(sk, D, 'hand.' + s, Qc @ hd)
    info = {}
    for s in ('L', 'R'):
        ax_, ay_, az_, fpitch, fyaw = pose['leg.' + s]
        hip = D['hips'] @ sk.head['thigh.' + s]
        target = Vector((ax_, ay_, az_))
        fy = math.radians(fyaw)
        fwd = Vector((math.sin(fy), -math.cos(fy), 0))
        knee, ankle, ok = two_bone_ik(hip, target, sk.length('thigh.' + s), sk.length('shin.' + s), fwd)
        D['thigh.' + s] = aim(sk, D, 'thigh.' + s, knee)
        D['shin.' + s] = aim(sk, D, 'shin.' + s, ankle)
        # foot: rest direction (in the character's frame), turned to the foot's yaw and pitched (toe down > 0)
        d0 = sk.dir0('foot.' + s)
        side = Vector((math.cos(fy), math.sin(fy), 0))
        fd = Matrix.Rotation(-math.radians(fpitch), 3, side) @ (Matrix.Rotation(fy, 3, 'Z') @ d0)
        D['foot.' + s] = aim_dir(sk, D, 'foot.' + s, fd)
        info['reach.' + s] = ok
        info['miss.' + s] = (ankle - target).length
    for s in ('L', 'R'):
        bl = pose.get('blink', 0.0)
        S = Matrix.Diagonal((1, 1, max(0.08, 1 - bl), 1))
        h = sk.head['eye.' + s]
        D['eye.' + s] = D['head'] @ Matrix.Translation(h) @ S @ Matrix.Translation(-h)
    # anything else (chains) follows its parent rigidly until spring.py aims it
    for b in sk.order:
        if b not in D:
            D[b] = D[sk.parent[b]]
    return D, info
