"""Things made for THIS room. The starter needs only pictures: the view outside, the laptop's pages, a print.
A real topic builds its own objects here from lr.geo.Part (see the worked example's props.py)."""
import math

from lr import draw


def view_outside(version, seed=3):
    """The one picture beyond the window: far towers, a middle row, near roofs. Returns (image, roof tops)."""
    night = version == 'night'                                     # the work-light views see the morning picture
    sky = [(0, '#070a14'), (0.62, '#141a2c'), (1, '#2a2430')] if night else [(0, '#8fa6c4'), (0.55, '#d9c4b8'), (1, '#f0d2b0')]
    lit = 0.22 if night else 0.02
    layers = [
        dict(base=0.74, h=(0.10, 0.34), w=(0.03, 0.07), color='#0d1220' if night else '#8d99ae', lit=lit * 0.7, win=['#ffd9a0', '#cfe0ff'],
             win_px=(3, 4, 5, 7), gap=0.25),
        dict(base=0.82, h=(0.06, 0.16), w=(0.05, 0.10), color='#111826' if night else '#77849a', lit=lit, win=['#ffcf8a', '#ffe9c4', '#bcd4ff'],
             win_px=(5, 6, 7, 10), gap=0.1),
        dict(base=1.0, h=(0.10, 0.20), w=(0.10, 0.22), color='#0a0d14' if night else '#586273', lit=lit * 1.2, win=['#ffc878', '#ffe2b0'],
             win_px=(9, 11, 14, 18), roof='#1c2430' if night else '#6b7686'),
    ]
    return draw.skyline((2048, 1152), sky, layers, seed=seed, glow=('#3a2a22', 0.8, 0.25) if night else ('#ffd8b0', 0.72, 0.3),
                        stars=120 if night else 0, haze=None if night else ('#e8d2c0', 0.35))


def laptop_pages():
    """What is on the screen: three pages it cycles through. Draw the screen of the person who lives here."""
    out = []
    for k in range(3):
        im, d = draw.new(640, 400, '#11151c')
        d.rectangle([0, 0, 640, 26], fill='#1c222c')
        draw.text(d, (12, 13), '초안 — 3장.txt', size=13, fill='#aeb7c4', anchor='lm')
        y = 46
        for i in range(13):
            w = 120 + (i * 97 + k * 53) % 380
            if i < 4 + k * 4:
                d.rectangle([24, y, 24 + w, y + 7], fill='#8d98a8')
            y += 24
        d.rectangle([24 + 60 * k, 46 + 24 * (4 + k * 4), 26 + 60 * k, 60 + 24 * (4 + k * 4)], fill='#e9c98f')
        out.append(im)
    return out


def print_art():
    im, d = draw.new(300, 400, '#e9e2d0')
    for i in range(7):
        a = i / 7 * math.tau
        d.ellipse([150 + 70 * math.cos(a) - 46, 190 + 70 * math.sin(a) - 46, 150 + 70 * math.cos(a) + 46, 190 + 70 * math.sin(a) + 46], outline='#2b4a5e', width=3)
    draw.text(d, (150, 360), '七', size=22, fill='#7a2a1e', anchor='mm')
    return im


def note_text(lines, color='#f6e36b', seed=0):
    im, d = draw.new(160, 160, color)
    for i, s in enumerate(lines):
        draw.scrawl((im, d), (12, 16 + i * 40), s, size=26, fill='#27304a', seed=seed + i)
    return im
