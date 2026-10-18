"""Sound for examples/minimal (30 s, 7 scenes). Used by mix.json → scripts/mix.py.

song(dur) -> stereo array: bright 120 bpm F-major pop bed that follows the scene cuts
            0 curious marimba · 4.2 muted/tense + riser · 8.2 drop (solution) · 21.6 soft piano (trust) · 25.8 final lift
sfx(add, sfx_dir): add(t_seconds, mono_array, gain) — synthesized UI sounds + two ElevenLabs takes (stamp, typing)
Scene cuts: 4.2 problem · 8.2 solution · 12.6 quote · 17.0 pay/inspect/ship · 21.6 trust · 25.8 call to action
"""
import os
import numpy as np
from synth import *  # noqa: F401,F403  (mix.py puts scripts/ on sys.path)


def song(dur=30.0):
    """Fortimove Global. Curious intro (0-4.2), stuck (4.2-8.2), bright drop at 8.2,
    driving through the steps, soft sincere break at 21.6, final lift at 25.8. 120 bpm."""
    T = Track(dur)
    beat = 0.5
    # S1 curious: F major pizz motif + soft keys
    for i, (off, nn) in enumerate([(0.2, 65), (0.45, 69), (0.7, 72), (1.2, 74), (1.7, 72), (2.2, 69), (2.7, 70), (3.2, 72), (3.7, 74)]):
        T.add(off, marimba(nn, 0.45), 0.24, pan=0.2)
    for t0, (root, ch) in zip((0.0, 2.0), [(41, [57, 60, 65]), (46, [58, 62, 65])]):
        for i, nn in enumerate(ch):
            T.add(t0 + 0.01 * i, epiano(nn, 1.9, 0.6), 0.09, pan=-0.2 + 0.2 * i)
        T.add(t0, ks_pluck(midi(root), 1.2, bright=0.3, damp=0.995, seed=int(t0 * 10)), 0.4)
    for i in range(8):
        T.add(0.5 * i + 0.25, shaker(seed=i), 0.4, pan=0.4)
    # S2 stuck: Dm Bb Gm A, muffled pulse
    for k, (root, ch) in enumerate([(38, [57, 62, 65]), (46, [58, 62, 65])]):
        t0 = 4.2 + 2.0 * k
        for i, nn in enumerate(ch):
            T.add(t0 + 0.01 * i, epiano(nn, 1.9, 0.4), 0.08, pan=-0.2 + 0.2 * i)
        for i in range(8):
            T.add(t0 + 0.25 * i, pluck_bass(root, 0.18), 0.28 if i % 2 == 0 else 0.16)
        T.add(t0, kick(0.4, 80, 40, 0.2), 0.3)
        T.add(t0 + 1.0, kick(0.4, 80, 40, 0.2), 0.22)
    n = int(1.4 * SR); tt = np.arange(n) / SR
    T.add(6.8, hp(noise(n, 41)) * (tt / 1.4) ** 2.2 * 0.35, 1.0)        # riser into the drop
    # bright groove from 8.2: F C Dm Bb
    prog = [(41, [60, 65, 69, 72]), (36, [60, 64, 67, 72]), (38, [57, 62, 65, 69]), (46, [58, 62, 65, 70])]
    t0, bar = 8.2, 0
    while t0 < 21.6 - 0.01:
        root, ch = prog[bar % 4]
        for i, nn in enumerate(ch):
            T.add(t0 + 0.01 * i, epiano(nn, 1.9, 0.75), 0.1, pan=-0.25 + 0.17 * i)
        arp = ch + [ch[2] + 12]
        for i in range(8):
            T.add(t0 + i * 0.25, ks_pluck(midi(arp[(i * 3) % len(arp)] + 12), 0.4, bright=0.7, damp=0.99, seed=bar * 8 + i), 0.07, pan=0.35 * (-1) ** i)
        for i in range(4):
            tb = t0 + i * beat
            T.add(tb, kick(0.4, 150, 46, 0.9), 0.6)
            T.add(tb + 0.25, hat(seed=int(tb * 9), open_=True), 0.13, pan=0.25)
            T.add(tb + 0.25, pluck_bass(root, 0.22), 0.42)
            if i % 2 == 1:
                T.add(tb, clap(seed=int(tb * 9)), 0.4)
        t0 += 2.0; bar += 1
    # soft sincere break 21.6 - 25.8: piano only
    for k, (root, ch) in enumerate([(46, [58, 62, 65, 69]), (41, [57, 60, 65, 69])]):
        tb = 21.6 + 2.1 * k
        for i, nn in enumerate(ch):
            T.add(tb + 0.03 * i, epiano(nn, 2.2, 0.5), 0.12, pan=-0.25 + 0.17 * i)
        T.add(tb, sub_bass(root, 2.0), 0.25)
        T.add(tb + 1.05, glock(ch[-1] + 12, 1.0), 0.05, pan=0.4)
    # final lift 25.8 - 30
    for k, (root, ch) in enumerate([(46, [58, 62, 65, 70]), (36, [60, 64, 67, 72]), (41, [60, 65, 69, 72])]):
        tb = 25.8 + 1.25 * k
        if k == 2:
            tb = 28.3
        for i, nn in enumerate(ch):
            T.add(tb + 0.01 * i, epiano(nn, 2.0 if k < 2 else 1.7, 0.8), 0.11, pan=-0.25 + 0.17 * i)
        T.add(tb, pad(root + 24, 2.0, 0.5), 0.7)
        T.add(tb, kick(0.5, 150, 44, 0.9), 0.55)
        if k < 2:
            for i in range(5):
                T.add(tb + 0.25 * i, hat(seed=k * 9 + i), 0.12, pan=0.3)
    for i, nn in enumerate([77, 81, 84, 89]):
        T.add(28.3 + 0.07 * i, glock(nn, 1.4), 0.1, pan=0.4)
    for tc in (8.2, 12.6, 17.0, 25.8):                                # scene impacts
        T.add(tc, kick(0.9, 190, 36, 1.2), 0.45)
    st = reverb(T.stereo(), wet=0.18, decay=1.4)
    return finish(st, dur, fade_in=0.05, fade_out=1.4)



