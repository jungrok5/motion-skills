"""The hour and the visitor. The room is the same in both versions; this file is all that differs.

  night  02:14, November. Lit by what she left on: the desk lamp, the screen, the heater, a lamp by the pillow.
         A friend lets themselves in with a phone in their hand, walks to the tape wall and turns its torch on.
  dawn   06:50, the same morning. Everything is off but the rice cooker. Low sun through mist and a cold window.
"""
import math

from mathutils import Vector

from lr import mat, util
import props


def plate(r):
    """The quarter outside: one picture 90 m wide, 40 m beyond the glass, its horizon at eye level."""
    img, marks = props.view_outside(r.v)
    strength = dict(night=1.25, dawn=2.6).get(r.v, 0.7)
    r.backdrop(img, 'N', distance=40, width=90, strength=strength, z=1.45 + (0.66 - 0.5) * 90 * 1350 / 3600, u=6.8)
    return marks


def light(r):
    marks = plate(r)
    night = r.v == 'night'
    # lights on the two tall structures: flashing red on top (20–60 a minute), steady red half-way up [beacon]
    r.beacon(*marks['mast_top'], per_min=30, size=0.34, strength=70, on='night', name='mast beacon')
    r.beacon(*marks['mast_mid'], per_min=None, size=0.26, strength=14, on='night', name='mast mid light')
    r.beacon(*marks['chimney_top'], per_min=46, size=0.34, strength=70, on='night', name='chimney beacon')
    r.beacon(*marks['chimney_mid'], per_min=None, size=0.26, strength=14, on='night', name='chimney mid light')
    for i, (u, v) in enumerate(marks['cross']):                    # neon crosses are signs, not beacons: steady
        r.beacon(u, v, per_min=None, size=0.5, strength=9, color='#ff2a22', on='night', name=f'neon cross {i + 1}')
    lamp = r.h['lamp']
    heat = r.h['heater']
    if night:
        r.ambient('#0a0f1c', 0.012)
        r.h['desk light'] = r.lamp('desk light', tuple(lamp.matrix_world @ Vector(lamp['lr_bulb'])), watts=5.0, color=2700, radius=0.02)
        r.h['heat light'] = r.lamp('heater light', tuple(heat.matrix_world @ Vector((0, -0.06, 0.2))), watts=11.0, color='#ff5a1e', radius=0.09)
        nl = r.h['night lamp']
        r.h['night light'] = r.lamp('night light', tuple(nl.matrix_world @ Vector((0, 0, 0.1))), watts=0.9, color=2400, radius=0.05)
    else:
        r.ambient('#a9bbd4', 0.22)
        r.daylight(elev=9.0, azim=33.0, strength=2.4, color=4300, angle=1.6)       # the sun just clear of the hill
        r.haze(0.026, color=(1.0, 0.96, 0.92))
    r.glow(next(m for m in lamp.data.materials if m.get('lr_emit')), 45.0, on='night')
    r.glow(r.h['bars'], 22.0, on='night')
    r.glow(r.h['night'], 5.0, on='night')
    r.glow(r.h['screen'], 2.2, on='night')
    r.glow(r.h['meters'], 2.6, on='night')
    r.glow(r.h['deck'], 2.2, on='night')
    r.glow(r.h['cooker'], 30.0)                                    # the cooker keeps warm through the night and the morning
    r.glow(r.h['strip'], 10.0)
    for g in r.h['leds']:
        r.glow(g, 0.0)


def motion(r):
    night = r.v == 'night'
    r.tick(r.h['hand'], axis=1, name='clock second hand', start=22)
    r.spin(r.h['rotor'], 1300 if night else 1300, axis=1, name='circulator blades')
    for i, c in enumerate(r.h['wash']):
        big = i < 4
        r.flutter(c, axis=0, amp=(2.2 if big else 3.4), freq=0.55 + 0.11 * i, name=f'washing {i + 1}', seed=i, note='in the circulator\'s air')
    for i, n in enumerate(r.h['notes']):
        r.flutter(n, axis=0, amp=1.6, freq=0.9 + 0.17 * i, rest=0.0, name=f'sticky note {i + 1}', seed=20 + i, note='the same air, by the time it reaches the desk')
    r.flutter(r.h['calendar'], axis=0, amp=0.7, freq=0.5, rest=-0.9, name='calendar', seed=40, note='lifts off the wall on its nail')
    if night:
        r.pages(r.h['screen'], 3, times=[4.6, 11.2], name='monitor screen')
        r.flicker(r.h['desk light'], 0.022, 5.0, name='desk lamp', seed=1)
        r.flicker(r.h['heat light'], 0.05, 2.2, name='heater glow', seed=2)
        r.flicker(mat.emit_socket(r.h['bars']), 0.05, 2.2, seed=2)
        r.flicker(r.h['night light'], 0.03, 3.1, name='night lamp', seed=3)
        r.flicker(mat.emit_socket(r.h['meters']), 0.35, 3.3, name='recorder meters', seed=4)
        r.flicker(mat.emit_socket(r.h['deck']), 0.12, 1.7, name='deck meters', seed=5)
        socks = [mat.emit_socket(g) for g in r.h['leds']]

        def level(f, k):                                           # a level meter following the tape: more LEDs when it is loud
            lv = 0.5 + 0.5 * util.fbm1(r.sec(f) * 5.5, 11.0)
            return {'default_value': 9.0 if lv * 6.4 > k + 0.6 else 0.15}
        for k, s in enumerate(socks):
            r.animate(s, lambda f, k=k: level(f, k), name='mixer level LEDs' if k == 0 else None, kind='meter', note='six LEDs follow the tape')


def camera(r):
    r.camera(lens=24, fstop=6.0)
    if r.v == 'night':
        r.walk([
            dict(t=0.0, pos=(2.62, 0.22, 1.47), look=(1.2, 4.2, 1.1)),                       # in the doorway
            dict(t=4.0, pos=(2.22, 1.5, 1.46), look=(0.9, 4.1, 1.05)),                       # four steps in: the desk and the window
            dict(t=8.0, pos=(1.92, 2.3, 1.45), look=(0.2, 3.6, 1.2)),                        # turning to the west wall
            dict(t=12.0, pos=(1.5, 2.66, 1.42), look=(0.0, 2.85, 1.3), close=True, hunt=True),    # up to the tapes
            dict(t=16.0, pos=(1.22, 2.5, 1.38), look=(0.0, 2.6, 1.22), close=True),          # along the row
        ], shake=0.36, pan_cap=12)
        r.phone_light(on_at=9.2, watts=0.42, angle=56)
    else:
        r.walk([
            dict(t=0.0, pos=(2.62, 0.25, 1.48), look=(1.5, 4.2, 1.2)),
            dict(t=4.0, pos=(2.3, 1.45, 1.46), look=(1.0, 3.6, 0.95)),
            dict(t=10.0, pos=(2.05, 2.15, 1.42), look=(0.2, 3.0, 1.1), close=True),
        ], shake=0.32, pan_cap=12)
