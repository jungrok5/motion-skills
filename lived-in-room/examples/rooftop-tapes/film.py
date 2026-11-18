"""The hour and the person holding the phone. The room is the same in both versions; this file is all that differs.

  night      02:14, mid-November. She stepped out onto the roof for a minute and comes back in, phone in hand. Lit
             by what she left on: the desk lamp, the screen, the heater, the lamp by the pillow. Tonight's tape is
             playing into the computer. She walks to the tape wall and switches the phone's torch on.
  afternoon  16:40, the same day. She comes home from work, phone in hand. Nothing is on but the rice cooker. The
             sun, 6° up and 60° to the left of this west-north-west window, lays the window's shape on the east wall
             by the bed head — the one hour of direct sun this room gets, and never on the tapes.

What she has with her is not in the room at that hour (r.away): at night her terrace slippers; in the afternoon her
sneakers, her bag and the recorder in it. The phone is never on the table: it is the camera.
"""
from mathutils import Vector

from lr import mat, util
import props


def plate(r):
    """Outside: her own terrace built for real, and beyond it one picture 90 m wide, 40 m away, horizon at eye level."""
    props.terrace(r)
    img, marks = props.view_outside(r.v)
    strength = dict(night=0.2, afternoon=2.3).get(r.v, 0.7)
    r.backdrop(img, 'N', distance=40, width=90, strength=strength, z=1.45 + (0.66 - 0.5) * 90 * 1350 / 3600, u=6.8)
    return marks


def light(r):
    marks = plate(r)
    night = r.v == 'night'
    # lights on the two tall structures: flashing red on top (20–60 a minute), steady red half-way up [beacon]
    r.beacon(*marks['mast_top'], per_min=30, size=0.34, strength=34, on='night', name='mast beacon')
    r.beacon(*marks['mast_mid'], per_min=None, size=0.26, strength=7, on='night', name='mast mid light')
    r.beacon(*marks['chimney_top'], per_min=46, size=0.34, strength=34, on='night', name='chimney beacon')
    r.beacon(*marks['chimney_mid'], per_min=None, size=0.26, strength=7, on='night', name='chimney mid light')
    for i, (u, v) in enumerate(marks['cross']):                    # neon crosses are signs, not beacons: steady
        r.beacon(u, v, per_min=None, size=0.5, strength=4, color='#ff2a22', on='night', name=f'neon cross {i + 1}')
    lamp, heat = r.h['lamp'], r.h['heater']
    d = r.doorway['center']
    if night:
        r.ambient('#0a0f1c', 0.01)
        r.h['desk light'] = r.lamp('desk light', tuple(lamp.matrix_world @ Vector(lamp['lr_bulb'])), watts=5.0, color=2700, radius=0.02)
        front = heat.matrix_world @ Vector((0, -0.07, 0.2))
        r.h['heat light'] = r.lamp('heater light', tuple(front), watts=7.0, color='#ff7436', radius=0.08, spot=84, blend=0.7,
                                   aim=tuple(heat.matrix_world @ Vector((0, -1.2, -0.05))))        # a reflector heater throws a beam, not a glow
        nl = r.h['night lamp']
        r.h['night light'] = r.lamp('night light', tuple(nl.matrix_world @ Vector((0, 0, 0.1))), watts=0.55, color=2400, radius=0.05)
    else:
        r.ambient('#aab9d0', 0.26)
        r.daylight(elev=6.3, azim=-60.0, strength=3.4, color=3500, angle=1.2)      # Seoul, 17 November, 16:40: azimuth 240°, 6.3° up [sun]
        r.haze(0.03, color=(1.0, 0.95, 0.88))
        r.lamp('door sky', (d.x, d.y - 0.25, 1.1), watts=2.2, color=7500, size=(0.75, 1.9), aim=(d.x, d.y + 2.0, 0.9))   # the door stands open behind her
    r.glow(next(m for m in lamp.data.materials if m.get('lr_emit')), 45.0, on='night')
    r.glow(r.h['bars'], 16.0, on='night')
    r.glow(r.h['night'], 2.2, on='night')
    r.glow(r.h['screen'], 2.2, on='night')
    r.glow(r.h['meters'], 2.4, on='night')                         # the recorder is playing
    r.glow(r.h['deck'], 0.5, on='night')                           # the deck is on and idle
    r.glow(r.h['cooker'], 30.0)                                    # the cooker keeps warm round the clock
    for s in r.h['strips']:
        r.glow(s, 10.0 if night else 2.0)                         # a neon rocker is a point at night and almost nothing by day
    for g in r.h['leds']:
        r.glow(g, 0.0)
    # what she has with her
    r.away(r.h['outdoor'], on='night')                             # on her feet: she has just been out on the roof
    r.away(r.h['sneakers'] + [r.h['tote'], r.h['recorder']], on='afternoon')    # on her feet, on her shoulder, in the bag
    r.away(r.h['hp peg'], on='night')                               # at night the headphones are on the desk: she was listening
    r.away(r.h['hp desk'], on='afternoon')                         # by day they are back on their peg
    r.away(r.h['drops'], on='afternoon')                           # the pane sweats at night and is dry by the afternoon
    r.hands(r.h['hands'][0], r.h['hands'][1], 2 if night else 16, 14 if night else 40)


