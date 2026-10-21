"""Keep a character from drifting between image-model edits (the Rain Station trick): register an edited drawing
to the base (similarity: scale + shift, searched on a region of luminance), then paste ONLY a feathered region of
it (eyes, mouth) onto the base. Usage:
  python3 patch.py base.png edit.png out.png --reg x0,y0,x1,y1 --region x0,y0,x1,y1[,feather]
--reg: area used for registration (hair/face around the change); --region: the part to paste (feathered ellipse)."""
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
a = sys.argv[1:]; base, edit, out = a[0], a[1], a[2]
arg = lambda k: [float(v) for v in a[a.index(k) + 1].split(',')]
R, P = arg('--reg'), arg('--region')
B = Image.open(base).convert('RGBA'); E = Image.open(edit).convert('RGBA')
def lum(im, k):   # luminance, downsampled by k
    g = im.convert('L').resize((im.width // k, im.height // k), Image.BILINEAR); return np.asarray(g, np.float32)
k = 4; LB = lum(B, k); x0, y0, x1, y1 = [int(v / k) for v in R]; ref = LB[y0:y1, x0:x1]; ref = (ref - ref.mean()) / (ref.std() + 1e-6)
best = (-1e9, 1, 0, 0)
for s in np.arange(.9, 1.101, .01):
    Es = E.resize((int(E.width * s), int(E.height * s)), Image.BILINEAR); LE = lum(Es, k)
    for dy in range(-30, 31, 2):
        for dx in range(-30, 31, 2):
            ys, xs = y0 + dy, x0 + dx
            if ys < 0 or xs < 0 or ys + ref.shape[0] > LE.shape[0] or xs + ref.shape[1] > LE.shape[1]: continue
            w = LE[ys:ys + ref.shape[0], xs:xs + ref.shape[1]]; w = (w - w.mean()) / (w.std() + 1e-6)
            sc = float((w * ref).mean())
            if sc > best[0]: best = (sc, s, dx, dy)
# refine at full step around the best
sc, s, dx, dy = best
print('coarse', best)
Es = E.resize((int(E.width * s), int(E.height * s)), Image.LANCZOS)
# place the scaled edit so that its point (X*s + dx*k) lands on base X
aligned = Image.new('RGBA', B.size, (0, 0, 0, 0)); aligned.paste(Es, (-int(dx * k), -int(dy * k)))
f = P[4] if len(P) > 4 else 24
M = Image.new('L', B.size, 0); ImageDraw.Draw(M).ellipse(P[:4], fill=255); M = M.filter(ImageFilter.GaussianBlur(f))
outim = B.copy(); outim.paste(aligned, (0, 0), M); outim.save(out); print(out)
