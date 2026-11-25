#!/usr/bin/env python3
"""Draw the drawing sheet the film opens on, from the project's numbers (plan.json): off-white paper with fibre,
watercolour washes that bleed and darken at their edges, contour lines across the land, ink walls and openings drawn
with a slightly shaky pen, dimension lines, room labels, a north arrow, a scale bar, an elevation of the first
building and a title block. Writes sheet.png and sheet.json (the pixel <-> metre mapping kit/film.py reads, so the
plan on the paper is the real size of the house built on it).

    python3 <skill>/scripts/draw-sheet.py <project>            -> <project>/sheet.png, <project>/sheet.json
    python3 <skill>/scripts/draw-sheet.py <project> --px 75 --size 3200x2263 --seed 3

If the person brings their own sketch or plan instead, do not draw one: photograph it straight down, then
scripts/calibrate.py writes the same sheet.json from two points whose metres you know.
"""
import argparse
import json
import math
import os
import random

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_SANS = os.path.join(SKILL, "fonts", "ALFSans-ksx1001.woff2")
FONT_SERIF = os.path.join(SKILL, "fonts", "NanumMyeongjo-800-ksx1001.woff2")
INK = (38, 36, 34)
PAPER = (243, 238, 226)


def font(path, size, weight=None):
    f = ImageFont.truetype(path, size)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except (OSError, AttributeError):
            pass
    return f


