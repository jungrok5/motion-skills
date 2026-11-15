"""s02 — the title is an object in the scene: it takes the same light, focus and grain as everything else."""
from pf import draw, geo, light, mat, util


def build(s):
    gold = mat.metal('gold', '#e2b468', rough=0.32, brushed='linear', grain=0.6, wear=0.2, scale=60)
    geo.text('title', s.film.title, size=0.0062, depth=0.0006, bevel_w=0.00008, tracking=1.75, font=draw.FONT_TITLE, mat=gold)
    geo.box('rule', (0.030, 0.00022, 0.0003), mat=gold, loc=(0, -0.0072, 0))

    rs = s.rng('bokeh')                                               # seeded: the same film every time
    glow = mat.emit('glint', util.kelvin(2900), 60)
    for i in range(22):                                               # small practicals behind the word → bokeh discs
        geo.sphere(f'glint{i}', rs.uniform(0.00015, 0.0005), seg=12, rings=6, mat=glow,
                   loc=(rs.uniform(-0.05, 0.05), rs.uniform(-0.018, 0.018), rs.uniform(-0.09, -0.02)))
    light.area('key', (-0.05, 0.06, 0.16), aim=(0, 0, 0), size=(0.18, 0.04), watts=0.42, color=3600, spread=60)
    light.ambient(s.scene, '#06101a', 0.6)

    s.camera(lens=100, fstop=4, blades=9, clip=(0.001, 10))

    def cam(f):
        (dx, dy, dz), roll = s.shake(f, 0.00015, 0.05)
        return dict(pos=(dx, -0.002 + dy, util.lerp(0.215, 0.20, util.smooth(s.u(f))) + dz), look=(0, -0.0012, 0), up=(0, 1, 0),
                    focus=(0, 0, 0.0003), roll=roll)
    s.shoot(cam)
