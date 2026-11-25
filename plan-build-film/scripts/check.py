#!/usr/bin/env python3
"""Checks a film the way a viewer would catch it, and reports numbers, not only pass / fail.

  build      no part floats (audit.json from the build), no part under 3 mm
  order      no part lands before what holds it up (a stone on a course not laid yet, a rope on a roof not there)
  beat       every landing sits on the beat grid (within half a frame); the wave starts on a beat, the lights after it
  camera     clearance: the camera never sits in or against something once the house stands (centre ray >= 0.6 m,
             every ray >= 0.2 m); no camera jump (a frame's move > 3x its neighbours' and > 0.5 m)
  frames     all there; no blank frame; no pop (a frame-to-frame change 4x the local median: something appears
             from nowhere or the camera jumps); no freeze while the camera moves; no long stare at a blank surface
  sound      score.wav at -14 LUFS +-0.5 integrated, true peak <= -1 dBTP, as long as the film
Writes <out>/check.json and <out>/contact.jpg (one frame a second).

    python3 <skill>/scripts/check.py pbf-out/<name> [--frames pbf-out/<name>/frames] [--step 1]
"""
import argparse
import json
import math
import os
import statistics
import sys
import wave

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def load_score():
    import importlib.util
    spec = importlib.util.spec_from_file_location("score", os.path.join(os.path.dirname(os.path.abspath(__file__)), "score.py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("--frames")
    ap.add_argument("--step", type=int, default=1, help="the render's --step (2 = every other frame was rendered)")
    a = ap.parse_args()
    tl = json.load(open(os.path.join(a.out, "timeline.json"), encoding="utf-8"))
    fps, dur = tl["fps"], tl["duration"]
    nf = int(round(dur * fps))
    fails, warns, nums = [], [], {}

    # ---- build
    ap_ = os.path.join(a.out, "audit.json")
    if os.path.exists(ap_):
        au = json.load(open(ap_))
        nums["parts"] = au["parts"]
        nums["floaters"] = len(au["floaters"])
        if au["floaters"]:
            fails.append(f"build: {len(au['floaters'])} parts float (touch nothing): {', '.join(au['floaters'][:8])}")
        if au["tiny"]:
            warns.append(f"build: {len(au['tiny'])} parts under 3 mm")
    else:
        warns.append("build: no audit.json (run the build or film.py first)")

    # ---- order: what holds each part up must already be there
    parts = [p for p in tl["parts"] if "lo" in p]
    on_air = []
    if parts:
        cell = 1.0
        grid = {}
        for i, p in enumerate(parts):
            for gx in range(int(math.floor(p["lo"][0] / cell)), int(math.floor(p["hi"][0] / cell)) + 1):
                for gy in range(int(math.floor(p["lo"][1] / cell)), int(math.floor(p["hi"][1] / cell)) + 1):
                    grid.setdefault((gx, gy), []).append(i)
        for i, p in enumerate(parts):
            if p["lo"][2] <= 0.02 or p.get("grow"):
                continue
            cand = set()
            for gx in range(int(math.floor(p["lo"][0] / cell)), int(math.floor(p["hi"][0] / cell)) + 1):
                for gy in range(int(math.floor(p["lo"][1] / cell)), int(math.floor(p["hi"][1] / cell)) + 1):
                    cand.update(grid.get((gx, gy), ()))
            below_any, below_ready = False, False
            for j in cand:
                if j == i:
                    continue
                q = parts[j]
                ox = min(p["hi"][0], q["hi"][0]) - max(p["lo"][0], q["lo"][0])
                oy = min(p["hi"][1], q["hi"][1]) - max(p["lo"][1], q["lo"][1])
                if ox <= 0.005 or oy <= 0.005:
                    continue
                if q["lo"][2] < p["lo"][2] - 0.01 and q["hi"][2] >= p["lo"][2] - 0.06:  # q reaches up to p's underside
                    below_any = True
                    if q["t"] <= p["t"] + 1e-6:
                        below_ready = True
                        break
            if below_any and not below_ready:
                on_air.append(p)
        nums["lands_on_air"] = len(on_air)
        if on_air:
            ex = ", ".join(f"{p['name']}@{p['t']:.2f}s" for p in on_air[:6])
            (fails if len(on_air) > max(3, len(parts) // 200) else warns).append(f"order: {len(on_air)} parts land before what holds them up ({ex})")
    else:
        warns.append("order: timeline has no part boxes (re-run film.py)")

    # ---- beat
    beat = 60.0 / tl["bpm"]
    g = beat / tl.get("grid", 4)
    down = tl.get("downbeat", 0.0)
    off = [abs(((p["t"] - down) / g) - round((p["t"] - down) / g)) * g for p in tl["parts"]]
    nums["landings"] = len(tl["parts"])
    nums["hit_slots"] = len({round(p["t"], 3) for p in tl["parts"]})
    nums["off_grid_max_ms"] = round(max(off) * 1000, 2) if off else 0
    if off and max(off) > 0.5 / fps:
        fails.append(f"beat: a landing is {max(off) * 1000:.0f} ms off the grid")
    tw = tl["T"]["wave"]
    wb = (tw - down) / beat
    if abs(wb - round(wb)) > 0.01:
        fails.append(f"beat: the wave starts between beats ({wb:.2f})")
    elif round(wb) % 4:
        warns.append(f"beat: the wave starts on beat {round(wb)}, not on a bar's downbeat")
    if tl["parts"] and max(p["t"] for p in tl["parts"]) > tw:
        fails.append("beat: parts are still landing after the wave")
    if tl.get("lights") and min(tl["lights"]) < tw:
        fails.append("beat: a light comes on before the wave")

    # ---- camera
    cl = tl.get("clearance", [])
    if cl:
        bad_c = [c for c in cl if c["center"] < 0.6]
        bad_m = [c for c in cl if c["min"] < 0.2]
        nums["clearance_min_m"] = min(c["min"] for c in cl)
        nums["clearance_center_min_m"] = min(c["center"] for c in cl)
        if bad_c:
            fails.append(f"camera: faces something closer than 0.6 m at {', '.join(str(c['t']) for c in bad_c[:6])} s")
        if bad_m:
            fails.append(f"camera: grazes something (< 0.2 m) at {', '.join(str(c['t']) for c in bad_m[:6])} s")
    cam = tl.get("camera", [])
    if len(cam) > 3:
        mv = [math.dist((cam[i]["x"], cam[i]["y"], cam[i]["z"]), (cam[i - 1]["x"], cam[i - 1]["y"], cam[i - 1]["z"])) for i in range(1, len(cam))]
        jumps = []
        for i in range(len(mv)):
            nb = mv[max(0, i - 6):i] + mv[i + 1:i + 7]
            if nb and mv[i] > 0.5 and mv[i] > 3 * statistics.median(nb):
                jumps.append(round(cam[i + 1]["t"], 2))
        nums["camera_max_step_m"] = round(max(mv), 3)
        if jumps:
            fails.append(f"camera: jumps at {jumps[:6]} s")

    # ---- frames
    fd = a.frames or os.path.join(a.out, "final")
    ext = ".jpg"
    if not os.path.isdir(fd) or not os.listdir(fd):
        fd, ext = os.path.join(a.out, "frames"), ".png"
    want = list(range(1, nf + 1, a.step))
    have = [f for f in want if os.path.exists(os.path.join(fd, f"f_{f:04d}{ext}"))]
    nums["frames"] = f"{len(have)}/{len(want)}"
    if len(have) < len(want):
        fails.append(f"frames: {len(want) - len(have)} missing in {fd}")
    if have:
        small = []
        for f in have:
            im = Image.open(os.path.join(fd, f"f_{f:04d}{ext}")).convert("L").resize((96, 54), Image.BILINEAR)
            small.append(np.asarray(im, np.float32))
        stds = [float(s.std()) for s in small]
        blank = [have[i] for i, s in enumerate(stds) if s < 5.0]
        if blank:
            fails.append(f"frames: {len(blank)} blank frames (first {blank[0]})")
        d = [float(np.mean(np.abs(small[i] - small[i - 1]))) for i in range(1, len(small))]
        pops, freezes = [], []
        for i in range(len(d)):
            nb = d[max(0, i - 12):i] + d[i + 1:i + 13]
            med = statistics.median(nb) if nb else 0
            if d[i] > 6.0 and d[i] > 4 * max(med, 0.5):
                pops.append(round((have[i + 1] - 1) / fps, 2))
            if cam and d[i] < 0.02:
                c0, c1 = cam[min(len(cam) - 1, have[i] - 1)], cam[min(len(cam) - 1, have[i + 1] - 1)]
                if math.dist((c0["x"], c0["y"], c0["z"]), (c1["x"], c1["y"], c1["z"])) > 0.01:
                    freezes.append(round((have[i + 1] - 1) / fps, 2))
        nums["frame_diff_median"] = round(statistics.median(d), 2) if d else 0
        nums["frame_diff_max"] = round(max(d), 2) if d else 0
        if pops:
            fails.append(f"frames: a pop / stutter at {pops[:8]} s (frame-to-frame change 4x the neighbours')")
        if freezes:
            warns.append(f"frames: {len(freezes)} frozen frames while the camera moves (first {freezes[0]} s)")
        flat = 0
        worst = 0
        for s in small:
            c = s[14:40, 24:72]
            flat = flat + 1 if c.std() < 3.0 else 0
            worst = max(worst, flat)
        nums["longest_blank_stare_frames"] = worst
        if worst > fps // 2:
            warns.append(f"frames: the middle of the frame is one flat surface for {worst} frames (a blank wall up close?)")
        # contact sheet: one frame a second
        picks = [f for f in have if (f - 1) % fps == 0]
        W0, H0 = Image.open(os.path.join(fd, f"f_{have[0]:04d}{ext}")).size
        tw_, th_ = 320, int(320 * H0 / W0)
        cols = 6
        rows = (len(picks) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw_, rows * th_), (20, 20, 20))
        for k, f in enumerate(picks):
            sheet.paste(Image.open(os.path.join(fd, f"f_{f:04d}{ext}")).convert("RGB").resize((tw_, th_)), ((k % cols) * tw_, (k // cols) * th_))
        sheet.save(os.path.join(a.out, "contact.jpg"), quality=82)

    # ---- sound
    wp = os.path.join(a.out, "score.wav")
    if os.path.exists(wp):
        sc = load_score()
        with wave.open(wp) as w:
            x = np.frombuffer(w.readframes(w.getnframes()), "<i2").reshape(-1, w.getnchannels()).astype(np.float64) / 32768
            sr = w.getframerate()
        L, tp = sc.lufs(x), sc.true_peak(x)
        nums.update(lufs=round(L, 2), true_peak_dbtp=round(tp, 2), audio_s=round(len(x) / sr, 3))
        if abs(L + 14) > 0.5:
            fails.append(f"sound: {L:.2f} LUFS (want -14 +-0.5)")
        if tp > -1.0:
            fails.append(f"sound: true peak {tp:.2f} dBTP (want <= -1)")
        if abs(len(x) / sr - dur) > 0.1:
            fails.append(f"sound: {len(x) / sr:.2f} s for a {dur:.2f} s film")
    else:
        warns.append("sound: no score.wav (run score.py)")

    rep = dict(ok=not fails, fails=fails, warns=warns, numbers=nums)
    json.dump(rep, open(os.path.join(a.out, "check.json"), "w"), indent=1, ensure_ascii=False)
    for k, v in nums.items():
        print(f"  {k}: {v}")
    for w_ in warns:
        print("WARN", w_)
    for f_ in fails:
        print("FAIL", f_)
    print("check: OK" if not fails else f"check: {len(fails)} failing")
    sys.exit(0 if not fails else 1)


if __name__ == "__main__":
    main()
