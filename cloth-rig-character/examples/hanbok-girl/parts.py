"""Project parts for the hanbok girl: a norigae (노리개), the tasselled ornament that hangs from the goreum.
This is how a character gets a part the library does not have: register it here with @part, use the
skill's helpers (geom, ctx.add, ctx.chain), and name it in character.json. The library is not edited."""
import math
from mathutils import Vector
from crc.parts import part, P
from crc import geom


@part('norigae')
def norigae(ctx, p):
    b, H = ctx.body, ctx.body.H
    z = b.chest_z - 0.035 * H
    rx, ry = b.torso(z)
    top = Vector((0.03 * H, -(ry + ctx.shell(0.012 * H)), z))
    L = P(p, 'length', 0.2) * H
    # the cord + knot + bead + tassel hang on one cloth chain, so it swings with the walk and flies out on the twirl
    pts = []
    for t in (0, 0.25, 0.5, 0.75, 1.0):
        q = top + Vector((0.004 * H * t, -0.006 * H * t, -L * t))
        # hang on the outside of the chima: ctx.outer_r() is the radius of the skirts built so far
        th = math.atan2(q.y, q.x)
        need = ctx.outer_r(q.z, th) + 0.012 * H
        rad = math.hypot(q.x, q.y)
        if rad < need:
            q.x, q.y = q.x * need / rad, q.y * need / rad
        pts.append(q)
    bones = ctx.chain('norigae', 'chest', pts, stiff=P(p, 'stiff', 0.06), damp=0.1, gravity=1.0, drag=0.05,
                      cone=70, radius=0.01 * H, collide=['skirt'])
    col = {'color': p.get('color', '#c8203a'), 'rough': 0.6, 'sheen': 0.5}
    cord = geom.tube('norigae_cord', pts[:3], 0.0035 * H, segs=8)
    ctx.add(cord, col, bones=bones[:2])
    knot = geom.ellipsoid('norigae_knot', pts[1], (0.012 * H, 0.008 * H, 0.014 * H), segs=12, rings=8)
    ctx.add(knot, col, bones=[bones[0], bones[1]])
    bead = geom.ellipsoid('norigae_bead', pts[2], (0.014 * H, 0.012 * H, 0.016 * H), segs=14, rings=10)
    ctx.add(bead, {'color': p.get('bead', '#3fae8f'), 'rough': 0.2, 'coat': 0.8}, bones=[bones[1], bones[2]])
    # tassel: a flared bundle of threads from the bead down to the tip
    threads = []
    for i in range(10):
        a = math.tau * i / 10
        off = Vector((math.cos(a), math.sin(a) * 0.6, 0)) * 0.006 * H
        threads.append(geom.tube(f'norigae_t{i}', [pts[2] + off * 0.5, pts[3] + off * 1.4, pts[4] + off * 2.2],
                                 [0.0024 * H, 0.0022 * H, 0.0016 * H], segs=6))
    tassel = geom.join(threads, 'norigae_tassel')
    ctx.add(tassel, col, bones=bones[2:])
