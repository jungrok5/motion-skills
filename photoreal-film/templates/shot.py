"""__ID__ — one sentence: what this shot shows and why it is in the film."""
import math

from pf import draw, geo, light, mat, util

MM = 0.001


def build(s):
    """Build the set once; register what moves. Frames are local: 1..s.n. Units are metres."""
    # 1. the set and the light (place every light on purpose; the world is black until you say otherwise)
    geo.plane('floor', 3.0, 3.0, mat=mat.floor('floor', '#040506', rough=0.08))
    light.panel('strip', (0.3, 0.6, 0.25), aim=(0, -1, 0.2), size=(0.03, 0.5), strength=16, color=2700)
    light.area('key', (-0.35, -0.3, 0.25), aim=(0, 0, 0.03), size=(0.06, 0.5), watts=5, color=6500)
    light.ambient(s.scene, '#04070b', 0.2)

    # 2. the subject, from numbers (geo.lathe / prism / tube / box / cyl / grid / text) with real materials
    part = geo.lathe('part', geo.rrect_profile(0.012, 0.03, 0.0, 0.02, 0.0015), seg=128,
                     mat=mat.metal('steel', '#c2c5c9', rough=0.22, brushed='radial', scale=30))

    # 3. what moves: functions of the frame (never state carried from frame to frame)
    s.animate(part, lambda f: {'rotation_euler': (0, 0, 0.8 * util.seg(f, 1, s.n, util.ease_in_out))})

    # 4. the lens: focal length, f-stop, where it is, what it looks at, what is sharp
    s.camera(lens=85, fstop=5.6, blades=9)

    def cam(f):
        u = util.smooth(s.u(f))
        (dx, dy, dz), roll = s.shake(f, 0.0005, 0.08)
        return dict(pos=(util.lerp(-0.1, 0.06, u) + dx, -0.32 + dy, 0.09 + dz), look=(0, 0, 0.012), focus=(0, -0.02, 0.012), roll=roll)
    s.shoot(cam)
