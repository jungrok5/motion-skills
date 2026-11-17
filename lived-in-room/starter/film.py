"""The hour and the visitor. The room is the same in every version; this file is what differs:
light(r) — what is switched on and what the sky does;  motion(r) — the small things that move;
camera(r) — the phone in the hand of the person who walks in.   r.v is the version being built."""
from mathutils import Vector

import props


def plate(r):
    """The world outside: one picture 40 m beyond the glass. Also used by the work-light views."""
    img, tops = props.view_outside(r.v)
    r.backdrop(img, 'N', distance=40, width=120, strength=1.4 if r.v == 'night' else 2.6 if r.v == 'dawn' else 0.6, z=14)
    return tops


def light(r):
    tops = plate(r)
    if r.v == 'night':
        r.ambient('#0b1020', 0.02)
        lamp = r.h['lamp']
        r.h['desk light'] = r.lamp('desk light', tuple(lamp.matrix_world @ Vector(lamp['lr_bulb'])), watts=5.5, color=2700, radius=0.022)
        r.glow(next(m for m in lamp.data.materials if m.get('lr_emit')), 40.0)
        for i, (u, v, layer, w, h) in enumerate([t for t in tops if t[2] == 0][:3]):          # the three tallest far towers
            r.beacon(u, v - 0.004, per_min=(28, 41, 52)[i], size=0.45)                      # each its own rate, inside the rule
    else:
        r.ambient('#9db4d0', 0.35)
        r.daylight(elev=7, azim=18, strength=2.2, color=4300, angle=2.0)
        r.haze(0.035, color=(1.0, 0.95, 0.9))
        r.glow(r.h['screen'], 0.0)                                                               # the laptop went to sleep


def motion(r):
    r.tick(r.h['hand'], axis=1, name='clock second hand', start=37)
    for i, n in enumerate(r.h['notes']):
        r.flutter(n, axis=0, amp=3.0 if r.v == 'night' else 1.2, freq=0.9 + 0.3 * i, name=f'sticky note {i + 1}', seed=i)
    if r.v == 'night':
        r.pages(r.h['screen'], 3, hold=2.2, name='laptop screen')
        r.flicker(r.h['desk light'], 0.025, 5.0, name='desk lamp')


def camera(r):
    r.camera(lens=24, fstop=5.6)
    if r.v == 'night':
        r.walk([
            dict(t=0.0, pos=(1.95, 0.28, 1.46), look=(1.55, 2.9, 1.05)),                    # in the doorway
            dict(t=2.6, pos=(1.80, 1.20, 1.44), look=(1.35, 2.95, 0.98)),                   # three steps in
            dict(t=4.4, pos=(1.62, 1.75, 1.36), look=(1.25, 2.85, 0.86), close=True, hunt=True),
            dict(t=6.0, pos=(1.62, 1.75, 1.36), look=(1.05, 2.9, 0.84), close=True),         # over the desk
        ], pan_cap=12)
        r.phone_light(on_at=4.6, watts=0.5)
    else:
        r.walk([
            dict(t=0.0, pos=(1.95, 0.30, 1.48), look=(1.35, 3.2, 1.3)),
            dict(t=2.4, pos=(1.70, 1.15, 1.46), look=(1.2, 3.2, 1.25)),
            dict(t=5.0, pos=(1.55, 1.55, 1.42), look=(0.6, 3.0, 1.15), close=True),
        ], pan_cap=12)