def sfx(add, sfx_dir):
    st = load(os.path.join(sfx_dir, 'stamp.mp3'))
    ty = load(os.path.join(sfx_dir, 'typing.mp3'))
    add(0.0, swoosh(0.6, True, 2), 0.3)
    for i in range(5):
        add(0.9 + i * 0.32 + 0.05, pop(800 + 90 * i, 1300 + 90 * i), 0.25)
    add(4.5, swoosh(0.4, True, 3), 0.2)
    y = clip(ty, 0.05, 1.05); f = int(0.03 * SR); y[-f:] *= np.linspace(1, 0, f)
    add(5.0, y, 0.32)
    add(6.25, buzz(), 0.22)
    for i in range(3):
        add(6.8 + i * 0.22, pop(500, 750, 0.1), 0.25)
    for T in (8.2, 12.6, 17.0, 21.6, 25.8):
        add(T - 0.05, swoosh(0.55, True, int(T * 3)), 0.35)
    add(8.65, swoosh(0.25, True, 7), 0.25); add(8.7, pop(700, 1100, 0.08), 0.25)
    add(9.72, pop(950, 1500), 0.3)
    add(10.35, pop(500, 900, 0.12), 0.25)
    for T in (12.9, 13.4, 17.4, 18.9):
        add(T, pop(1400, 2100, 0.07), 0.2)
    for i in range(4):
        tt, step = 13.6 + i * 0.45, 0.05
        while tt < 13.6 + i * 0.45 + 0.6:
            add(tt, tick(2800 + 150 * i, 0.02), 0.08); tt += step; step *= 1.15
    add(15.72, clip(st, 0.28, 0.7), 0.6)
    add(17.92, tick(1500, 0.04), 0.3); add(18.1, pop(900, 1500), 0.25)
    add(18.9, shutter(), 0.5)
    add(19.15, pop(1100, 1700), 0.22)
    add(19.6, swoosh(1.5, False, 12), 0.2)
    for i in range(5):
        add(23.3 + i * 0.22, pop(900 + 80 * i, 1400 + 80 * i), 0.2)
    add(26.1, kick(0.6, 150, 42, 0.6), 0.3)
    add(27.2, pop(600, 1000, 0.12), 0.25)
    add(28.3, tick(1600, 0.04), 0.35); add(28.35, chime(), 0.28)
