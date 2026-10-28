#!/usr/bin/env python3
"""Green-screen key for ONE image-model still (e.g. the start frame you give the video model, or a cut-out prop).
Never ask an image model for transparency — ask for a flat #00FF00 backdrop and key it here.

usage:  python3 -I key.py in.png out.png [--choke 1] [--trim]
- alpha from how much green dominates red/blue (soft edge between 28 and 90),
- despill: G clamped to max(R, B) wherever green dominates,
- --choke N erodes the alpha by N px (default 1) to drop the green fringe; --trim crops to the opaque box (+8 px).
For a whole clip whose backdrop drifts, use prep_dance.py (plate key) instead."""
import sys
import numpy as np
from PIL import Image, ImageFilter
a = sys.argv[1:]
if len(a) < 2: raise SystemExit(__doc__)
src, dst = a[0], a[1]
choke = int(a[a.index('--choke') + 1]) if '--choke' in a else 1
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
dom = g - np.maximum(r, b)
lo, hi = 28.0, 90.0
alpha = 1 - np.clip((dom - lo) / (hi - lo), 0, 1)
g2 = np.where(dom > 0, np.maximum(r, b), g)
img = Image.fromarray(np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
if choke:
    img.putalpha(img.getchannel('A').filter(ImageFilter.MinFilter(choke * 2 + 1)).filter(ImageFilter.GaussianBlur(.6)))
if '--trim' in a:
    bb = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if bb: img = img.crop((max(0, bb[0] - 8), max(0, bb[1] - 8), min(img.width, bb[2] + 8), min(img.height, bb[3] + 8)))
img.save(dst); print(dst, img.size)
