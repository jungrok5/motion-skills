"""Things made for THIS room — a rooftop room in Seoul whose tenant records the neighbourhood on cassette.
Sizes are the researched ones (RESEARCH.md ids in brackets). Built from lr.geo.Part; nothing is imported."""
import math
import random

from PIL import Image, ImageDraw, ImageFilter

from lr import draw, mat
from lr.geo import Part

TAU = math.tau
CASE = (0.0168, 0.0696, 0.109)        # Norelco cassette case, outside [cassette]
SHELL = (0.1016, 0.0635, 0.0127)      # the cassette itself at its largest [cassette]

SOUNDS = ['두부 트럭 06:10', '옥상 빗소리', '인쇄 골목', '새벽 첫차', '세탁소 스팀', '시장 호객', '약수터 물', '철물점 셔터', '골목 고양이', '교회 종 11시',
          '놀이터 그네', '보일러 점화', '재개발 펜스', '분식집 튀김', '이발소 라디오', '지하철 환풍구', '눈 밟는 소리', '한강 다리 밑', '빨래 터는 소리',
          '공사장 항타', '야시장', '버스 뒷문', '우체부 오토바이', '옥탑 바람', '물탱크 채우는 소리', '김장하는 날', '장마 첫날', '태풍 전날', '매미 7월',
          '귀뚜라미 9월', '소방차 멀리', '수능 날 아침', '정전된 밤', '눈 오는 새벽', '이삿날', '첫눈', '동지', '설날 골목', '개 짖는 소리', '빈 교실']
JCARD = ['#efe7d2', '#f1ece0', '#e6dcc3', '#d9e2e6', '#f0d9c8', '#e8e2b8', '#dfe6d5', '#f3f0e8', '#c9d5e2', '#f2c9b0', '#1d1e22', '#b33a2c']


# ---- pictures --------------------------------------------------------------------------------------
def tape_atlas(n, seed, typed=0.15, first=0, total=190):
    """One picture holding n cassette-case spines side by side (each 32 × 208 px): a paper J-card with a date and
    a hand-written title, running top to bottom. Blanks are bought by the box, so card colours come in runs; the
    tapes are racked in the order recorded, so the years climb from 2019 to 2026 along the rows (`first` = how many
    tapes come before this row, of `total`). Returns (material, [uv rect per spine])."""
    rnd = random.Random(f'tapes/{seed}')
    w, h = 32, 208
    im = Image.new('RGB', (w * n, h), '#efe7d2')
    bg, run = None, 0
    for i in range(n):
        if run <= 0:
            bg = rnd.choice([c for c in JCARD if c != bg])
            run = rnd.randint(7, 13)
        run -= 1
        dark = bg in ('#1d1e22', '#b33a2c')
        cell = Image.new('RGB', (h, w), bg)                           # drawn lying down, then turned
        d = ImageDraw.Draw(cell)
        ink = '#e9e4d6' if dark else rnd.choice(['#1b2a4a', '#222222', '#3a2a22'])
        when = 2019 + 7.9 * (first + i) / max(1, total)
        draw.text(d, (6, w / 2), f"'{int(when) % 100:02d}.{1 + int((when % 1) * 12):02d}", size=11, fill=ink, anchor='lm', weight=500)
        title = rnd.choice(SOUNDS)
        if rnd.random() < typed:
            draw.text(d, (52, w / 2), title, size=15, fill=ink, anchor='lm', weight=600)
        else:
            draw.scrawl((cell, d), (50, 4), title, size=16, fill=ink, seed=seed * 100 + i, slant=5)
        im.paste(cell.rotate(-90, expand=True), (i * w, 0))           # reads top → bottom, letter tops to the right
        ImageDraw.Draw(im).line([i * w, 0, i * w, h], fill='#8d8778')
    m = mat.picture(f'tape spines {seed}', im, rough=0.28, coat=0.6)
    return m, [(i / n + 0.002, 0.0, (i + 1) / n - 0.002, 1.0) for i in range(n)]


def jcard(title, sub, bg='#efe7d2', ink='#1b2a4a', seed=0):
    """The front of a cassette case, seen when it lies flat: 436 × 278 px for 109 × 69.6 mm."""
    im, d = draw.new(436, 278, bg)
    d.rectangle([0, 0, 436, 40], fill=ink)
    draw.text(d, (14, 20), 'SIDE A / B   NORMAL POSITION', size=13, fill=bg, anchor='lm', weight=600)
    draw.scrawl((im, d), (22, 78), title, size=44, fill=ink, seed=seed)
    draw.scrawl((im, d), (24, 170), sub, size=26, fill=ink, seed=seed + 7)
    for i in range(6):
        d.line([24, 232 + i * 7, 412, 232 + i * 7], fill='#b9b09a')
    return im


def shell_label(title, seed=0, body='#2a2b2f'):
    """A bare cassette from above: 406 × 254 px for 101.6 × 63.5 mm — label, window, two hubs."""
    im, d = draw.new(406, 254, body)
    d.rounded_rectangle([22, 18, 384, 150], 8, fill='#ebe4d0')
    draw.scrawl((im, d), (36, 28), title, size=30, fill='#1b2a4a', seed=seed)
    d.rounded_rectangle([110, 86, 296, 138], 6, fill='#17181b')
    for cx in (150, 256):
        d.ellipse([cx - 22, 90, cx + 22, 134], fill='#d8d2c2')
        d.ellipse([cx - 9, 103, cx + 9, 121], fill='#17181b')
    d.polygon([(60, 254), (90, 186), (316, 186), (346, 254)], fill='#1b1c1f')
    for x in (120, 170, 236, 286):
        d.ellipse([x - 7, 214, x + 7, 228], fill='#0c0c0d')
    return im


def monitor_pages(n=8):
    """The tenant's screen: tonight's tape being played into the computer. ONE view that advances — the playhead a
    step further, the counter a second on, the level bars different — not pages changing by themselves."""
    out = []
    for k in range(n):
        im, d = draw.new(1060, 600, '#0f1318')
        d.rectangle([0, 0, 1060, 34], fill='#1a2028')
        draw.text(d, (16, 17), '옥상 빗소리 — A면.wav', size=17, fill='#b8c2cf', anchor='lm', weight=600)
        draw.text(d, (1044, 17), '02:14', size=16, fill='#7d8896', anchor='rm')
        px = 560 + k * 9
        for j, (y, sd) in enumerate(((70, 4), (250, 9))):
            d.rectangle([16, y, 1044, y + 150], fill='#141a21')
            draw.waveform(d, (24, y + 8, 1036, y + 142), seed=sd, fill='#69c98a', bars=220)
            d.rectangle([px, y, 1044, y + 150], fill='#11161c')                      # not played yet
            draw.text(d, (22, y + 4), 'L' if j == 0 else 'R', size=14, fill='#5d6875')
        d.line([px, 60, px, 410], fill='#e9c98f', width=2)
        rnd = random.Random(k * 7 + 3)
        for i in range(26):
            d.rectangle([24 + i * 39, 540 - (14 + rnd.randint(0, 80)), 24 + i * 39 + 30, 540], fill='#2c6f8f' if i % 5 else '#e9c98f')
        draw.text(d, (24, 566), f'테이프 → 파일   녹음 중 00:{17 + k // 2:02d}:{(41 + k) % 60:02d}   44.1 kHz   돌비 끔', size=16, fill='#8d98a6', anchor='lm')
        d.ellipse([1010, 556, 1030, 576], fill='#c8412f')
        out.append(im)
    return out


