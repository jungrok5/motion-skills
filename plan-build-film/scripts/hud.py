#!/usr/bin/env python3
"""The parts counter and the title over the rendered frames, then the film itself (frames + score.wav -> MP4).

The counter is a still card top-left while the building goes up: one row per stage (its flash colour, its label, how
many of its parts have landed, a thin bar), the total underneath in big tabular figures. It reads every landing from
timeline.json, so a number changes on the very frame a part sits down. It fades out as the wave leaves; the title
(film.json "title", "subtitle", "credit" with {parts}) fades in near the end.

    python3 <skill>/scripts/hud.py pbf-out/<name>                  -> pbf-out/<name>/final/ + final.mp4 (with score.wav if present)
    python3 <skill>/scripts/hud.py pbf-out/<name> --test 9.5        one overlaid frame -> pbf-out/<name>/hud_9.50.png
"""
import argparse
import json
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SANS = os.path.join(SKILL, "fonts", "ALFSans-ksx1001.woff2")
SERIF = os.path.join(SKILL, "fonts", "NanumMyeongjo-800-ksx1001.woff2")
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")


def font(path, size, weight=None):
    f = ImageFont.truetype(path, max(8, int(round(size))))
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except (OSError, AttributeError):
            pass
    return f


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def srgb(c, a=255):
    return tuple(int(round(255 * max(0.0, min(1.0, v)) ** (1 / 2.2))) for v in c) + (a,)


