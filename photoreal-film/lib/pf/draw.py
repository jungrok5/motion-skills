"""Images drawn in Python (Pillow) for use as textures: engraved scales, dials, labels, printed matter.
They are generated at build time into out/tex/ — a film still ships no image files."""
import os

from PIL import Image, ImageDraw, ImageFont

FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
FONT = os.path.join(FONTS, 'Inter-Medium.otf')
FONT_TITLE = os.path.join(FONTS, 'InterDisplay-SemiBold.otf')


def canvas(w, h, bg=(0, 0, 0)):
    """→ (image, draw). Black background = "no marking" for mat.engraved()."""
    im = Image.new('RGB', (w, h), bg)
    return im, ImageDraw.Draw(im)


def font(size, path=None):
    return ImageFont.truetype(path or FONT, size)


def text(d, xy, s, size, fill=(255, 255, 255), path=None, tracking=0.0, anchor='mm'):
    """Text centred on xy (anchor as in Pillow). tracking = extra space between letters in em."""
    f = font(size, path)
    if not tracking:
        d.text(xy, s, font=f, fill=fill, anchor=anchor)
        return
    widths = [d.textlength(ch, font=f) for ch in s]
    gap = tracking * size
    total = sum(widths) + gap * (len(s) - 1)
    x = xy[0] - total / 2 if anchor[0] == 'm' else xy[0] - (total if anchor[0] == 'r' else 0)
    for ch, w in zip(s, widths):
        d.text((x, xy[1]), ch, font=f, fill=fill, anchor='l' + anchor[1])
        x += w + gap


def ticks(d, x0, x1, n, y0, y1, width=3, fill=(255, 255, 255), every=None, y_long=None):
    """n+1 evenly spaced tick marks between x0 and x1; every k-th one reaches y_long."""
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        yb = y_long if (every and i % every == 0 and y_long is not None) else y1
        d.line([(x, y0), (x, yb)], fill=fill, width=width)


def save(shot, name, im):
    """Write the image under the project's out/tex/ and return the path (give it to mat.engraved / mat.picture)."""
    p = shot.film.out('tex', f'{shot.id}_{name}.png')
    im.save(p)
    return p
