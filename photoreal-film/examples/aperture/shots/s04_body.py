"""s04 — the machine. The finished lens swings onto the body and locks; the camera drifts in low over the table."""
import math

from pf import util
import props
from props import MM
from shots.s03_elements import studio


def build(s):
    studio(s, hero=True)
    root, lroot, P, blades = props.body(s)
    root.rotation_euler = (0, 0, math.radians(18))
    props.set_iris(s, blades, lambda f: 11.5)

    home = tuple(lroot.location)

    def mount(f):                                            # arrives along the axis, then a 55° twist into the bayonet
        k = 1 - util.seg(f, 2, 20, util.ease_out)
        tw = 1 - util.seg(f, 17, 27, util.back_out)
        return {'location': (home[0], home[1] - 0.085 * k, home[2]),
                'rotation_euler': (math.radians(90), math.radians(55) * tw + 1.6 * k, 0)}
    s.animate(lroot, mount)

    s.camera(lens=65, fstop=4.0, blades=9)
    h = props.lens_axis_height()

    def cam(f):
        u = util.smooth(s.u(f))
        az = math.radians(util.lerp(-36, -22, u))
        d = util.lerp(0.62, 0.50, u)
        (dx, dy, dz), roll = s.shake(f, 0.0008, 0.1)
        return dict(pos=(d * math.sin(az) + dx, -d * math.cos(az) + dy, util.lerp(0.035, 0.05, u) + dz),
                    look=(0.004, 0, h + 0.004), focus=(0.02, -0.05, h), roll=roll - 1.5)
    s.shoot(cam)
