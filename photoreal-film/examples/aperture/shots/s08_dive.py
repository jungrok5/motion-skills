"""s08 — back in. From the desk the camera rushes at the lens and falls through the front glass toward the iris."""
import math

from mathutils import Euler, Vector

from pf import light, util
import props
from props import MM
from shots.s07_print import desk


def build(s):
    root, blades = desk(s, s.plate('s06_coast', 57), [s.plate('s03_elements', 31), s.plate('s04_body', 54)])
    props.set_iris(s, blades, lambda f: util.lerp(11.0, 3.0, util.seg(f, 16, 34, util.ease_in)))
    # the lens axis in world space: the body is turned on the desk, the lens looks out along its -Y
    rot = Euler(root.rotation_euler).to_matrix()
    axis = rot @ Vector((0, -1, 0))
    front = Vector(root.location) + rot @ Vector((props.MOUNT_X * MM, -(props.BODY_D / 2 + 3.6 + 47.5) * MM, props.lens_axis_height()))
    light.area('glass', tuple(front + axis * 0.25 + Vector((0.10, 0, 0.16))), aim=tuple(front), size=(0.30, 0.06), watts=5.5, color=7000)
    light.area('glass2', tuple(front + axis * 0.18 + Vector((-0.14, 0, 0.03))), aim=tuple(front), size=(0.03, 0.2), watts=1.6, color=3000)
    s.camera(lens=28, fstop=2.8, blades=9, clip=(0.002, 50))

    def cam(f):
        u = util.ease_in(s.u(f), 2.6)                         # slow start, then it rushes
        start = Vector((-0.055, -0.33, 0.30))
        end = front + axis * 0.012
        pos = start.lerp(end, u) + Vector((0, 0, 0.05 * math.sin(math.pi * u) * (1 - u)))
        tgt = Vector((0.03, 0.02, 0.0)).lerp(front - axis * 0.03, util.seg(f, 1, 20, util.smooth))
        (dx, dy, dz), roll = s.shake(f, 0.0008 * (1 - u), 0.15)
        return dict(pos=tuple(pos + Vector((dx, dy, dz))), look=tuple(tgt), focus=tuple(front - axis * 0.004),
                    roll=roll + 25 * u, lens=util.lerp(28, 20, u))
    s.shoot(cam)
