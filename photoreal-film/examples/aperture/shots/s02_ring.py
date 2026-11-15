"""s02 — the scales. A macro up the barrel while the rings turn: engraved stops, the red index, feet and metres."""
import math

from pf import geo, light, mat, util
import props


def build(s):
    root, P, blades = props.lens(s)                          # standing on its mount: optical axis = Z, front up
    root.rotation_euler = (0, 0, math.radians(-65))          # the index faces the camera
    props.set_iris(s, blades, lambda f: 9.0)
    s.animate(P['focus']['ob'], lambda f: {'rotation_euler': (0, 0, util.lerp(-0.70, 0.25, util.seg(f, 0, 44, util.ease_in_out)))})
    click = lambda f: util.seg(f, 16, 19, util.back_out) + util.seg(f, 27, 30, util.back_out)
    s.animate(P['stops']['ob'], lambda f: {'rotation_euler': (0, 0, 0.157 * (click(f) - 1))})

    light.area('key', (-0.16, -0.20, 0.06), aim=(0.01, 0, 0.025), size=(0.03, 0.34), watts=2.6, color=6000)
    light.area('rim', (0.22, 0.10, 0.05), aim=(0.02, 0, 0.025), size=(0.02, 0.30), watts=3.0, color=2900)
    light.area('top', (0.0, -0.10, 0.30), aim=(0.01, -0.02, 0.03), size=0.12, watts=0.5, color=7500)
    light.ambient(s.scene, '#04070b', 0.3)
    glow = mat.emit('glint', util.kelvin(3000), 260)
    rs = s.rng('bokeh')
    for i in range(26):                                      # warm practicals far behind: out of focus they are the bokeh
        geo.sphere(f'glint{i}', rs.uniform(0.001, 0.0032), seg=12, rings=6, mat=glow,
                   loc=(rs.uniform(0.02, 0.5), rs.uniform(0.35, 0.9), rs.uniform(-0.12, 0.2)))
    geo.scatter('dust', 500, ((-0.03, -0.11, 0.0), (0.07, -0.02, 0.06)), size=(0.00002, 0.00008), seed=5,
                mat=mat.matte('dust', '#e6e0d6'))

    s.camera(lens=100, fstop=16, blades=9, clip=(0.001, 10))

    def cam(f):
        u = util.smooth(s.u(f))
        z = util.lerp(0.0135, 0.0275, u)                      # crane up the barrel: stops → index → distance scale
        (dx, dy, dz), roll = s.shake(f, 0.0002, 0.08)
        tgt = (0.019, -0.027, z)
        return dict(pos=(0.028 + dx, -0.135 + dy, z + 0.022 + dz), look=tgt, focus=(0.014, -0.030, z), roll=3 + roll)
    s.shoot(cam)
