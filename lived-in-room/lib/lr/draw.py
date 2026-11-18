"""Pictures drawn in code with Pillow: everything in the room that carries type or an image — book spines, tape
labels, posters, pages, screens — and the one picture outside the window. No image files are read.

Type is where a guessed room gives itself away, so the conventions are in here:
  * a Korean (or Japanese / Chinese) spine is set VERTICALLY: glyphs upright, stacked top to bottom; Latin words and
    numbers inside it lie on their side, tops toward the back of the book ... `spine()` does both
  * a Latin spine reads top to bottom with letter tops toward the back cover (so it reads when the book lies face up)
Bundled face: ALF Sans (a KS X 1001 subset of Pretendard, OFL) — 2,350 Hangul syllables, Latin, digits.
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'ALFSans-ksx1001.woff2')
_fonts = {}


def font(size, weight=500, path=None):
    """The bundled variable face at a pixel size and weight (100-900). path = another .ttf/.otf/.woff2 of yours."""
    key = (path or FONT, int(size), int(weight))
    f = _fonts.get(key)
    if f is None:
        f = ImageFont.truetype(path or FONT, int(size))
        try:
            f.set_variation_by_axes([int(weight)])
        except Exception:
            pass
        _fonts[key] = f
    return f


def new(w, h, bg='#ffffff'):
    im = Image.new('RGB', (int(w), int(h)), bg)
    return im, ImageDraw.Draw(im)


def text(d, xy, s, size=24, fill='#111111', weight=500, anchor='la', path=None, spacing=4):
    d.text(xy, s, font=font(size, weight, path), fill=fill, anchor=anchor, spacing=spacing)


def width(s, size, weight=500):
    return font(size, weight).getlength(s)


def fit(s, max_w, size, weight=500, min_size=6):
    """Largest size ≤ `size` at which `s` is no wider than max_w pixels."""
    while size > min_size and width(s, size, weight) > max_w:
        size -= 1
    return size


def wrap(s, max_w, size, weight=500):
    """Break a line into lines no wider than max_w (by words; a Korean line breaks between words as well)."""
    out, cur = [], ''
    for word in s.split(' '):
        t = (cur + ' ' + word).strip()
        if cur and width(t, size, weight) > max_w:
            out.append(cur)
            cur = word
        else:
            cur = t
    if cur:
        out.append(cur)
    return out


def _is_cjk(ch):
    o = ord(ch)
    return 0xAC00 <= o <= 0xD7A3 or 0x3040 <= o <= 0x30FF or 0x4E00 <= o <= 0x9FFF or 0x3130 <= o <= 0x318F


def spine(title, w_px, h_px, bg='#2f4a3a', fg='#f1ead8', author='', publisher='', band=None, weight=600, margin=0.07):
    """A book spine, top of the picture = top of the book. Title starts near the top; the author sits under it,
    smaller; the publisher's name is at the foot. band = colour of a stripe across the head."""
    im, d = new(w_px, h_px, bg)
    m = int(h_px * margin)
    if band:
        d.rectangle([0, 0, w_px, int(h_px * 0.045)], fill=band)
    y = m
    foot = h_px - m
    if publisher:
        ps = max(7, int(w_px * 0.34))
        foot_h = _vertical(None, publisher, w_px, 0, ps, fg, 500)
        _vertical(d_im=(im, d), s=publisher, w=w_px, y=h_px - m - foot_h, size=ps, fill=fg, weight=500)
        foot = h_px - m - foot_h - int(h_px * 0.03)
    ts = int(w_px * 0.62)
    avail = foot - y
    a_h = 0
    asz = max(7, int(w_px * 0.36))
    if author:
        a_h = _vertical(None, author, w_px, 0, asz, fg, 400) + int(h_px * 0.025)
    while ts > 7 and _vertical(None, title, w_px, 0, ts, fg, weight) > avail - a_h:
        ts -= 1
    used = _vertical((im, d), title, w_px, y, ts, fg, weight)
    if author:
        _vertical((im, d), author, w_px, y + used + int(h_px * 0.025), asz, fg, 400)
    return im