def keys_picture(w=726, h=280, body='#2a2b2e', cap='#3a3c40', legend='#b9bcc2'):
    im, d = draw.new(w, h, body)
    rows = [15, 15, 14, 13, 12, 9]
    for r_, n in enumerate(rows):
        kw = (w - 20) / 17
        y = 12 + r_ * (h - 24) / 6
        for i in range(n):
            x = 10 + i * kw * (17 / (n + (2 if r_ != 5 else 6))) * 1.08
            ww = kw * (0.9 if not (r_ == 5 and i == 3) else 5.4)
            d.rounded_rectangle([x, y, x + ww, y + (h - 24) / 6 - 5], 4, fill=cap)
            d.rectangle([x + ww / 2 - 3, y + 9, x + ww / 2 + 3, y + 12], fill=legend)
    return im


def panel(w, h, kind, seed=0):
    """Front / top panels of the machines: drawn, because a guessed machine face is the first thing a tape person
    would call out. kind: 'deck' | 'recorder' | 'mixer' | 'radio' | 'speaker' | 'heater' | 'thermostat' | 'breaker'."""
    rnd = random.Random(f'{kind}/{seed}')
    if kind == 'deck':
        im, d = draw.new(w, h, '#1b1c1f')
        d.rounded_rectangle([int(w * .06), int(h * .16), int(w * .40), int(h * .86)], 6, fill='#0c0d0f', outline='#3a3c40')
        d.rounded_rectangle([int(w * .12), int(h * .30), int(w * .34), int(h * .66)], 4, fill='#1f2125')
        for cx in (.18, .28):
            d.ellipse([w * cx - h * .07, h * .41, w * cx + h * .07, h * .55], fill='#d8d2c2')
        d.rectangle([int(w * .46), int(h * .2), int(w * .70), int(h * .52)], fill='#0a0b0c', outline='#3a3c40')
        for i in range(8):
            d.rectangle([w * .47 + i * w * .028, h * .56, w * .47 + i * w * .028 + w * .02, h * .62], fill='#2b2d31')
        for i, cx in enumerate((.78, .86, .93)):
            d.ellipse([w * cx - h * .09, h * .28, w * cx + h * .09, h * .46], fill='#2a2c30', outline='#55585e')
            d.line([w * cx, h * .37, w * cx + h * .05 * math.cos(1 + i), h * .37 - h * .05 * math.sin(1 + i)], fill='#d9d9d9', width=2)
        for i in range(6):
            d.rounded_rectangle([w * .46 + i * w * .085, h * .72, w * .46 + i * w * .085 + w * .07, h * .86], 3, fill='#303236')
        draw.text(d, (w * .06, h * .08), 'STEREO CASSETTE DECK', size=int(h * .07), fill='#9b9fa6', anchor='lm', weight=600)
        return im
    if kind == 'recorder':
        im, d = draw.new(w, h, '#25272b')
        d.rounded_rectangle([int(w * .05), int(h * .10), int(w * .52), int(h * .68)], 8, fill='#0d0e10', outline='#44474d')
        d.rounded_rectangle([int(w * .12), int(h * .22), int(w * .45), int(h * .52)], 5, fill='#ebe4d0')
        for cx in (.21, .36):
            d.ellipse([w * cx - h * .08, h * .29, w * cx + h * .08, h * .45], fill='#2a2b2f')
        for j in range(2):
            x0 = w * (.58 + j * .2)
            d.rounded_rectangle([x0, h * .12, x0 + w * .17, h * .42], 4, fill='#e8dfc4')
            d.line([x0 + w * .085, h * .40, x0 + w * (.05 + .05 * j), h * .18], fill='#7a1f18', width=2)
        for i in range(5):
            d.rounded_rectangle([w * .06 + i * w * .095, h * .76, w * .06 + i * w * .095 + w * .08, h * .93], 3,
                                fill='#b33a2c' if i == 0 else '#3a3c40')
        for i, cx in enumerate((.66, .78, .9)):
            d.ellipse([w * cx - h * .09, h * .56, w * cx + h * .09, h * .74], fill='#17181a', outline='#5a5d63')
        return im
    if kind == 'mixer':
        im, d = draw.new(w, h, '#2b2d31')
        for c in range(6):
            x = w * (.07 + c * .14)
            for r_ in range(3):
                col = ['#c8412f', '#2f6f8a', '#d9a72b'][r_]
                d.ellipse([x - w * .03, h * (.10 + r_ * .13) - w * .03, x + w * .03, h * (.10 + r_ * .13) + w * .03], fill=col)
            d.rectangle([x - w * .008, h * .5, x + w * .008, h * .92], fill='#101113')
            fy = h * (.55 + rnd.random() * .3)
            d.rounded_rectangle([x - w * .035, fy - h * .03, x + w * .035, fy + h * .03], 3, fill='#d9d5cc')
        return im
    if kind == 'radio':
        im, d = draw.new(w, h, '#3a2d22')
        for y in range(int(h * .12), int(h * .88), 7):
            d.line([w * .05, y, w * .56, y], fill='#1c1510', width=3)
        d.rectangle([int(w * .62), int(h * .16), int(w * .95), int(h * .46)], fill='#e8dfc4')
        for i in range(9):
            d.line([w * .64 + i * w * .036, h * .2, w * .64 + i * w * .036, h * .32], fill='#3a2d22', width=2)
        d.line([w * .81, h * .17, w * .81, h * .45], fill='#b33a2c', width=3)
        for cx in (.70, .88):
            d.ellipse([w * cx - h * .13, h * .56, w * cx + h * .13, h * .82], fill='#c9b98a', outline='#6b5a3a', width=3)
        draw.text(d, (w * .62, h * .09), 'AM   FM', size=int(h * .07), fill='#c9b98a', anchor='lm', weight=600)
        return im
    if kind == 'speaker':
        im, d = draw.new(w, h, '#1c1c1e')
        d.ellipse([w * .5 - w * .36, h * .42, w * .5 + w * .36, h * .42 + w * .72], fill='#0c0c0d', outline='#35363a', width=4)
        d.ellipse([w * .5 - w * .12, h * .42 + w * .24, w * .5 + w * .12, h * .42 + w * .48], fill='#232427')
        d.ellipse([w * .5 - w * .12, h * .10, w * .5 + w * .12, h * .10 + w * .24], fill='#0c0c0d', outline='#35363a', width=3)
        return im
    if kind == 'thermostat':
        im, d = draw.new(w, h, '#efede6')
        d.rounded_rectangle([int(w * .14), int(h * .12), int(w * .86), int(h * .52)], 6, fill='#9fb09a')
        draw.text(d, (w * .5, h * .32), '21.5', size=int(h * .22), fill='#1c2a1c', anchor='mm', weight=700)
        draw.text(d, (w * .5, h * .46), '실내  난방', size=int(h * .06), fill='#2c3a2c', anchor='mm')
        for i, s in enumerate(('전원', '외출', '예약')):
            d.rounded_rectangle([w * (.14 + i * .25), h * .66, w * (.14 + i * .25) + w * .2, h * .84], 5, fill='#d9d6cc')
            draw.text(d, (w * (.24 + i * .25), h * .75), s, size=int(h * .07), fill='#4a4a48', anchor='mm')
        return im
    if kind == 'breaker':
        im, d = draw.new(w, h, '#e9e7e0')
        d.rectangle([4, 4, w - 5, h - 5], outline='#bdbab0', width=3)
        draw.text(d, (w * .5, h * .14), '세대 분전반', size=int(h * .08), fill='#77756c', anchor='mm', weight=600)
        d.rounded_rectangle([int(w * .86), int(h * .46), int(w * .93), int(h * .58)], 4, fill='#bdbab0')
        return im
    raise ValueError(kind)


