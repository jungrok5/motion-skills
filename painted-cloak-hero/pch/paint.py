"""Hand-painted textures: every painted material is a texture of brush strokes drawn with numpy, laid out in the
piece's own UV space at a fixed size in metres, so a stroke is the same size on the cloak, the hat and the sleeve,
and it is glued to the surface (it moves with the cloth; nothing depends on the camera).

Source step 4: "the cloak gets painted strokes, 'hand-painted blue, visible brush marks'".

A paint spec (in any material: "paint": {...} or "paint": true):
  tones     [dark, mid, light, ...] hex colours, painted dark -> light (later strokes on top). Default: made from the
            material colour (a cooler, darker shade; the colour; a lighter, warmer tint).
  weights   share of strokes per tone (default dark .28, mid .42, light .30)
  base      index of the tone under all strokes (default 1)
  len       [min, max] stroke length in metres (default [.07, .2])
  width     [min, max] stroke width in metres (default [.022, .045])
  angle     stroke direction in UV, degrees: 90 = along v (down a cloak / round a brim's radius), 0 = along u
  jitter    random spread of the angle, degrees (default 14)
  cover     how many strokes: coverage factor (1 = about one stroke deep everywhere, default 1.6)
  bristle   0..1 visible bristle streaks inside a stroke (default .5)
  lightBias -1..1: light strokes gather toward v = 1 (+) or v = 0 (-) (default 0)
  fringe    {"depth": m, "teeth": m, "edge": "v0" | "v1"}: ragged, alpha-cut edge (a frayed hem, a straw brim)
  seed      int
Units: the part builder measures metres per UV unit on the mesh (uv_scale) and the texture is sized from that.
"""
import colorsys
import math
import numpy as np

PX_PER_M = 520          # texture density (a 1.1 m cloak is ~570 px tall)
MAX_PX = 2048


def hex_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def auto_tones(col):
    """dark / mid / light from one colour: shadows cooler and deeper, lights warmer and paler (a painter's palette)."""
    r, g, b = hex_rgb(col)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    dk = 0.62 + 0.27 * max(0.0, (l - 0.55) / 0.45)        # pale cloth gets softer shadows (no dirty blotches)
    dark = colorsys.hls_to_rgb((h + 0.02) % 1, l * dk, min(1, s * 1.08))
    cool = (0.38, 0.38, 0.56)                            # shadows lean cool (grey-violet), most on pale cloth
    mixk = 0.12 + 0.42 * max(0.0, (l - 0.55) / 0.45)
    dark = tuple(d * (1 - mixk) + c * l * mixk * 1.25 for d, c in zip(dark, cool))
    lf = 0.16 + 0.22 * min(1.0, l / 0.5)                  # dark cloth gets subtle lights, not pale streaks
    light = colorsys.hls_to_rgb((h - 0.025) % 1, min(0.92, l + (1 - l) * lf), s * 0.92)
    return [dark, (r, g, b), light]


def _smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def uv_scale(me):
    """Metres per UV unit along u and along v, measured on the mesh (least squares over every face edge)."""
    uvl = me.uv_layers.active
    if uvl is None:
        return (1.0, 1.0)
    su_n = su_d = sv_n = sv_d = 0.0
    for poly in me.polygons:
        idx = list(poly.loop_indices)
        for a, b in zip(idx, idx[1:] + idx[:1]):
            pa, pb = me.vertices[me.loops[a].vertex_index].co, me.vertices[me.loops[b].vertex_index].co
            ua, ub = uvl.data[a].uv, uvl.data[b].uv
            du, dv = abs(ub.x - ua.x), abs(ub.y - ua.y)
            L = (pb - pa).length
            if du > 4 * dv and du > 1e-6:
                su_n += L * du
                su_d += du * du
            elif dv > 4 * du and dv > 1e-6:
                sv_n += L * dv
                sv_d += dv * dv
    su = su_n / su_d if su_d else 1.0
    sv = sv_n / sv_d if sv_d else su
    return (su, sv)


