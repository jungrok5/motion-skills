"""s07 — it was a photograph. The sea is a print on a desk; the camera lifts away from it and finds the camera."""
import math

from pf import draw, geo, light, mat, util
import props
from props import MM

PRINT_W = 0.150                    # picture width on the paper (m); the picture is 2.39:1 like the film
PRINT_C = (-0.045, -0.02)          # where the print lies on the desk
PRINT_ROT = math.radians(-7)


def desk(s, plate, others):
    """The maker's desk: oak, a leather mat, the print, the camera, a loupe, film cans, a pencil; one warm lamp."""
    m = props.materials()
    geo.plane('desk', 3.0, 2.0, mat=mat.wood('oak', '#8a5a30', '#4a2c16', rough=0.38, scale=1.6, coat=0.35, axis='X'))
    geo.box('mat', (0.62, 0.40, 0.004), bevel_w=0.0015, mat=mat.leather('deskmat', '#16110d', rough=0.5, cell=1400, depth=0.5),
            loc=(0.02, 0.0, 0.002))
    z = 0.0042
    ph = PRINT_W / 2.39
    paper = geo.box('paper', (PRINT_W + 0.018, ph + 0.018, 0.0004), mat=mat.plastic('paper', '#eeeae0', 0.55, wear=0.1),
                    loc=(PRINT_C[0], PRINT_C[1], z + 0.0002))
    pic = geo.plane('print', PRINT_W, ph, mat=mat.picture('print', plate, rough=0.22, coat=0.6, emission=0.35),
                    loc=(PRINT_C[0], PRINT_C[1], z + 0.00045))
    paper.rotation_euler = pic.rotation_euler = (0, 0, PRINT_ROT)
    # two earlier prints fanned underneath: frames of this same film
    for i, (dx, dy, a) in enumerate(((0.045, 0.035, 9), (-0.06, 0.05, -19))):
        o = (PRINT_C[0] + dx, PRINT_C[1] + dy)
        geo.box(f'paper{i}', (PRINT_W + 0.018, ph + 0.018, 0.0004), mat=mat.plastic(f'paper{i}', '#e6e1d6', 0.6, wear=0.1),
                loc=(o[0], o[1], z - 0.0006 * (i + 1) + 0.0002)).rotation_euler = (0, 0, math.radians(a))
        geo.plane(f'print{i}', PRINT_W, ph, mat=mat.picture(f'print{i}', others[i], rough=0.25, coat=0.5),
                  loc=(o[0], o[1], z - 0.0006 * (i + 1) + 0.00045)).rotation_euler = (0, 0, math.radians(a))
    # the camera, lying back on the mat, lens toward us
    root, lroot, P, blades = props.body(s, mats=m)
    root.location = (0.19, 0.075, z)
    root.rotation_euler = (0, 0, math.radians(-28))
    # loupe
    lp = geo.empty('loupe', (0.085, -0.115, z))
    geo.lathe('loupe_body', [(0.021, 0), (0.024, 0), (0.024, 0.004), (0.0185, 0.03), (0.0185, 0.036), (0.0165, 0.036), (0.0165, 0.03),
                             (0.021, 0.005)], seg=96, mat=m['lacquer'], parent=lp)
    geo.lathe('loupe_ring', geo.rrect_profile(0.0165, 0.0195, 0.036, 0.040, 0.0008), seg=96, mat=m['chrome'], parent=lp)
    props.element('loupe_glass', 16.4, 40, 40, 38.5, 6.0, mat.glass('loupe_glass', ior=1.52, coating=120), mat.matte('loupe_edge', '#050505'),
                  parent=lp)
    # film cans
    im, d = draw.canvas(1024, 256, (228, 176, 40))
    d.rectangle([0, 0, 1024, 60], fill=(18, 18, 18))
    draw.text(d, (512, 150), 'PF 400  \\u00b7  36 EXP', 86, fill=(18, 18, 18), tracking=0.06)
    can_m = mat.picture('can_label', draw.save(s, 'can', im), rough=0.35, coat=0.3)
    for i, (x, y, lying) in enumerate(((-0.215, 0.12, False), (-0.165, 0.145, False), (-0.2, -0.06, True))):
        c = geo.empty(f'can{i}', (x, y, z if not lying else z + 0.0125))
        geo.lathe(f'can{i}_shell', [(0, 0), (0.0125, 0), (0.0125, 0.047), (0, 0.047)], seg=64, closed=False, mat=can_m, parent=c, uv_scale=(1, 1))
        geo.lathe(f'can{i}_cap', geo.rrect_profile(0, 0.0131, 0.046, 0.0495, 0.0008)[:-4] + [(0, 0.0495)], seg=64, closed=False, mat=m['lacquer'], parent=c)
        geo.lathe(f'can{i}_spool', geo.rrect_profile(0, 0.0055, 0.0495, 0.053, 0.0006)[:-4] + [(0, 0.053)], seg=32, closed=False, mat=m['lacquer'], parent=c)
        if lying:
            c.rotation_euler = (0, math.radians(90), math.radians(35))
    # pencil
    pn = geo.empty('pencil', (-0.02, -0.15, z + 0.0035))
    geo.prism('pencil_body', geo.circle(0.0037, 6), 0.16, bevel=0.0004, mat=mat.paint('pencil', '#c9981a', rough=0.35, coat=0.6, scale=20), parent=pn)
    geo.lathe('pencil_tip', [(0, 0.097), (0.0009, 0.094), (0.0036, 0.080), (0, 0.080)], seg=24, closed=False, mat=mat.wood('cedar', '#c8a070', '#a07850', scale=30, coat=0), parent=pn)
    pn.rotation_euler = (math.radians(90), 0, math.radians(72))

    light.spot('lamp', (-0.38, 0.30, 0.62), aim=(-0.02, -0.02, 0), watts=42, color=2850, angle=62, blend=0.6, radius=0.05)
    light.area('window', (0.9, -0.5, 0.7), aim=(0, 0, 0), size=(0.8, 0.5), watts=9, color=9500)
    light.ambient(s.scene, '#05080d', 0.35)
    return root, blades


def build(s):
    root, blades = desk(s, s.plate('s06_coast', 57), [s.plate('s03_elements', 31), s.plate('s04_body', 54)])
    props.set_iris(s, blades, lambda f: 11.0)
    s.camera(lens=50, fstop=4.0, blades=9, clip=(0.01, 50))
    h0 = PRINT_W * 50 / 36.0                                  # height at which the picture exactly fills the frame

    def cam(f):
        u = util.seg(f, 1, s.n, util.ease_in_out)
        e = util.ease_in(s.u(f), 2)
        (dx, dy, dz), roll = s.shake(f, 0.0006, 0.1)
        dx, dy, dz = dx * e, dy * e, dz * e                    # dead still on the cut, alive after it
        px = PRINT_C[0] + util.lerp(0, -0.02, u)
        pos = (px + dx, PRINT_C[1] - util.lerp(0.0001, 0.30, u) + dy, util.lerp(h0, 0.30, u) + dz)
        look = (PRINT_C[0] + util.lerp(0, 0.075, u), PRINT_C[1] + util.lerp(0, 0.04, u), 0.0)
        return dict(pos=pos, look=look, up=(0, 1, 0), focus=(PRINT_C[0], PRINT_C[1], 0.0), roll=math.degrees(PRINT_ROT) * (1 - e) + roll * e)
    s.shoot(cam)