def sound_map(seed=5):
    """The hero print: a hand-drawn map of the neighbourhood, one pin for every tape. 600 × 840 px.
    Returns (image, pins) with pins as (u, v) picture fractions (v from the top) for the real pin heads."""
    rnd = random.Random(seed)
    im, d = draw.new(600, 840, '#f6f0df')
    for i in range(9):                                                # streets
        y = 70 + i * 86 + rnd.randint(-14, 14)
        d.line([20, y, 580, y + rnd.randint(-30, 30)], fill='#b3a684', width=rnd.choice((3, 5, 9)))
    for i in range(7):
        x = 50 + i * 84 + rnd.randint(-12, 12)
        d.line([x, 60, x + rnd.randint(-40, 40), 800], fill='#b3a684', width=rnd.choice((3, 5)))
    d.line([20, 640, 250, 700, 420, 660, 580, 760], fill='#7fa9bb', width=16)      # the stream
    pins = []
    for _ in range(34):
        x, y = rnd.randint(40, 560), rnd.randint(90, 780)
        d.line([x, y, x - 3, y + 9], fill='#6b6456', width=2)                       # the pin's shadow
        pins.append((x / 600, y / 840))
    draw.scrawl((im, d), (30, 14), '우리 동네 소리 지도', size=34, fill='#27304a', seed=seed)
    draw.scrawl((im, d), (380, 806), '2019 — 2026', size=20, fill='#27304a', seed=seed + 1)
    return im, pins


def sound_board(w=0.5, h=0.7, name='sound map'):
    """The map on a cork board with real pins (plaster on block takes no pins): back on y = 0, origin at the top
    centre of its back, for r.hang()."""
    img, pins = sound_map()
    cork = mat.paint('#a87b4f', rough=0.95, dirt=0.3)
    p = Part(name)
    p.box((w, 0.012, h), at=(0, -0.006, -h), mat=cork, bevel=0.002)
    pw, ph = w - 0.07, h - 0.07
    p.box((pw, 0.0006, ph), at=(0, -0.0123, -h + 0.035), mat=mat.paper('#f6f0df'), bevel=0, faces={'front': mat.picture(name + ' paper', img, rough=0.8)})
    cols = ['#c8412f', '#c8412f', '#2f6f8a', '#d9a72b']
    rnd = random.Random(3)
    for u, v in pins:
        x, z = (u - 0.5) * pw, -0.035 - v * ph
        p.sphere(0.0042, at=(x, -0.0185, z - 0.0042), mat=mat.plastic(rnd.choice(cols), rough=0.25, dirt=0.0), seg=6, rings=4)
        p.cyl(0.0008, 0.008, at=(x, -0.0125, z), rot=(90, 0, 0), mat=mat.metal('#9a9a98'), seg=4)
    return p.build()


def gig_poster(title, sub, bg, fg, seed=0):
    im, d = draw.new(420, 594, bg)
    rnd = random.Random(seed)
    for i in range(14):
        r_ = 40 + i * 22
        d.arc([210 - r_, 250 - r_, 210 + r_, 250 + r_], rnd.randint(0, 180), rnd.randint(200, 360), fill=fg, width=3)
    draw.text(d, (30, 440), title, size=draw.fit(title, 360, 58, 800), fill=fg, weight=800)
    draw.text(d, (32, 520), sub, size=20, fill=fg, weight=500)
    return im


def calendar_page(month='11', year='2026', first_wd=0, days=30, mark=(17,)):
    im, d = draw.new(420, 594, '#f4f1e8')
    d.rectangle([0, 0, 420, 150], fill='#27405a')
    draw.text(d, (30, 76), month + '월', size=84, fill='#f4f1e8', anchor='lm', weight=800)
    draw.text(d, (392, 110), year, size=26, fill='#c9d5e2', anchor='rm')
    for i, s in enumerate('일월화수목금토'):
        draw.text(d, (48 + i * 54, 190), s, size=20, fill='#b33a2c' if i == 0 else '#55585e', anchor='mm', weight=600)
    for k in range(days):
        c, r_ = (first_wd + k) % 7, (first_wd + k) // 7
        x, y = 48 + c * 54, 248 + r_ * 62
        if k + 1 in mark:
            d.ellipse([x - 22, y - 22, x + 22, y + 22], outline='#b33a2c', width=3)
        draw.text(d, (x, y), str(k + 1), size=24, fill='#b33a2c' if c == 0 else '#2a2c30', anchor='mm', weight=500)
    return im


