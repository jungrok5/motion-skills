"""s03 — the lens comes together. Fifteen parts hang in a line along the optical axis and slide home."""
import math

from pf import geo, light, mat, util
import props
from props import MM

AXIS_H = 0.085          # height of the optical axis above the table


def studio(s, hero=False):
    """The set of the middle of the film: a black glass table, warm strip lights behind, cool soft light from above.
    hero=True moves the strips for the standing camera body."""
    geo.plane('table', 4.0, 4.0, mat=mat.floor('table', '#040506', rough=0.07, smudge=0.55, scale=6.0))
    strips = ((-0.42, 0.62, 0.50, 22), (0.50, 0.75, 0.62, 18), (0.06, 0.95, 0.36, 10), (-0.95, 0.9, 0.7, 12))
    if hero:
        strips = ((-0.30, 0.55, 0.42, 20), (0.34, 0.62, 0.55, 16), (0.78, 0.5, 0.30, 9), (-0.85, 0.8, 0.7, 12))
    for i, (x, y, h, k) in enumerate(strips):
        light.panel(f'strip{i}', (x, y, h / 2 + 0.002), aim=(x * 0.4, -1.0, h / 2), size=(0.035, h), strength=k, color=2700)
    light.area('top', (0.0, 0.05, 0.75), aim=(0, 0, AXIS_H), size=(0.9, 0.25), watts=4.5, color=9000, spread=110)
    light.area('soft', (0.75, -0.25, 0.45), aim=(0.03, 0, AXIS_H), size=(0.5, 0.35), watts=5, color=6000, spread=140)
    light.area('rim', (-0.5, 0.35, 0.22), aim=(0, 0, AXIS_H), size=(0.05, 0.4), watts=5, color=7500)
    if hero:                                                 # two long boxes in front draw the highlights that give the body its shape
        light.area('boxL', (-0.50, -0.30, 0.20), aim=(0, 0, 0.05), size=(0.06, 0.7), watts=5, color=6800)
        light.area('boxR', (0.42, -0.42, 0.16), aim=(0, 0, 0.05), size=(0.05, 0.5), watts=3.5, color=3400)
    light.ambient(s.scene, '#04070b', 0.2)
    light.haze('haze', ((-1.5, -1.0, 0), (1.5, 1.4, 1.0)), density=0.014, color='#a8c4d8', aniso=0.5)


def build(s):
    studio(s)
    root, P, blades = props.lens(s)
    root.location = (0, 0, AXIS_H)
    root.rotation_euler = (0, math.radians(90), 0)     # optical axis lying along X, front toward +X
    props.set_iris(s, blades, lambda f: 9.0)

    # each part slides home along the axis, the front ones last; the rings turn as they thread in
    keys = sorted(P, key=lambda k: P[k]['e'])
    n = len(keys)
    for i, key in enumerate(keys):
        part = P[key]
        ob = part['ob']
        z_home = ob.location.z
        rot0 = tuple(ob.rotation_euler)
        dist = abs(part['e'])
        t0 = 10 + 22 * (abs(i - keys.index('iris')) / n)
        turn = 0.0 if key.startswith('g') or key == 'iris' else (1.4 if i % 2 else -1.1)

        def fn(f, ob=ob, e=part['e'], z_home=z_home, t0=t0, turn=turn, rot0=rot0):
            k = 1 - util.seg(f, t0, t0 + 24, util.ease_in_out)
            return {'location': (ob.location.x, ob.location.y, z_home + e * MM * k),
                    'rotation_euler': (rot0[0], rot0[1], rot0[2] + turn * k)}
        s.animate(ob, fn)

    s.camera(lens=85, fstop=5.6, blades=9)

    def cam(f):
        u = util.smooth(s.u(f))
        az = math.radians(util.lerp(24, 52, u))           # 0 = square on to the axis, 90 = looking down the barrel
        d = util.lerp(0.98, 0.62, u)
        h = util.lerp(0.12, 0.135, u)
        (dx, dy, dz), roll = s.shake(f, 0.0006, 0.08)
        tx = util.lerp(0.062, 0.022, u)
        return dict(pos=(tx + d * math.sin(az) + dx, -d * math.cos(az) + dy, h + dz), look=(tx, 0, AXIS_H - 0.004),
                    focus=(util.lerp(0.15, 0.046, u), -0.025, AXIS_H), roll=roll)
    s.shoot(cam)
