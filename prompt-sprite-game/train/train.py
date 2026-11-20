"""train.py — train a SpritePainter on a subset made by prepare.py (CPU is enough for one theme).

    python3 train.py --data cat.npz --out runs/cat --steps 6000 --batch 64

Writes <out>/ckpt.pt (EMA weights + config + palette + vocab), <out>/log.txt and <out>/samples-<step>.png
(prompts × 4 variations) so progress can be looked at while it trains.
"""
import argparse, json, math, os, re, time
import numpy as np
import torch
import torch.nn.functional as F
from model import SpritePainter, mask_batch, paint

ap = argparse.ArgumentParser()
ap.add_argument('--data', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--steps', type=int, default=6000); ap.add_argument('--batch', type=int, default=64)
ap.add_argument('--lr', type=float, default=1e-3); ap.add_argument('--d', type=int, default=192)
ap.add_argument('--d-px', type=int, default=96); ap.add_argument('--core', type=int, default=6)
ap.add_argument('--heads', type=int, default=6); ap.add_argument('--every', type=int, default=500)
ap.add_argument('--prompts', default='')
ap.add_argument('--selfcond', type=int, default=0); ap.add_argument('--blob', type=float, default=0.0)
ap.add_argument('--psmooth', type=float, default=0.0, help='perceptual label smoothing weight (colour-distance-aware)')
ap.add_argument('--smooth', type=float, default=0.05); ap.add_argument('--wd', type=float, default=0.05)
ap.add_argument('--dropout-words', type=float, default=0.1)
ap.add_argument('--init', default='', help='start from this checkpoint (fine-tuning); its palette and vocabulary must match --data')
ap.add_argument('--warmup', type=int, default=300)
ap.add_argument('--bench', type=int, default=0, help='time this many steps and exit')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
torch.manual_seed(0)

D = np.load(a.data)
tokens = torch.from_numpy(D['tokens'].astype(np.int64)); palette = D['palette']; vocab = list(D['vocab'])
caps = list(D['captions']); K = len(palette) - 1
widx = {w: i for i, w in enumerate(vocab)}
def encode(c, L=16):
    ids = [widx.get(w, 1) for w in re.findall(r"[a-z]+(?:-[a-z]+)*", c.lower())][:L]
    return ids + [0] * (L - len(ids))
words = torch.tensor([encode(c) for c in caps])
x0 = tokens  # colour ids 0..K (0 = transparent); the model's MASK id is K + 1
n = len(tokens); perm = torch.randperm(n); nval = max(64, n // 20)
val, tr = perm[:nval], perm[nval:]

model = SpritePainter(colors=K + 1, vocab=len(vocab), d=a.d, d_px=a.d_px, core=a.core, heads=a.heads, selfcond=bool(a.selfcond))
if a.init:
    ck0 = torch.load(a.init, weights_only=False); model.load_state_dict(ck0['state']); print(f'initialised from {a.init} (step {ck0["step"]})', flush=True)
ema = SpritePainter(**model.cfg); ema.load_state_dict(model.state_dict()); [p.requires_grad_(False) for p in ema.parameters()]
nparam = sum(p.numel() for p in model.parameters())
print(f'{n} sprites ({len(tr)} train / {nval} val), {K + 1} colours, {len(vocab)} words, {nparam / 1e6:.2f} M parameters', flush=True)
opt = torch.optim.AdamW(model.parameters(), lr=a.lr, betas=(0.9, 0.98), weight_decay=a.wd)
# perceptual label smoothing: part of each target spreads to colours that look alike (OKLab), none to/from transparent
def _oklab(rgb):
    c = rgb / 255.0; c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708*c[:,0] + 0.5363325363*c[:,1] + 0.0514459929*c[:,2]; m_ = 0.2119034982*c[:,0] + 0.6806995451*c[:,1] + 0.1073969566*c[:,2]
    s_ = 0.0883024619*c[:,0] + 0.2817188376*c[:,1] + 0.6299787005*c[:,2]; l, m_, s_ = np.cbrt(l), np.cbrt(m_), np.cbrt(s_)
    return np.stack([0.2104542553*l + 0.7936177850*m_ - 0.0040720468*s_, 1.9779984951*l - 2.4285922050*m_ + 0.4505937099*s_, 0.0259040371*l + 0.7827717662*m_ - 0.8086757660*s_], 1)
_lab = torch.tensor(_oklab(palette.astype(np.float64)), dtype=torch.float32)
_d2 = ((_lab[:, None] - _lab[None]) ** 2).sum(-1)
SOFT = torch.softmax(-_d2 / 0.002, 1); SOFT[0] = 0; SOFT[:, 0] = 0; SOFT[0, 0] = 1; SOFT = SOFT / SOFT.sum(1, keepdim=True)
sched = lambda s: min(1, s / a.warmup) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * min(1, s / a.steps))))
prompts = [p.strip() for p in a.prompts.split('|') if p.strip()] or ['orange tabby cat', 'side-view black cat', 'front-view white persian cat', 'three-quarter-view siamese cat', 'kitten', 'cat warrior with a sword', 'ghost cat', 'winged cat']

