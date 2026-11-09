"""s06 — what the lens is for. Last light on open water; a lighthouse answers the sun."""
import math

import numpy as np

from pf import geo, light, mat, util


def lighthouse(s, at=(0.0, 0.0, 0.0)):
    root = geo.empty('lighthouse', at)
    white = mat.paint('lh_white', '#d9d4c8', rough=0.6, coat=0.0, peel=0, wear=0.5, scale=0.2)
    red = mat.paint('lh_red', '#8c1f16', rough=0.5, coat=0.1, peel=0, wear=0.5, scale=0.2)
    dark = mat.metal('lh_iron', '#101315', rough=0.5, wear=0.4, scale=0.3)
    geo.lathe('lh_base', [(0, 0), (5.6, 0), (5.2, 2.2), (0, 2.2)], seg=48, closed=False, mat=mat.rock('lh_stone', '#5c554c', '#26221f', scale=0.5), parent=root)
    geo.lathe('lh_tower', [(0, 2.2), (4.4, 2.2), (3.9, 9.0), (3.5, 16.0), (3.1, 23.0), (3.1, 24.0), (0, 24.0)], seg=64, closed=False, mat=white, parent=root)
    geo.lathe('lh_band', [(3.92, 9.0), (3.96, 9.0), (3.56, 16.0), (3.52, 16.0)], seg=64, closed=True, mat=red, parent=root)
    geo.lathe('lh_deck', geo.rrect_profile(0, 4.3, 24.0, 24.5, 0.1)[:-4] + [(0, 24.5)], seg=64, closed=False, mat=dark, parent=root)
    geo.tube('lh_rail', [(4.15 * math.cos(a), 4.15 * math.sin(a), 25.6) for a in np.linspace(0, math.tau, 48, endpoint=False)], 0.04,
             closed=True, mat=dark, parent=root)
    post = geo.cyl('lh_post', 0.035, 1.1, seg=8, mat=dark, parent=root, loc=(4.15, 0, 25.05))
    geo.radial(post, 16, parent=root)
    geo.lathe('lh_lantern', [(0, 24.5), (2.3, 24.5), (2.3, 25.2), (0, 25.2)], seg=48, closed=False, mat=dark, parent=root)
    geo.lathe('lh_glass', [(2.2, 25.2), (2.25, 25.2), (2.25, 27.8), (2.2, 27.8)], seg=48, mat=mat.glass('lh_glass', ior=1.45), parent=root)
    mul = geo.box('lh_mullion', (0.07, 0.07, 2.6), mat=dark, parent=root, loc=(2.25, 0, 26.5))
    geo.radial(mul, 12, parent=root)
    geo.lathe('lh_roof', [(0, 27.8), (2.6, 27.8), (2.5, 28.0), (1.6, 29.3), (0.35, 30.0), (0.3, 30.5), (0, 30.6)], seg=48, closed=False, mat=dark, parent=root)
    geo.sphere('lh_lamp', 0.5, seg=24, rings=12, mat=mat.emit('lh_lamp', util.kelvin(3000), 900), parent=root, loc=(0, 0, 26.5))
    head = geo.empty('lh_head', (0, 0, 26.5), parent=root)
    for k in (0, 1):                                          # two opposed beams; the haze makes them visible
        b = light.spot(f'lh_beam{k}', (0, 0, 0), aim=((1 - 2 * k) * 10, 0, 0), watts=4.0e7, color=3200, angle=5.5, blend=0.5, radius=0.5)
        b.parent = head
    s.animate(head, lambda f: {'rotation_euler': (0, 0, math.radians(200) + s.sec(f) * math.tau / 7.0)})
    return root


def build(s):
    # the sea: a spectral ocean near the camera, a flat sheet out to the horizon
    sea = mat.water('sea', '#02161d', rough=0.03, depth_tint=0.0, ripple=0.35, ripple_scale=2.5)
    oc = geo.plane('ocean', 2.0, mat=sea)
    m = oc.modifiers.new('ocean', 'OCEAN')
    m.geometry_mode = 'GENERATE'
    m.size = 1.0
    m.spatial_size = 300
    m.repeat_x = m.repeat_y = 2
    m.resolution = 13
    m.wave_scale = 1.5
    m.choppiness = 1.15
    m.wind_velocity = 9.0
    m.wave_alignment = 0.4
    m.wave_direction = math.radians(70)
    m.random_seed = 11
    s.animate(m, lambda f: {'time': 3.0 + s.sec(f) * 1.1})
    oc.location = (-300, -150, 0)
    geo.plane('sea_far', 60000, mat=sea, loc=(0, 20000, -0.4))

    # the headland and two islands on the horizon
    def cape(X, Y):
        ridge = np.exp(-((X + 20) / 95.0) ** 2 * 1.2) * np.clip(1 - (Y + 60) / 190.0, 0, 1) ** 0.6
        return ridge * (16 + 9 * geo.fbm2(X / 40, Y / 40, 3, 6)) + 2.5 * geo.fbm2(X / 9, Y / 9, 9, 4) * ridge - 2.0
    rock = mat.rock('rock', '#5a4a3e', '#18130f', scale=0.25, rough=0.9)
    geo.grid('cape', 300, 300, 220, 220, cape, mat=rock, loc=(-140, 330, 0))
    for i, (x, y, w, hgt) in enumerate(((420, 2600, 900, 70), (-900, 3400, 1500, 110))):
        geo.grid(f'isle{i}', w, w * 0.5, 90, 45, lambda X, Y, w=w, hgt=hgt, i=i: np.clip(1 - (X / (w * 0.5)) ** 2 - (Y / (w * 0.22)) ** 2, 0, 1)
                 * hgt * (0.8 + 0.4 * geo.fbm2(X / 120, Y / 120, i + 20, 5)) - 1.0, mat=mat.matte('isle', '#0e1418'), loc=(x, y, 0))
    lighthouse(s, (-118, 300, cape(np.array([22.0]), np.array([-30.0]))[0] - 0.5))

    light.sky(s.scene, elev=3.2, azim=0.5, strength=0.085, sun_strength=0.6, dust=3.0, air=1.2, ozone=1.6)
    light.haze('mist', ((-700, 60, 0), (500, 900, 90)), density=0.0011, color='#ffd9b8', aniso=0.6)

    s.camera(lens=38, fstop=8, clip=(0.5, 80000))

    def cam(f):
        u = s.u(f)
        (dx, dy, dz), roll = s.shake(f, 0.05, 0.12, 0.7)
        y = util.lerp(-30, -2, u)                             # drifting low over the water toward the light
        return dict(pos=(-22 + dx, y + dy, 5.2 + dz * 0.5), look=(-96, 300, 15.0), focus=320.0, roll=roll - 0.6)
    s.shoot(cam)
