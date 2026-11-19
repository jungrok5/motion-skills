"""eval.py — score a painter with numbers, so changes are compared instead of eyeballed.

    python3 eval.py --data cat.npz --ckpt runs/cat/ckpt-best.pt [--steps 24 --temp 0.7 --guidance 3 --nms 1] [--per 8]

For every subject of the theme it paints `per` sprites from the subject's name and reports:
  acc    a small CNN trained on the real sprites names the subject the painter was asked for (prompt following;
         the same CNN on the real validation sprites gives the ceiling)
  fd     Fréchet distance between CNN features of painted and real sprites (lower = closer to the real look;
         real train vs real validation gives the floor)
  lone   opaque pixels whose four neighbours all have another colour, per sprite (detail or noise; real sprites give the target)
  speck  lone pixels whose colour appears nowhere else in the sprite and is far (OKLab) from every neighbour: stray
         off-colour pixels (real sprites give the target)
  nll    validation negative log-likelihood per hidden pixel, no label smoothing (the model, not the sampler)
The CNN is trained once and cached next to the data (<data>.cls.pt). A sample sheet goes to --sheet.
"""
import argparse, os, re, math, json
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F
from model import SpritePainter, paint, mask_batch

ap = argparse.ArgumentParser()
ap.add_argument('--data', required=True); ap.add_argument('--ckpt', required=True)
ap.add_argument('--steps', type=int, default=16); ap.add_argument('--temp', type=float, default=1.0)
ap.add_argument('--guidance', type=float, default=3.0); ap.add_argument('--nms', type=int, default=0)
ap.add_argument('--top-p', type=float, default=1.0); ap.add_argument('--choice', type=float, default=1.0)
ap.add_argument('--per', type=int, default=8); ap.add_argument('--sheet', default='')
ap.add_argument('--json', default='')
a = ap.parse_args()
torch.manual_seed(0)

