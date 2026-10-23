"""Cut a keyed character drawing into Live2D-style parts, using an "underlay" edit from the image model.

The underlay is the same drawing with some loose parts removed (ponytail, wind-blown locks) and what was behind them
painted in. This tool:
  1. registers the underlay to the base (scale + shift on luminance, as patch.py),
  2. finds the removed parts = where base and underlay differ, inside --box, on the figure (not on the green),
  3. splits them into connected parts (drops specks), and for each part writes
       <out>/<name>-part<k>.png   the part, cut from the BASE (so its pixels are the original art)
     plus a spine: points from the root (the end nearest --root) to the tip, along the part's main axis,
  4. writes <out>/<name>-under.png: the base with the parts' area replaced by the underlay (feathered),
  5. writes <out>/<name>-rig.json: image size, parts (file, bbox, spine).
All images stay on green; key them afterwards with key.py.
Usage: python3 layers.py base.png underlay.png OUTDIR NAME --reg x0,y0,x1,y1 --box x0,y0,x1,y1 --root x,y[;x,y…] [--min 4000] [--thr 60] [--close 9] [--join 160] [--protect x0,y0,x1,y1]"""
import sys, json, os, numpy as np
from collections import deque
from PIL import Image, ImageFilter

a = sys.argv[1:]; base_p, under_p, out, name = a[:4]
arg = lambda k, d=None: [float(v) for v in a[a.index(k) + 1].split(',')] if k in a else d
REG, BOX = arg('--reg'), arg('--box'); ROOTS = [np.array([float(v) for v in r.split(',')]) for r in a[a.index('--root') + 1].split(';')]; MIN = (arg('--min') or [4000])[0]
os.makedirs(out, exist_ok=True)
B = Image.open(base_p).convert('RGB'); U = Image.open(under_p).convert('RGB')