class Sheet:
    def __init__(s, w, h, px, origin, seed):
        s.w, s.h, s.px = w, h, px
        s.ox, s.oy = origin
        s.rng = random.Random(seed)
        s.np = np.random.default_rng(seed)
        s.ink = Image.new("L", (w, h), 0)       # ink coverage
        s.inkd = ImageDraw.Draw(s.ink)
        s.washes = []                           # (mask image, colour, strength)

    def P(s, x, y):
        return (s.ox + x * s.px, s.oy - y * s.px)

    # ---- pen
    def line(s, pts, width=3.0, jitter=0.6, closed=False, dash=None):
        pts = [s.P(*p) for p in pts]
        if closed:
            pts = pts + [pts[0]]
        for a, b in zip(pts, pts[1:]):
            L = math.dist(a, b)
            n = max(2, int(L / 14))
            seg = []
            ph = s.rng.uniform(0, 6)
            for i in range(n + 1):
                t = i / n
                x = a[0] + (b[0] - a[0]) * t
                y = a[1] + (b[1] - a[1]) * t
                nx, ny = -(b[1] - a[1]) / (L or 1), (b[0] - a[0]) / (L or 1)
                j = jitter * (math.sin(t * 7 + ph) * 0.6 + s.rng.uniform(-0.5, 0.5))
                seg.append((x + nx * j, y + ny * j))
            if dash:
                on, off = dash
                acc, draw_on, cur = 0.0, True, [seg[0]]
                for p, q in zip(seg, seg[1:]):
                    d = math.dist(p, q)
                    acc += d
                    cur.append(q)
                    if acc > (on if draw_on else off):
                        if draw_on:
                            s.inkd.line(cur, fill=230, width=int(round(width)))
                        draw_on, acc, cur = not draw_on, 0.0, [q]
                if draw_on and len(cur) > 1:
                    s.inkd.line(cur, fill=230, width=int(round(width)))
            else:
                wv = width * s.rng.uniform(0.85, 1.15)
                s.inkd.line(seg, fill=int(200 + 55 * s.rng.random()), width=max(1, int(round(wv))), joint="curve")

    def rect(s, x0, y0, x1, y1, **k):
        s.line([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], closed=True, **k)

    def poche(s, x0, y0, x1, y1, stones=True):
        """a stone wall in plan: two pen lines and the rubble drawn as small irregular rings"""
        s.rect(x0, y0, x1, y1, width=3.6)
        if not stones:
            return
        horiz = (x1 - x0) >= (y1 - y0)
        L = (x1 - x0) if horiz else (y1 - y0)
        t = (y1 - y0) if horiz else (x1 - x0)
        u = 0.0
        while u < L - 0.1:
            ln = s.rng.uniform(0.28, 0.48)
            c = u + ln / 2
            cx, cy = (x0 + c, (y0 + y1) / 2) if horiz else ((x0 + x1) / 2, y0 + c)
            rx, ry = (ln * 0.42, t * 0.36) if horiz else (t * 0.36, ln * 0.42)
            pts = []
            for k in range(9):
                a = k / 9 * math.tau
                r = s.rng.uniform(0.8, 1.1)
                pts.append((cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r))
            s.line(pts, width=1.6, jitter=0.3, closed=True)
            u += ln

    def wash(s, poly_m, color, strength=0.55, spread=10, blur=6):
        """a watercolour wash: jittered polygons, blurred, with a darker rim where the pigment dried"""
        m = Image.new("L", (s.w, s.h), 0)
        d = ImageDraw.Draw(m)
        for k in range(4):
            pts = [s.P(*p) for p in poly_m]
            pts = [(x + s.rng.uniform(-spread, spread), y + s.rng.uniform(-spread, spread)) for x, y in pts]
            d.polygon(pts, fill=60)
        m = m.filter(ImageFilter.GaussianBlur(blur))
        s.washes.append((m, color, strength))

    def blot(s, cx, cy, r, color, strength=0.6, n=7):
        """a round wash (a tree crown, a shrub): several soft discs"""
        m = Image.new("L", (s.w, s.h), 0)
        d = ImageDraw.Draw(m)
        for k in range(n):
            a = s.rng.uniform(0, math.tau)
            rr = r * s.rng.uniform(0.45, 0.75)
            x, y = s.P(cx + math.cos(a) * r * 0.45, cy + math.sin(a) * r * 0.45)
            d.ellipse((x - rr * s.px, y - rr * s.px, x + rr * s.px, y + rr * s.px), fill=110)
        m = m.filter(ImageFilter.GaussianBlur(5))
        s.washes.append((m, color, strength))

    def text(s, img, xy_m, txt, size, f=FONT_SANS, anchor="mm", weight=400, fill=INK, px_xy=None):
        d = ImageDraw.Draw(img)
        xy = px_xy if px_xy is not None else s.P(*xy_m)
        d.text(xy, txt, font=font(f, size, weight), fill=fill, anchor=anchor)

    def dim(s, a, b, off, label, size=30):
        """a dimension line offset 'off' metres from a-b, ticks at the ends, the number in the middle"""
        ax, ay = a
        bx, by = b
        L = math.dist(a, b)
        nx, ny = -(by - ay) / L, (bx - ax) / L
        A = (ax + nx * off, ay + ny * off)
        B = (bx + nx * off, by + ny * off)
        s.line([A, B], width=1.6, jitter=0.2)
        for p, q in ((a, A), (b, B)):
            s.line([(p[0] + nx * 0.15 * (1 if off > 0 else -1), p[1] + ny * 0.15 * (1 if off > 0 else -1)), (q[0] + nx * 0.2 * (1 if off > 0 else -1), q[1] + ny * 0.2 * (1 if off > 0 else -1))], width=1.2, jitter=0.1)
            tx, ty = (by - ay) / L, -(bx - ax) / L
            s.line([(q[0] - 0.12 * (tx + nx), q[1] - 0.12 * (ty + ny)), (q[0] + 0.12 * (tx + nx), q[1] + 0.12 * (ty + ny))], width=2.0, jitter=0.1)
        s.labels.append(((A[0] + B[0]) / 2 + nx * 0.32 * (1 if off > 0 else -1), (A[1] + B[1]) / 2 + ny * 0.32 * (1 if off > 0 else -1), label, size, math.degrees(math.atan2(by - ay, bx - ax))))