def view_outside(version, seed=8):
    """What the window sees from a fifth-storey roof in an old low-rise quarter: other roofs at the same height
    (green waterproofing, yellow water tanks, a red neon cross or two), a slope of small houses behind them, far
    apartment slabs, and a hill with a mast. One picture, 3600 × 1350. Returns (image, marks) where marks has the
    picture positions (u, v from the top) of the mast and chimney tops, their mid levels, and the crosses."""
    night = version == 'night'                                         # the work-light views see the morning picture
    W, H = 3600, 1350
    rnd = random.Random(seed)
    sky = [(0, '#020308'), (0.5, '#05070d'), (0.72, '#120f14'), (1, '#161113')] if night else \
          [(0, '#6f8fb4'), (0.42, '#b9bcc8'), (0.62, '#f0c79c'), (0.7, '#f3b989'), (1, '#f1cfae')]      # 16:40, the sun low on the left
    im = draw.sky(W, H, sky)
    d = ImageDraw.Draw(im)
    hz = H * 0.66                                                      # the horizon as the picture sees it
    marks = dict(cross=[], tank=[])
    if night:
        for _ in range(260):
            x, y = rnd.randrange(W), int(rnd.random() ** 1.6 * hz * 0.8)
            v = rnd.randint(60, 150)
            d.point((x, y), fill=(v, v, v))
    # two hills: a broadcasting mast on one, a tall chimney on the other (both over 60 m: both carry lights)
    mx, cx_ = 1370, 2700
    hill = [(0, hz)] + [(x, hz - 150 * math.exp(-((x - mx) / 520) ** 2) - 70 * math.exp(-((x - cx_) / 430) ** 2) - 30 * math.exp(-((x - 400) / 380) ** 2) - rnd.uniform(0, 5))
                        for x in range(0, W + 1, 24)] + [(W, hz)]
    dark = '#0d1018' if night else '#7b889c'
    d.polygon(hill, fill='#0a0d14' if night else '#93a0b4')
    mbase = hz - 150
    d.polygon([(mx - 9, mbase), (mx + 9, mbase), (mx + 3, mbase - 210), (mx - 3, mbase - 210)], fill=dark)
    d.line([mx, mbase - 210, mx, mbase - 262], fill=dark, width=3)
    marks['mast_top'] = (mx / W, (mbase - 262) / H)
    marks['mast_mid'] = (mx / W, (mbase - 128) / H)
    cbase = hz - 70
    d.polygon([(cx_ - 11, cbase), (cx_ + 11, cbase), (cx_ + 7, cbase - 170), (cx_ - 7, cbase - 170)], fill=dark)
    marks['chimney_top'] = (cx_ / W, (cbase - 172) / H)
    marks['chimney_mid'] = (cx_ / W, (cbase - 88) / H)
    # far apartment slabs
    for x in sorted(rnd.sample(range(40, W - 200, 64), 30)):
        bw, bh = rnd.randint(46, 120), rnd.randint(80, 190)
        if abs(x + bw / 2 - mx) < 150 or abs(x + bw / 2 - cx_) < 120:
            bh = int(bh * 0.5)
        col = '#0c1019' if night else '#8a97ac'
        d.rectangle([x, hz - bh, x + bw, hz + 4], fill=col)
        for wy in range(int(hz - bh + 6), int(hz - 2), 7):
            for wx in range(x + 4, x + bw - 4, 6):
                if night and rnd.random() < 0.3:
                    d.rectangle([wx, wy, wx + 2, wy + 3], fill=rnd.choice(['#ffd9a0', '#ffe9c8', '#cfe0ff', '#ffc878']))
                elif not night and rnd.random() < 0.7:
                    d.rectangle([wx, wy, wx + 2, wy + 3], fill='#77849a')
    # the slope of small houses: many small roofs, a few lit windows
    for row in range(5):
        y0 = hz + 6 + row * 34
        x = -rnd.randint(0, 60)
        while x < W:
            bw, bh = rnd.randint(50, 130) + row * 10, rnd.randint(34, 78) + row * 8
            if night:
                col = rnd.choice(['#0f131b', '#121720', '#0d1016', '#151a22'])
            else:
                col = rnd.choice(['#a39a8e', '#8f8a84', '#b0a595', '#9a9186', '#a8a09a'])
            d.rectangle([x, y0 - bh, x + bw, y0 + 60], fill=col)
            roof = rnd.choice(['#1d3a2b', '#1a2f25', '#24303a']) if night else rnd.choice(['#5f8f6a', '#6f9a78', '#7d8a94', '#8c5a48'])
            d.rectangle([x - 2, y0 - bh - 4, x + bw + 2, y0 - bh + 3], fill=roof)
            for _ in range(rnd.randint(0, 3)):
                wx, wy = x + rnd.randint(6, max(7, bw - 18)), y0 - bh + rnd.randint(10, max(11, bh - 10))
                if night and rnd.random() < 0.5:
                    d.rectangle([wx, wy, wx + 9 + row, wy + 7 + row], fill=rnd.choice(['#ffcf8a', '#ffe2b0', '#fff0d0', '#bcd4ff']))
                else:
                    d.rectangle([wx, wy, wx + 9 + row, wy + 7 + row], fill='#07090d' if night else '#4d5866')
            if rnd.random() < 0.3:                                    # a water tank
                tw = 18 + row * 4
                tx = x + rnd.randint(4, max(5, bw - tw - 4))
                d.rounded_rectangle([tx, y0 - bh - 4 - tw, tx + tw, y0 - bh - 3], 4, fill='#2e2609' if night else '#e1b62e')
                marks['tank'].append(((tx + tw / 2) / W, (y0 - bh - tw / 2) / H))
            if rnd.random() < 0.035 + (0.03 if row < 2 else 0):       # a steeple with a neon cross
                cx = x + bw / 2
                d.polygon([(cx - 9, y0 - bh), (cx + 9, y0 - bh), (cx, y0 - bh - 60)], fill='#10141c' if night else '#8a8f98')
                marks['cross'].append((cx / W, (y0 - bh - 78) / H))
                if not night:
                    d.line([cx, y0 - bh - 92, cx, y0 - bh - 60], fill='#9a4a44', width=3)
                    d.line([cx - 9, y0 - bh - 80, cx + 9, y0 - bh - 80], fill='#9a4a44', width=3)
            x += bw + rnd.randint(0, 12)
    # the nearest roofs, at our own height: a parapet line, green waterproofing, a big tank, a stair tower
    y0 = H * 0.86
    for x, bw, bh, tank in ((-40, 760, 150, True), (840, 620, 110, False), (1540, 900, 170, True), (2520, 560, 120, False), (3140, 520, 160, True)):
        wall = '#151821' if night else '#b3a898'
        d.rectangle([x, y0 - bh, x + bw, H], fill=wall)
        d.rectangle([x, y0 - bh - 16, x + bw, y0 - bh], fill='#20242e' if night else '#c6bcae')              # the parapet
        d.rectangle([x + 14, y0 - bh - 4, x + bw - 14, y0 - bh], fill='#17382a' if night else '#5c9469')       # green deck showing over it
        d.rectangle([x + bw * 0.62, y0 - bh - 150, x + bw * 0.62 + 170, y0 - bh - 16], fill='#12151c' if night else '#a79d8f')    # the stair tower
        d.rectangle([x + bw * 0.62 + 60, y0 - bh - 96, x + bw * 0.62 + 110, y0 - bh - 16], fill='#0b0d12' if night else '#5d5a55')
        if tank:
            tx = x + bw * 0.2
            d.rounded_rectangle([tx, y0 - bh - 126, tx + 104, y0 - bh - 14], 14, fill='#3a300b' if night else '#e7bd33')
            d.rounded_rectangle([tx + 28, y0 - bh - 138, tx + 76, y0 - bh - 122], 5, fill='#2c2408' if night else '#c9a326')
            for k in range(1, 5):
                d.line([tx + 2, y0 - bh - 14 - k * 22, tx + 102, y0 - bh - 14 - k * 22], fill='#2c2408' if night else '#cfa82a', width=2)
        for k in range(rnd.randint(1, 3)):                            # windows of the top floor below the parapet
            wx = x + 50 + k * 190 + rnd.randint(0, 40)
            lit_ = night and rnd.random() < 0.6
            d.rectangle([wx, y0 - bh + 36, wx + 110, y0 - bh + 96], fill=('#ffd596' if rnd.random() < 0.7 else '#cfe0ff') if lit_ else ('#07090d' if night else '#56606c'))
            d.line([wx + 55, y0 - bh + 36, wx + 55, y0 - bh + 96], fill=wall, width=5)
    if night:                                                         # the glow that sits on a city
        g = Image.new('RGB', (W, H), (0, 0, 0))
        gd = ImageDraw.Draw(g)
        gd.ellipse([-W * .2, hz - 110, W * 1.2, hz + 170], fill=(38, 26, 22))
        from PIL import ImageChops
        im = ImageChops.screen(im, g.filter(ImageFilter.GaussianBlur(90)))
        soft = im.filter(ImageFilter.GaussianBlur(5))
        im = ImageChops.screen(im.filter(ImageFilter.GaussianBlur(0.8)), Image.eval(soft, lambda v: int(v * 0.45)))
    else:                                                             # morning mist lying between the rows
        mist = Image.new('RGB', (W, H), '#eed6c2')
        m = Image.new('L', (W, H), 0)
        md = ImageDraw.Draw(m)
        for y in range(int(hz - 220), int(H * 0.82)):
            t = (y - (hz - 220)) / (H * 0.82 - (hz - 220))
            md.line([0, y, W, y], fill=int(150 * math.sin(math.pi * min(1, t * 1.15)) ** 1.5))
        im = Image.composite(mist, im, m.filter(ImageFilter.GaussianBlur(18))).filter(ImageFilter.GaussianBlur(1.2))
    return im, marks


# ---- things ----------------------------------------------------------------------------------------
def tape(spines, rect, name='tape'):
    """A cassette in its case, standing like a book: 16.8 wide, 69.6 deep, 109 tall, the J-card spine to the front."""
    clear = mat.plastic('#cfd3d6', rough=0.12, dirt=0.25)
    p = Part(name)
    p.box(CASE, mat=clear, bevel=0.0006, faces={'front': (spines, rect)})
    return p.build()


def tape_flat(image, name='tape flat'):
    """A case lying on its back, the J-card front up."""
    clear = mat.plastic('#cfd3d6', rough=0.12, dirt=0.25)
    p = Part(name)
    p.box((CASE[2], CASE[1], CASE[0]), mat=clear, bevel=0.0008, faces={'top': mat.picture(name, image, rough=0.25, coat=0.6)})
    return p.build()