def motion(r):
    night = r.v == 'night'
    r.tick(r.h['hands'][2], axis=1, name='clock second hand', start=22)
    for i, n in enumerate(r.h['notes']):
        r.flutter(n, axis=0, amp=1.3, freq=0.9 + 0.17 * i, name=f'sticky note {i + 1}', seed=20 + i, note='the draught of a single-glazed window')
    r.flutter(r.h['curtain'], axis=0, amp=0.5, freq=0.35, rest=0.0, name='curtain', seed=41, note='the same draught, slower: it is heavy')
    r.flutter(r.h['calendar'], axis=0, amp=0.8, freq=0.5, rest=-0.9, name='calendar', seed=40, note='the door is open beside it')
    r.spin(r.h['rotor'], 1300, axis=1, name='circulator blades')        # she leaves it running while the washing hangs
    for i, c in enumerate(r.h['wash']):
        r.flutter(c, axis=0, amp=(2.2 if i < 4 else 3.4), freq=0.55 + 0.11 * i, name=f'washing {i + 1}', seed=i, note="in the circulator's air")
    if night:
        r.pages(r.h['screen'], 8, hold=1.0, name='monitor: the transfer advancing')
        r.flicker(r.h['desk light'], 0.022, 5.0, name='desk lamp', seed=1)
        r.flicker(r.h['heat light'], 0.05, 2.2, name='heater glow', seed=2)
        r.flicker(mat.emit_socket(r.h['bars']), 0.05, 2.2, seed=2)
        r.flicker(r.h['night light'], 0.03, 3.1, name='night lamp', seed=3)
        r.flicker(mat.emit_socket(r.h['meters']), 0.35, 3.3, name='recorder meters', seed=4)
        socks = [mat.emit_socket(g) for g in r.h['leds']]

        def level(f, k):                                           # a level meter following the tape: more LEDs when it is loud
            lv = 0.5 + 0.5 * util.fbm1(r.sec(f) * 5.5, 11.0)
            return {'default_value': 9.0 if lv * 6.4 > k + 0.6 else 0.15}
        for k, s in enumerate(socks):
            r.animate(s, lambda f, k=k: level(f, k), name='mixer level LEDs' if k == 3 else None, kind='meter', note='six LEDs follow the tape')


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
        r.phone_light(on_at=9.2, watts=3.0, angle=75, blend=0.9, color=6500)       # a wide soft flood with a hot middle, not a theatre spot
    else:
        r.walk([
            dict(t=0.0, pos=(2.62, 0.25, 1.48), look=(1.7, 4.3, 1.25)),                      # in the doorway: the window, the beam
            dict(t=4.0, pos=(1.95, 1.45, 1.46), look=(2.1, 4.2, 1.1)),
            dict(t=8.0, pos=(1.72, 1.62, 1.45), look=(2.9, 3.8, 1.0)),                       # turning with the light
            dict(t=12.0, pos=(1.62, 1.72, 1.47), look=(3.02, 2.98, 0.62), close=True, hunt=True),  # the sun on the wall over her pillow
        ], shake=0.32, pan_cap=12)