def local_to_world(b, u, v):
    if b["front"] == "S":
        return b["x0"] + u, b["y0"] + v
    if b["front"] == "N":
        return b["x1"] - u, b["y1"] - v
    if b["front"] == "E":
        return b["x1"] - v, b["y0"] + u
    return b["x0"] + v, b["y1"] - u


def draw_building(S, b):
    L = (b["x1"] - b["x0"]) if b["front"] in "SN" else (b["y1"] - b["y0"])
    D = (b["y1"] - b["y0"]) if b["front"] in "SN" else (b["x1"] - b["x0"])
    t = b.get("wall", 0.4)
    W = lambda u, v: local_to_world(b, u, v)  # noqa: E731

    def wr(u0, v0, u1, v1):
        (x0, y0), (x1, y1) = W(u0, v0), W(u1, v1)
        return min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)
    # roof edge (dashed)
    o = b.get("overhang", 0.5)
    x0, y0, x1, y1 = wr(-o, -o, L + o, D + o)
    S.line([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], closed=True, width=1.6, dash=(16, 12))
    # stone walls on the back and the two ends, with their window gaps
    gaps = {"back": [], "left": [], "right": []}
    for op in b.get("openings", []):
        if op["wall"] in gaps:
            c = op.get("u", op.get("v", 0))
            gaps[op["wall"]].append((c - op["w"] / 2, c + op["w"] / 2))

    def wall_run(u0, v0, u1, v1, along, gl):
        a0 = u0 if along == "u" else v0
        a1 = u1 if along == "u" else v1
        cuts = sorted(gl)
        cur = a0
        for g0, g1 in cuts + [(a1, a1)]:
            if g0 > cur + 0.05:
                if along == "u":
                    S.poche(*wr(cur, v0, g0, v1))
                else:
                    S.poche(*wr(u0, cur, u1, g0))
            if g1 > g0:  # a window: thin double line across the gap
                if along == "u":
                    gx0, gy0, gx1, gy1 = wr(g0, v0, g1, v1)
                else:
                    gx0, gy0, gx1, gy1 = wr(u0, g0, u1, g1)
                S.rect(gx0, gy0, gx1, gy1, width=1.4)
            cur = max(cur, g1)
    wall_run(0, D - t, L, D, "u", gaps["back"])
    wall_run(0, 0, t, D - t, "v", gaps["left"])
    wall_run(L - t, 0, L, D - t, "v", gaps["right"])
    # the timber front: posts, sills, doors with their swing
    u = t
    edges = [0.0]
    for w in b["bays"]:
        edges.append(edges[-1] + w)
    for e in edges:
        ue = min(max(e, t / 2), L - t / 2)
        cx, cy = W(ue, 0.12)
        S.line([(cx - 0.12, cy - 0.12), (cx + 0.12, cy - 0.12), (cx + 0.12, cy + 0.12), (cx - 0.12, cy + 0.12)], closed=True, width=3.0)
    S.line([W(t, 0.05), W(L - t, 0.05)], width=1.4)
    S.line([W(t, 0.2), W(L - t, 0.2)], width=1.4)
    for op in b.get("openings", []):
        if op["wall"] != "front":
            continue
        c = (edges[op["bay"]] + edges[op["bay"] + 1]) / 2
        w = op["w"]
        if op["kind"] in ("door", "doors"):
            leaves = 2 if op["kind"] == "doors" else 1
            lw = w / leaves
            for k in range(leaves):
                hinge = c - w / 2 if k == 0 else c + w / 2
                sign = 1 if k == 0 else -1
                pts = [W(hinge + sign * lw * math.cos(a), -lw * math.sin(a)) for a in [i / 10 * math.pi / 2 for i in range(11)]]
                S.line(pts, width=1.2, jitter=0.2)
                S.line([W(hinge, 0), W(hinge, -lw)], width=1.4, jitter=0.2)
        else:
            S.line([W(c - w / 2, 0.12), W(c + w / 2, 0.12)], width=3.0)
    # interior partitions between rooms
    for r in b.get("rooms", [])[1:]:
        e = edges[r["bays"][0]]
        S.line([W(e, 0.25), W(e, D - t)], width=2.2)
    # floors: boards hatched, rooms washed
    for r in b.get("rooms", []):
        u0, u1 = edges[r["bays"][0]], edges[r["bays"][1] + 1]
        u0, u1 = max(u0, t), min(u1, L - t)
        X0, Y0, X1, Y1 = wr(u0 + 0.06, 0.25, u1 - 0.06, D - t - 0.06)
        col = {"boards": (196, 150, 92), "paper": (214, 178, 96), "earth": (160, 140, 120)}.get(r.get("floor"), (200, 180, 150))
        S.wash([(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)], col, 0.45)
        if r.get("floor") == "boards":
            n = int((u1 - u0) / 0.22)
            for i in range(1, n):
                uu = u0 + (u1 - u0) * i / n
                S.line([W(uu, 0.3), W(uu, D - t - 0.1)], width=0.9, jitter=0.15)
        cx, cy = W((u0 + u1) / 2, (D - t) / 2 + 0.25)
        S.labels.append((cx, cy + 0.25, r["label"], 44, 0))
        S.labels.append((cx, cy - 0.4, r.get("en", ""), 22, 0))
    # its name beside one end (plan.json "label_end": "left" | "right")
    ue = -o - 1.1 if b.get("label_end") == "left" else L + o + 1.1
    cx, cy = W(ue, D / 2)
    S.labels.append((cx, cy + 0.2, b["label"], 34, 0))
    S.labels.append((cx, cy - 0.35, b.get("en", ""), 20, 0))
    return edges


