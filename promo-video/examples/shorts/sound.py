"""Sound for the Shorts starter: warm composed bed + page-turn swooshes, timed from timing.js (no narration needed).

song(dur): soft e-piano + pad on C–Am–F–G at 92 bpm, light drums from the second line, a resolving chord at the last line.
sfx(add, sfx_dir): a swoosh at every scene change (scene i starts 0.3 s before narration/caption line i), a chime at the end.
EDIT: keep the shape, move the times (they come from timing.js, so usually nothing to edit).
"""
import json, os, re
import numpy as np
import synth as s

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.loads(re.search(r'=\s*(\{.*\});', open(os.path.join(HERE, 'timing.js'), encoding='utf-8').read(), re.S).group(1))
CUES = T['cues']
BEAT = 60 / 92
PROG = [(48, [60, 64, 67, 71]), (45, [57, 60, 64, 67]), (41, [57, 60, 65, 69]), (43, [55, 59, 62, 67])]


def song(dur):
    tr = s.Track(dur)
    bar = BEAT * 4
    for b in range(int(dur / bar) + 1):
        t0 = b * bar
        root, ch = PROG[b % 4]
        tr.add(t0, s.pad(root + 12, bar * 1.05, 0.45), 0.35)
        tr.add(t0, s.sub_bass(root, bar * 0.9), 0.22)
        for k, n in enumerate(ch):
            tr.add(t0 + k * BEAT * 0.5, s.epiano(n, 1.4, 0.7), 0.09, pan=-0.3 + 0.2 * k)
        if t0 >= CUES[1] - 0.3 and t0 < dur - bar:                 # groove from the second line
            for q in range(4):
                tr.add(t0 + q * BEAT, s.kick(0.35, 120, 45, 0.6) if q % 2 == 0 else s.rim(), 0.18 if q % 2 == 0 else 0.07)
                tr.add(t0 + q * BEAT + BEAT / 2, s.hat(), 0.04, pan=0.3)
    last = CUES[-1]
    for i, n in enumerate([48, 55, 60, 64, 67, 72]):               # resolving chord on the call to action
        tr.add(last + 0.02 * i, s.epiano(n, 3.5, 0.8), 0.1, pan=-0.3 + 0.12 * i)
    tr.add(last, s.glock(84, 1.6), 0.06, pan=0.4)
    return s.finish(s.reverb(tr.stereo(), wet=0.2, decay=1.6), dur, fade_in=0.05, fade_out=1.2)


def sfx(add, sfx_dir):
    for i, c in enumerate(CUES[1:], 1):
        add(c - 0.38, s.swoosh(0.45, True, 10 + i), 0.16)
    add(CUES[-1] + 0.4, s.chime(), 0.18)
