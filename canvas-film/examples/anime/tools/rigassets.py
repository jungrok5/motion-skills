"""Turn the output of layers.py into scene assets (WebP with alpha) for scenes/rig.js.
  python3 rigassets.py RIGDIR NAME BASE_KEYED.png OUTDIR [--expr name=patched.png:x0,y0,x1,y1[,feather];… ]
- each part:   alpha = keyed base alpha × part mask  → OUTDIR/NAME-partK.webp
- the underlay: keyed (green → alpha)                → OUTDIR/NAME-under.webp
- expressions (optional): the underlay with the expression's face regions pasted in, but never inside a part
  (parts are drawn on top and move) → OUTDIR/NAME-under-<expr>.webp
- OUTDIR/NAME-rig.json: the rig (sizes, parts with files, bboxes, spines)."""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
a = sys.argv[1:]; rig, name, base_key, out = a[:4]; os.makedirs(out, exist_ok=True)
J = json.load(open(os.path.join(rig, f'{name}-rig.json')))
K = np.asarray(Image.open(base_key).convert('RGBA'), np.float32)
def key(rgb):   # same rule as key.py: green dominance → alpha, despill
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]; dom = g - np.maximum(r, b)
    al = 1 - np.clip((dom - 28) / 62, 0, 1); g2 = np.where(dom > 0, np.maximum(r, b), g)
    A = Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.6))   # same 1-px choke as key.py
    return np.dstack([r, g2, b, np.asarray(A, np.float32)])
save = (lambda arr, fn: Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA').save(os.path.join(out, fn), 'WEBP', quality=92, method=6))
union = np.zeros(K.shape[:2], np.float32)
for i, p in enumerate(J['parts']):
    m = np.asarray(Image.open(os.path.join(rig, p['file'].replace('.png', '-alpha.png'))), np.float32) / 255
    union = np.maximum(union, m); P = K.copy(); P[..., 3] *= m
    fn = f'{name}-part{i}.webp'; save(P, fn); p['file'] = fn
U = key(np.asarray(Image.open(os.path.join(rig, f'{name}-under.png')).convert('RGB'), np.float32)); save(U, f'{name}-under.webp')
J['under'] = f'{name}-under.webp'; J['expr'] = {}
if '--expr' in a:
    keep_out = (union > .5).astype(np.float32)   # only the parts' cores: eye corners next to a lock still get the expression
    for spec in a[a.index('--expr') + 1].split(';'):
        en, rest = spec.split('='); src, regs = rest.split(':', 1)
        E = key(np.asarray(Image.open(src).convert('RGB'), np.float32)); M = Image.new('L', (U.shape[1], U.shape[0]), 0); d = ImageDraw.Draw(M); f = 8
        for r in regs.split('|'):
            v = [float(x) for x in r.split(',')]; d.ellipse(v[:4], fill=255); f = v[4] if len(v) > 4 else f
        Mm = np.asarray(M.filter(ImageFilter.GaussianBlur(f)), np.float32)[..., None] / 255 * (1 - keep_out[..., None])
        X = U * (1 - Mm) + E * Mm; fn = f'{name}-under-{en}.webp'; save(X, fn); J['expr'][en] = fn
json.dump(J, open(os.path.join(out, f'{name}-rig.json'), 'w'), indent=1); print('wrote', out, name, len(J['parts']), 'parts', list(J['expr']))
