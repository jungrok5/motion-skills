"""Green-screen key for image-model character art (the Rain Station method: never ask the model for transparency —
ask for flat #00FF00 and key it here). Usage: python3 key.py in.png out.png [--choke 1] [--trim]
- alpha from how much green dominates red/blue (soft edge between lo..hi),
- despill: clamp G to max(R,B) where green leaks into hair/skin edges,
- choke: erode the alpha by N px to drop the green fringe; --trim crops to the opaque bounding box (+8 px)."""
import sys, numpy as np
from PIL import Image, ImageFilter
a = sys.argv[1:]; src, dst = a[0], a[1]
choke = int(a[a.index('--choke') + 1]) if '--choke' in a else 1
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
dom = g - np.maximum(r, b)                      # >0 where green dominates
lo, hi = 28.0, 90.0
alpha = 1 - np.clip((dom - lo) / (hi - lo), 0, 1)
# despill everywhere green exceeds the other channels
g2 = np.where(dom > 0, np.maximum(r, b), g)   # despill: green may not exceed max(R, B)
out = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
img = Image.fromarray(out, 'RGBA')
if choke:
    A = img.getchannel('A').filter(ImageFilter.MinFilter(choke * 2 + 1)).filter(ImageFilter.GaussianBlur(.6))
    img.putalpha(A)
if '--trim' in a:
    bb = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if bb: img = img.crop((max(0, bb[0] - 8), max(0, bb[1] - 8), min(img.width, bb[2] + 8), min(img.height, bb[3] + 8)))
img.save(dst); print(dst, img.size)