D = np.load(a.data); tokens = torch.from_numpy(D['tokens'].astype(np.int64)); palette = D['palette']
subjects = list(D['subjects']); names = sorted(set(subjects)); sid = torch.tensor([names.index(s) for s in subjects])
n = len(tokens); perm = torch.randperm(n); nval = max(64, n // 20); val, tr = perm[:nval], perm[nval:]   # same split as train.py
pal_rgb = torch.tensor(palette, dtype=torch.float32) / 255

def to_img(t):  # (B,256) colour ids → (B,4,16,16) RGBA in [0,1]
    t = t.clamp(max=len(palette) - 1)
    rgb = pal_rgb[t].view(-1, 16, 16, 3).permute(0, 3, 1, 2); a_ = (t > 0).float().view(-1, 1, 16, 16)
    return torch.cat([rgb * a_, a_], 1)

class CNN(nn.Module):
    def __init__(self, k):
        super().__init__()
        self.f = nn.Sequential(nn.Conv2d(4, 48, 3, padding=1), nn.GELU(), nn.Conv2d(48, 48, 3, padding=1), nn.GELU(), nn.MaxPool2d(2),
                               nn.Conv2d(48, 96, 3, padding=1), nn.GELU(), nn.Conv2d(96, 96, 3, padding=1), nn.GELU(), nn.MaxPool2d(2),
                               nn.Conv2d(96, 160, 3, padding=1), nn.GELU(), nn.AdaptiveAvgPool2d(1), nn.Flatten())
        self.h = nn.Linear(160, k)
    def forward(self, x): return self.h(self.f(x))

cls_path = a.data + '.cls.pt'
cnn = CNN(len(names))
if os.path.exists(cls_path): cnn.load_state_dict(torch.load(cls_path))
else:
    opt = torch.optim.AdamW(cnn.parameters(), 2e-3, weight_decay=0.05)
    for ep in range(12):
        cnn.train(); p = tr[torch.randperm(len(tr))]
        for i in range(0, len(p), 128):
            ix = p[i:i + 128]; x = to_img(tokens[ix])
            flip = torch.rand(len(ix)) < 0.5; x[flip] = x[flip].flip(-1)
            loss = F.cross_entropy(cnn(x), sid[ix]); opt.zero_grad(); loss.backward(); opt.step()
    torch.save(cnn.state_dict(), cls_path)
cnn.eval()

@torch.no_grad()
def feats_and_pred(t):
    out_f, out_p = [], []
    for i in range(0, len(t), 256):
        x = to_img(t[i:i + 256]); f = cnn.f(x); out_f.append(f); out_p.append(cnn.h(f).argmax(1))
    return torch.cat(out_f).numpy().astype(np.float64), torch.cat(out_p)

def frechet(f1, f2):
    m1, m2 = f1.mean(0), f2.mean(0); c1, c2 = np.cov(f1, rowvar=False), np.cov(f2, rowvar=False)
    ev = np.linalg.eigvals(c1 @ c2); tr_sqrt = np.sqrt(np.clip(ev.real, 0, None)).sum()
    return float(((m1 - m2) ** 2).sum() + np.trace(c1) + np.trace(c2) - 2 * tr_sqrt)

def lone(t):
    t = t.view(-1, 16, 16); p = F.pad(t, (1, 1, 1, 1), value=-1)
    nb = torch.stack([p[:, :-2, 1:-1], p[:, 2:, 1:-1], p[:, 1:-1, :-2], p[:, 1:-1, 2:]])
    return ((t > 0) & (nb != t).all(0)).float().sum((1, 2)).mean().item()


def _oklab(rgb):
    c = rgb / 255.0; c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708*c[:,0] + 0.5363325363*c[:,1] + 0.0514459929*c[:,2]; m_ = 0.2119034982*c[:,0] + 0.6806995451*c[:,1] + 0.1073969566*c[:,2]
    s_ = 0.0883024619*c[:,0] + 0.2817188376*c[:,1] + 0.6299787005*c[:,2]; l, m_, s_ = np.cbrt(l), np.cbrt(m_), np.cbrt(s_)
    return np.stack([0.2104542553*l + 0.7936177850*m_ - 0.0040720468*s_, 1.9779984951*l - 2.4285922050*m_ + 0.4505937099*s_, 0.0259040371*l + 0.7827717662*m_ - 0.8086757660*s_], 1)
LAB = torch.tensor(_oklab(palette.astype(np.float64)), dtype=torch.float32)
def speck(t, far=0.12):
    t = t.view(-1, 16, 16).clamp(max=len(palette) - 1); B = t.shape[0]
    p = F.pad(t, (1, 1, 1, 1), value=0)
    nb = torch.stack([p[:, :-2, 1:-1], p[:, 2:, 1:-1], p[:, 1:-1, :-2], p[:, 1:-1, 2:]])
    dist = ((LAB[t][None] - LAB[nb]) ** 2).sum(-1).sqrt()                                  # (4,B,16,16)
    once = torch.stack([(t[b][..., None, None] == t[b]).sum((-1, -2)) == 1 for b in range(B)])
    return ((t > 0) & once & (dist > far).all(0)).float().sum((1, 2)).mean().item()

real_tr_f, _ = feats_and_pred(tokens[tr]); real_val_f, real_val_p = feats_and_pred(tokens[val])
ref = {'acc': (real_val_p == sid[val]).float().mean().item(), 'fd': frechet(real_tr_f, real_val_f), 'lone': lone(tokens[val]), 'speck': speck(tokens[val])}

ck = torch.load(a.ckpt, weights_only=False); m = SpritePainter(**ck['cfg']); m.load_state_dict(ck['state']); m.eval()
vocab = list(ck['vocab']); widx = {w: i for i, w in enumerate(vocab)}
enc = lambda c: (lambda ids: ids + [0] * (16 - len(ids)))([widx.get(w, 1) for w in re.findall(r"[a-z]+(?:-[a-z]+)*", c.lower())][:16])
words_all = torch.tensor([enc(c) for c in D['captions']])

with torch.no_grad():  # validation NLL, plain
    torch.manual_seed(1); tot, cnt = 0.0, 0
    for i in range(0, nval, 128):
        ix = val[i:i + 128]; x = tokens[ix]; hid, r = mask_batch(x)
        inp = torch.where(hid, torch.full_like(x, m.mask_id), x)
        lg = m(inp, words_all[ix], r)
        tot += F.cross_entropy(lg[hid], x[hid], reduction='sum').item(); cnt += hid.sum().item()
    nll = tot / cnt

gen, want = [], []
for k, name in enumerate(names):
    out = paint(m, torch.tensor(enc(name)), steps=a.steps, guidance=a.guidance, temp=a.temp, seed=k, count=a.per, nms=bool(a.nms), top_p=a.top_p, choice=a.choice)
    out = torch.where(out == m.mask_id, torch.zeros_like(out), out); gen.append(out); want += [k] * a.per
gen = torch.cat(gen); want = torch.tensor(want)
gf, gp = feats_and_pred(gen)
res = {'acc': (gp == want).float().mean().item(), 'fd': frechet(gf, real_val_f), 'lone': lone(gen), 'speck': speck(gen), 'nll': nll}
print(f"{os.path.basename(os.path.dirname(a.ckpt))} step {ck['step']} · steps {a.steps} temp {a.temp} top-p {a.top_p} choice {a.choice} guidance {a.guidance} nms {a.nms}")
print(f"  acc  {res['acc']*100:5.1f} %   (real {ref['acc']*100:.1f} %)")
print(f"  fd   {res['fd']:7.2f}   (real {ref['fd']:.2f})")
print(f"  lone {res['lone']:5.1f}     (real {ref['lone']:.1f})")
print(f"  speck {res['speck']:4.2f}     (real {ref['speck']:.2f})")
print(f"  nll  {res['nll']:.4f}")
if a.json: json.dump({'res': res, 'ref': ref, 'args': vars(a), 'step': ck['step']}, open(a.json, 'w'))
if a.sheet:
    from PIL import Image
    S = 4; cols = min(a.per, 8); img = np.full((len(names) * 18 * S, cols * 18 * S, 3), 34, np.uint8)
    for k in range(len(names)):
        for c in range(cols):
            t = gen[k * a.per + c].view(16, 16).numpy(); tile = np.where((t > 0)[..., None], palette[t], 50).astype(np.uint8)
            img[(k * 18 + 1) * S:(k * 18 + 17) * S, (c * 18 + 1) * S:(c * 18 + 17) * S] = tile.repeat(S, 0).repeat(S, 1)
    Image.fromarray(img).save(a.sheet)