def draw(spec, color, scale):
    """-> (H, W, 4) float32 sRGB + alpha. scale = (metres per u, metres per v)."""
    if spec is True:
        spec = {}
    rng = np.random.default_rng(int(spec.get('seed', 11)))
    su, sv = scale
    W = int(min(MAX_PX, max(64, round(su * PX_PER_M))))
    H = int(min(MAX_PX, max(64, round(sv * PX_PER_M))))
    ppm_u, ppm_v = W / su, H / sv           # pixels per metre along u, v (equal unless clamped)
    tones = [hex_rgb(t) for t in spec['tones']] if spec.get('tones') else auto_tones(color)
    nt = len(tones)
    pale = colorsys.rgb_to_hls(*hex_rgb(color))[1] > 0.72 and not spec.get('tones')
    wts = spec.get('weights') or (([0.1, 0.52, 0.38] if pale else [0.28, 0.42, 0.30]) if nt == 3 else [1 / nt] * nt)
    wts = np.array(wts[:nt], float)
    wts /= wts.sum()
    canvas = np.empty((H, W, 3), np.float32)
    canvas[:] = tones[int(spec.get('base', min(1, nt - 1)))]
    lmin, lmax = spec.get('len', [0.07, 0.2])
    wmin, wmax = spec.get('width', [0.022, 0.045])
    ks = max(0.2, min(1.0, math.sqrt(su * sv) / 0.3))     # small pieces (a cuff, a hand) get a smaller brush
    lmin, lmax, wmin, wmax = lmin * ks, lmax * ks, wmin * ks, wmax * ks
    ang0 = math.radians(float(spec.get('angle', 90)))
    jit = math.radians(float(spec.get('jitter', 14)))
    bristle = float(spec.get('bristle', 0.5))
    lb = float(spec.get('lightBias', 0.0))
    area = su * sv
    mean_a = ((lmin + lmax) / 2) * ((wmin + wmax) / 2)
    n = int(float(spec.get('cover', 1.6)) * area / max(mean_a, 1e-6))
    n = max(8, min(n, 9000))
    strokes = []
    for _ in range(n):
        t = int(rng.choice(nt, p=wts))
        v = rng.uniform(0, 1)
        if lb and t == nt - 1 and rng.uniform() < abs(lb):
            v = rng.uniform(0.45, 1) if lb > 0 else rng.uniform(0, 0.55)
        strokes.append((t, rng.uniform(0, 1), v, rng.uniform(lmin, lmax), rng.uniform(wmin, wmax),
                        ang0 + rng.normal(0, jit), rng.uniform(0.82, 1.0), rng.uniform(0, 1000), rng.uniform(0.94, 1.06)))
    strokes.sort(key=lambda s: s[0])          # dark first, light on top
    for (t, u, v, L, Wd, ang, op, ph, val) in strokes:
        cx, cy = u * W, v * H
        dx, dy = math.cos(ang), math.sin(ang)          # stroke direction in metres (u, v)
        Lp, Wp = L * ppm_u, Wd * ppm_u
        half = int(math.ceil((L / 2 + Wd) * max(ppm_u, ppm_v))) + 2
        x0, x1 = int(cx) - half, int(cx) + half
        y0, y1 = max(0, int(cy) - half), min(H, int(cy) + half)
        if y1 <= y0:
            continue
        xs = np.arange(x0, x1)
        ys = np.arange(y0, y1)
        X, Y = np.meshgrid(xs, ys)
        mx = (X + 0.5 - cx) / ppm_u
        my = (Y + 0.5 - cy) / ppm_v
        s = mx * dx + my * dy                # along the stroke, metres
        q = -mx * dy + my * dx               # across
        sn = s / (L / 2)                     # -1 .. 1
        qn = q / (Wd / 2)
        # ragged edges: the half-width wobbles along the stroke
        wob = 1 + 0.16 * np.sin(sn * 4.3 + ph) + 0.08 * np.sin(sn * 11.1 + ph * 1.7)
        taper = 1 - 0.35 * np.clip(sn, 0, 1) ** 2            # the stroke thins as the brush lifts
        side = 1 - _smooth(0.6, 1.0, np.abs(qn) / (wob * taper))
        # head: round and loaded; tail: dry brush that breaks into bristles
        head = _smooth(-1.0, -0.7, sn - 0.25 * (np.abs(qn)) ** 2)
        br = 0.5 + 0.5 * np.sin(qn * (9 + 3 * math.sin(ph)) + ph) * np.sin(qn * 23 + ph * 0.3)
        tail = np.where(sn < 0.35, 1.0, _smooth(0.0, 0.25, br - (sn - 0.35) / 0.65 * 0.9 + 0.12))
        a = np.clip(side * head * tail * op, 0, 1)
        if not a.any():
            continue
        col = np.array(tones[t], np.float32) * val
        shade = (1 + bristle * 0.09 * (br - 0.5))[..., None]
        c = np.clip(col[None, None, :] * shade, 0, 1)
        xi = np.mod(xs, W)                   # wrap round u (seamless on a lathe)
        sub = canvas[y0:y1][:, xi]
        sub = sub * (1 - a[..., None]) + c * a[..., None]
        canvas[y0:y1, xi] = sub
    alpha = np.ones((H, W), np.float32)
    fr = spec.get('fringe')
    if fr:
        depth = float(fr.get('depth', 0.05))
        tooth = float(fr.get('teeth', 0.035))
        edge = fr.get('edge', 'v0')
        u = 0.0
        while u < su:
            w = tooth * rng.uniform(0.55, 1.5)
            d = depth * rng.uniform(0.25, 1.0)
            ua, ub = int(u * ppm_u), int(min(su, u + w) * ppm_u)
            if ub > ua:
                xs = np.arange(ua, ub)
                k = np.abs((xs + 0.5 - (ua + ub) / 2) / max(1, (ub - ua) / 2))
                cut = d * (0.35 + 0.65 * k ** 1.3)              # pointed tooth: shortest in its middle
                cut_px = (cut * ppm_v).astype(int)
                for x, cp in zip(xs, cut_px):
                    if edge == 'v0':
                        alpha[:cp, x % W] = 0
                    else:
                        alpha[H - cp:, x % W] = 0
            u += w
    out = np.empty((H, W, 4), np.float32)
    out[..., :3] = canvas
    out[..., 3] = alpha
    return out
