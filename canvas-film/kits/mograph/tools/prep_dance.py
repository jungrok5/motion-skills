#!/usr/bin/env python3
"""Key video-model character clips (shot on flat #00FF00) into ONE alpha sprite sequence + meta.js for the mograph kit.

usage:
  python3 -I prep_dance.py OUTDIR clipA.mp4 [clipB.mp4 …] [--height 820] [--step 2] [--workers 4]
    OUTDIR      e.g. sermons/<folder>/film/scenes/art/dance   (frames f000.webp … + meta.js)
    --height    figure height in px of the first frame after scaling (the kit scales again at draw time; 820 ≈ 15 MB of webp
                for 362 frames — keep the folder ≲ 20 MB, it is committed for the preview)
    --step      keep every Nth source frame (Kling gives 24 fps; step 2 → 12 fps, anime "on twos", half the size)
  then:  python3 -I contacts.py OUTDIR      (better footfall detection from the alpha profile — the kit's keyboard uses it)
  scene: <script src="art/dance/meta.js"></script> … D = await Mograph.loadSprite(window.DANCE, 'art/dance', { dur: S.DUR })

What it does
- frames of all clips in order (clips are joined: shoot each so it starts and ends on the SAME pose — start frame = end frame —
  so A→B and B→(loop)→A join without a jump); meta.clips = [[first, count], …]
- PLATE KEY, not a fixed threshold: Kling drifts the backdrop from #00FF00 to a muted green within a clip, so the key is relative
  to a smooth per-frame background plate estimated from the clearly-green cells; edge pixels are un-mixed from the plate, then
  green is despilled (G ≤ max(R, B) + 6), and the alpha is choked 1 px + blurred .6 px (kills the green fringe)
- one crop box for ALL frames (union of the alpha, +6 px), so the figure never jumps between frames
- meta.js (window.DANCE): fps, n, clips, w, h, ext, ax/ay (ground anchor: feet midpoint of frame 0, 90th-percentile ground line),
  figH (median figure height), per-frame feet [lx, ly, rx, ry, minx, maxx], box, hands [lx, ly, rx, ry] (left/right-most alpha
  in the upper 60 %), contacts (a foot coming back to the ground after lifting ≥ 3.5 % of figH; never across a clip join)
Needs ffmpeg/ffprobe, numpy, Pillow. Set TMPD to a scratch folder for the intermediate PNGs (≈ 1 GB for 2 × 15 s)."""
import argparse, os, json, subprocess, tempfile, glob
import numpy as np
from PIL import Image, ImageFilter
from multiprocessing import Pool

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('out'); ap.add_argument('clips', nargs='+')
ap.add_argument('--height', type=int, default=820); ap.add_argument('--step', type=int, default=2); ap.add_argument('--workers', type=int, default=4)
A = ap.parse_args()
os.makedirs(A.out, exist_ok=True)
tmp = tempfile.mkdtemp(prefix='dance-', dir=os.environ.get('TMPD'))

def probe_fps(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', p],
                       capture_output=True, text=True).stdout.strip()
    a, b = r.split('/'); return float(a) / float(b)

