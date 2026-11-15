"""The lens and the film stock: linear render → the delivered frame. numpy + Pillow only.

Order matters and follows the light: glow in the lens (halation, bloom, streak) → the lens itself (softness,
aberration, distortion, vignette) → the stock's response (tone map) → the grade → grain → the letterbox.
Everything before the tone map works on scene-linear values, so a strip light at 40× white blooms like one.
"""
import numpy as np
from PIL import Image

from .util import hexcol

LUM = np.array([0.2126, 0.7152, 0.0722], np.float32)


# ---- blur / resample ----------------------------------------------------------------------------
def _box1(a, r, axis):
    if r < 1:
        return a
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def blur(a, sigma, sx=1.0, sy=1.0):
    """Gaussian-like blur (three box passes). Large sigmas run on a reduced copy: bloom does not need pixels."""
    if sigma <= 0.3:
        return a
    h, w = a.shape[:2]
    k = 1
    while sigma / k > 6 and min(h, w) // (k * 2) >= 8:
        k *= 2
    if k > 1:
        small = resize(a, max(1, w // k), max(1, h // k))
        return resize(blur(small, sigma / k, sx, sy), w, h)
    r = max(1, int(round(np.sqrt(12 * sigma * sigma / 3 + 1) / 2 - 0.5)))
    for _ in range(3):
        if sx > 0:
            a = _box1(a, max(1, int(round(r * sx))), 1)
        if sy > 0:
            a = _box1(a, max(1, int(round(r * sy))), 0)
    return a


def resize(a, w, h, how=Image.BILINEAR):
    if a.ndim == 2:
        return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((w, h), how), np.float32)
    return np.stack([np.asarray(Image.fromarray(np.ascontiguousarray(a[..., c]), 'F').resize((w, h), how), np.float32)
                     for c in range(a.shape[2])], -1)


def _sample(ch, x, y):
    h, w = ch.shape
    x = np.clip(x, 0, w - 1.001)
    y = np.clip(y, 0, h - 1.001)
    x0, y0 = x.astype(np.int32), y.astype(np.int32)
    fx, fy = x - x0, y - y0
    a = ch[y0, x0] * (1 - fx) + ch[y0, x0 + 1] * fx
    b = ch[y0 + 1, x0] * (1 - fx) + ch[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy


# ---- tone ---------------------------------------------------------------------------------------
_AGX_IN = np.array([[0.842479062253094, 0.0423282422610123, 0.0423756549057051],
                    [0.0784335999999992, 0.878468636469772, 0.0784336],
                    [0.0792237451477643, 0.0791661274605434, 0.879142973793104]], np.float32)
_AGX_OUT = np.array([[1.19687900512017, -0.0528968517574562, -0.0529716355144438],
                     [-0.0980208811401368, 1.15190312990417, -0.0980434501171241],
                     [-0.0990297440797205, -0.0989611768448433, 1.15107367264116]], np.float32)


def agx(x):
    """AgX base (Troy Sobotka), Benjamin Wrensch's polynomial fit: bright colours desaturate toward white the way
    film does instead of clipping to a flat primary. Linear in → display-encoded 0..1 out."""
    v = np.maximum(x, 0) @ _AGX_IN
    v = (np.clip(np.log2(np.maximum(v, 1e-10)), -12.47393, 4.026069) + 12.47393) / (4.026069 + 12.47393)
    v2 = v * v
    v4 = v2 * v2
    v = 15.5 * v4 * v2 - 40.14 * v4 * v + 31.96 * v4 - 6.868 * v2 * v + 0.4298 * v2 + 0.1191 * v - 0.00232
    return np.clip(v @ _AGX_OUT, 0, 1)


def filmic(x):
    """Hable's curve: more contrast and colour than AgX, clips harder."""
    def f(v):
        A, B, C, D, E, F = 0.15, 0.50, 0.10, 0.20, 0.02, 0.30
        return (v * (A * v + C * B) + D * E) / (v * (A * v + B) + D * F) - E / F
    y = f(np.maximum(x, 0) * 2.0) / f(np.float32(11.2))
    return np.clip(y, 0, 1) ** (1 / 2.2)


def encode(x, how='agx'):
    if how == 'agx':
        return agx(x)
    if how == 'filmic':
        return filmic(x)
    return np.clip(x, 0, 1) ** (1 / 2.2)


# ---- the chain ----------------------------------------------------------------------------------
def finish(lin, look, frame=0, fade=None, bars=None, film_w=None):
    """lin: float32 (H, W, 3) scene-linear. look: dict (pf.film.DEFAULT_LOOK). frame: global frame number (seeds
    the grain). fade: (colour 'white'|'black'|hex, amount 0..1). bars: (W, H) of the delivered frame.
    → uint8 (H', W', 3)."""
    L = look
    x = lin.astype(np.float32) * np.float32(2.0 ** L['exposure'])
    h, w = x.shape[:2]
    px = w / float(film_w or w)                      # so a half-size preview gets the same look as the film

    if L['soften'] > 0:
        x = x + (blur(x, 0.8 * px) - x) * L['soften']
    lum = x @ LUM
    if L['halation'] > 0:
        hot = np.maximum(lum - 1.2, 0)[..., None] * (x / (lum[..., None] + 1e-4))
        hal = blur(hot, w * 0.006)
        x = x + hal * np.array([1.0, 0.32, 0.10], np.float32) * L['halation']
    if L['bloom'] > 0:
        knee = np.maximum(lum - L['bloom_at'], 0)
        hot = x * (knee / (lum + 1e-4))[..., None]
        acc = np.zeros_like(x)
        for sig, wt in ((0.004, 0.45), (0.012, 0.30), (0.035, 0.17), (0.09, 0.08)):
            acc += blur(hot, w * sig) * wt
        x = x + acc * L['bloom']
    if L['streak'] > 0:
        hot = np.maximum(lum - 3.0, 0)[..., None] * np.array([0.35, 0.6, 1.0], np.float32)
        x = x + blur(hot, w * 0.05, 1.0, 0.0) * L['streak']

    if L['ca'] > 0 or L['distortion'] != 0:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        cx, cy = (w - 1) / 2, (h - 1) / 2
        nx, ny = (xx - cx) / cx, (yy - cy) / cx
        r2 = nx * nx + ny * ny
        base = 1 + L['distortion'] * r2
        out = np.empty_like(x)
        for c, k in enumerate((1 + L['ca'] * 2.2, 1.0, 1 - L['ca'] * 2.2)):
            s = base * (1 + (k - 1) * r2)
            out[..., c] = _sample(x[..., c], cx + nx * cx * s, cy + ny * cx * s)
        x = out
    if L['vignette'] > 0:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        r2 = ((xx - (w - 1) / 2) / (w / 2)) ** 2 + ((yy - (h - 1) / 2) / (w / 2)) ** 2
        x = x * (1 - L['vignette'] * np.clip(r2, 0, 1.4) ** 1.2 / 1.4)[..., None]

    if fade and fade[1] > 0:
        col = {'white': (4.0, 3.8, 3.5), 'black': (0, 0, 0)}.get(fade[0]) or hexcol(fade[0])
        a = np.float32(fade[1])
        x = x * (1 - a) + np.array(col, np.float32) * a

    d = encode(x, L['tonemap'])
    # grade (display space)
    if L['contrast'] != 1:
        d = np.clip(0.5 + (d - 0.42) * L['contrast'] + (0.42 - 0.5), 0, 1)
    dl = (d @ LUM)[..., None]
    if L['saturation'] != 1:
        d = dl + (d - dl) * L['saturation']
    if L['split'] > 0:
        sh = np.array(hexcol(L['shadows']), np.float32)
        hi = np.array(hexcol(L['highlights']), np.float32)
        sh, hi = sh / (sh @ LUM + 1e-4), hi / (hi @ LUM + 1e-4)
        ws = (1 - dl) ** 2.2
        wh = dl ** 1.6
        d = d * (1 + L['split'] * (ws * (sh - 1) + wh * (hi - 1)))
    d = d + np.array(L['lift'], np.float32)
    d = L['black'] + d * (1 - L['black'])
    d = np.clip(d, 0, 1)

    if L['grain'] > 0:
        rs = np.random.RandomState((int(frame) * 2654435761 + 12345) % 2 ** 32)
        gs = max(1.0, L['grain_size'] * px)
        gh, gw = int(np.ceil(h / gs)), int(np.ceil(w / gs))
        mono = resize(rs.standard_normal((gh, gw)).astype(np.float32), w, h, Image.BICUBIC)
        chroma = resize(rs.standard_normal((gh, gw, 3)).astype(np.float32), w, h, Image.BICUBIC)
        dl = (d @ LUM)[..., None]
        amp = L['grain'] * (0.35 + 0.65 * np.sqrt(np.clip(dl, 0, 1)) * (1.15 - 0.6 * dl)) * min(1.0, L['grain_size'] * px / gs)
        d = d + (mono[..., None] * 0.8 + chroma * 0.35) * amp
    d = np.clip(d, 0, 1)

    img = (d * 255.0 + 0.5).astype(np.uint8)
    if bars:
        bw = int(round(bars[0] * w / float(film_w or w)))
        bh = int(round(bars[1] * w / float(film_w or w)))
        if (bw, bh) != (w, h):
            canvas = np.zeros((bh, bw, 3), np.uint8)
            oy, ox = (bh - h) // 2, (bw - w) // 2
            canvas[oy:oy + h, ox:ox + w] = img
            img = canvas
    return img


def fade_for(shot, f):
    """The dip a shot asks for at frame f: fade_in=('white', 8) / fade_out=('black', 12) in film.py."""
    n = shot['frames']
    fi, fo = shot.get('fade_in'), shot.get('fade_out')
    best = None
    if fi and f <= fi[1]:
        a = 1 - (f - 1) / fi[1]
        best = (fi[0], a * a * (3 - 2 * a))
    if fo and f > n - fo[1]:
        a = (f - (n - fo[1])) / fo[1]
        a = a * a * (3 - 2 * a)
        if best is None or a > best[1]:
            best = (fo[0], a)
    return best


def stats(img8):
    """Numbers used by check.py and for comparing against a reference: luminance percentiles of the picture area."""
    a = img8.astype(np.float32) @ LUM
    rows = np.where(a.mean(1) > 1.5)[0]
    if len(rows):
        a = a[rows[0]:rows[-1] + 1]
    p = np.percentile(a, [5, 50, 95, 99.5])
    return dict(p5=float(p[0]), median=float(p[1]), p95=float(p[2]), p995=float(p[3]), mean=float(a.mean()))


def sharpness(img8):
    """How sharp the sharpest part of the frame is (Laplacian energy of the best tiles). A shot whose subject is
    out of focus scores low everywhere."""
    a = img8.astype(np.float32) @ LUM
    rows = np.where(a.mean(1) > 1.5)[0]
    if len(rows) > 16:
        a = a[rows[0]:rows[-1] + 1]
    a = blur(a, 1.0)                                                     # look past the grain
    lap = np.abs(4 * a[1:-1, 1:-1] - a[:-2, 1:-1] - a[2:, 1:-1] - a[1:-1, :-2] - a[1:-1, 2:])
    th, tw = max(8, lap.shape[0] // 12), max(8, lap.shape[1] // 20)
    tiles = [lap[y:y + th, x:x + tw].mean() for y in range(0, lap.shape[0] - th + 1, th)
             for x in range(0, lap.shape[1] - tw + 1, tw)]
    tiles.sort()
    return float(np.mean(tiles[-max(1, len(tiles) // 20):]))
