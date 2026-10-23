"""Prepare FULL Live2D-style layers (each drawn complete by the image model, on green) for scenes/layers.js.
  python3 tools/l2dlayers.py SRC_DIR OUT_DIR NAME
SRC_DIR holds the keyed layers k-<layer>.png (tools/key.py) — backhair, body, face, features, bangs, lockL and the
feature variants features-blink / features-sad. Steps:
- variants are aligned to their base layer (scale 0.6–1.15 + shift search on alpha), since they were edited from
  other drawings whose framing can differ a little;
- the face layer is drawn as a whole bald head; only skin near what is visible at rest is kept (the skull top would
  peek out from under the bangs when they move);
- hair layers get a root → tip axis (root: the opaque pixel nearest the head top; tip: the farthest from the root);
- writes OUT_DIR/NAME-<layer>.webp and OUT_DIR/NAME-l2d.json (size, head ellipse, neck, layers in draw order)."""
import sys, os, json, numpy as np
from PIL import Image, ImageFilter
src, out, name = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
ORDER = [('backhair', 'head', -1.0, True), ('body', 'body', 0, False), ('face', 'head', 0, False),
         ('features', 'head', .7, False), ('bangs', 'head', 1.0, True), ('lockL', 'head', .85, True)]
VAR = {'features': ['blink', 'sad']}
L = {n: Image.open(os.path.join(src, f'k-{n}.png')).convert('RGBA') for n, *_ in ORDER}
W, H = L['face'].size
alpha = lambda im: np.asarray(im)[..., 3].astype(np.float32) / 255
def place(im, s, dx, dy):
    T = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.BILINEAR); O = Image.new('RGBA', im.size, (0, 0, 0, 0))
    O.paste(T, (-((T.width - im.width) // 2 + dx), -((T.height - im.height) // 2 + dy))); return O
def align(im, ref, k=4):
    R = alpha(ref.resize((W // k, H // k))); I = im.resize((W // k, H // k)); best = None
    for s in np.arange(.6, 1.151, .025):
        for dy in range(-40, 41, 2):
            for dx in range(-40, 41, 2):
                a = alpha(place(I, s, dx, dy)); sc = (a * R).sum() / (np.sqrt((a * a).sum() * (R * R).sum()) + 1e-6)
                if best is None or sc > best[0]: best = (sc, s, dx, dy)
    sc, s, dx, dy = best; a0 = alpha(I); id_sc = (a0 * R).sum() / (np.sqrt((a0 * a0).sum() * (R * R).sum()) + 1e-6)
    keep = sc > id_sc + .1   # closed eyes etc. barely overlap anything: only move a variant when it clearly fits better
    print(f'  overlap as drawn {id_sc:.3f}, best {sc:.3f} (scale {s:.3f} shift {dx * k},{dy * k}) →', 'aligned' if keep else 'kept as drawn')
    return place(im, s, dx * k, dy * k) if keep else im
variants = {}
for base, vs in VAR.items():
    for v in vs:
        p = os.path.join(src, f'k-{base}-{v}.png')
        if not os.path.exists(p): continue
        print(base, v); variants.setdefault(base, {})[v] = align(Image.open(p).convert('RGBA'), L[base])
# face: keep skin within 70 px of what is visible at rest (in front of the back hair, not under bangs / lock)
fa = alpha(L['face']); cover = np.maximum(alpha(L['bangs']), alpha(L['lockL']))
vis = (fa > .5) & (cover < .5)
near = np.asarray(Image.fromarray((vis * 255).astype(np.uint8)).resize((W // 4, H // 4)).filter(ImageFilter.MaxFilter(35)).filter(ImageFilter.GaussianBlur(2)).resize((W, H), Image.BILINEAR), np.float32) / 255
f = np.asarray(L['face']).copy(); f[..., 3] = (f[..., 3] * near).astype(np.uint8); L['face'] = Image.fromarray(f, 'RGBA')
ys, xs = np.nonzero(fa > .5); head = {'cx': float(xs.mean()), 'cy': float(ys.min() + (ys.max() - ys.min()) * .42), 'rx': float((xs.max() - xs.min()) / 2), 'ry': float((ys.max() - ys.min()) / 2)}
neck = [float(xs.mean()), float(ys.max())]
J = {'size': [W, H], 'head': head, 'neck': neck, 'layers': []}
for n, role, depth, hair in ORDER:
    a = alpha(L[n]); ys, xs = np.nonzero(a > .5); fn = f'{name}-{n}.webp'
    L[n].save(os.path.join(out, fn), 'WEBP', quality=92, method=6)
    e = {'name': n, 'file': fn, 'role': role, 'depth': depth, 'hair': hair, 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]}
    if hair:
        top = np.array([head['cx'], head['cy'] - head['ry']]); d = (xs - top[0]) ** 2 + (ys - top[1]) ** 2; i = int(d.argmin())
        r = np.array([xs[i], ys[i]], float); d2 = (xs - r[0]) ** 2 + (ys - r[1]) ** 2; j = int(d2.argmax())
        e['axis'] = [float(r[0]), float(r[1]), float(xs[j]), float(ys[j])]
    for v, im in variants.get(n, {}).items():
        vf = f'{name}-{n}-{v}.webp'; im.save(os.path.join(out, vf), 'WEBP', quality=92, method=6); e.setdefault('variants', {})[v] = vf
    J['layers'].append(e); print(n, e['bbox'], e.get('axis', ''))
json.dump(J, open(os.path.join(out, f'{name}-l2d.json'), 'w'), indent=1); print('wrote', out, name, 'head', head, 'neck', neck)