def cassette(image, name='cassette'):
    """A bare cassette out of its case."""
    p = Part(name)
    p.box((SHELL[0], SHELL[1], 0.0095), mat=mat.plastic('#2a2b2f', rough=0.4), bevel=0.001, faces={'top': mat.picture(name, image, rough=0.4)})
    p.box((0.066, 0.016, 0.0032), at=(0, -SHELL[1] / 2 + 0.012, 0.0095), mat=mat.plastic('#2a2b2f', rough=0.4), bevel=0.0005)   # the head-end step: 12.7 at its thickest
    return p.build()


def tape_rack(w=0.84, rows=5, pitch=0.128, d=0.082, board=0.012, batten=0.018, name='tape rack'):
    """A shallow wall rack made for cassettes: `rows` boards `pitch` apart between two cheeks. It stands off the wall
    on two battens (an outside wall is where damp gathers behind furniture): back of the battens on y = 0, origin at
    the middle of the underside of the lowest board. Knows its shelves like kit.shelf_unit."""
    pine = mat.wood('#c9a66e', '#a37e48', rough=0.55, coat=0.05, axis='X')
    p = Part(name)
    H = rows * pitch + board
    y0 = -batten
    for sx in (-1, 1):
        p.box((board, d, H), at=(sx * (w / 2 - board / 2), y0 - d / 2, 0), mat=pine, bevel=0.001)
        p.box((0.03, batten, H), at=(sx * (w / 2 - 0.12), -batten / 2, 0), mat=pine, bevel=0)
    for k in range(rows + 1):
        p.box((w - 2 * board, d, board), at=(0, y0 - d / 2, k * pitch), mat=pine, bevel=0.001)
    p.box((w - 2 * board, 0.004, H - 2 * board), at=(0, y0 - 0.002, board), mat=pine, bevel=0)
    ob = p.build()
    ob['lr_levels'] = [k * pitch + board for k in range(rows)]
    ob['lr_clear'] = [pitch - board] * rows
    return ob


def deck(name='cassette deck', glow=None):
    """A hi-fi cassette deck, 430 × 120 × 290 [cassette]: drawn fascia, two lit level meters, four feet."""
    body = mat.metal('#1d1e21', rough=0.45, dirt=0.3)
    p = Part(name)
    p.box((0.43, 0.29, 0.108), at=(0, 0, 0.012), mat=body, bevel=0.002, faces={'front': mat.picture(name + ' face', panel(860, 216, 'deck'), rough=0.35)})
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.cyl(0.018, 0.012, at=(sx * 0.18, sy * 0.11, 0), mat=mat.rubber(), seg=12)
    g = glow or mat.emit('#ffb45a', 0.0, name=name + ' meters', off='#141210')
    p.box((0.098, 0.002, 0.034), at=(0.0355, -0.146, 0.062), mat=g, bevel=0)
    return p.build()


def recorder(name='field recorder', glow=None):
    """A portable field cassette recorder, 237 × 48 × 168 [cassette]: transport keys and two meters on top."""
    body = mat.metal('#2a2c30', rough=0.4, dirt=0.35)
    p = Part(name)
    p.box((0.237, 0.168, 0.048), mat=body, bevel=0.003, faces={'top': mat.picture(name + ' top', panel(948, 672, 'recorder'), rough=0.4)})
    for sx in (-1, 1):
        p.box((0.006, 0.02, 0.012), at=(sx * 0.1215, 0.03, 0.024), mat=mat.metal('#9a9a98'), bevel=0.001)
    g = glow or mat.emit('#ffb45a', 0.0, name=name + ' meters')
    for j in range(2):
        p.box((0.036, 0.046, 0.0008), at=(0.039 + j * 0.0474, 0.039, 0.048), mat=g, bevel=0)
    return p.build()


def mixer(name='mixer', leds=None):
    """A six-channel desk mixer, 300 × 210, sloped; a ladder of LEDs on its right. leds = list of emit materials."""
    body = mat.metal('#2b2d31', rough=0.45)
    p = Part(name)
    p.box((0.30, 0.21, 0.03), mat=body, bevel=0.002)
    p.box((0.30, 0.21, 0.012), at=(0, 0, 0.03), rot=(6, 0, 0), mat=body, bevel=0.002, faces={'top': mat.picture(name + ' top', panel(600, 420, 'mixer'), rough=0.4)})
    for i, g in enumerate(leds or []):
        p.box((0.006, 0.0045, 0.002), at=(0.138, 0.02 + i * 0.008, 0.046 + (0.02 + i * 0.008) * math.tan(math.radians(6))), rot=(6, 0, 0), mat=g, bevel=0)
    return p.build()


def microphone(name='microphone'):
    """A small condenser microphone on a desk stand with a foam windscreen."""
    steel = mat.metal('#2a2a2c', rough=0.4)
    p = Part(name)
    p.cyl(0.06, 0.012, mat=steel, seg=24, bevel=0.003)
    p.tube([(0, 0, 0.012), (0, 0, 0.17), (0, -0.05, 0.215)], 0.005, mat=steel, seg=8)
    p.cyl(0.011, 0.07, at=(0, -0.05, 0.215), rot=(125, 0, 0), mat=steel, seg=12)
    p.sphere(0.028, at=(0, -0.118, 0.238), mat=mat.fabric('#1b1b1d', weave=1.6, sheen=0.1), seg=14, rings=8, squash=(1, 1.25, 1))
    ob = p.build()
    ob['lr_com'] = (0.0, 0.0, 0.02)
    return ob


def heater(name='heater', bars=None):
    """A two-bar quartz heater, 310 × 375 × 145, 400 / 800 W [heat-air]: reflector, two tubes, a wire guard."""
    cream = mat.paint('#e3dccb', rough=0.4)
    g = bars or mat.emit('#ff5a14', 0.0, name=name + ' bars')
    p = Part(name)
    p.box((0.31, 0.145, 0.04), mat=cream, bevel=0.004)
    p.box((0.31, 0.03, 0.335), at=(0, 0.045, 0.04), mat=cream, bevel=0.004)
    p.box((0.31, 0.09, 0.02), at=(0, 0.0, 0.355), mat=cream, bevel=0.004)
    for sx in (-1, 1):
        p.box((0.014, 0.09, 0.315), at=(sx * 0.148, 0.0, 0.04), mat=cream, bevel=0.002)
    p.box((0.276, 0.004, 0.3), at=(0, 0.03, 0.048), mat=mat.metal('#d8d8d6', rough=0.18), bevel=0)
    for z in (0.13, 0.26):
        p.cyl(0.006, 0.26, at=(-0.13, -0.005, z), rot=(0, 90, 0), mat=g, seg=10)
    for i in range(7):
        z = 0.07 + i * 0.043
        p.tube([(-0.139, -0.04, z), (0.139, -0.04, z)], 0.0011, mat=mat.metal('#bdbdbb', rough=0.3), seg=4)
    p.box((0.05, 0.02, 0.012), at=(0.1, -0.03, 0.375), mat=mat.plastic('#2a2a2c'), bevel=0.003)
    ob = p.build()
    ob['lr_bars'] = (0.0, -0.01, 0.195)
    return ob


