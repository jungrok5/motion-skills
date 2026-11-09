"""s01 — a turned brass dial on black glass. Shows the whole grammar in one shot: lathe + knurl, an engraved scale
drawn in Python, a prism with a real bevel, practical strip lights, haze-free studio, a slow arc with focus on the part."""
import math

from pf import draw, geo, light, mat, util

MM = 0.001


def build(s):
    # --- the set: a near-mirror table and two warm strips that will show in every reflection ---------------
    geo.plane('table', 3.0, 3.0, mat=mat.floor('table', '#040506', rough=0.07, smudge=0.5, scale=6.0))
    light.panel('stripL', (-0.30, 0.55, 0.22), aim=(-0.1, -1, 0.2), size=(0.03, 0.44), strength=20, color=2700)
    light.panel('stripR', (0.36, 0.70, 0.28), aim=(0.1, -1, 0.25), size=(0.03, 0.56), strength=14, color=2700)
    light.area('top', (0.0, 0.0, 0.6), aim=(0, 0, 0), size=(0.6, 0.2), watts=4, color=8500, spread=110)
    light.area('box', (-0.35, -0.3, 0.2), aim=(0, 0, 0.01), size=(0.05, 0.5), watts=4, color=6500)
    light.ambient(s.scene, '#04070b', 0.2)

    # --- the object: every part from numbers ------------------------------------------------------------------
    brass = mat.metal('brass', '#c9a25a', rough=0.26, brushed='radial', grain=0.8, wear=0.15, scale=40)
    steel = mat.metal('steel', '#c2c5c9', rough=0.2, brushed='radial', grain=0.4, wear=0.2, scale=40)
    # the scale: a strip image that wraps once round the face (tops of the numbers point outward)
    r_mid, band = 23.0, 8.0
    ppm = 8192 / (math.tau * r_mid)
    im, d = draw.canvas(8192, round(band * ppm))
    for i in range(100):
        x = (i + 0.5) / 100 * 8192
        long = i % 10 == 0
        d.line([(x, im.height * (0.55 if long else 0.72)), (x, im.height * 0.96)], fill=(20, 18, 14), width=round((0.35 if long else 0.2) * ppm))
        if long:
            draw.text(d, (x, im.height * 0.27), str(i), round(3.0 * ppm), fill=(20, 18, 14))
    face = mat.engraved('face', '#c9a25a', draw.save(s, 'scale', im), ('disc', (r_mid - band / 2) * MM, (r_mid + band / 2) * MM),
                        rough=0.24, grain=0.9, wear=0.12, scale=40, depth=0.7, fill_rough=0.6, metallic=1.0)
    knurl = lambda th, r, z, i: r - (0.5 * MM * (0.5 - 0.5 * math.cos(th * 90)) if r > 29.5 * MM and 1.5 * MM < z < 6.5 * MM else 0)
    dial = geo.empty('dial')
    prof = [(0, 0), (30 * MM, 0), (30 * MM, 1.2 * MM)] + [(30 * MM, (1.5 + 0.5 * k) * MM) for k in range(11)] + \
           [(30 * MM, 6.8 * MM), (29.2 * MM, 7.8 * MM), (28 * MM, 8 * MM), (0, 8 * MM)]
    geo.lathe('dial_body', prof, seg=720, closed=False, rmod=knurl, mat=face, parent=dial, angle=40)
    geo.cyl('hub', 4.5 * MM, 3 * MM, seg=64, bevel_w=0.6 * MM, mat=steel, parent=dial, loc=(0, 0, 9.5 * MM))
    pointer = geo.prism('pointer', [(-3 * MM, -1.6 * MM), (22 * MM, -0.25 * MM), (22 * MM, 0.25 * MM), (-3 * MM, 1.6 * MM)], 0.8 * MM,
                        bevel=0.15 * MM, mat=mat.paint('red', '#a01c14', rough=0.3, coat=0.8, scale=30), loc=(0, 0, 8.6 * MM))
    # --- what moves: all of it is a function of the frame -----------------------------------------------------
    s.spin(dial, rpm=-6)                                              # the dial turns under a fixed pointer
    s.animate(pointer, lambda f: {'rotation_euler': (0, 0, 2.2 + 0.05 * util.spring(util.seg(f, 6, 30, util.linear)))})

    # --- the lens ---------------------------------------------------------------------------------------------
    s.camera(lens=90, fstop=8, blades=9, clip=(0.005, 20))

    def cam(f):
        u = util.smooth(s.u(f))
        az = math.radians(util.lerp(-28, 6, u))                       # a slow arc round the part, pushing in
        d = util.lerp(0.33, 0.27, u)
        (dx, dy, dz), roll = s.shake(f, 0.0004, 0.08)
        return dict(pos=(d * math.sin(az) + dx, -d * math.cos(az) + dy, 0.19 + dz), look=(0, 0, 0.004),
                    focus=(0, -0.012, 0.008), roll=roll)
    s.shoot(cam)
