"""s05 — the exposure. Square on to the glass: the iris snaps down, and the frame burns out to white."""
import math

from pf import light, util
import props
from shots.s03_elements import studio


def build(s):
    studio(s, hero=True)
    root, lroot, P, blades = props.body(s)
    props.set_iris(s, blades, lambda f: util.lerp(11.5, 3.2, util.seg(f, 4, 9, util.ease_out)))
    h = props.lens_axis_height()
    light.area('ring', (0.006, -0.5, h + 0.16), aim=(0.006, 0, h), size=(0.5, 0.08), watts=4, color=6500)
    light.spot('through', (0.02, 0.5, h + 0.04), aim=(0.006, -0.05, h), watts=30, color=3000, angle=14, radius=0.03)

    s.camera(lens=90, fstop=5.6, blades=9)

    def cam(f):
        u = s.u(f)
        d = util.lerp(0.46, 0.34, util.ease_in(u, 2))
        (dx, dy, dz), roll = s.shake(f, 0.0006, 0.1)
        return dict(pos=(0.03 + dx, -d + dy, h + 0.012 + dz), look=(0.006, 0, h), focus=(0.006, -0.062, h), roll=roll)
    s.shoot(cam)