def _vertical(d_im, s, w, y, size, fill, weight):
    """Set a string vertically in a column `w` wide starting at y. CJK glyphs stay upright; a run of Latin / digits
    is turned 90° clockwise. Returns the height used; d_im=None only measures."""
    runs, cur, kind = [], '', None
    for ch in s:
        k = 'c' if _is_cjk(ch) else 'l'
        if ch == ' ':
            k = kind or 'l'
        if k != kind and cur:
            runs.append((kind, cur))
            cur = ''
        kind = k
        cur += ch
    if cur:
        runs.append((kind, cur))
    f = font(size, weight)
    h = 0
    for k, run in runs:
        if k == 'c':
            for ch in run:
                if ch == ' ':
                    h += int(size * 0.35)
                    continue
                if d_im:
                    d_im[1].text((w / 2, y + h + size * 0.5), ch, font=f, fill=fill, anchor='mm')
                h += int(size * 1.04)
        else:
            run = run.strip()
            if not run:
                h += int(size * 0.3)
                continue
            lw = int(f.getlength(run)) + 2
            if d_im:
                tile = Image.new('RGBA', (lw, int(size * 1.3)), (0, 0, 0, 0))
                ImageDraw.Draw(tile).text((lw / 2, size * 0.62), run, font=f, fill=fill, anchor='mm')
                tile = tile.rotate(-90, expand=True)
                d_im[0].paste(tile, (int(w / 2 - tile.width / 2), int(y + h)), tile)
            h += lw + int(size * 0.15)
    return h


