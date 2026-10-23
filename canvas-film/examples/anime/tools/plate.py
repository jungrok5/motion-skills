"""Align a painted background (an image-model repaint of a code reference frame) to that frame, and optionally cut a
FRONT layer with a mask rendered from the code geometry.
  python3 tools/plate.py PAINTED.png REF.png OUT.webp [--front REF_NOFRONT.png FRONT_OUT.webp] [--grow 3]
- the painting is resized to the reference size, then a scale (0.94–1.06) + shift (±40 px) search on blurred luminance
  finds the best match; the result is cropped/padded to exactly the reference frame, so every position the code knows
  (lamp centres, the girl's feet, the train's rails) is valid on the painting too;
- --front: pixels where the reference with and without the front objects differ (near signal, near pole) become the
  front layer's alpha (grown by --grow px, softened) — the train passes between the plate and this layer."""
import sys, numpy as np
from PIL import Image, ImageFilter
a = sys.argv[1:]; painted, ref, out = a[:3]
R = Image.open(ref).convert('RGB'); P = Image.open(painted).convert('RGB').resize(R.size, Image.LANCZOS)
def lum(im, k=4): return np.asarray(im.convert('L').filter(ImageFilter.GaussianBlur(2)).resize((im.width // k, im.height // k), Image.BILINEAR), np.float32)
def edges(L): gy, gx = np.gradient(L); return np.hypot(gx, gy)
LR = edges(lum(R)); LR = (LR - LR.mean()) / (LR.std() + 1e-6); best = (-9, 1, 0, 0)
for s in np.arange(.94, 1.061, .01):
    Ps = P.resize((int(P.width * s), int(P.height * s)), Image.BILINEAR); LP = edges(lum(Ps))
    for dy in range(-10, 11):
        for dx in range(-10, 11):
            # place Ps so that its centre sits at the frame centre + (dx, dy)*4
            ox = (LP.shape[1] - LR.shape[1]) // 2 + dx; oy = (LP.shape[0] - LR.shape[0]) // 2 + dy
            if ox < 0 or oy < 0 or ox + LR.shape[1] > LP.shape[1] or oy + LR.shape[0] > LP.shape[0]:
                if s >= 1: continue
                # smaller than the frame: compare the overlap only
                x0, y0 = max(0, -ox), max(0, -oy); x1, y1 = min(LR.shape[1], LP.shape[1] - ox), min(LR.shape[0], LP.shape[0] - oy)
                if x1 - x0 < LR.shape[1] * .8 or y1 - y0 < LR.shape[0] * .8: continue
                w = LP[y0 + oy:y1 + oy, x0 + ox:x1 + ox]; r = LR[y0:y1, x0:x1]
            else: w = LP[oy:oy + LR.shape[0], ox:ox + LR.shape[1]]; r = LR
            w = (w - w.mean()) / (w.std() + 1e-6); sc = float((w * r).mean())
            if sc > best[0]: best = (sc, s, dx, dy)
sc, s, dx, dy = best; print(f'registration {sc:.3f} scale {s:.2f} shift {dx * 4},{dy * 4}')
Ps = P.resize((round(P.width * s), round(P.height * s)), Image.LANCZOS)
ox = (Ps.width - R.width) // 2 + dx * 4; oy = (Ps.height - R.height) // 2 + dy * 4
O = Image.new('RGB', R.size); O.paste(Ps, (-ox, -oy))
if s < 1:   # fill any uncovered border by stretching the edge (never visible after the scene's own zoom)
    o = np.asarray(O).copy(); cov = np.zeros(R.size[::-1], bool); cov[max(0, -oy):max(0, -oy) + Ps.height, max(0, -ox):max(0, -ox) + Ps.width] = True
    ys, xs = np.nonzero(cov); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max(); o[:y0] = o[y0]; o[y1 + 1:] = o[y1]; o[:, :x0] = o[:, x0:x0 + 1]; o[:, x1 + 1:] = o[:, x1:x1 + 1]; O = Image.fromarray(o)
O.save(out, quality=92, method=6) if out.endswith('.webp') else O.save(out)
if '--front' in a:
    i = a.index('--front'); nf, fo = a[i + 1], a[i + 2]; g = int(a[a.index('--grow') + 1]) if '--grow' in a else 3
    d = np.abs(np.asarray(R, np.int16) - np.asarray(Image.open(nf).convert('RGB'), np.int16)).sum(-1) > 24
    M = Image.fromarray((d * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    M = M.filter(ImageFilter.MaxFilter(2 * g + 1)).filter(ImageFilter.GaussianBlur(1.2))
    F = O.convert('RGBA'); F.putalpha(M); F.save(fo, quality=92, method=6) if fo.endswith('.webp') else F.save(fo)
    print('front layer', fo, int((np.asarray(M) > 127).sum()), 'px')
