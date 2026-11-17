"""Custom part for the snow-pass postman: a leather satchel on a strap across the chest. The bag hangs from the hips
on a short chain of its own, so it swings — and, like the cloak, follows the body a couple of frames late."""
import math
from mathutils import Vector
from pch.parts import part, P
from pch import geom


@part('satchel')
def satchel(ctx, p):
    b, j, H = ctx.body, ctx.j, ctx.body.H
    off = ctx.shell(0.004 * H)
    # strap: left shoulder, across the chest, down to the right hip
    pts = []
    for k in range(9):
        t = k / 8
        z = (b.shoulder_z + 0.004 * H) * (1 - t) + (b.hip_z + 0.02 * H) * t
        rx, ry = b.torso(z)
        x = (0.55 - 1.15 * t) * rx
        y = -math.sqrt(max(0.0, 1 - min(1.0, (x / (rx + off)) ** 2))) * (ry + off) - 0.006 * H
        pts.append(Vector((x, y, z)))
    strap = geom.tube('satchel_strap', pts, 0.006 * H, segs=8, flat=0.35)
    ctx.add(strap, {'color': p.get('strap', '#5b361b'), 'rough': 0.7}, bones=['chest', 'spine', 'hips'])
    # the bag: hangs at the right hip on a 2-bone chain
    top = Vector((-(b.torso(b.hip_z)[0] + off + 0.02 * H), -0.035 * H, b.hip_z + 0.01 * H))
    cpts = [top, top + Vector((-0.004 * H, 0, -0.06 * H)), top + Vector((-0.008 * H, 0, -0.12 * H))]
    bones = ctx.chain('satchel', 'hips', cpts, stiff=P(p, 'stiff', 0.12), damp=0.14, gravity=1.0, cone=40,
                      radius=0.03 * H, collide=['legs'], lag=P(p, 'lag', 2.0))
    c = top + Vector((-0.012 * H, 0, -0.075 * H))
    bag = geom.ellipsoid('satchel_bag', c, (0.028 * H, 0.075 * H, 0.06 * H), segs=18, rings=10)
    for v in bag.data.vertices:          # boxy: flatten the round sides
        v.co.x = c.x + (v.co.x - c.x) * 0.9
        v.co.y = c.y + max(-0.068 * H, min(0.068 * H, v.co.y - c.y))
        v.co.z = c.z + max(-0.055 * H, min(0.055 * H, v.co.z - c.z))
    ctx.add(bag, {'color': p.get('color', '#7a4a26'), 'rough': 0.6}, bones=bones)
    flap = geom.ellipsoid('satchel_flap', c + Vector((-0.02 * H, 0, 0.02 * H)), (0.012 * H, 0.072 * H, 0.04 * H), segs=16, rings=8)
    ctx.add(flap, {'color': p.get('flap', '#8d5a30'), 'rough': 0.55}, bones=bones)
