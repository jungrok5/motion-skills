"""Split a bust underlay into a FACE BASE (no bangs, no features — an image-model edit) and a FACE FRONT layer
(everything that differs: eyes, brows, nose, mouth, bangs, the 3/4 contour) for a Live2D-style head turn: the front
slides by parallax over the base, which itself shifts a little less.
  python3 facelayer.py UNDER_RAW.png FACEBASE_RAW.png RIGDIR NAME --reg x0,y0,x1,y1 --box x0,y0,x1,y1 --expr blink=U_blink.webp,sad=U_sad.webp
UNDER_RAW / FACEBASE_RAW are green-screen images of the same size; --expr takes the KEYED expression underlays made by
rigassets.py (their front is cut with the same mask). Writes RIGDIR/NAME-facebase.webp, NAME-front[-expr].webp and adds
"face": {base, front, expr:{…}, bbox} to RIGDIR/NAME-rig.json."""
import sys, os, json, numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
a = sys.argv[1:]; under_p, base_p, rig, name = a[:4]
arg = lambda k: [float(v) for v in a[a.index(k) + 1].split(',')]
REG, BOX = arg('--reg'), [int(v) for v in arg('--box')]
U = Image.open(under_p).convert('RGB'); F = Image.open(base_p).convert('RGB')
def lum(im, k=4): return np.asarray(im.convert('L').resize((im.width // k, im.height // k), Image.BILINEAR), np.float32)
LU = lum(U); x0, y0, x1, y1 = [int(v / 4) for v in REG]; ref = LU[y0:y1, x0:x1]; ref = (ref - ref.mean()) / (ref.std() + 1e-6); best = (-1e9, 1, 0, 0)
for s in np.arange(.96, 1.041, .01):
    LF = lum(F.resize((int(F.width * s), int(F.height * s)), Image.BILINEAR))
    for dy in range(-16, 17, 2):
        for dx in range(-16, 17, 2):
            ys, xs = y0 + dy, x0 + dx
            if ys < 0 or xs < 0 or ys + ref.shape[0] > LF.shape[0] or xs + ref.shape[1] > LF.shape[1]: continue
            w = LF[ys:ys + ref.shape[0], xs:xs + ref.shape[1]]; w = (w - w.mean()) / (w.std() + 1e-6); sc = float((w * ref).mean())
            if sc > best[0]: best = (sc, s, dx, dy)
sc, s, dx, dy = best; print('registration', round(sc, 3), round(float(s), 3), dx * 4, dy * 4)
Fs = F.resize((int(F.width * s), int(F.height * s)), Image.LANCZOS); Fa = Image.new('RGB', U.size, (0, 255, 0)); Fa.paste(Fs, (-int(dx * 4), -int(dy * 4)))
u = np.asarray(U.filter(ImageFilter.GaussianBlur(1.5)), np.float32); f = np.asarray(Fa.filter(ImageFilter.GaussianBlur(1.5)), np.float32)
m = np.abs(u - f).sum(-1) > 50; bx0, by0, bx1, by1 = BOX; box = np.zeros_like(m); box[by0:by1, bx0:bx1] = True; m &= box
M = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))    # close
M = M.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(3))                                          # margin, soft
def key(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]; dom = g - np.maximum(r, b)
    al = 1 - np.clip((dom - 28) / 62, 0, 1); g2 = np.where(dom > 0, np.maximum(r, b), g)
    A = Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.6))
    return np.dstack([r, g2, b, np.asarray(A, np.float32)])
save = lambda arr, fn: Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA').save(os.path.join(rig, fn), 'WEBP', quality=92, method=6)
J = json.load(open(os.path.join(rig, f'{name}-rig.json')))
srcs = {'': os.path.join(rig, J['under'])}
for spec in (a[a.index('--expr') + 1].split(',') if '--expr' in a else []):
    k_, v_ = spec.split('='); srcs[k_] = v_
# the front must cover what differs in EVERY expression (a smile is wider than an 'o')
fa_rgb = np.asarray(Fa.filter(ImageFilter.GaussianBlur(1.5)), np.float32)
for k_, src in srcs.items():
    if not k_: continue
    E_ = Image.open(src).convert('RGBA'); Eb = Image.new('RGB', E_.size, (0, 255, 0)); Eb.paste(E_, (0, 0), E_)
    de = np.abs(np.asarray(Eb.filter(ImageFilter.GaussianBlur(1.5)), np.float32) - fa_rgb).sum(-1) > 50; m |= de & box
M = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
M = M.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(3)); mk = np.asarray(M, np.float32) / 255
Uk = np.asarray(Image.open(os.path.join(rig, J['under'])).convert('RGBA'), np.float32)
base = Uk * (1 - mk[..., None]) + key(np.asarray(Fa, np.float32)) * mk[..., None]   # the face base differs from the underlay only under the front
save(base, f'{name}-facebase.webp')
face = {'base': f'{name}-facebase.webp', 'expr': {}}
for k_, src in srcs.items():
    X = np.asarray(Image.open(src).convert('RGBA'), np.float32).copy(); X[..., 3] *= mk
    fn = f'{name}-front{"-" + k_ if k_ else ""}.webp'; save(X, fn)
    if k_: face['expr'][k_] = fn
    else: face['front'] = fn
ys, xs = np.nonzero(mk > .05); face['bbox'] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
J['face'] = face; json.dump(J, open(os.path.join(rig, f'{name}-rig.json'), 'w'), indent=1); print('face layer', face['bbox'], 'mask px', int((mk > .5).sum()))