def lum(im, k): return np.asarray(im.convert('L').resize((im.width // k, im.height // k), Image.BILINEAR), np.float32)
def register(B, E, R, k=4):
    LB = lum(B, k); x0, y0, x1, y1 = [int(v / k) for v in R]; ref = LB[y0:y1, x0:x1]; ref = (ref - ref.mean()) / (ref.std() + 1e-6)
    best = (-1e9, 1, 0, 0)
    for s in np.arange(.94, 1.061, .01):
        LE = lum(E.resize((int(E.width * s), int(E.height * s)), Image.BILINEAR), k)
        for dy in range(-24, 25, 2):
            for dx in range(-24, 25, 2):
                ys, xs = y0 + dy, x0 + dx
                if ys < 0 or xs < 0 or ys + ref.shape[0] > LE.shape[0] or xs + ref.shape[1] > LE.shape[1]: continue
                w = LE[ys:ys + ref.shape[0], xs:xs + ref.shape[1]]; w = (w - w.mean()) / (w.std() + 1e-6)
                sc = float((w * ref).mean())
                if sc > best[0]: best = (sc, s, dx, dy)
    sc, s, dx, dy = best; print('registration', round(sc, 3), 'scale', round(float(s), 3), 'shift', dx * k, dy * k)
    Es = E.resize((int(E.width * s), int(E.height * s)), Image.LANCZOS)
    al = Image.new('RGB', B.size, (0, 255, 0)); al.paste(Es, (-int(dx * k), -int(dy * k))); return al

A = register(B, U, REG)
b = np.asarray(B.filter(ImageFilter.GaussianBlur(2)), np.float32); u = np.asarray(A.filter(ImageFilter.GaussianBlur(2)), np.float32)
fig = (b[..., 1] - np.maximum(b[..., 0], b[..., 2])) < 40          # base pixels that are figure, not green
diff = np.abs(b - u).sum(-1) > (arg('--thr') or [60])[0]
m = diff & fig
diff_full = (np.abs(np.asarray(B, np.float32) - np.asarray(A, np.float32)).sum(-1) > 45) & fig   # unblurred: keeps 1-px strands
# shift-tolerant difference: a pixel the underlay also has within 3 px (a chin line, a neck shadow the model redrew a
# little off) is NOT part of the hair, so it must not slide with the lock
Bi, Ai = np.asarray(B, np.int16), np.asarray(A, np.int16); dmin = np.full(Bi.shape[:2], 9999, np.int16)
for sy in range(-3, 4):
    for sx in range(-3, 4): dmin = np.minimum(dmin, np.abs(Bi - np.roll(Ai, (sy, sx), (0, 1))).sum(-1))
Au = Ai.astype(np.float32); skin_u = (Au[..., 0] > 200) & (Au[..., 1] > 150) & (Au[..., 2] > 115) & (Au[..., 0] > Au[..., 2] + 20)
near_skin = np.asarray(Image.fromarray((skin_u * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
diff_tol = (dmin > 45) | ~near_skin     # only next to skin: hair over hair keeps all its pixels (no cracks)
# hair-coloured pixels only (parts are hair): drop navy cloth, white blouse/stripes, light skin, red scarf/scrunchie
bb_ = np.asarray(B, np.float32); R_, G_, B_ = bb_[..., 0], bb_[..., 1], bb_[..., 2]; MX, MN = bb_.max(-1), bb_.min(-1)
hairlike = ~((B_ > R_ + 8) | (MN > 175) | ((MX > 225) & (MN > 140)) | (R_ - G_ > 95))
if '--nohair' in a: hairlike[:] = True
x0, y0, x1, y1 = [int(v) for v in BOX]; box = np.zeros_like(m); box[y0:y1, x0:x1] = True; m &= box
# clean at 1/4 resolution: close, open, label, drop specks
k = 4; small = Image.fromarray((m * 255).astype(np.uint8)).resize((m.shape[1] // k, m.shape[0] // k), Image.BILINEAR)
CL = int((arg('--close') or [9])[0]); small = small.filter(ImageFilter.MaxFilter(CL)).filter(ImageFilter.MinFilter(CL))     # close (bridges gaps where hair lies over hair)
small = small.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))     # open
S = np.asarray(small) > 127; H, W = S.shape; lab = np.zeros((H, W), np.int32); n = 0; sizes = []
for yy in range(H):
    for xx in range(W):
        if S[yy, xx] and not lab[yy, xx]:
            n += 1; q = deque([(yy, xx)]); lab[yy, xx] = n; c = 0
            while q:
                cy, cx = q.popleft(); c += 1
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < H and 0 <= nx < W and S[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
            sizes.append(c)
keep = [i + 1 for i, c in enumerate(sizes) if c * k * k >= MIN]
# every other diff fragment (thin loose strands): join the nearest kept part if close, else it is erased (underlay)
JOIN = (arg('--join') or [160])[0] / k
raw = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)) > 60
lab_raw = np.zeros((H, W), np.int32); n2 = 0
for yy in range(H):
    for xx in range(W):
        if raw[yy, xx] and not lab_raw[yy, xx]:
            n2 += 1; q = deque([(yy, xx)]); lab_raw[yy, xx] = n2
            while q:
                cy, cx = q.popleft()
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < H and 0 <= nx < W and raw[ny, nx] and not lab_raw[ny, nx]: lab_raw[ny, nx] = n2; q.append((ny, nx))
keep_pts = {L: np.argwhere(lab == L) for L in keep}
for L2 in range(1, n2 + 1):
    pts2 = np.argwhere(lab_raw == L2)
    if any(lab[pts2[:, 0], pts2[:, 1]] > 0) and set(lab[pts2[:, 0], pts2[:, 1]]) & set(keep): continue   # already part of a kept part
    c2 = pts2.mean(0); best, bd = None, 1e9
    for L, kp in keep_pts.items():
        dd = np.sqrt(((kp[::7] - c2) ** 2).sum(1)).min()
        if dd < bd: best, bd = L, dd
    if best is not None and bd <= JOIN: lab[pts2[:, 0], pts2[:, 1]] = best
    else:
        PR = arg('--protect')   # never erase inside the face (keeps the base's features for the expression patches)
        if PR and PR[0] / k <= c2[1] <= PR[2] / k and PR[1] / k <= c2[0] <= PR[3] / k: continue
        lab[pts2[:, 0], pts2[:, 1]] = -1   # erased: replaced by the underlay, belongs to no part
print('parts', [sizes[i - 1] * k * k for i in keep])

base_rgba = Image.open(base_p).convert('RGBA'); union = np.zeros((B.height, B.width), bool); parts = []
for pi, L in enumerate(keep):
    pm = Image.fromarray(((lab == L) * 255).astype(np.uint8)).resize(B.size, Image.BILINEAR)
    near = np.asarray(pm.filter(ImageFilter.MaxFilter(41)), np.float32) > 40          # generous neighbourhood of the part
    core = np.asarray(pm.filter(ImageFilter.MaxFilter(9)), np.float32) > 40
    thin = Image.fromarray(((near & diff_full) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))   # thin strands, whole
    pm = Image.fromarray(((core | (np.asarray(thin) > 0)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    pmn = (np.asarray(pm, np.float32) / 255) * fig                                    # only on the figure
    hl = np.asarray(Image.fromarray((hairlike * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.8)), np.float32) / 255
    # only pixels that really differ from the underlay (plus a hair's width): a contour that runs UNDER the lock
    # (jaw, collar edge) stays in the underlay instead of sliding with the hair
    dfm = np.asarray(Image.fromarray(((diff_full & diff_tol) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1)), np.float32) / 255
    before = (pmn > .5).sum(); pmn = pmn * hl * dfm; print(f'  part {pi}: dropped {int(before - (pmn > .5).sum())} non-hair pixels')
    union |= pmn > .05
    part = np.asarray(base_rgba).copy(); part[..., 3] = (pmn * 255).astype(np.uint8)
    # outside the part: green, so key.py treats the part like any other drawing
    g = part[..., 3] < 8; part[g, 0] = 0; part[g, 1] = 255; part[g, 2] = 0; part[g, 3] = 255
    fn = f'{name}-part{pi}.png'; Image.fromarray(part[..., :3]).save(os.path.join(out, fn))
    Image.fromarray((pmn * 255).astype(np.uint8)).save(os.path.join(out, f'{name}-part{pi}-alpha.png'))
    ys, xs = np.nonzero(pmn > .5); pts = np.stack([xs, ys], 1).astype(np.float64)
    c = pts.mean(0); cov = np.cov((pts - c).T); w, v = np.linalg.eigh(cov); ax = v[:, -1]
    t = (pts - c) @ ax; lo, hi = t.min(), t.max()
    # orient root → tip: pick the root point nearest this part, then the end nearest it is the root
    ROOT = min(ROOTS, key=lambda r: np.linalg.norm(c - r))
    if np.linalg.norm(c + ax * lo - ROOT) > np.linalg.norm(c + ax * hi - ROOT): ax = -ax; t = -t; lo, hi = -hi, -lo
    nb = 8; spine = []
    for i in range(nb + 1):
        tt = lo + (hi - lo) * i / nb; sel = np.abs(t - tt) < (hi - lo) / nb * .6
        spine.append((pts[sel].mean(0) if sel.sum() > 20 else c + ax * tt).round(1).tolist())
    bb = [int(xs.min()) - 20, int(ys.min()) - 20, int(xs.max()) + 20, int(ys.max()) + 20]
    parts.append({'file': fn, 'bbox': bb, 'spine': spine})
# underlay: base, with the union of parts AND erased fragments (grown) replaced by the registered underlay
erased = Image.fromarray(((lab == -1) * 255).astype(np.uint8)).resize(B.size, Image.BILINEAR)
union |= np.asarray(erased) > 40
um = Image.fromarray((union * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(4))
under = B.copy(); under.paste(A, (0, 0), um); under.save(os.path.join(out, f'{name}-under.png'))
json.dump({'size': [B.width, B.height], 'parts': parts}, open(os.path.join(out, f'{name}-rig.json'), 'w'), indent=1)
print('wrote', out, name, len(parts), 'parts')