def draw_elevation(S, img, b, X, Y, px):
    """the front of a building at the sheet's scale: plinth, posts, doors, the roof profile with its ropes"""
    d = ImageDraw.Draw(S.ink)
    L = (b["x1"] - b["x0"]) if b["front"] in "SN" else (b["y1"] - b["y0"])
    o = b.get("overhang", 0.5)

    def E(u, z):
        return (X + u * px, Y - z * px)

    def pl(pts, w=3):
        for a, c in zip(pts, pts[1:]):
            d.line([a, c], fill=230, width=w)
    pl([E(-1.5, 0), E(L + 1.5, 0)], 2)
    pl([E(-0.1, 0), E(-0.1, b["plinth"]), E(L + 0.1, b["plinth"]), E(L + 0.1, 0)], 3)
    edges = [0.0]
    for w in b["bays"]:
        edges.append(edges[-1] + w)
    for e in edges:
        ue = min(max(e, 0.25), L - 0.25)
        pl([E(ue - 0.1, b["plinth"]), E(ue - 0.1, b["wall_top"]), E(ue + 0.1, b["wall_top"]), E(ue + 0.1, b["plinth"])], 3)
    pl([E(0, b["wall_top"]), E(L, b["wall_top"])], 3)
    for op in b.get("openings", []):
        if op["wall"] != "front":
            continue
        c = (edges[op["bay"]] + edges[op["bay"] + 1]) / 2
        z0 = b["plinth"] + (op.get("sill", 0.05))
        z1 = z0 + op["h"]
        w = op["w"]
        pl([E(c - w / 2, z0), E(c + w / 2, z0), E(c + w / 2, z1), E(c - w / 2, z1), E(c - w / 2, z0)], 2)
        n = 8 if op["kind"] != "door" else 5
        for i in range(1, n):
            pl([E(c - w / 2 + w * i / n, z0), E(c - w / 2 + w * i / n, z1)], 1)
        for zz in (z0 + 0.15, z1 - 0.15, (z0 + z1) / 2):
            pl([E(c - w / 2, zz), E(c + w / 2, zz)], 1)
    eave, ridge = b["eave"], b["ridge"]
    if b.get("roof", "thatch") != "thatch":  # a pitched roof seen from its long side: a band from the eave to the ridge
        pl([E(-o, eave), E(L + o, eave), E(L + o, ridge), E(-o, ridge), E(-o, eave)], 3)
        for i in range(1, 12):
            zz = eave + (ridge - eave) * i / 12
            pl([E(-o, zz), E(L + o, zz)], 1)
        S.labels_px.append((X + L * px / 2, Y + 60, f'{b["label"]} 정면도  FRONT ELEVATION', 30))
        return
    # rounded thatch profile seen from the front: a soft loaf
    prof = []
    for i in range(41):
        u = -o + (L + 2 * o) * i / 40
        e = min(u + o, L + o - u) / 1.2
        k = (1 - (1 - min(1, max(0, e))) ** 2)
        prof.append(E(u, eave + (ridge - eave) * k))
    pl(prof, 3)
    pl([E(-o, eave), E(-o, eave - 0.25), E(L + o, eave - 0.25), E(L + o, eave)], 2)
    for i in range(1, 9):
        u = -o + (L + 2 * o) * i / 9
        e = min(u + o, L + o - u) / 1.2
        k = (1 - (1 - min(1, max(0, e))) ** 2)
        pl([E(u, eave - 0.2), E(u, eave + (ridge - eave) * k)], 1)
    S.labels_px.append((X + L * px / 2, Y + 60, f'{b["label"]} 정면도  FRONT ELEVATION', 30))


