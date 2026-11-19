"""model.py — a small masked-diffusion sprite painter (the Tessera recipe, scaled down for one theme).

A 16×16 sprite is 256 palette tokens (0 = transparent). Training hides a random share of them (cosine schedule) and the
network predicts the hidden colours from the visible ones, the caption and how much is still hidden. Painting starts from
a fully hidden canvas and commits the most confident pixels over S steps (MaskGIT-style), with classifier-free guidance.

Shape (an hourglass, like Tessera-small): pixel tokens at 16×16 (width `d_px`) → one block → 2×2 merge to 8×8
(width `d`) → core blocks over [caption words, registers, 64 merged tokens] → unmerge + skip → one block → colour logits.
The caption side is a word vocabulary learned with the model (no CLIP): one theme needs a few hundred words.
"""
import math
import torch
import torch.nn as nn
import torch.nn.functional as F


class Block(nn.Module):
    def __init__(self, d, heads):
        super().__init__()
        self.n1, self.n2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.qkv, self.proj = nn.Linear(d, 3 * d), nn.Linear(d, d)
        self.ff = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d))
        self.h = heads

    def forward(self, x):
        B, T, D = x.shape
        q, k, v = self.qkv(self.n1(x)).view(B, T, 3, self.h, D // self.h).permute(2, 0, 3, 1, 4)
        a = F.scaled_dot_product_attention(q, k, v).transpose(1, 2).reshape(B, T, D)
        x = x + self.proj(a)
        return x + self.ff(self.n2(x))


class SpritePainter(nn.Module):
    def __init__(self, colors, vocab, d=192, d_px=96, core=6, heads=6, text_len=16, registers=2, selfcond=False):
        super().__init__()
        self.colors, self.mask_id, self.text_len, self.selfcond = colors, colors, text_len, selfcond
        self.cfg = dict(colors=colors, vocab=vocab, d=d, d_px=d_px, core=core, heads=heads, text_len=text_len, registers=registers, selfcond=selfcond)
        self.px_emb = nn.Embedding(colors + 1, d_px)                  # + MASK
        if selfcond: self.sc = nn.Linear(colors, d_px, bias=False)    # last step's colour probabilities (self-conditioning)
        self.px_pos = nn.Parameter(torch.randn(1, 256, d_px) * 0.02)
        self.inb = Block(d_px, max(1, heads // 2))
        self.merge = nn.Linear(4 * d_px, d)
        self.word = nn.Embedding(vocab, d, padding_idx=0)
        self.word_pos = nn.Parameter(torch.randn(1, text_len, d) * 0.02)
        self.reg = nn.Parameter(torch.randn(1, registers, d) * 0.02)
        self.core_pos = nn.Parameter(torch.randn(1, 64, d) * 0.02)
        self.ratio = nn.Sequential(nn.Linear(1, d), nn.GELU(), nn.Linear(d, d))
        self.core = nn.ModuleList([Block(d, heads) for _ in range(core)])
        self.unmerge = nn.Linear(d, 4 * d_px)
        self.outb = Block(d_px, max(1, heads // 2))
        self.norm = nn.LayerNorm(d_px)
        self.head = nn.Linear(d_px, colors)
        self.R = registers

    def forward(self, x, words, ratio, sc=None):
        """x (B,256) colour ids or MASK · words (B,text_len) word ids (0 = pad) · ratio (B,) share still hidden ·
        sc (B,256,colors) the previous prediction's probabilities (self-conditioning; zeros = none) → (B,256,colors)"""
        B = x.shape[0]
        e = self.px_emb(x) + self.px_pos
        if self.selfcond: e = e + self.sc(sc if sc is not None else torch.zeros(B, 256, self.colors))
        h = self.inb(e)                                                                # (B,256,dp)
        g = h.view(B, 8, 2, 8, 2, -1).permute(0, 1, 3, 2, 4, 5).reshape(B, 64, -1)      # 2×2 merge
        c = self.merge(g) + self.core_pos + self.ratio(ratio.view(B, 1, 1).float())
        t = self.word(words) + self.word_pos
        z = torch.cat([t, self.reg.expand(B, -1, -1), c], 1)
        for blk in self.core: z = blk(z)
        u = self.unmerge(z[:, -64:]).view(B, 8, 8, 2, 2, -1).permute(0, 1, 3, 2, 4, 5).reshape(B, 256, -1)
        return self.head(self.norm(self.outb(u + h)))


def mask_batch(x, gen=None, blob=0.0):
    """hide a cosine-scheduled share of each sprite; with probability `blob` the hidden pixels form smooth blobs
    (low-res noise thresholded at the share) instead of scattered pixels. Returns (hidden mask, ratio)."""
    B = x.shape[0]
    r = torch.cos(torch.rand(B, generator=gen) * math.pi / 2).clamp(min=1 / 256)
    score = torch.rand(B, 256, generator=gen)
    if blob > 0:
        lo = F.interpolate(torch.rand(B, 1, 4, 4, generator=gen), size=16, mode='bilinear', align_corners=False).view(B, 256)
        use = torch.rand(B, generator=gen) < blob
        score = torch.where(use[:, None], lo + 0.05 * score, score)
    k = (r * 256).round().clamp(min=1).long()
    thresh = score.sort(1).values.gather(1, (k - 1)[:, None])
    m = score <= thresh
    m[torch.arange(B), torch.randint(0, 256, (B,), generator=gen)] = True               # at least one hidden pixel
    return m, m.float().mean(1)


@torch.no_grad()
def paint(model, words, steps=16, guidance=3.0, temp=1.0, seed=0, count=4, nms=False, top_p=1.0, choice=1.0):
    """MaskGIT-style painting from a fully hidden canvas. words: (text_len,) LongTensor → (count,256) colour ids.
    nms: a pixel is committed early only if it is the most confident hidden pixel in its 3×3 neighbourhood, so the
    first strokes spread over the sprite instead of clumping (Tessera's spatial NMS).
    top_p: sample each pixel only among the most likely colours that make up `top_p` of its probability (nucleus), so a
    high temperature brings back detail without stray off-colour specks from the tail.
    choice: scale of the annealed Gumbel noise on *which* pixels are committed each step (not which colour)."""
    g = torch.Generator().manual_seed(seed)
    M = model.mask_id
    x = torch.full((count, 256), M, dtype=torch.long)
    w = words.view(1, -1).expand(count, -1)
    blank = torch.zeros_like(w)
    sc_c = sc_u = None
    for s in range(steps):
        hidden = x == M
        ratio = hidden.float().mean(1)
        lc = model(x, w, ratio, sc_c); lu = model(x, blank, ratio, sc_u)
        if model.selfcond: sc_c, sc_u = F.softmax(lc, -1), F.softmax(lu, -1)
        logits = lu + guidance * (lc - lu)
        probs = F.softmax(logits / temp, -1)
        if top_p < 1.0:
            sp, si = probs.sort(-1, descending=True)
            drop = (sp.cumsum(-1) - sp) > top_p                                          # keep the smallest set reaching top_p
            sp = sp.masked_fill(drop, 0.0)
            probs = torch.zeros_like(probs).scatter(-1, si, sp)
            probs = probs / probs.sum(-1, keepdim=True)
        pick = torch.multinomial(probs.view(-1, probs.shape[-1]), 1, generator=g).view(count, 256)
        conf = torch.gather(probs, -1, pick[..., None])[..., 0]
        anneal = 1.0 - (s + 1) / steps
        conf = torch.log(conf.clamp_min(1e-9)) + choice * anneal * -torch.log(-torch.log(torch.rand(conf.shape, generator=g).clamp(1e-9, 1)))
        if nms and s < steps - 1:
            ch = torch.where(hidden, conf, torch.full_like(conf, -1e9)).view(count, 1, 16, 16)
            peak = (ch == F.max_pool2d(ch, 3, 1, 1)).view(count, 256)
            conf = torch.where(peak, conf, conf - 1e3)                                   # non-peaks only after every peak
        conf = torch.where(hidden, conf, torch.full_like(conf, float('inf')))         # painted pixels stay
        keep_hidden = int(256 * math.cos(math.pi / 2 * (s + 1) / steps))
        cand = torch.where(hidden, pick, x)
        if keep_hidden > 0:
            thresh = conf.sort(1).values[:, keep_hidden - 1:keep_hidden]
            cand = torch.where(conf <= thresh, torch.full_like(x, M), cand)
        x = cand
    return x
