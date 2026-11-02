#!/usr/bin/env python3
"""cinematic-3d · contact.py — a contact sheet: every shot at a few times, small, side by side. Look at it before every render.

  python3 <skill>/scripts/contact.py shots/fog.html shots/rain.html --times 0,3.5,7 --scale .35   → out/contact.jpg

Runs render.mjs --stills for each shot (preview scale), then tiles the frames: one row per shot, one column per time.
"""
import argparse, os, subprocess, sys
from PIL import Image, ImageDraw

here = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('shots', nargs='+')
ap.add_argument('--times', default='0,3.5,7')
ap.add_argument('--scale', default='.35')
ap.add_argument('--q', default='')
ap.add_argument('--out', default='out/contact.jpg')
a = ap.parse_args()
times = a.times.split(',')
rows = []
for shot in a.shots:
    name = os.path.basename(shot)[:-5]
    cmd = ['node', os.path.join(here, 'render.mjs'), shot, '--stills', a.times, '--scale', a.scale, '--out', 'out/contact-tmp']
    if a.q: cmd += ['--q', a.q]
    r = subprocess.run(cmd, capture_output=True, text=True)
    errs = [l for l in (r.stdout + r.stderr).splitlines() if 'error' in l.lower()]
    if r.returncode or errs: print('\n'.join(errs) or r.stderr[-2000:], file=sys.stderr)
    tag = ('-' + ''.join(c for c in a.q if c.isalnum())) if a.q else ''
    rows.append((name, [Image.open(f'out/contact-tmp/{name}{tag}-{t}.png').convert('RGB') for t in times]))
w, h = rows[0][1][0].size
pad = 8
sheet = Image.new('RGB', (pad + len(times) * (w + pad), pad + len(rows) * (h + pad + 18)), (12, 12, 14))
d = ImageDraw.Draw(sheet)
for r, (name, ims) in enumerate(rows):
    y = pad + r * (h + pad + 18)
    for c, im in enumerate(ims):
        x = pad + c * (w + pad)
        sheet.paste(im, (x, y + 18))
        d.text((x, y + 3), f'{name}  t={times[c]}', fill=(200, 200, 200))
os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
sheet.save(a.out, quality=88)
print(a.out)