def scrawl(d, xy, s, size=20, fill='#1a2a5a', seed=0, weight=500, slant=4.0, jitter=0.06):
    """Hand-lettered text: each glyph a little off its line and its angle — a tape label, a sticky note, a date on
    masking tape. Draws onto the image behind `d` (pass (image, draw))."""
    im, _ = d
    rnd = random.Random(f'{s}/{seed}')
    x, y = xy
    f = font(size, weight)
    for ch in s:
        if ch == ' ':
            x += size * 0.3
            continue
        cw = int(f.getlength(ch)) + 4
        tile = Image.new('RGBA', (cw + 6, int(size * 1.5)), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text((3, size * 0.15), ch, font=f, fill=fill)
        tile = tile.rotate(rnd.uniform(-slant, slant), expand=False, resample=Image.BICUBIC)
        im.paste(tile, (int(x), int(y + rnd.uniform(-jitter, jitter) * size)), tile)
        x += (cw - 4) * rnd.uniform(0.94, 1.06)
    return x


def waveform(d, box, seed=0, fill='#6fd08c', bars=120, quiet=0.15):
    """An audio waveform in box = (x0, y0, x1, y1): the picture on a recorder's or editor's screen."""
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    mid, half = (y0 + y1) / 2, (y1 - y0) / 2
    env = 0.3
    for i in range(bars):
        env = max(quiet, min(1.0, env + rnd.uniform(-0.22, 0.22)))
        if rnd.random() < 0.06:
            env = rnd.uniform(0.7, 1.0)
        a = env * rnd.uniform(0.5, 1.0) * half
        x = x0 + (x1 - x0) * i / bars
        d.line([x, mid - a, x, mid + a], fill=fill, width=max(1, int((x1 - x0) / bars * 0.6)))


def grain(im, amount=6, seed=0):
    """A little sensor / paper noise so a drawn picture is not perfectly flat."""
    rnd = random.Random(seed)
    px = im.load()
    w, h = im.size
    for _ in range(int(w * h * 0.08)):
        x, y = rnd.randrange(w), rnd.randrange(h)
        p = px[x, y]
        dv = rnd.randint(-amount, amount)
        px[x, y] = tuple(max(0, min(255, c + dv)) for c in p[:3])
    return im


def _mix(a, b, t):
    return tuple(int(round(x + (y - x) * t)) for x, y in zip(a, b))


def _rgb(c):
    if isinstance(c, str):
        c = c.lstrip('#')
        return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
    return tuple(c)


def sky(w, h, stops):
    """Vertical gradient. stops = [(0.0, colour at the top), …, (1.0, colour at the bottom)]."""
    im = Image.new('RGB', (1, h))
    px = im.load()
    st = [(p, _rgb(c)) for p, c in stops]
    for y in range(h):
        t = y / max(1, h - 1)
        for (p0, c0), (p1, c1) in zip(st, st[1:]):
            if p0 <= t <= p1:
                px[0, y] = _mix(c0, c1, (t - p0) / max(1e-9, p1 - p0))
                break
    return im.resize((w, h))


def skyline(size, sky_stops, layers, seed=0, glow=None, stars=0, haze=None):
    """The one picture outside the window: a sky and rows of buildings, far to near. NOT a model — the city is a
    plate tens of metres beyond the glass (see Room.backdrop).

    layers (far → near), each a dict:
      base      0..1   height of the row's ground line in the picture (0 = top)
      h         (min, max) building height as a fraction of the picture height
      w         (min, max) building width as a fraction of the picture width
      color     wall colour;  roof = colour of a thin roof line (optional)
      lit       share of windows that are lit (0 at dawn);  win = lit window colours (list);  dark = unlit colour
      win_px    (w, h, gap_x, gap_y) window size and spacing in pixels
      gap       share of the row left empty between buildings
      extras    callback(draw, x0, y_roof, x1, rnd) to put a thing on a roof (a water tank, a cross, an antenna)
    Returns (image, tops) where tops = [(u, v, layer index, width u)] roof centres in picture fractions (v from the
    top), tallest first — put the blinking beacons on those."""
    w, h = size
    rnd = random.Random(seed)
    im = sky(w, h, sky_stops)
    d = ImageDraw.Draw(im)
    if stars:
        for _ in range(stars):
            x, y = rnd.randrange(w), int(rnd.random() ** 2 * h * 0.5)
            v = rnd.randint(90, 200)
            d.point((x, y), fill=(v, v, int(v * 0.95)))
    if glow:
        g = Image.new('RGB', (w, h), (0, 0, 0))
        gd = ImageDraw.Draw(g)
        gy = int(h * glow[1])
        gd.ellipse([-w * 0.2, gy - h * glow[2], w * 1.2, gy + h * glow[2]], fill=_rgb(glow[0]))
        g = g.filter(ImageFilter.GaussianBlur(h * 0.12))
        im = _screen(im, g)
        d = ImageDraw.Draw(im)
    tops = []
    for li, L in enumerate(layers):
        x = -rnd.random() * w * L['w'][1]
        base = int(h * L['base'])
        col = _rgb(L['color'])
        while x < w:
            bw = int(w * rnd.uniform(*L['w']))
            bh = int(h * rnd.uniform(*L['h']))
            if rnd.random() < L.get('gap', 0.0):
                x += bw * 0.6
                continue
            x0, x1, y0 = int(x), int(x + bw), base - bh
            shade = rnd.uniform(0.85, 1.12)
            d.rectangle([x0, y0, x1, h], fill=tuple(max(0, min(255, int(c * shade))) for c in col))
            if L.get('roof'):
                d.rectangle([x0, y0, x1, y0 + max(1, int(h * 0.004))], fill=_rgb(L['roof']))
            ww, wh, gx, gy = L.get('win_px', (3, 4, 4, 6))
            if ww:
                wy = y0 + gy
                lit = L.get('lit', 0.0) * rnd.uniform(0.4, 1.6)
                while wy + wh < min(base + int(h * 0.2), h):
                    wx = x0 + gx
                    while wx + ww < x1 - gx / 2:
                        if rnd.random() < lit:
                            d.rectangle([wx, wy, wx + ww, wy + wh], fill=_rgb(rnd.choice(L.get('win', ['#ffd9a0']))))
                        elif L.get('dark'):
                            d.rectangle([wx, wy, wx + ww, wy + wh], fill=_rgb(L['dark']))
                        wx += ww + gx
                    wy += wh + gy
            if L.get('extras'):
                L['extras'](d, x0, y0, x1, rnd)
            tops.append(((x0 + x1) / 2 / w, y0 / h, li, bw / w, bh / h))
            x += bw + int(w * rnd.uniform(0, 0.01))
        if haze:
            hz = Image.new('RGB', (w, h), _rgb(haze[0]))
            m = Image.new('L', (w, h), 0)
            md = ImageDraw.Draw(m)
            a = int(255 * haze[1] * (1 - li / max(1, len(layers) - 1)))
            md.rectangle([0, 0, w, h], fill=a)
            im = Image.composite(hz, im, m)
            d = ImageDraw.Draw(im)
    tops = [t for t in tops if 0.02 < t[0] < 0.98]
    tops.sort(key=lambda t: t[1])
    return im, tops


def _screen(a, b):
    from PIL import ImageChops
    return ImageChops.screen(a, b)
