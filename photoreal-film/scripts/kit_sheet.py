#!/usr/bin/env python3
"""Render one picture of the kit: every material recipe on a test shape and a row of builder samples (gear, spring,
knurled knob, engraved ring, lens, terrain …). A self-test after installing or upgrading Blender, and a reference
for choosing materials.

  kit_sheet.py [--out kit.jpg] [--q preview|final] [--scale 0.5]
"""
import math
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402
sys.path.insert(0, os.path.join(_boot.SKILL, 'lib'))


def main():
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default='kit.jpg')
    ap.add_argument('--q', default='preview', choices=['draft', 'preview', 'final', 'hero'])
    ap.add_argument('--scale', type=float)
    a = ap.parse_args(_boot.argv())
    import numpy as np
    from PIL import Image
    from pf import draw, exr, finish, geo, light, mat, util
    from pf import scene as sc
    from pf.film import DEFAULT_LOOK

    scn = sc.reset()
    sc.setup(scn, (1920, 1080), 24, a.q, motion_blur=False, **({'scale': a.scale} if a.scale else {}))
    geo.plane('floor', 6, 6, mat=mat.floor('floor', '#050607', rough=0.12, smudge=0.5, scale=4.0))
    light.panel('strip', (-0.9, 1.1, 0.5), aim=(0, -1, 0.3), size=(0.05, 1.0), strength=14, color=2800)
    light.panel('strip2', (1.0, 1.2, 0.5), aim=(0, -1, 0.3), size=(0.05, 1.0), strength=10, color=2800)
    light.area('top', (0, -0.1, 1.4), aim=(0, 0.1, 0), size=(1.8, 0.6), watts=70, color=6500, spread=120)
    light.area('side', (-1.3, -0.8, 0.5), aim=(0, 0, 0.1), size=(0.15, 1.2), watts=40, color=7500)
    light.ambient(scn, '#05080c', 0.3)

    im, d = draw.canvas(512, 512, (236, 230, 216))
    for i in range(8):
        d.rectangle([i * 64, 0, i * 64 + 31, 511], fill=(30, 60, 110))
    tmp = tempfile.mkdtemp()
    stripes = os.path.join(tmp, 'stripes.png')
    im.save(stripes)
    im, d = draw.canvas(2048, 128)
    draw.text(d, (1024, 64), 'PF   KIT   0 1 2 3 4 5 6 7 8 9   ', 84, tracking=0.2)
    mask = os.path.join(tmp, 'mask.png')
    im.save(mask)

    mats = [
        ('brass', mat.metal('m_brass', '#c9a25a', 0.26, 'radial', scale=12)),
        ('steel', mat.metal('m_steel', '#c2c5c9', 0.22, 'linear', scale=12)),
        ('blued', mat.metal('m_blued', '#1b1c20', 0.28, 'linear', grain=1.5, tarnish='#20283a', scale=12)),
        ('cast', mat.metal('m_cast', '#8a8d90', 0.5, 'cast', scale=12)),
        ('gold', mat.metal('m_gold', '#e2b468', 0.2, wear=0.15, scale=12)),
        ('paint', mat.paint('m_paint', '#8c1f16', 0.35, coat=1.0, scale=12)),
        ('flake', mat.paint('m_flake', '#10324a', 0.3, coat=1.0, flake=0.6, scale=12)),
        ('glass', mat.glass('m_glass', coating=120)),
        ('plastic', mat.plastic('m_plastic', '#d8d2c4', 0.45, grain=1.0, scale=12)),
        ('rubber', mat.rubber('m_rubber', scale=8)),
        ('leather', mat.leather('m_leather', '#0b0b0c', cell=500)),
        ('wood', mat.wood('m_wood', scale=10)),
        ('rock', mat.rock('m_rock', scale=12)),
        ('water', mat.water('m_water', '#04202a')),
        ('emit', mat.emit('m_emit', util.kelvin(3000), 6)),
        ('picture', mat.picture('m_picture', stripes, coat=0.5)),
        ('engraved', mat.engraved('m_engraved', '#0d0d0f', mask, ('cyl', -0.02, 0.02), scale=12)),
        ('matte', mat.matte('m_matte', '#6a7078')),
    ]
    label = mat.emit('label', (0.8, 0.75, 0.65), 2.5)
    cols = 6
    for i, (name, m) in enumerate(mats):
        x, y = (i % cols - (cols - 1) / 2) * 0.26, (i // cols) * 0.30
        geo.lathe('ball_' + name, [(0, 0.0), (0.05, 0.0), (0.055, 0.006), (0.075, 0.06), (0.06, 0.12), (0.035, 0.15), (0.0, 0.155)],
                  seg=96, closed=False, mat=m, loc=(x, y, 0))
        geo.box('cube_' + name, 0.05, bevel_w=0.006, mat=m, loc=(x + 0.085, y - 0.06, 0.025)).rotation_euler = (0, 0, 0.6)
        geo.text('lab_' + name, name, size=0.028, font=draw.FONT, mat=label, loc=(x, y - 0.12, 0.0008))
    # builders
    by = -0.36
    steel = mats[1][1]
    brass = mats[0][1]
    g = geo.prism('gear', geo.gear(24, 0.07, 0.058), 0.012, holes=[geo.circle(0.012, 32)] + [geo.circle(0.014, 24, cx=0.036 * math.cos(k * math.tau / 5), cy=0.036 * math.sin(k * math.tau / 5)) for k in range(5)],
                  bevel=0.0012, mat=brass, loc=(-0.62, by, 0.006))
    geo.tube('spring', geo.helix(0.03, 0.012, 7, n=24), 0.0035, mat=steel, loc=(-0.42, by, 0.004))
    knurl = lambda th, r, z, i: r - (0.002 * (0.5 - 0.5 * math.cos(th * 48)) if r > 0.039 and 0.008 < z < 0.04 else 0)
    geo.lathe('knob', [(0, 0), (0.04, 0), (0.04, 0.005)] + [(0.04, 0.008 + 0.004 * k) for k in range(9)] + [(0.04, 0.043), (0.036, 0.048), (0, 0.05)],
              seg=480, closed=False, rmod=knurl, mat=mats[2][1], loc=(-0.25, by, 0))
    geo.ring('ring', 0.03, 0.045, 0.04, bevel_w=0.003, mat=mats[16][1], loc=(-0.08, by, 0.02))
    b = geo.box('cut', (0.09, 0.09, 0.05), bevel_w=0.004, mat=mats[5][1], loc=(0.10, by, 0.025))
    geo.boolean(b, geo.cyl('cutter', 0.025, 0.1, loc=(0.10, by, 0.04)))
    s = geo.solidify(geo.grid('sheet', 0.14, 0.1, 40, 30, lambda X, Y: 0.012 * np.sin(X * 60) * np.cos(Y * 50), mat=mats[8][1], loc=(0.30, by, 0.02)), 0.002)
    geo.grid('terrain', 0.2, 0.2, 80, 80, lambda X, Y: 0.03 * (geo.fbm2(X * 14, Y * 14, 3) + 1) * np.clip(1 - (X * X + Y * Y) / 0.01, 0, 1),
             mat=mats[12][1], loc=(0.52, by, 0.001))
    parts = [geo.sphere(f'j{k}', 0.012, mat=mats[4][1], loc=(0.72 + 0.03 * k, by, 0.012 + 0.024 * k)) for k in range(3)]
    j = geo.join(parts, 'joined')
    geo.scatter('dust', 300, ((-0.8, -0.6, 0.02), (0.8, 0.2, 0.4)), size=(0.0004, 0.0012), seed=2, mat=mat.matte('dust', '#e6e0d6'))

    import bpy
    cam = bpy.data.cameras.new('cam')
    cam.lens = 32
    cam.dof.use_dof = True
    cam.dof.aperture_fstop = 11
    co = bpy.data.objects.new('cam', cam)
    scn.collection.objects.link(co)
    scn.camera = co
    co.location = (0, -1.5, 1.35)
    geo.look_at(co, (0, 0.06, 0.0))
    cam.dof.focus_distance = 2.05
    out = os.path.abspath(a.out)
    base = os.path.splitext(out)[0]
    sc.render(scn, 1, base + '.exr', 1)
    look = {**DEFAULT_LOOK, 'grain': 0.03, 'vignette': 0.25}
    Image.fromarray(finish.finish(exr.read_rgb(base + '.exr'), look, film_w=1920)).save(out, quality=92)
    os.remove(base + '.exr')
    print(out)


if __name__ == '__main__':
    main()
