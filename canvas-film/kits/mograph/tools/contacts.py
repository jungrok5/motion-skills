#!/usr/bin/env python3
"""Re-detect foot contacts (footfalls) of a keyed sprite sequence from its alpha, and rewrite meta.js `contacts` in place.

usage:  python3 -I contacts.py SPRITEDIR [LIFT]        e.g. sermons/<folder>/film/scenes/art/dance   (LIFT default 13 px)

A landing = an x-span ≥ 22 px of the bottom profile that touches the ground line (meta.ay) now, but was ≥ LIFT px above it (or
empty) in each of the 2 previous frames. Two passes are merged: quick low steps (lift 12, tolerance 6) and steps that land a
little behind the ground line (lift 22, tolerance 12). Frames that start a clip are skipped (no landing across a join).
Prints each contact as film time (s, clips played in order) @ sprite x. The kit (Mograph.spriteActor → footHits) maps them
to keys/beats; check them against the picture (render a still at each time) — the prep_dance.py guess is coarser."""
import sys, json, re
import numpy as np
from PIL import Image

if len(sys.argv) < 2: raise SystemExit(__doc__)
d = sys.argv[1]; LIFT = float(sys.argv[2]) if len(sys.argv) > 2 else 13
src = open(f'{d}/meta.js', encoding='utf-8').read()
M = json.loads(re.search(r'window.DANCE = (\{.*\});', src, re.S).group(1))
G = M['ay']; starts = {c[0] for c in M.get('clips', [[0, M['n']]])}
prof = []
for i in range(M['n']):
    a = np.asarray(Image.open(f'{d}/f{i:03d}.{M.get("ext", "webp")}'))[..., 3] > 128
    prof.append(np.where(a.any(0), a.shape[0] - 1 - np.argmax(a[::-1], 0), -1).astype(float))   # lowest alpha row per column
P = np.array(prof)

def detect(lift, tol):
    out = []
    for f in range(1, M['n']):
        if f in starts: continue
        down = P[f] >= G - tol; air = np.ones_like(down)
        for k in range(1, 3):
            if f - k >= 0: air &= (P[f - k] < G - lift)
        xs = np.where(down & air)[0]
        for sp in (np.split(xs, np.where(np.diff(xs) > 4)[0] + 1) if len(xs) else []):
            if len(sp) >= 22: out.append({'f': f, 'x': float(sp.mean()), 'y': float(G), 'w': int(len(sp))})
    return out

out = []
for c in detect(LIFT - 1, 6) + detect(LIFT + 9, 12):
    if not any(abs(c['f'] - o['f']) <= 1 and abs(c['x'] - o['x']) < 50 for o in out): out.append(c)
out.sort(key=lambda c: c['f'])
M['contacts'] = out
open(f'{d}/meta.js', 'w', encoding='utf-8').write(src[:src.index('window.DANCE =')] + 'window.DANCE = ' + json.dumps(M, separators=(',', ':')) + ';\n')
def tt(f):   # frame → film time (clips play in order)
    t = 0
    for a, n in M.get('clips', [[0, M['n']]]):
        if f < a + n: return t + (f - a) / M['fps']
        t += n / M['fps']
print(len(out), 'contacts:', ' '.join(f"{tt(c['f']):.2f}@{c['x']:.0f}" for c in out))