def contours(S, c, keep_out):
    """concentric, wobbling level lines; broken where they would cross the lot (the plan stays readable)"""
    ox, oy = c["origin"]
    kx0, ky0, kx1, ky1 = keep_out
    for k in range(1, c["count"] + 1):
        r = k * c["step"] + 14
        pts = []
        ph = S.rng.uniform(0, 9)
        for i in range(121):
            a = i / 120 * math.tau
            rr = r * (1 + 0.10 * math.sin(a * 2 + ph) + 0.05 * math.sin(a * 5 + ph * 2))
            pts.append((ox + math.cos(a) * rr * 1.25, oy + math.sin(a) * rr * 0.85))
        run = []
        for p in pts + [None]:
            if p is not None and not (kx0 < p[0] < kx1 and ky0 < p[1] < ky1):
                run.append(p)
            else:
                if len(run) > 1:
                    S.line(run, width=1.3, jitter=0.4)
                run = []
        if k % 3 == 0 and not (kx0 < pts[95][0] < kx1 and ky0 < pts[95][1] < ky1):
            S.contour_labels.append((pts[95], f"+{k * 2}.0"))


def compose(S, img):
    """washes (with granulation and a dried rim) under the ink"""
    base = np.asarray(img).astype(np.float32) / 255.0
    for m, col, st in S.washes:
        a = np.asarray(m).astype(np.float32) / 255.0
        a = np.clip(a * 2.2, 0, 1)
        rim = np.clip(a - np.asarray(m.filter(ImageFilter.GaussianBlur(9))).astype(np.float32) / 255.0 * 2.2, 0, 1)
        gran = S.np.normal(1.0, 0.12, a.shape).astype(np.float32)
        k = np.clip(a * st * gran + rim * 0.6, 0, 1)[..., None]
        c = np.array(col, np.float32) / 255.0
        base = base * (1 - k) + base * c * k  # multiply, like pigment
    img = Image.fromarray(np.clip(base * 255, 0, 255).astype(np.uint8))
    ink = S.ink.filter(ImageFilter.GaussianBlur(0.7))
    inkc = Image.new("RGB", img.size, INK)
    img = Image.composite(inkc, img, ink.point(lambda v: int(min(255, v * 1.05))))
    return img