def drying_rack(L=1.15, W=0.53, H=0.9, rods=7, name='drying rack'):
    """A folding X-frame drying rack opened out, 1150 × 530 × 900 [heat-air]. The object's lr_rods = [(y, z), …]
    of its rods (they run along X): drape the washing over them."""
    tube = mat.metal('#e6e6e3', rough=0.35, dirt=0.25)
    tip = mat.plastic('#8fb7d6', rough=0.5)
    p = Part(name)
    for sx in (-1, 1):
        x = sx * (L / 2 - 0.02)
        p.tube([(x, -W / 2, 0.012), (x, W / 2, H)], 0.009, mat=tube, seg=8)
        p.tube([(x - sx * 0.022, W / 2, 0.012), (x - sx * 0.022, -W / 2, H)], 0.009, mat=tube, seg=8)
        for sy in (-1, 1):
            p.cyl(0.012, 0.012, at=(x - (sx * 0.022 if sy > 0 else 0), sy * W / 2, 0), mat=tip, seg=10)
    rod_pos = []
    for i in range(rods):
        y = -W / 2 + W * i / (rods - 1)
        p.tube([(-L / 2 + 0.02, y, H), (L / 2 - 0.02, y, H)], 0.005, mat=tube, seg=8)
        rod_pos.append((y, H))
    for y in (-W / 2, W / 2):
        p.tube([(-L / 2 + 0.02, y, H), (-L / 2 + 0.02, y, H)] if False else [(-L / 2 + 0.02, y, H * 0.45), (L / 2 - 0.02, y, H * 0.45)], 0.006, mat=tube, seg=8)
    ob = p.build()
    ob['lr_rods'] = [c for q in rod_pos for c in q]
    return ob


def sock(color='#d9d6cf', name='sock'):
    """A sock over a rod: a narrow drape."""
    p = Part(name)
    p.drape(0.085, 0.2, 0.12, over_r=0.005, mat=mat.fabric(color, weave=1.2), t=0.005, folds=1, sway=0.004, seed=hash(name) % 97, nx=6)
    return p.build()


def fridge(name='fridge'):
    """A one-door compact fridge, 480 × 500 × 850."""
    white = mat.paint('#eceae4', rough=0.35, coat=0.3)
    p = Part(name)
    p.box((0.48, 0.46, 0.85), at=(0, 0.02, 0), mat=white, bevel=0.006)
    p.box((0.476, 0.04, 0.80), at=(0, -0.23, 0.045), mat=white, bevel=0.008)
    p.box((0.02, 0.025, 0.3), at=(-0.2, -0.262, 0.42), mat=mat.metal('#c8c8c6', rough=0.3), bevel=0.006)
    return p.build()


def rice_cooker(name='rice cooker', lamp=None):
    """A small electric rice cooker with its keep-warm lamp."""
    white = mat.plastic('#ece9e1', rough=0.35)
    g = lamp or mat.emit('#ff9a2a', 0.0, name=name + ' lamp')
    p = Part(name)
    p.lathe([(0, 0), (0.105, 0), (0.118, 0.02), (0.12, 0.15), (0.1, 0.19), (0.04, 0.2), (0, 0.2)], mat=white, seg=28)
    p.box((0.07, 0.01, 0.05), at=(0, -0.118, 0.055), mat=mat.plastic('#2a2a2c'), bevel=0.003)
    p.box((0.008, 0.002, 0.008), at=(-0.02, -0.124, 0.085), mat=g, bevel=0)
    p.tube([(-0.09, 0, 0.19), (-0.06, 0, 0.235), (0.06, 0, 0.235), (0.09, 0, 0.19)], 0.006, mat=mat.plastic('#2a2a2c'), seg=8)
    return p.build()


def kettle(name='kettle'):
    steel = mat.metal('#c9c9c6', rough=0.22)
    p = Part(name)
    p.lathe([(0, 0), (0.075, 0), (0.08, 0.02), (0.062, 0.19), (0.05, 0.2), (0, 0.205)], mat=steel, seg=24)
    p.tube([(0.066, 0, 0.17), (0.11, 0, 0.16), (0.115, 0, 0.07), (0.079, 0, 0.04)], 0.008, mat=mat.plastic('#1c1c1e'), seg=8)
    p.cyl(0.085, 0.022, at=(0, 0, -0.022), mat=mat.plastic('#1c1c1e'), seg=24, bevel=0.004)
    return p.ground(center=False).build()


def ac_unit(name='air conditioner'):
    """A wall-mounted split unit, 754 × 308 × 189 [ac]: back on y = 0, origin at the middle of its back."""
    white = mat.plastic('#f1f0eb', rough=0.35, dirt=0.3)
    p = Part(name)
    p.box((0.754, 0.189, 0.308), at=(0, -0.0945, -0.154), mat=white, bevel=0.012)
    p.box((0.7, 0.012, 0.06), at=(0, -0.186, -0.15), rot=(-28, 0, 0), mat=white, bevel=0.003)         # the louver, closed for winter
    p.box((0.5, 0.004, 0.004), at=(0, -0.19, -0.02), mat=mat.plastic('#c9c8c2'), bevel=0)
    return p.build()


def pipe_sleeve(length=0.22, name='pipe sleeve'):
    """The 65 mm sleeve that takes the refrigerant lines and the drain hose through the wall, sloping down toward
    outside [ac]: origin where it enters the wall face, running into the wall (+y)."""
    p = Part(name)
    p.cyl(0.0325, length, at=(0, -0.02, 0.0), rot=(-87, 0, 0), mat=mat.plastic('#e4e2da', rough=0.5), seg=16)
    return p.build()


def wall_box(w, h, t, image, name, glow=0.0):
    """A plate on the wall carrying a drawn face (thermostat, breaker cover): back on y = 0, origin at its centre."""
    p = Part(name)
    p.box((w, t, h), at=(0, -t / 2, -h / 2), mat=mat.plastic('#ecebe5', rough=0.4), bevel=0.003,
          faces={'front': mat.picture(name + ' face', image, rough=0.4, emission=glow)})
    return p.build()


def coat_rail(w=0.5, pegs=3, name='coat rail'):
    """A board with pegs for r.fix(wall=…). lr_pegs = local points where things hang (the peg tips' roots)."""
    wood_ = mat.wood('#8a6238', '#5f4022', rough=0.5)
    steel = mat.metal('#55585e', rough=0.4)
    p = Part(name)
    p.box((w, 0.018, 0.07), at=(0, -0.009, -0.035), mat=wood_, bevel=0.003)
    pts = []
    for i in range(pegs):
        x = -w / 2 + w * (i + 0.5) / pegs
        p.tube([(x, -0.016, 0.0), (x, -0.05, 0.004), (x, -0.058, 0.02)], 0.004, mat=steel, seg=8)
        pts += [x, -0.045, 0.006]
    ob = p.build()
    ob['lr_pegs'] = pts
    return ob


def tote(color='#c9b99a', name='tote bag', image=None):
    """A cotton bag hanging by its handles: back on y = 0, origin at the top of the handle loop."""
    cloth = mat.fabric(color, weave=1.4)
    p = Part(name)
    front = {'front': mat.picture(name + ' print', image, rough=0.9)} if image is not None else None
    p.box((0.34, 0.035, 0.38), at=(0, -0.022, -0.6), mat=cloth, bevel=0.008, faces=front)
    for sx in (-1, 1):
        p.tube([(sx * 0.07, -0.022, -0.225), (sx * 0.05, -0.02, -0.06), (sx * 0.012, -0.012, -0.002), (-sx * 0.0, -0.012, 0.0)], 0.007, mat=cloth, seg=6)
    return p.build()


def shoe(color='#e8e6df', sole='#d8d5cc', name='shoe', L=0.27):
    """A low sneaker, drawn as a sole, an upper and a toe cap."""
    p = Part(name)
    p.prism([(x, y) for x, y in ((-0.045, -L / 2), (0.045, -L / 2), (0.05, 0), (0.042, L / 2 - 0.02), (0, L / 2), (-0.042, L / 2 - 0.02), (-0.05, 0))],
            0.028, mat=mat.rubber(sole, rough=0.6))
    p.sphere(0.04, at=(0, 0.045, 0.02), mat=mat.fabric(color, weave=1.2), seg=12, rings=6, squash=(1.05, 1.9, 0.85))
    p.pipe(0.036, 0.03, 0.05, at=(0, -0.07, 0.03), mat=mat.fabric(color, weave=1.2), seg=14)
    return p.build()


