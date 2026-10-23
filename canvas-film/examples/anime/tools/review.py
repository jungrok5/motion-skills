"""Analyse the frames written by review.mjs and make the sheets a reviewer looks at.
  python3 tools/review.py out/review [--hole 40]
Checks (FAIL lines are things to fix before showing anyone; LOOK lines need a human/agent look at the saved image):
- FIDELITY: rendered in the drawn pose (rest=1) the rig must reproduce the original flat drawing (orig=1) — catches
  broken strands, missing pieces, misplaced parts.
- SEAMS: thin cracks of background inside the figure (triangle seams).
- HOLES / SEAMS: magenta showing through INSIDE the figure (pixels not connected to the frame border) — a part moved
  and the underlay has nothing behind it, or triangles left a seam. Reports the worst frames with the hole's position.
- MOTION: from stats.json — a part that never moves (max tip < 0.03 rad) or explodes (max tip > 2.2 rad, bone
  speed > 12 rad/s, single-bone bend > 0.9 rad).
- JUMPS: figure silhouette area changing by > 6% between neighbouring frames of the same shot (pops, swaps).
Sheets: strip-<range>.jpg (figure crops in time order, for judging motion by eye), film-sheet.jpg (whole film),
holes-<t>.png (the worst frames with holes circled). Writes report.txt."""
import sys, os, re, json, glob, numpy as np
from collections import deque
from PIL import Image, ImageDraw, ImageFilter
d = sys.argv[1]; HOLE = int(sys.argv[sys.argv.index('--hole') + 1]) if '--hole' in sys.argv else 40
rep, fails = [], 0
figs = sorted(glob.glob(os.path.join(d, 'fig-*.png')), key=lambda p: float(re.findall(r'fig-([\d.]+)\.png', p)[0]))
def magenta(a): return (a[..., 0] > 200) & (a[..., 1] < 70) & (a[..., 2] > 200)
def holes(mask):   # magenta components not touching the border (at 1/2 res)
    m = mask[::2, ::2]; H, W = m.shape; seen = np.zeros_like(m); q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if m[y, x] and not seen[y, x]: seen[y, x] = 1; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if m[y, x] and not seen[y, x]: seen[y, x] = 1; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not seen[ny, nx]: seen[ny, nx] = 1; q.append((ny, nx))
    inner = m & ~seen.astype(bool); ys, xs = np.nonzero(inner)
    return len(ys) * 4, (list(zip((xs * 2).tolist(), (ys * 2).tolist())) if len(ys) else [])
SJ = json.load(open(os.path.join(d, 'stats.json'))) if os.path.exists(os.path.join(d, 'stats.json')) else {}
shots = [tuple(map(float, r.split(':')[:2])) for r in SJ.get('shots', '0:999').split(',')]
shot_of = lambda t: next((i for i, (a, b) in enumerate(shots) if a - 1e-6 <= t < b - 1e-6), -1)
def grow(mask, r=6):
    im = Image.fromarray((mask * 255).astype(np.uint8)).filter(__import__('PIL.ImageFilter', fromlist=['x']).MaxFilter(2 * r + 1)); return np.asarray(im) > 0
rows, prev_area, prev_t, prev_s = [], None, None, None
for p in figs:
    t = float(re.findall(r'fig-([\d.]+)\.png', p)[0]); a = np.asarray(Image.open(p).convert('RGB'))
    mm = magenta(a); area = int((~mm).sum()); n, pts = holes(mm)
    rp_ = p.replace('fig-', 'rest-')
    if os.path.exists(rp_) and pts:   # keep only holes that the drawn pose does not have
        rn, rpts = holes(magenta(np.asarray(Image.open(rp_).convert('RGB'))))
        rm = np.zeros(mm.shape, bool)
        for x, y in rpts: rm[y:y + 2, x:x + 2] = True
        rm = grow(rm, 8); pts = [(x, y) for x, y in pts if not rm[y, x]]; n = len(pts) * 4
    rows.append((t, n, pts, area, p)); s_ = shot_of(t)
    if prev_area and s_ == prev_s and area and abs(area - prev_area) / prev_area > .06:
        rep.append(f'FAIL jump: figure area {prev_area} → {area} between {prev_t:.2f}s and {t:.2f}s'); fails += 1
    prev_area, prev_t, prev_s = area, t, s_
