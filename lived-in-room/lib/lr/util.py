"""Small deterministic helpers: easing, seeded noise, colour. No bpy here."""
import math
import random

TAU = math.tau


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def lerp(a, b, t):
    if isinstance(a, (tuple, list)):
        return tuple(lerp(x, y, t) for x, y in zip(a, b))
    return a + (b - a) * t


def remap(x, a, b, c=0.0, d=1.0, clip=True):
    t = (x - a) / (b - a) if b != a else 0.0
    if clip:
        t = clamp(t)
    return c + (d - c) * t


# ---- easing: all take t in 0..1 and return 0..1 -------------------------------------------------
def linear(t):
    return clamp(t)


def smooth(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def smoother(t):
    t = clamp(t)
    return t * t * t * (t * (t * 6 - 15) + 10)


def ease_in(t, p=3):
    return clamp(t) ** p


def ease_out(t, p=3):
    return 1 - (1 - clamp(t)) ** p


def ease_in_out(t, p=3):
    t = clamp(t)
    return 0.5 * (2 * t) ** p if t < 0.5 else 1 - 0.5 * (2 - 2 * t) ** p


def expo_out(t):
    t = clamp(t)
    return 1.0 if t >= 1 else 1 - 2 ** (-10 * t)


def expo_in(t):
    t = clamp(t)
    return 0.0 if t <= 0 else 2 ** (10 * (t - 1))


def back_out(t, s=1.4):
    """Overshoots a little, then settles: parts that click into place."""
    t = clamp(t) - 1
    return t * t * ((s + 1) * t + s) + 1


def spring(t, freq=3.0, damp=6.0):
    """Damped settle: 0 → 1 with a small ring. For a part that seats itself."""
    t = clamp(t)
    return 1 - math.exp(-damp * t) * math.cos(TAU * freq * t * 0.5) if t < 1 else 1.0


def seg(f, f0, f1, ease=smooth):
    """Progress of frame f through [f0, f1], eased. The building block of every move."""
    if f1 == f0:
        return 1.0 if f >= f1 else 0.0
    return ease((f - f0) / (f1 - f0))


def pulse(f, f0, f1, f2, f3):
    """0 → 1 over [f0, f1], hold, 1 → 0 over [f2, f3]."""
    return min(seg(f, f0, f1), 1 - seg(f, f2, f3))


# ---- seeded randomness ------------------------------------------------------------------------
def rng(seed):
    """A random.Random that depends only on the seed (any hashable)."""
    return random.Random(str(seed))


def _h(i, seed):
    x = math.sin(i * 127.1 + seed * 311.7) * 43758.5453123
    return x - math.floor(x)


def noise1(x, seed=0.0):
    """Smooth value noise in -1..1, a pure function of x (use x = frame * speed)."""
    i = math.floor(x)
    f = x - i
    u = f * f * (3 - 2 * f)
    return (_h(i, seed) * (1 - u) + _h(i + 1, seed) * u) * 2 - 1


def fbm1(x, seed=0.0, octaves=3):
    a, s, tot = 0.0, 1.0, 0.0
    for o in range(octaves):
        a += noise1(x * 2 ** o, seed + o * 17.0) * s
        tot += s
        s *= 0.5
    return a / tot


# ---- colour -----------------------------------------------------------------------------------
def srgb(c):
    """sRGB 0..1 component → linear."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexcol(h, alpha=None):
    """'#e8a04a' (sRGB) → linear (r, g, b) or (r, g, b, a). Every colour in a film is written like this."""
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(ch * 2 for ch in h)
    rgb = tuple(srgb(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))
    return rgb if alpha is None else rgb + (alpha,)


def rgba(c, a=1.0):
    if isinstance(c, str):
        return hexcol(c, a)
    c = tuple(c)
    return c if len(c) == 4 else c + (a,)


def kelvin(K):
    """Colour temperature → linear RGB, normalised so the brightest channel is 1 (Tanner Helland's fit)."""
    t = K / 100.0
    if t <= 66:
        r = 255
        g = 99.4708025861 * math.log(t) - 161.1195681661
        b = 0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307
    else:
        r = 329.698727446 * (t - 60) ** -0.1332047592
        g = 288.1221695283 * (t - 60) ** -0.0755148492
        b = 255
    c = [srgb(clamp(v / 255)) for v in (r, g, b)]
    m = max(c)
    return tuple(v / m for v in c)
