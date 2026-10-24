#!/usr/bin/env python3
"""Body check pack: dense full-size stills around the moments characters act, for the joints/hands review
(references/BODY-CHECK.md). Code-drawn figures most often break here — an elbow bending backwards, a forearm that
stretches, a hand that floats off what it holds, a wrist twisted 180°, an arm that grows out of the neck.

  python3 <skill>/scripts/body-check.py <film-dir> --scene <id> --around 3.2,9.0,18.4 [--span -0.4,1.2] [--step 0.2]
                                       [--every 1.0] [--dur 30] [--o v] [--out DIR]
→ DIR/f-<t>.jpg   every still at full size (crop these to zoom on hands — the sheets are only an index)
  DIR/sheet-N.jpg 6 stills per sheet (3×2, 540 px wide each, time stamped)
  DIR/times.txt   the times rendered
DIR defaults to <film-dir>/out/body/<id>/ (scratch — don't commit). Times = every `step` s within `span` of each
`--around` time (action beats: sawing, lifting, laying, falling), plus every `every` s over the whole film.
"""
import argparse, glob, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(usage=__doc__)
ap.add_argument('film'); ap.add_argument('--scene', required=True)
ap.add_argument('--around', default=''); ap.add_argument('--span', default='-0.4,1.2'); ap.add_argument('--step', type=float, default=.2)
ap.add_argument('--every', type=float, default=1.0); ap.add_argument('--dur', type=float, default=0)
ap.add_argument('--o', default='v'); ap.add_argument('--out')
a = ap.parse_args()
film = os.path.abspath(a.film); here = os.path.dirname(os.path.abspath(__file__))
render = os.path.join(here, 'render.mjs')
out = os.path.abspath(a.out or os.path.join(film, 'out', 'body', a.scene)); os.makedirs(out, exist_ok=True)
lo, hi = (float(x) for x in a.span.split(','))
ts = set()
for c in (float(x) for x in a.around.split(',') if x.strip()):
    k = 0
    while lo + k * a.step <= hi + 1e-9:
        ts.add(round(max(0, c + lo + k * a.step), 2)); k += 1
if a.dur and a.every:
    k = 0
    while k * a.every <= a.dur:
        ts.add(round(k * a.every, 2)); k += 1
ts = sorted(ts)
if not ts: sys.exit('no times — give --around and/or --dur')
for f in glob.glob(os.path.join(out, '*')): os.remove(f)
pat = os.path.join(film, 'out', f'still-{a.scene}-{a.o}-*.png')
for f in glob.glob(pat): os.remove(f)
for i in range(0, len(ts), 40):   # chunks keep one browser session reasonable
    subprocess.run(['node', render, a.o, '--scene', a.scene, '--stills', ','.join(str(t) for t in ts[i:i + 40])], cwd=film, check=True, capture_output=True)
key = lambda f: float(re.search(r'-([\d_]+)\.png$', f).group(1).replace('_', '.'))
fs = sorted(glob.glob(pat), key=key)
if len(fs) != len(ts): sys.exit(f'rendered {len(fs)} of {len(ts)} stills')
try: font = ImageFont.truetype('DejaVuSans-Bold.ttf', 30)
except OSError: font = ImageFont.load_default()
jp = []
for f in fs:
    t = key(f); j = os.path.join(out, f'f-{t:06.2f}.jpg')
    Image.open(f).convert('RGB').save(j, quality=88); os.remove(f); jp.append((t, j))
W = 540; cols, per = 3, 6
for k in range(0, len(jp), per):
    grp = jp[k:k + per]; ims = []
    for t, j in grp:
        im = Image.open(j); im = im.resize((W, round(im.height * W / im.width))); g = ImageDraw.Draw(im)
        g.rectangle((0, 0, 118, 42), fill=(0, 0, 0)); g.text((8, 5), f'{t:.2f}s', fill=(255, 230, 0), font=font); ims.append(im)
    h = ims[0].height; rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (W * cols, h * rows), 'white')
    for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * W, (i // cols) * h))
    sheet.save(os.path.join(out, f'sheet-{k // per + 1:02d}.jpg'), quality=85)
open(os.path.join(out, 'times.txt'), 'w').write(' '.join(f'{t:g}' for t in ts) + '\n')
print('→', out, '·', len(jp), 'stills,', (len(jp) + per - 1) // per, 'sheets')