class Hud:
    def __init__(s, tl, W, H):
        s.tl, s.W, s.H = tl, W, H
        k = H / 1080.0
        s.k = k
        s.rows = tl["rows"]
        s.row_of = {r["id"]: i for i, r in enumerate(s.rows)}
        s.lands = sorted((p["t"], s.row_of[p["stage"]]) for p in tl["parts"] if p["stage"] in s.row_of)
        s.totals = [sum(1 for _, r in s.lands if r == i) for i in range(len(s.rows))]
        s.total = sum(s.totals)
        hud = tl.get("hud", {})
        s.heading, s.sub = hud.get("heading", "부재 목록"), hud.get("sub", "PARTS")
        s.t_in = float(hud.get("in", 0.9))
        s.t_out = tl["T"]["wave"] + 0.25
        s.t_title = tl["T"]["title"]
        s.f_head = font(SANS, 30 * k, 700)
        s.f_sub = font(SANS, 19 * k, 500)
        s.f_row = font(SANS, 23 * k, 500)
        s.f_num = font(SANS, 23 * k, 600)
        s.f_big = font(SANS, 64 * k, 700)
        s.f_tot = font(SANS, 20 * k, 600)
        s.f_title = font(SERIF, 92 * k)
        s.f_st = font(SANS, 28 * k, 500)
        s.f_cr = font(SANS, 19 * k, 600)

    def counts(s, t):
        c = [0] * len(s.rows)
        for tt, r in s.lands:
            if tt > t + 1e-6:
                break
            c[r] += 1
        return c

    def frame(s, t):
        W, H, k = s.W, s.H, s.k
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        a_card = smooth((t - s.t_in) / 0.5) * (1 - smooth((t - s.t_out) / 0.6))
        if a_card > 0.003:
            card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            d = ImageDraw.Draw(card)
            X, Y, CW = int(48 * k), int(44 * k), int(430 * k)
            rh = int(38 * k)
            CH = int(92 * k) + rh * (len(s.rows) - 1) + int(126 * k)
            d.rounded_rectangle((X, Y, X + CW, Y + CH), radius=int(14 * k), fill=(250, 248, 243, 226), outline=(40, 38, 34, 40), width=max(1, int(1.5 * k)))
            d.text((X + int(26 * k), Y + int(30 * k)), s.heading, font=s.f_head, fill=(34, 32, 30, 255), anchor="lm")
            d.text((X + CW - int(26 * k), Y + int(32 * k)), s.sub, font=s.f_sub, fill=(120, 112, 104, 255), anchor="rm")
            d.line((X + int(24 * k), Y + int(64 * k), X + CW - int(24 * k), Y + int(64 * k)), fill=(40, 38, 34, 70), width=max(1, int(k)))
            c = s.counts(t)
            for i, r in enumerate(s.rows):
                yy = Y + int(92 * k) + i * rh
                col = srgb(r["color"])
                live = c[i] > 0 and c[i] < s.totals[i]
                d.ellipse((X + int(26 * k), yy - int(7 * k), X + int(40 * k), yy + int(7 * k)), fill=col)
                d.text((X + int(54 * k), yy), r["label"], font=s.f_row, fill=(34, 32, 30, 255 if c[i] else 130), anchor="lm")
                d.text((X + CW - int(26 * k), yy), f"{c[i]:,}", font=s.f_num, fill=(34, 32, 30, 255 if c[i] else 110), anchor="rm")
                bx0, bx1 = X + int(54 * k), X + CW - int(26 * k)
                by = yy + int(15 * k)
                d.line((bx0, by, bx1, by), fill=(40, 38, 34, 28), width=max(1, int(2 * k)))
                if s.totals[i]:
                    d.line((bx0, by, bx0 + (bx1 - bx0) * c[i] / s.totals[i], by), fill=col[:3] + (255 if live else 190,), width=max(1, int(3 * k)))
            yy = Y + CH - int(52 * k)
            d.line((X + int(24 * k), yy - int(46 * k), X + CW - int(24 * k), yy - int(46 * k)), fill=(40, 38, 34, 70), width=max(1, int(k)))
            d.text((X + int(26 * k), yy), "합계  TOTAL", font=s.f_tot, fill=(90, 84, 76, 255), anchor="lm")
            d.text((X + CW - int(24 * k), yy + int(2 * k)), f"{sum(c):,}", font=s.f_big, fill=(28, 26, 24, 255), anchor="rm")
            if a_card < 0.999:
                card.putalpha(card.getchannel("A").point(lambda v: int(v * a_card)))
            im = Image.alpha_composite(im, card)
        a_t = smooth((t - s.t_title) / 0.9)
        if a_t > 0.003:
            tc = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            d = ImageDraw.Draw(tc)
            X, Y = W - int(70 * k), H - int(150 * k)
            sh = (0, 0, 0, 120)
            for dx, dy in ((2, 2), (0, 2)):
                d.text((X + dx * k, Y + dy * k), s.tl.get("title", ""), font=s.f_title, fill=sh, anchor="rs")
            d.text((X, Y), s.tl.get("title", ""), font=s.f_title, fill=(250, 246, 236, 255), anchor="rs")
            d.text((X, Y + int(48 * k)), s.tl.get("subtitle", ""), font=s.f_st, fill=(244, 236, 220, 240), anchor="rs")
            cr = s.tl.get("credit", "").replace("{parts}", f"{s.total:,}")
            d.text((X, Y + int(86 * k)), cr, font=s.f_cr, fill=(236, 226, 206, 210), anchor="rs")
            tc.putalpha(tc.getchannel("A").point(lambda v: int(v * a_t)))
            im = Image.alpha_composite(im, tc)
        return im


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("--frames", help="rendered frames (default <out>/frames)")
    ap.add_argument("--test", type=float, help="draw one moment and stop")
    ap.add_argument("--crf", default="18")
    a = ap.parse_args()
    tl = json.load(open(os.path.join(a.out, "timeline.json"), encoding="utf-8"))
    fd = a.frames or os.path.join(a.out, "frames")
    fps, nf = tl["fps"], int(round(tl["duration"] * tl["fps"]))
    files = sorted(f for f in os.listdir(fd) if f.startswith("f_") and f.endswith(".png"))
    if not files:
        raise SystemExit(f"no frames in {fd}: render them with kit/film.py first")
    W, H = Image.open(os.path.join(fd, files[0])).size
    hud = Hud(tl, W, H)
    if a.test is not None:
        f = 1 + int(round(a.test * fps))
        src = os.path.join(fd, f"f_{f:04d}.png")
        bg = Image.open(src).convert("RGBA") if os.path.exists(src) else Image.new("RGBA", (W, H), (120, 120, 120, 255))
        out = os.path.join(a.out, f"hud_{a.test:05.2f}.png")
        Image.alpha_composite(bg, hud.frame(a.test)).convert("RGB").save(out)
        print(out)
        return
    od = os.path.join(a.out, "final")
    os.makedirs(od, exist_ok=True)
    missing = [f for f in range(1, nf + 1) if not os.path.exists(os.path.join(fd, f"f_{f:04d}.png"))]
    if missing:
        raise SystemExit(f"{len(missing)} frames missing (first {missing[0]}): finish the render (film.py resumes)")
    for f in range(1, nf + 1):
        t = (f - 1) / fps
        bg = Image.open(os.path.join(fd, f"f_{f:04d}.png")).convert("RGBA")
        Image.alpha_composite(bg, hud.frame(t)).convert("RGB").save(os.path.join(od, f"f_{f:04d}.jpg"), quality=94)
    mp4 = os.path.join(a.out, "final.mp4")
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(od, "f_%04d.jpg")]
    wav = os.path.join(a.out, "score.wav")
    if os.path.exists(wav):
        cmd += ["-i", wav, "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", a.crf, "-preset", "slow", "-movflags", "+faststart", mp4]
    subprocess.run(cmd, check=True)
    print(f"{mp4}: {nf} frames {W}x{H} at {fps} fps{' with score.wav' if os.path.exists(wav) else ' (silent: run score.py first)'}")


if __name__ == "__main__":
    main()