def paper(w, h, rng):
    n = rng.normal(0, 1, (h // 4, w // 4)).astype(np.float32)
    im = Image.fromarray(np.uint8(np.clip(128 + n * 30, 0, 255))).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.2))
    fib = (np.asarray(im).astype(np.float32) - 128) / 128.0
    yy, xx = np.mgrid[0:h, 0:w]
    vig = 1 - 0.06 * (((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    base = np.array(PAPER, np.float32)[None, None, :] * (1 + fib[..., None] * 0.025) * vig[..., None]
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project")
    ap.add_argument("--px", type=float, default=75.0, help="pixels per metre on the sheet (1:100 at 75 px/m ~ 190 dpi)")
    ap.add_argument("--size", default="3200x2263")
    ap.add_argument("--seed", type=int, default=3)
    a = ap.parse_args()
    plan = json.load(open(os.path.join(a.project, "plan.json"), encoding="utf-8"))
    W, H = map(int, a.size.split("x"))
    lot = plan["lot"]
    px = a.px
    ox = 300 - lot["x0"] * px
    oy = H - 360 + lot["y0"] * px
    S = Sheet(W, H, px, (ox, oy), a.seed)
    S.labels, S.labels_px, S.contour_labels = [], [], []
    img = paper(W, H, S.np)
    if "contours" in plan:
        contours(S, plan["contours"], (lot["x0"] - 1.6, lot["y0"] - 3.2, lot["x1"] + 3.4, lot["y1"] + 1.6))
    # lot, fence, yard, path
    x0, x1, y0, y1 = lot["x0"], lot["x1"], lot["y0"], lot["y1"]
    S.wash([(x0 - 0.3, y0 - 0.3), (x1 + 0.3, y0 - 0.3), (x1 + 0.3, y1 + 0.3), (x0 - 0.3, y1 + 0.3)], (150, 170, 110), 0.28, spread=16, blur=10)
    S.line([(x0 - 1.2, y0 - 1.2), (x1 + 1.2, y0 - 1.2), (x1 + 1.2, y1 + 1.2), (x0 - 1.2, y1 + 1.2)], closed=True, width=1.4, dash=(26, 10))
    if "yard" in plan:
        yd = plan["yard"]
        S.wash([(yd["x0"], yd["y0"]), (yd["x1"], yd["y0"]), (yd["x1"], yd["y1"]), (yd["x0"], yd["y1"])], (176, 156, 128), 0.32, spread=14)
        S.labels.append(((yd["x0"] + yd["x1"]) / 2 + 2.2, (yd["y0"] + yd["y1"]) / 2 - 0.9, f'{yd["label"]}  {yd.get("en", "")}', 34, 0))
    f = plan.get("fence")
    if f:
        t = f["thick"]
        g = f.get("gate")
        runs = [(x0, y0, x1, y0 + t), (x0, y1 - t, x1, y1), (x0, y0 + t, x0 + t, y1 - t)]
        if g and g["side"] == "E":
            runs += [(x1 - t, y0 + t, x1, g["y0"]), (x1 - t, g["y1"], x1, y1 - t)]
            for k in range(3):
                yy = g["y0"] + 0.2 + k * 0.05
                S.line([(x1 - t / 2, g["y0"] + 0.1), (x1 - t / 2, g["y1"] - 0.1)], width=2.0 + k * 0.3, jitter=0.5)
            S.labels.append((x1 + 1.3, (g["y0"] + g["y1"]) / 2, f'{g["label"]}', 30, 90))
        else:
            runs.append((x1 - t, y0 + t, x1, y1 - t))
        for r in runs:
            S.poche(*r)
        S.labels.append((x0 + 3.0, y0 - 0.75, f'{f["label"]}  STONE WALL  h {f["height"]:.2f}', 26, 0))
    for (px_, py_) in plan.get("path", []):
        pts = []
        for k in range(8):
            ang = k / 8 * math.tau
            r = S.rng.uniform(0.26, 0.34)
            pts.append((px_ + math.cos(ang) * r, py_ + math.sin(ang) * r * 0.8))
        S.line(pts, width=1.6, closed=True, jitter=0.3)
    # buildings
    for b in plan.get("buildings", []):
        draw_building(S, b)
    # tree, items
    tr = plan.get("tree")
    if tr:
        cx, cy = tr["at"]
        S.blot(cx, cy, tr["crown"], (96, 140, 70), 0.6)
        for k in range(14):
            a_ = S.rng.uniform(0, math.tau)
            r_ = S.rng.uniform(0.2, tr["crown"] * 0.8)
            S.blot(cx + math.cos(a_) * r_, cy + math.sin(a_) * r_, 0.16, (236, 128, 40), 0.85, n=2)
        pts = [(cx + math.cos(k / 24 * math.tau) * tr["crown"] * (1 + 0.08 * math.sin(k * 1.7)), cy + math.sin(k / 24 * math.tau) * tr["crown"] * (1 + 0.08 * math.sin(k * 1.7))) for k in range(24)]
        S.line(pts, closed=True, width=1.4, jitter=1.2)
        S.labels.append((cx, cy - tr["crown"] - 0.5, tr["label"], 30, 0))
    for it in plan.get("items", []):
        ats = it["at"] if isinstance(it["at"][0], list) else [it["at"]]
        rs = it.get("r", 0.3)
        rs = rs if isinstance(rs, list) else [rs] * len(ats)
        for (cx, cy), r in zip(ats, rs):
            S.line([(cx + math.cos(k / 12 * math.tau) * r, cy + math.sin(k / 12 * math.tau) * r) for k in range(12)], closed=True, width=1.8, jitter=0.2)
            S.line([(cx + math.cos(k / 10 * math.tau) * r * 0.5, cy + math.sin(k / 10 * math.tau) * r * 0.5) for k in range(10)], closed=True, width=1.0, jitter=0.1)
        mx = sum(p[0] for p in ats) / len(ats)
        my = min(p[1] for p in ats)
        S.labels.append((mx, my - 0.75, it["label"], 28, 0))
    # dimensions
    S.dim((x0, y0), (x1, y0), -1.9, f'{x1 - x0:.2f}', 30)
    S.dim((x1, y0), (x1, y1), -2.6, f'{y1 - y0:.2f}', 30)
    for b in plan.get("buildings", []):
        if b["front"] == "S":
            S.dim((b["x0"], b["y1"]), (b["x1"], b["y1"]), 1.9, f'{b["x1"] - b["x0"]:.2f}', 26)
        elif b["front"] == "N":
            S.dim((b["x0"], b["y0"]), (b["x1"], b["y0"]), -0.95, f'{b["x1"] - b["x0"]:.2f}', 26)
        S.dim((b["x0"], b["y0"]), (b["x0"], b["y1"]), 1.2 if b["x0"] > 3 else -1.2, f'{b["y1"] - b["y0"]:.2f}', 24)
    # elevation of the first building, top right
    b0 = plan["buildings"][0]
    ex = W - 300 - ((b0["x1"] - b0["x0"]) + 2) * px
    draw_elevation(S, img, b0, ex + px, 760, px)
    # materials legend: a swatch of each material the build uses (the look, pinned on the paper)
    mats = plan.get("materials", [])
    lx, ly = W - 1000, 1080
    if mats:
        S.labels_px.append((lx + 190, ly - 70, "재료  MATERIALS", 30))
        for k, mt in enumerate(mats):
            yy = ly + k * 78
            X0m, Y0m = (lx - S.ox) / px, (S.oy - yy) / px
            S.wash([(X0m, Y0m), (X0m + 1.3, Y0m), (X0m + 1.3, Y0m - 0.6), (X0m, Y0m - 0.6)], tuple(mt["color"]), 0.8, spread=3, blur=3)
            S.labels_px.append((lx + 130, yy + 22, mt["label"], 28, "lm"))
            S.labels_px.append((lx + 330, yy + 22, mt.get("en", ""), 22, "lm"))
    # north arrow and scale bar
    nx_, ny_ = W - 300, 1250
    d = ImageDraw.Draw(S.ink)
    d.ellipse((nx_ - 70, ny_ - 70, nx_ + 70, ny_ + 70), outline=230, width=3)
    d.polygon([(nx_, ny_ - 92), (nx_ - 26, ny_ + 30), (nx_, ny_ + 8), (nx_ + 26, ny_ + 30)], fill=230)
    S.labels_px.append((nx_, ny_ - 118, "N", 40))
    sx, sy = 300, H - 150
    for k in range(5):
        fill = 230 if k % 2 == 0 else 0
        d.rectangle((sx + k * px, sy, sx + (k + 1) * px, sy + 18), outline=230, fill=fill, width=2)
    for k in (0, 1, 5):
        S.labels_px.append((sx + k * px, sy + 46, f"{k}", 24))
    S.labels_px.append((sx + 5 * px + 60, sy + 9, "m", 26))
    # compose washes + ink, then type
    img = compose(S, img)
    dr = ImageDraw.Draw(img)
    for x, y, txt, size, ang in S.labels:
        X, Y = S.P(x, y)
        fnt = font(FONT_SANS, size, 500)
        if ang and abs(ang) > 1 and abs(abs(ang) - 180) > 1:
            tw = int(dr.textlength(txt, font=fnt)) + 20
            t = Image.new("RGBA", (tw, size + 20), (0, 0, 0, 0))
            ImageDraw.Draw(t).text((tw / 2, (size + 20) / 2), txt, font=fnt, fill=INK, anchor="mm")
            t = t.rotate(ang, expand=True, resample=Image.BICUBIC)
            img.paste(t, (int(X - t.width / 2), int(Y - t.height / 2)), t)
        else:
            dr.text((X, Y), txt, font=fnt, fill=INK, anchor="mm")
    for X, Y, txt, size, *anc in S.labels_px:
        dr.text((X, Y), txt, font=font(FONT_SANS, size, 500), fill=INK, anchor=(anc[0] if anc else "mm"))
    for (x, y), txt in S.contour_labels:
        X, Y = S.P(x, y)
        if 0 < X < W and 0 < Y < H:
            dr.text((X, Y), txt, font=font(FONT_SANS, 22, 400), fill=(110, 100, 90), anchor="mm")
    # title block
    tx0, ty0 = W - 1000, H - 470
    dr.rectangle((tx0, ty0, W - 120, H - 120), outline=INK, width=3)
    dr.line((tx0, ty0 + 200, W - 120, ty0 + 200), fill=INK, width=2)
    dr.text((tx0 + 40, ty0 + 70), plan["title"], font=font(FONT_SERIF, 84), fill=INK, anchor="lm")
    dr.text((tx0 + 44, ty0 + 152), plan.get("subtitle", ""), font=font(FONT_SANS, 30, 500), fill=(90, 84, 76), anchor="lm")
    dr.text((tx0 + 40, ty0 + 250), f'배치평면도  SITE PLAN   {plan.get("scale", "1:100")}', font=font(FONT_SANS, 30, 600), fill=INK, anchor="lm")
    dr.text((tx0 + 40, ty0 + 300), f'대지 {x1 - x0:.1f} × {y1 - y0:.1f} m', font=font(FONT_SANS, 28, 400), fill=INK, anchor="lm")
    out = os.path.join(a.project, "sheet.png")
    img.save(out, optimize=True)
    m = dict(image="sheet.png", size_px=[W, H], px_per_m=px, origin_px=[ox, oy], note="pixel (x right, y down) = origin_px + (x_m, -y_m) * px_per_m")
    json.dump(m, open(os.path.join(a.project, "sheet.json"), "w"), indent=1)
    print(f"{out}: {W}x{H}, {px:g} px/m, the sheet is {W / px:.1f} x {H / px:.1f} m in the film")


if __name__ == "__main__":
    main()