def key(im):
    """Plate key → (rgb float array, alpha 0..1)."""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dom = g - np.maximum(r, b)                                   # > 0 where green dominates
    h, w = dom.shape
    # rough background: green clearly dominates (relative to the frame's own border green)
    border = np.concatenate([dom[:8].ravel(), dom[:, :8].ravel(), dom[:, -8:].ravel()])
    rough = dom > max(25.0, .45 * np.median(border))
    gy, gx = 32, 18                                              # plate grid
    ys = np.linspace(0, h, gy + 1).astype(int); xs = np.linspace(0, w, gx + 1).astype(int)
    P = np.zeros((gy, gx, 3), np.float32); M = np.zeros((gy, gx), bool)
    for i in range(gy):
        for j in range(gx):
            m = rough[ys[i]:ys[i + 1], xs[j]:xs[j + 1]]
            if m.mean() > .25: P[i, j] = a[ys[i]:ys[i + 1], xs[j]:xs[j + 1]][m].mean(0); M[i, j] = True
    for _ in range(40):                                          # fill the cells she covers from their background neighbours
        if M.all(): break
        P2, M2 = P.copy(), M.copy()
        for i in range(gy):
            for j in range(gx):
                if M[i, j]: continue
                nb = [(i + di, j + dj) for di in (-1, 0, 1) for dj in (-1, 0, 1) if 0 <= i + di < gy and 0 <= j + dj < gx and M[i + di, j + dj]]
                if nb: P2[i, j] = np.mean([P[q] for q in nb], 0); M2[i, j] = True
        P, M = P2, M2
    plate = np.asarray(Image.fromarray(P.clip(0, 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)).astype(np.float32)
    pdom = np.maximum(plate[..., 1] - np.maximum(plate[..., 0], plate[..., 2]), 20.0)
    rel = dom / pdom                                             # 1 = as green as the plate here, 0 = no green
    alpha = 1 - np.clip((rel - .16) / (.62 - .16), 0, 1)
    am = np.maximum(alpha, .05)[..., None]                       # un-mix edge pixels from the plate, then despill
    fg = np.where((alpha > .02)[..., None] & (alpha < .98)[..., None], (a - (1 - am) * plate) / am, a)
    fr, fg_, fb = fg[..., 0], fg[..., 1], fg[..., 2]
    fg_ = np.minimum(fg_, np.maximum(fr, fb) + 6)
    return np.dstack([fr, fg_, fb]).clip(0, 255), alpha

def pass1(job):                                                  # key once, keep the result, report the alpha box
    n, f = job
    rgb, al = key(Image.open(f))
    kp = os.path.join(tmp, f'k{n:04d}.npz'); np.savez(kp, rgb=rgb.astype(np.uint8), al=(al * 255).astype(np.uint8))
    ys, xs = np.where(al > .5)
    return kp, ([int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else None)

if __name__ == '__main__':
    frames, fps0, ranges = [], None, []
    for ci, c in enumerate(A.clips):
        d = os.path.join(tmp, f'c{ci}'); os.makedirs(d)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', c, os.path.join(d, '%04d.png')], check=True)
        fs = sorted(glob.glob(os.path.join(d, '*.png')))[::A.step]; fps = probe_fps(c) / A.step
        if fps0 and abs(fps - fps0) > 1e-3: raise SystemExit(f'{c}: {fps} fps ≠ {fps0} — all clips need the same frame rate')
        fps0 = fps; ranges.append([len(frames), len(fs)]); frames += fs
        print(c, fps, 'fps', len(fs), 'frames')
    print('keying', len(frames), flush=True)
    with Pool(A.workers) as pool: R = pool.map(pass1, list(enumerate(frames)), chunksize=4)
    KEYED = [r[0] for r in R]; BX = np.array([r[1] for r in R if r[1]])
    pad = 6; h0, w0 = Image.open(frames[0]).size[::-1]
    X0, Y0 = max(0, BX[:, 0].min() - pad), max(0, BX[:, 1].min() - pad)
    X1, Y1 = min(w0, BX[:, 2].max() + pad), min(h0, BX[:, 3].max() + pad)
    fig0 = R[0][1][3] - R[0][1][1]
    s = A.height / fig0; HT = round((Y1 - Y0) * s); Wd = round((X1 - X0) * s)
    print('union box', X0, Y0, X1, Y1, '->', Wd, HT, '| touches edge L R T:', BX[:, 0].min() <= 2, BX[:, 2].max() >= w0 - 3, BX[:, 1].min() <= 2,
          '(an edge touch = a hand/foot left the shot: re-shoot or accept a cut limb)', flush=True)

    meta = {'fps': fps0, 'n': len(frames), 'clips': ranges, 'w': Wd, 'h': HT, 'ext': 'webp', 'feet': [], 'box': [], 'hands': []}
    tot = 0
    for i, f in enumerate(frames):
        z = np.load(KEYED[i]); rgb, al = z['rgb'].astype(np.float32), z['al'].astype(np.float32) / 255
        al = al[Y0:Y1, X0:X1]; rgb = rgb[Y0:Y1, X0:X1]
        m = Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.6))
        img = Image.fromarray(rgb.clip(0, 255).astype(np.uint8), 'RGB'); img.putalpha(m)
        img = img.resize((Wd, HT), Image.LANCZOS)
        p = os.path.join(A.out, f'f{i:03d}.webp'); img.save(p, quality=80, alpha_quality=85, method=6); tot += os.path.getsize(p)
        a = np.asarray(img)[..., 3] > 128
        ys, xs = np.where(a)
        if len(xs) == 0:
            meta['feet'].append([0, 0, 0, 0, 0, 0]); meta['box'].append([0, 0, 0, 0]); meta['hands'].append([0, 0, 0, 0]); continue
        meta['box'].append([int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())])
        # feet: the lowest 9 % of the figure, split at the centre of that band; each foot = its lowest row's mean x
        yb = ys.max(); band = a[int(yb - .09 * (yb - ys.min())):yb + 1]
        cols = np.where(band.any(0))[0]; cx = (cols.min() + cols.max()) / 2
        Lc = [c for c in cols if c < cx]; Rc = [c for c in cols if c >= cx]
        def low(cs):
            if not cs: return [int(cx), int(yb)]
            sub = a[:, min(cs):max(cs) + 1]; yy = np.where(sub.any(1))[0].max(); xx = np.where(sub[yy])[0].mean() + min(cs)
            return [round(float(xx), 1), int(yy)]
        fl, fr = low(Lc), low(Rc)
        meta['feet'].append([fl[0], fl[1], fr[0], fr[1], int(cols.min()), int(cols.max())])
        up = a[:int(ys.min() + .6 * (yb - ys.min()))]; uy, ux = np.where(up)
        li, ri = ux.argmin(), ux.argmax()
        meta['hands'].append([int(ux[li]), int(uy[li]), int(ux[ri]), int(uy[ri])])
        if i % 60 == 0: print(i, 'ok', round(tot / 1e6, 1), 'MB', flush=True)

    F = np.array(meta['feet'], dtype=float)
    ground = float(np.percentile(np.maximum(F[:, 1], F[:, 3]), 90))
    f0 = meta['feet'][0]
    meta['ax'] = round((f0[0] + f0[2]) / 2, 1); meta['ay'] = round(ground, 1)
    Bx = np.array(meta['box']); meta['figH'] = round(float(np.median(meta['ay'] - Bx[:, 1])), 1)
    starts = {r[0] for r in ranges}
    lift, near = .035 * meta['figH'], .012 * meta['figH']
    contacts = []
    for k, (xi, yi) in enumerate([(0, 1), (2, 3)]):
        up_ = False
        for i in range(len(F)):
            if i in starts: up_ = False                          # never count a landing across a clip join
            y = F[i, yi]
            if ground - y > lift: up_ = True
            elif up_ and ground - y < near:
                contacts.append({'f': i, 'x': float(F[i, xi]), 'y': float(y), 'foot': 'LR'[k]}); up_ = False
    contacts.sort(key=lambda c: c['f'])
    meta['contacts'] = contacts
    print('ground', ground, 'figH', meta['figH'], 'contacts', len(contacts), 'total', round(tot / 1e6, 2), 'MB')
    open(os.path.join(A.out, 'meta.js'), 'w').write('/* generated by prep_dance.py — keyed character frames (video model) for the mograph kit */\n'
                                                    'window.DANCE = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
