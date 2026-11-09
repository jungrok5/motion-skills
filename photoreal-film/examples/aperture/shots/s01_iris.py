"""s01 — inside the lens. A macro of the iris opening; the light behind it pours through the hole."""
import math

from pf import geo, light, mat, util
import props
from props import MM


def build(s):
    root, blades = props.iris(s)
    props.set_iris(s, blades, lambda f: util.lerp(2.4, 12.2, util.seg(f, 8, 50, util.ease_in_out)))

    # the camera sits off the lens axis; everything it sees *through* the hole lies on the line behind the iris
    def eye(u):
        a = math.radians(util.lerp(36, 26, u))
        d = util.lerp(0.205, 0.172, u)
        return (d * math.sin(a) * 0.82, -d * math.sin(a) * 0.57, d * math.cos(a))
    ex, ey, ez = eye(0.6)
    behind = lambda k, ox=0.0, oy=0.0: (-ex * k / ez + ox, -ey * k / ez + oy, -k)   # k metres behind the iris

    # light: a hot tungsten source seen through the hole, a cool strip raking across the blades, a warm kick
    geo.sphere('back', 0.009, seg=24, rings=12, mat=mat.emit('back', util.kelvin(2800), 26), loc=behind(0.55, 0.012, 0.004))
    glow = mat.emit('glint', util.kelvin(3000), 120)
    for i, (k, ox, oy) in enumerate(((0.30, -0.040, 0.012), (0.44, 0.050, -0.020), (0.62, -0.020, -0.034))):
        geo.sphere(f'glint{i}', 0.0008, seg=12, rings=6, mat=glow, loc=behind(k, ox, oy))   # three far practicals: separate bokeh discs
    light.area('key', (-0.12, 0.06, 0.075), aim=(0.002, 0, 0), size=(0.012, 0.2), watts=0.11, color=6800)
    light.area('kick', (0.12, -0.10, 0.045), aim=(0, 0, 0), size=0.035, watts=0.035, color=3000)
    light.area('top', (0.0, 0.14, 0.12), aim=(0, 0, 0), size=0.10, watts=0.02, color=6000)
    light.ambient(s.scene, '#05080c', 0.2)
    geo.scatter('dust', 700, ((-0.04, -0.04, -0.16), (0.05, 0.04, 0.13)), size=(0.00002, 0.00009), seed=3,
                mat=mat.matte('dust', '#e6e0d6'))

    s.camera(lens=100, fstop=11, blades=9, clip=(0.001, 10))

    def cam(f):
        u = util.smooth(s.u(f))
        (dx, dy, dz), roll = s.shake(f, 0.00025, 0.12)
        x, y, z = eye(u)
        return dict(pos=(x + dx, y + dy, z + dz), look=(0.002, 0.001, 0), focus=(0.009, -0.007, 0.0003),
                    roll=util.lerp(-10, -4, u) + roll)
    s.shoot(cam)