def slipper(color='#6f8f7a', name='slipper', L=0.255):
    p = Part(name)
    p.prism([(x, y) for x, y in ((-0.042, -L / 2), (0.042, -L / 2), (0.048, 0.02), (0.04, L / 2 - 0.02), (0, L / 2), (-0.04, L / 2 - 0.02), (-0.048, 0.02))],
            0.018, mat=mat.rubber(color, rough=0.7))
    ring = []
    for i in range(7):
        a = math.pi * i / 6
        ring.append((0.048 * math.cos(a), 0.05, 0.016 + 0.045 * math.sin(a)))
    p.tube(ring, 0.006, mat=mat.rubber(color, rough=0.7), seg=6)
    return p.build()


def umbrella(name='umbrella', color='#22364f'):
    """A closed long umbrella for r.lean(): upright, origin under its tip, back toward +Y."""
    p = Part(name)
    p.cyl(0.004, 0.06, mat=mat.metal('#9a9a98'), seg=8)
    p.lathe([(0.008, 0.06), (0.024, 0.18), (0.03, 0.6), (0.012, 0.72), (0, 0.72)], mat=mat.fabric(color, weave=0.8, sheen=0.2), seg=12)
    p.lathe([(0, 0.055), (0.008, 0.06)], mat=mat.fabric(color), seg=12) if False else None
    p.tube([(0, 0, 0.72), (0, 0, 0.82), (0, -0.02, 0.86), (0, -0.05, 0.85), (0, -0.06, 0.81)], 0.009, mat=mat.wood('#6b4526', '#3f2814'), seg=8)
    return p.build()


def radio(name='radio'):
    """Grandfather's transistor radio, 230 × 130 × 62, its aerial pushed down."""
    p = Part(name)
    p.box((0.23, 0.062, 0.13), mat=mat.plastic('#3a2d22', rough=0.5), bevel=0.006, faces={'front': mat.picture(name + ' face', panel(460, 260, 'radio'), rough=0.5)})
    p.tube([(0.09, 0.02, 0.13), (0.1, 0.022, 0.19)], 0.0022, mat=mat.metal('#c9c9c6', rough=0.25), seg=6)       # the aerial pushed down
    p.tube([(-0.08, 0, 0.13), (-0.06, 0, 0.158), (0.06, 0, 0.158), (0.08, 0, 0.13)], 0.005, mat=mat.plastic('#2a211a'), seg=6)
    return p.build()


def speaker(name='speaker'):
    p = Part(name)
    p.box((0.15, 0.18, 0.24), mat=mat.wood('#3a2a1c', '#22170f', rough=0.5), bevel=0.003, faces={'front': mat.picture(name + ' face', panel(300, 480, 'speaker'), rough=0.6)})
    return p.build()


def calendar(image, name='calendar'):
    """A wall calendar on one nail: back on y = 0, origin at the hole in its top edge. Its page lifts in a draught."""
    p = Part(name)
    p.box((0.3, 0.004, 0.42), at=(0, -0.002, -0.43), mat=mat.paper('#f1ede2'), bevel=0, faces={'front': mat.picture(name + ' page', image, rough=0.8)})
    p.box((0.3, 0.006, 0.018), at=(0, -0.003, -0.018), mat=mat.metal('#b9b9b6', rough=0.4), bevel=0.001)
    return p.build()


# ---- what a child of the early 1990s kept ---------------------------------------------------------------
def virtual_pet(color='#f0c53a', name='virtual pet'):
    """An egg-shaped virtual pet, 44 × 54 × 19 [nostalgia], lying on its back."""
    p = Part(name)
    p.sphere(0.022, mat=mat.plastic(color, rough=0.3), seg=14, rings=8, squash=(1.0, 1.23, 0.43))
    p.box((0.02, 0.018, 0.0012), at=(0, 0.004, 0.0185), mat=mat.plastic('#9aa58c', rough=0.2), bevel=0)
    for i in range(3):
        p.cyl(0.0022, 0.0015, at=(-0.008 + i * 0.008, -0.014, 0.0176), mat=mat.rubber('#2a2a2c'), seg=8)
    return p.ground().build()


def spinning_top(color='#2f6f8a', name='spinning top'):
    """A battling top, ⌀ 48 × 40, resting tilted on its rim."""
    p = Part(name)
    p.lathe([(0, 0), (0.004, 0.004), (0.01, 0.016), (0.024, 0.024), (0.024, 0.03), (0.012, 0.034), (0.008, 0.04), (0, 0.04)], mat=mat.plastic(color, rough=0.3), seg=18)
    p.lathe([(0.02, 0.025), (0.0245, 0.0255), (0.0245, 0.0295), (0.02, 0.03), (0.02, 0.025)], mat=mat.metal('#c9c9c6', rough=0.25), seg=18)
    p.turn((0, 45, 0)).ground()                 # at rest a top lies on its tip and its rim
    return p.build()


def mini_car(color='#c8412f', name='mini car'):
    """A 1:32 four-wheel-drive toy racer, about 150 × 92 × 40 [nostalgia]."""
    p = Part(name)
    body = mat.plastic(color, rough=0.25)
    p.box((0.05, 0.14, 0.016), at=(0, 0, 0.012), mat=mat.plastic('#1c1c1e'), bevel=0.003)
    p.sphere(0.016, at=(0, 0.0, 0.02), mat=body, seg=12, rings=6, squash=(1.5, 3.6, 0.7))
    p.box((0.07, 0.016, 0.003), at=(0, -0.06, 0.04), mat=body, bevel=0.001)
    for sx in (-1, 1):
        p.box((0.004, 0.012, 0.014), at=(sx * 0.03, -0.06, 0.027), mat=body, bevel=0)
        for sy in (-1, 1):
            p.cyl(0.013, 0.012, at=(sx * 0.034, sy * 0.048, 0.013), rot=(0, sx * 90, 0), mat=mat.rubber('#151517'), seg=14)
    return p.ground(center=False).build()


def prism_player(name='mp3 player'):
    """A prism-shaped music player, 85 × 30 × 27, lying on one face."""
    p = Part(name)
    tri = [(-0.015, 0.0), (0.015, 0.0), (0.0, 0.026)]
    p.prism(tri, 0.085, mat=mat.plastic('#d9dadc', rough=0.25))
    p.turn((90, 0, 90)).ground()
    p.box((0.03, 0.0008, 0.012), at=(0.0, -0.0076, 0.008), rot=(-30, 0, 0), mat=mat.plastic('#3d4a3a', rough=0.2), bevel=0)
    return p.build()


def flip_phone(name='flip phone', color='#b9bcc2'):
    """A clamshell phone, shut: 87 × 45 × 23 [nostalgia]."""
    p = Part(name)
    p.box((0.045, 0.087, 0.0115), mat=mat.plastic(color, rough=0.3), bevel=0.004)
    p.box((0.045, 0.084, 0.0115), at=(0, -0.0015, 0.0115), mat=mat.plastic(color, rough=0.3), bevel=0.004)
    p.box((0.022, 0.018, 0.0006), at=(0, 0.012, 0.023), mat=mat.plastic('#1c2a3a', rough=0.15), bevel=0)
    p.cyl(0.0035, 0.012, at=(0.014, 0.043, 0.0115), mat=mat.plastic('#55585e'), seg=8)
    return p.build()