def batch(ix, aug=True):
    x = x0[ix].clone(); w = words[ix].clone()
    if aug:
        flip = torch.rand(len(ix)) < 0.5
        x[flip] = x[flip].view(-1, 16, 16).flip(-1).reshape(-1, 256)                 # mirror (sprites face both ways)
        w[torch.rand(len(ix)) < a.dropout_words] = 0                                 # caption dropout for guidance
    return x, w

def loss_on(m, x, w, train=True):
    hid, ratio = mask_batch(x, blob=a.blob if train else 0.0)
    inp = torch.where(hid, torch.full_like(x, m.mask_id), x)
    sc = None
    if m.selfcond and train and torch.rand(()) < 0.5:                                 # half the time: feed a first guess back in
        with torch.no_grad(): sc = F.softmax(m(inp, w, ratio), -1)
    logits = m(inp, w, ratio, sc)[hid]; tgt = x[hid]
    if not train: return F.cross_entropy(logits, tgt)
    if a.psmooth > 0:
        q = (1 - a.psmooth) * F.one_hot(tgt, logits.shape[-1]).float() + a.psmooth * SOFT[tgt]
        return -(q * F.log_softmax(logits, -1)).sum(-1).mean()
    return F.cross_entropy(logits, tgt, label_smoothing=a.smooth)

def save_samples(step):
    from PIL import Image
    ema.eval(); rows = []
    for i, p in enumerate(prompts):
        out = paint(ema, torch.tensor(encode(p)), seed=i, count=4, steps=24, temp=0.7, nms=True).numpy()
        rows.append(out)
    S = 6; img = np.zeros((len(prompts) * 18 * S, 4 * 18 * S, 4), np.uint8); img[..., :3] = 34; img[..., 3] = 255
    for r, out in enumerate(rows):
        for c in range(4):
            t = out[c].reshape(16, 16); rgb = palette[t]; a_ = (t > 0)
            tile = np.zeros((16, 16, 4), np.uint8); tile[..., :3] = np.where(a_[..., None], rgb, 50); tile[..., 3] = 255
            tile = tile.repeat(S, 0).repeat(S, 1)
            img[(r * 18 + 1) * S:(r * 18 + 17) * S, (c * 18 + 1) * S:(c * 18 + 17) * S] = tile
    Image.fromarray(img).save(f'{a.out}/samples-{step:05d}.png')
    json.dump(prompts, open(f'{a.out}/samples-prompts.json', 'w'))

log = open(f'{a.out}/log.txt', 'a'); t0 = time.time(); best = float('inf')
for step in range(1, a.steps + 1):
    model.train()
    for g_ in opt.param_groups: g_['lr'] = a.lr * sched(step)
    ix = tr[torch.randint(0, len(tr), (a.batch,))]
    loss = loss_on(model, *batch(ix))
    opt.zero_grad(set_to_none=True); loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0); opt.step()
    with torch.no_grad():
        dec = min(0.999, (1 + step) / (10 + step))
        for pe, pm in zip(ema.parameters(), model.parameters()): pe.mul_(dec).add_(pm, alpha=1 - dec)
    if a.bench and step == a.bench:
        print(f'{(time.time() - t0) / a.bench:.3f} s/step'); raise SystemExit
    if step % 50 == 0:
        msg = f'step {step} loss {loss.item():.4f} lr {a.lr * sched(step):.2e} {(time.time() - t0) / step:.2f}s/step'
        if step % a.every == 0:
            ema.eval()
            with torch.no_grad():
                torch.manual_seed(1); vl = np.mean([loss_on(ema, *batch(val[i:i + 128], aug=False), train=False).item() for i in range(0, nval, 128)])
            msg += f' val {vl:.4f}'
            save_samples(step)
            ck = {'cfg': ema.cfg, 'state': ema.state_dict(), 'palette': palette, 'vocab': vocab, 'step': step, 'val': float(vl)}
            torch.save(ck, f'{a.out}/ckpt.pt')
            if vl < best: best = vl; torch.save(ck, f'{a.out}/ckpt-best.pt'); msg += ' (best)'
        print(msg, flush=True); log.write(msg + '\n'); log.flush()
