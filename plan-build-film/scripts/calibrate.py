#!/usr/bin/env python3
"""A person's own sketch, plan or photo of one, as the film's sheet: the pixel <-> metre mapping (sheet.json) from
two points whose metres you know, and a metre grid drawn over the image to read walls, doors and windows by hand.

    python3 <skill>/scripts/calibrate.py <project> --image napkin.jpg --a 412,1630:0,0 --b 1580,522:14,14
        -> <project>/sheet.png (a copy), sheet.json, grid.png (1 m grid, every 5 m labelled)

--a / --b are "pixel_x,pixel_y:metre_x,metre_y". Pick two corners the drawing dimensions (trust the labels over the
pixels: an image model draws a 14 m square 745 px wide and 670 px tall). If the x and y scales differ by more than
3 %, the drawing is not square to the camera or not to scale: say so, and either photograph it again straight down
or pass --anisotropic to keep a scale per axis (the film then maps the sheet with both).
"""
import argparse
import json
import os
import shutil

from PIL import Image, ImageDraw, ImageFont

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def pt(s):
    p, m = s.split(":")
    px, py = map(float, p.split(","))
    mx, my = map(float, m.split(","))
    return (px, py), (mx, my)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project")
    ap.add_argument("--image", required=True)
    ap.add_argument("--a", required=True)
    ap.add_argument("--b", required=True)
    ap.add_argument("--anisotropic", action="store_true")
    a = ap.parse_args()
    (pa, ma), (pb, mb) = pt(a.a), pt(a.b)
    sx = (pb[0] - pa[0]) / (mb[0] - ma[0])
    sy = -(pb[1] - pa[1]) / (mb[1] - ma[1])  # image y runs down, metres y up
    diff = abs(sx - sy) / max(sx, sy)
    print(f"scale: {sx:.2f} px/m across, {sy:.2f} px/m up ({diff * 100:.1f} % apart)")
    if diff > 0.03 and not a.anisotropic:
        print("WARNING: the two axes disagree by more than 3 %: re-shoot straight down, or pass --anisotropic")
    px = (sx + sy) / 2
    ox = pa[0] - ma[0] * sx
    oy = pa[1] + ma[1] * sy
    im = Image.open(a.image).convert("RGB")
    os.makedirs(a.project, exist_ok=True)
    im.save(os.path.join(a.project, "sheet.png"))
    m = dict(image="sheet.png", size_px=list(im.size), px_per_m=px, origin_px=[ox, oy], source=os.path.basename(a.image),
             note="pixel (x right, y down) = origin_px + (x_m, -y_m) * px_per_m")
    if a.anisotropic:
        m["px_per_m_xy"] = [sx, sy]
    json.dump(m, open(os.path.join(a.project, "sheet.json"), "w"), indent=1)
    g = im.copy()
    d = ImageDraw.Draw(g, "RGBA")
    try:
        f = ImageFont.truetype(os.path.join(SKILL, "fonts", "ALFSans-ksx1001.woff2"), max(12, int(px * 0.35)))
    except OSError:
        f = ImageFont.load_default()
    W, H = im.size
    x0, x1 = int(-ox / sx) - 1, int((W - ox) / sx) + 1
    y0, y1 = int((oy - H) / sy) - 1, int(oy / sy) + 1
    for k in range(x0, x1 + 1):
        X = ox + k * sx
        d.line((X, 0, X, H), fill=(220, 40, 40, 150 if k % 5 == 0 else 60), width=2 if k % 5 == 0 else 1)
        if k % 5 == 0:
            d.text((X + 4, 4), f"{k} m", font=f, fill=(200, 30, 30, 255))
    for k in range(y0, y1 + 1):
        Y = oy - k * sy
        d.line((0, Y, W, Y), fill=(40, 90, 220, 150 if k % 5 == 0 else 60), width=2 if k % 5 == 0 else 1)
        if k % 5 == 0:
            d.text((4, Y + 4), f"{k} m", font=f, fill=(30, 70, 200, 255))
    g.save(os.path.join(a.project, "grid.png"))
    print(f"{a.project}/sheet.json, sheet.png, grid.png: read the openings on grid.png, write them into plan.json")
    if os.path.abspath(a.image) != os.path.abspath(os.path.join(a.project, "sheet.png")):
        shutil.copystat(a.image, os.path.join(a.project, "sheet.png"))


if __name__ == "__main__":
    main()
