"""prepare.py — cut a themed subset out of Pixel Art Atlas 1.4M (CC0) and turn it into training arrays.

    python3 prepare.py --atlas <dir with tokens.npy, palette.npy, captions.json, objects.json> \
        --match "cat|kitten|tabby|lynx" --drop "cat mask,cat tree" --colors 255 --out cat.npz

Writes <out>: tokens (N,256) uint8 in a new palette (0 = transparent, 1..K), palette (K+1,3) uint8,
captions, subjects, and the word vocabulary the text side of the model uses.
The palette is re-fitted to the subset with k-means in OKLab, weighted by how often each colour is used,
so a small model predicts K colours instead of the atlas's 4,096.
"""
import argparse, json, re, collections
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--atlas', required=True)
ap.add_argument('--match', required=True, help='regex on the subject label (and caption)')
ap.add_argument('--drop', default='', help='comma-separated subjects to leave out')
ap.add_argument('--colors', type=int, default=255)
ap.add_argument('--min-word', type=int, default=2)
ap.add_argument('--out', required=True)
a = ap.parse_args()

caps = json.load(open(f'{a.atlas}/captions.json')); objs = json.load(open(f'{a.atlas}/objects.json'))
rx = re.compile(rf'\b({a.match})\b', re.I); drop = {d.strip() for d in a.drop.split(',') if d.strip()}
idx = [i for i, (c, o) in enumerate(zip(caps, objs)) if (rx.search(o) or rx.search(c)) and o not in drop]
tok = np.load(f'{a.atlas}/tokens.npy', mmap_mode='r'); sub = np.array(tok[idx]).astype(np.int64)
pal = np.load(f'{a.atlas}/palette.npy').astype(np.float64)
print(f'{len(idx)} sprites, {len(set(objs[i] for i in idx))} subjects')

# --- k-means in OKLab over the colours the subset uses (index 0 = transparent stays 0)
def oklab(rgb):
    c = rgb / 255.0; c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708*c[:,0] + 0.5363325363*c[:,1] + 0.0514459929*c[:,2]
    m = 0.2119034982*c[:,0] + 0.6806995451*c[:,1] + 0.1073969566*c[:,2]
    s = 0.0883024619*c[:,0] + 0.2817188376*c[:,1] + 0.6299787005*c[:,2]
    l, m, s = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    return np.stack([0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
                     1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
                     0.0259040371*l + 0.7827717662*m - 0.8086757660*s], 1)
used, counts = np.unique(sub[sub > 0], return_counts=True)
X = oklab(pal[used]); w = counts.astype(np.float64)
K = min(a.colors, len(used)); rng = np.random.default_rng(0)
C = X[rng.choice(len(X), K, replace=False, p=w / w.sum())]
for it in range(40):
    d = ((X[:, None, :] - C[None]) ** 2).sum(-1); lab = d.argmin(1)
    for k in range(K):
        m = lab == k
        if m.any(): C[k] = (X[m] * w[m, None]).sum(0) / w[m].sum()
        else: C[k] = X[rng.choice(len(X), p=w / w.sum())]
lab = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
# each cluster's colour: the most-used real colour in it (keeps crisp, real pixel-art colours)
newpal = np.zeros((K + 1, 3), np.uint8)
for k in range(K):
    m = np.where(lab == k)[0]
    newpal[k + 1] = pal[used[m[np.argmax(w[m])]]] if len(m) else 0
remap = np.zeros(int(pal.shape[0]) + 1, np.int64); remap[used] = lab + 1
newtok = remap[sub].astype(np.uint8)
err = np.sqrt(((X - C[lab]) ** 2).sum(1)); print(f'palette {len(used)} → {K} colours, mean OKLab error {np.average(err, weights=w):.4f}')

# --- words
words = lambda c: re.findall(r"[a-z]+(?:-[a-z]+)*", c.lower())
cnt = collections.Counter(wd for i in idx for wd in words(caps[i]))
vocab = ['<pad>', '<unk>'] + sorted(wd for wd, c in cnt.items() if c >= a.min_word)
print(f'vocabulary {len(vocab)} words (longest caption {max(len(words(caps[i])) for i in idx)} words)')
np.savez_compressed(a.out, tokens=newtok, palette=newpal, captions=np.array([caps[i] for i in idx]),
                    subjects=np.array([objs[i] for i in idx]), vocab=np.array(vocab))
print('→', a.out)
