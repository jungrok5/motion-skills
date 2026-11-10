"""s09 — the title. The iris turns slowly behind the word, every light behind it a disc."""
import math

from pf import draw, geo, light, mat, util
import props


def build(s):
    m = props.materials()
    root, blades = props.iris(s, housing=False, mats=m)
    root.location = (0, 0, -0.030)
    geo.lathe('iris_rim', geo.rrect_profile(0.0205, 0.09, -0.0012, 0.0012, 0.0003), seg=160, mat=m['black'], parent=root)
    props.set_iris(s, blades, lambda f: util.lerp(12.2, 7.0, util.seg(f, 1, s.n, util.smooth)))
    s.animate(root, lambda f: {'rotation_euler': (0, 0, -0.3 * s.u(f))})

    gold = mat.metal('title_gold', '#e2b468', rough=0.32, brushed='linear', grain=0.6, wear=0.2, scale=60)
    geo.text('title', 'APERTURE', size=0.0062, depth=0.0006, bevel_w=0.00008, tracking=1.75, font=draw.FONT_TITLE, mat=gold)
    geo.box('rule', (0.034, 0.00022, 0.0003), mat=gold, loc=(0, -0.0072, 0))

    # behind the iris a dim cool wall: the hole reads as a soft blue nine-sided disc; warm practicals become bokeh
    light.panel('wall', (0, 0, -0.9), aim=(0, 0, 0), size=1.6, strength=0.11, color=11000)
    rs = s.rng('bokeh')
    glow = mat.emit('glint', util.kelvin(2900), 60)
    for i in range(16):                                      # in front of the blades, off to the sides
        geo.sphere(f'glint{i}', rs.uniform(0.00012, 0.00035), seg=12, rings=6, mat=glow,
                   loc=(rs.choice((-1, 1)) * rs.uniform(0.012, 0.042), rs.uniform(-0.016, 0.016), rs.uniform(-0.024, -0.008)))
    light.area('key', (-0.05, 0.06, 0.16), aim=(0, 0, 0), size=(0.18, 0.04), watts=0.42, color=3600, spread=60)
    light.area('rimL', (-0.09, 0.04, 0.0), aim=(0, 0, -0.030), size=(0.02, 0.16), watts=0.05, color=7500)
    light.ambient(s.scene, '#04070b', 0.15)

    s.camera(lens=100, fstop=4.0, blades=9, clip=(0.001, 10))

    def cam(f):
        u = s.u(f)
        (dx, dy, dz), roll = s.shake(f, 0.00015, 0.05)
        return dict(pos=(dx, -0.002 + dy, util.lerp(0.215, 0.20, util.smooth(u)) + dz), look=(0, -0.0012, 0), up=(0, 1, 0),
                    focus=(0, 0, 0.0003), roll=roll)
    s.shoot(cam)