# FIDELITY: the rig in its drawn pose must reproduce the original drawing (no broken strands, no missing pieces)
fid = []
for p in figs:
    t = float(re.findall(r'fig-([\d.]+)\.png', p)[0]); rp_, op_ = p.replace('fig-', 'rest-'), p.replace('fig-', 'orig-')
    if not (os.path.exists(rp_) and os.path.exists(op_)): continue
    R_ = np.asarray(Image.open(rp_).convert('RGB'), np.int16); O_ = np.asarray(Image.open(op_).convert('RGB'), np.int16)
    dd = np.abs(R_ - O_).max(-1) > 48; dd = np.asarray(Image.fromarray((dd * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0   # ignore 1-px edge shimmer
    fg = ~magenta(O_.astype(np.uint8)) | ~magenta(R_.astype(np.uint8))
    frac = dd.sum() / max(1, fg.sum()); fid.append((frac, t, dd, rp_))
if fid:
    worst = max(fid, key=lambda f: f[0]); rep.append(f'fidelity: worst {worst[0] * 100:.2f}% of figure pixels differ from the original at {worst[1]:.2f}s')
    for frac, t, dd, rp_ in sorted(fid, key=lambda f: -f[0])[:3]:
        if frac > .008:
            rep.append(f'FAIL fidelity {frac * 100:.2f}% at {t:.2f}s'); fails += 1
            im = Image.open(rp_).convert('RGB'); a_ = np.asarray(im).copy(); a_[dd] = (0, 255, 0); Image.fromarray(a_).save(os.path.join(d, f'fidelity-{t:.2f}.png'))
# SEAMS: thin cracks (magenta pixels mostly surrounded by figure) in the moved frames
for p in figs[::3]:
    a = np.asarray(Image.open(p).convert('RGB')); mm = magenta(a).astype(np.float32)
    box5 = lambda q: np.asarray(Image.fromarray((q * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(2)), np.float32) / 255   # 5×5 mean
    sm_ = box5(mm)
    cracks = int(((mm > .5) & (sm_ < .25)).sum()); rp2 = p.replace('fig-', 'rest-'); base_c = 0
    if os.path.exists(rp2):   # cracks the drawn pose has too are gaps between strands of the drawing
        rm_ = magenta(np.asarray(Image.open(rp2).convert('RGB'))).astype(np.float32)
        s2 = box5(rm_); base_c = int(((rm_ > .5) & (s2 < .25)).sum())
    if cracks - base_c > 120: rep.append(f'FAIL seams: {cracks} crack pixels ({base_c} in the drawn pose) at {re.findall(r"fig-([\d.]+)", p)[0]}s'); fails += 1
bad = [r for r in rows if r[1] > HOLE]
rep.append(f'frames checked: {len(rows)}; frames with NEW holes (not in the drawn pose) > {HOLE}px: {len(bad)}')
for t, n, pts, area, p in sorted(bad, key=lambda r: -r[1])[:6]:
    xs, ys = [q[0] for q in pts], [q[1] for q in pts]; rep.append(f'LOOK exposed background {n}px at {t:.2f}s around x {min(xs)}–{max(xs)}, y {min(ys)}–{max(ys)} (air behind moved hair is fine; skin/cloth missing is not) → holes-{t:.2f}.png')
    im = Image.open(p).convert('RGB'); dr = ImageDraw.Draw(im)
    for x, y in pts[::max(1, len(pts) // 400)]: dr.ellipse([x - 6, y - 6, x + 6, y + 6], outline=(0, 255, 0), width=2)
    im.save(os.path.join(d, f'holes-{t:.2f}.png'))
st = SJ.get('stats')
if st:
    for rig, parts in st.items():
        for i, s in enumerate(parts):
            if not s: rep.append(f'note {rig} part{i}: no motion data in the reviewed range'); continue
            line = f"{rig} part{i}: max tip {s['maxTip']:.2f} rad, max bend {s['maxBend']:.2f} rad, max speed {s['maxVel']:.1f} rad/s"
            if s['maxTip'] < .03: line = 'FAIL dead: ' + line; fails += 1
            elif s['maxTip'] > 2.2 or s['maxVel'] > 12 or s['maxBend'] > .9: line = 'FAIL wild: ' + line; fails += 1
            rep.append(line)
# strips: group figure frames into shots by time gaps, crop to the union bbox
groups, cur = [], []
for r in rows:
    if cur and shot_of(r[0]) != shot_of(cur[-1][0]): groups.append(cur); cur = []
    cur.append(r)
if cur: groups.append(cur)
for g in groups:
    boxes = []
    for r in g:
        a = np.asarray(Image.open(r[4]).convert('RGB')); ys, xs = np.nonzero(~magenta(a))
        if len(xs): boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
    if not boxes: continue
    x0, y0, x1, y1 = min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)
    th = 360; crops = [Image.open(r[4]).convert('RGB').crop((x0, y0, x1, y1)) for r in g]
    tw = max(1, int((x1 - x0) * th / max(1, y1 - y0))); cols = max(1, min(12, 2400 // tw)); rws = (len(crops) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rws * (th + 18)), (20, 20, 24)); dr = ImageDraw.Draw(sheet)
    for i, (c, r) in enumerate(zip(crops, g)):
        X, Y = (i % cols) * tw, (i // cols) * (th + 18); sheet.paste(c.resize((tw, th)), (X, Y + 18)); dr.text((X + 4, Y + 3), f'{r[0]:.2f}s', fill=(230, 230, 230))
    fn = f'strip-{g[0][0]:.1f}-{g[-1][0]:.1f}.jpg'; sheet.save(os.path.join(d, fn), quality=85); rep.append(f'sheet {fn} ({len(g)} frames)')
films = sorted(glob.glob(os.path.join(d, 'film-*.jpg')), key=lambda p: float(re.findall(r'film-([\d.]+)\.jpg', p)[0]))
if films:
    tw = 320; im0 = Image.open(films[0]); th = int(im0.height * tw / im0.width); cols = 8; rws = (len(films) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rws * (th + 16)), (20, 20, 24)); dr = ImageDraw.Draw(sheet)
    for i, p in enumerate(films):
        X, Y = (i % cols) * tw, (i // cols) * (th + 16); sheet.paste(Image.open(p).resize((tw, th)), (X, Y + 16)); dr.text((X + 4, Y + 2), re.findall(r'film-([\d.]+)', p)[0] + 's', fill=(230, 230, 230))
    sheet.save(os.path.join(d, 'film-sheet.jpg'), quality=85); rep.append('sheet film-sheet.jpg')
rep.append(f'RESULT: {"PASS" if not fails else str(fails) + " FAIL"} (automatic checks only — still look at every sheet)')
open(os.path.join(d, 'report.txt'), 'w').write('\n'.join(rep) + '\n'); print('\n'.join(rep))