# ---- what the first review asked for ------------------------------------------------------------------
def burner(name='burner'):
    """A portable butane burner, 340 × 280 × 90: the only stove a room like this has."""
    body = mat.paint('#c9c9c6', rough=0.35)
    p = Part(name)
    p.box((0.34, 0.28, 0.075), mat=body, bevel=0.006)
    p.cyl(0.07, 0.006, at=(-0.055, 0.0, 0.075), mat=mat.metal('#2a2a2c', rough=0.5), seg=20)
    for i in range(4):
        a = TAU * i / 4 + 0.78
        p.box((0.05, 0.008, 0.014), at=(-0.055 + 0.075 * math.cos(a), 0.075 * math.sin(a), 0.075), rot=(0, 0, math.degrees(a)), mat=mat.metal('#2a2a2c', rough=0.5), bevel=0)
    p.cyl(0.018, 0.012, at=(0.12, -0.14, 0.035), rot=(90, 0, 0), mat=mat.plastic('#1c1c1e'), seg=12)
    return p.build()


def basket(name='toiletries basket'):
    """A plastic basket of wash things, carried across the terrace to the tap and back."""
    p = Part(name)
    p.lathe([(0, 0), (0.1, 0), (0.12, 0.13), (0.117, 0.13), (0.098, 0.004), (0, 0.004)], mat=mat.plastic('#8fb7d6', rough=0.5), seg=20)
    for x, y, r_, h, c in ((-0.04, 0.02, 0.022, 0.17, '#f1f0ea'), (0.035, 0.03, 0.02, 0.15, '#e9c98f'), (0.0, -0.045, 0.025, 0.12, '#d97a6a')):
        p.cyl(r_, h, at=(x, y, 0.0045), mat=mat.plastic(c, rough=0.4), seg=12, bevel=0.004)
    p.tube([(-0.11, 0, 0.125), (-0.07, 0, 0.21), (0.07, 0, 0.21), (0.11, 0, 0.125)], 0.005, mat=mat.plastic('#8fb7d6', rough=0.5), seg=6)
    return p.build()


def absorber(name='moisture absorber'):
    """A tub of moisture absorber, 110 × 80 × 100: how the tapes' owner fights an outside wall."""
    p = Part(name)
    p.box((0.11, 0.08, 0.085), mat=mat.plastic('#e9eef0', rough=0.3), bevel=0.008)
    p.box((0.112, 0.082, 0.016), at=(0, 0, 0.084), mat=mat.plastic('#3f7fb0', rough=0.4), bevel=0.004)
    return p.build()


def hygrometer(name='hygrometer'):
    """A small dial hygrometer standing on the rack: ⌀ 70."""
    im, d = draw.new(160, 160, '#f2efe6')
    for i in range(11):
        a = math.radians(-120 + i * 24)
        d.line([80 + 58 * math.sin(a), 80 - 58 * math.cos(a), 80 + 70 * math.sin(a), 80 - 70 * math.cos(a)], fill='#222', width=3)
    d.pieslice([10, 10, 150, 150], -150, -110, fill='#c8412f')
    d.line([80, 80, 80 + 52 * math.sin(math.radians(-18)), 80 - 52 * math.cos(math.radians(-18))], fill='#121212', width=4)
    draw.text(d, (80, 118), '%', size=22, fill='#444', anchor='mm', weight=600)
    p = Part(name)
    p.cyl(0.035, 0.022, at=(0, 0.011, 0.035), rot=(90, 0, 0), mat=mat.plastic('#d9d6cc', rough=0.4), seg=24, bevel=0.003)
    p.prism([(0.031 * math.cos(TAU * i / 24), 0.031 * math.sin(TAU * i / 24)) for i in range(24)], 0.001, at=(0, -0.011, 0.035), rot=(90, 0, 0),
            mat=mat.plastic('#d9d6cc'), top=mat.picture(name + ' dial', im, rough=0.5))
    p.box((0.04, 0.03, 0.004), at=(0, 0, 0), mat=mat.plastic('#d9d6cc', rough=0.4), bevel=0.001)
    return p.build()


def mini_pc(name='mini pc'):
    """The computer: a small box behind the monitor, one blue LED."""
    p = Part(name)
    p.box((0.13, 0.13, 0.04), mat=mat.metal('#3a3c40', rough=0.4), bevel=0.006)
    p.box((0.004, 0.001, 0.004), at=(0.04, -0.0655, 0.018), mat=mat.emit('#6fb6ff', 6.0, name=name + ' led', off='#1c2a3a'), bevel=0)
    return p.build()


def mat_controller(name='mat controller'):
    """The dial of an electric floor mat, by the pillow."""
    p = Part(name)
    p.box((0.07, 0.12, 0.03), mat=mat.plastic('#e9e6dc', rough=0.4), bevel=0.006)
    p.cyl(0.02, 0.008, at=(0, 0.015, 0.03), mat=mat.plastic('#b9b5a8', rough=0.4), seg=16)
    p.box((0.006, 0.006, 0.002), at=(0, -0.04, 0.03), mat=mat.emit('#ff7a2a', 4.0, name=name + ' lamp', off='#5a3a2a'), bevel=0)
    return p.build()


def tissue_roll(name='tissue roll'):
    p = Part(name)
    p.pipe(0.055, 0.02, 0.1, mat=mat.paper('#f4f1ea', rough=0.95, dirt=0.05), seg=24)
    return p.build()


def terrace(r):
    """The room's own roof, built for real outside the window and the door: a deck 150 mm below the room's floor, a
    parapet, a yellow water tank. A rooftop window looks first at its own parapet — and real things at 2–5 m slide
    against the picture 40 m away as the visitor walks."""
    grey = mat.paint('#8d8f8c', rough=0.9, dirt=0.5)
    green = mat.paint('#4f7f5c', rough=0.75, dirt=0.5)                 # urethane waterproofing [rooftop]
    yellow = mat.plastic('#d9ab2a', rough=0.5, dirt=0.4)
    p = Part('terrace')
    p.box((9.5, 5.6, 0.2), at=(1.65, 4.49 + 2.8, -0.35), mat=green, bevel=0)                    # deck beyond the window wall
    p.box((9.5, 0.2, 1.1), at=(1.65, 4.49 + 5.5, -0.15), mat=grey, bevel=0.01)                  # parapet, top just above the sill
    p.box((0.2, 5.6, 1.1), at=(-3.0, 4.49 + 2.8, -0.15), mat=grey, bevel=0.01)
    p.box((9.5, 4.2, 0.2), at=(1.65, -0.19 - 2.1, -0.35), mat=green, bevel=0)                   # deck beyond the door
    p.box((9.5, 0.2, 1.1), at=(1.65, -0.19 - 4.1, -0.15), mat=grey, bevel=0.01)
    r.outdoors(p.build())
    t = Part('water tank')
    t.box((1.4, 1.4, 0.12), at=(0.15, 7.6, -0.15), mat=grey, bevel=0.01)
    t.lathe([(0, 0), (0.56, 0), (0.575, 0.03), (0.575, 1.08), (0.5, 1.2), (0.22, 1.24), (0.22, 1.3), (0, 1.3)], at=(0.15, 7.6, -0.03), mat=yellow, seg=28)
    for z in (0.3, 0.55, 0.8):
        t.pipe(0.582, 0.57, 0.03, at=(0.15, 7.6, -0.03 + z), mat=yellow, seg=28)
    r.outdoors(t.build())


def water_label():
    im, d = draw.new(256, 96, '#eaf4fb')
    d.rectangle([0, 0, 256, 20], fill='#2f7fb8')
    d.rectangle([0, 76, 256, 96], fill='#2f7fb8')
    draw.text(d, (128, 48), '샘물 2L', size=30, fill='#1f5f96', anchor='mm', weight=800)
    return im
