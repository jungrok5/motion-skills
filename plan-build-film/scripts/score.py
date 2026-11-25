#!/usr/bin/env python3
"""The sound of the film, on the film's own clock (timeline.json): a sound on every landing slot in its stage's
material, panned to where the parts are on screen; a whoosh and a swell on the wave; the lights clicking on; wind and
birds once the land is alive; and a score composed in code at the film's tempo, its build rising bar by bar into the
wave. Mastered to -14 LUFS integrated (ITU-R BS.1770-4 gating) with a -1 dBTP true-peak ceiling. numpy only.

    python3 <skill>/scripts/score.py pbf-out/<name>                 -> pbf-out/<name>/score.wav, score.json
    python3 <skill>/scripts/score.py pbf-out/<name> --music track.wav [--swell 14.0]
        a track of your own instead of the composed one: its swell (found, or given) is offset onto the wave
    python3 <skill>/scripts/score.py --analyse track.wav              tempo, downbeat and swell of a track

Every sound is synthesized here (no samples, no generated audio). A track the person brings is theirs to license.
"""
import argparse
import json
import math
import os
import wave

import numpy as np

SR = 48000
RNG = np.random.default_rng(5)


# ---------------------------------------------------------------- dsp
def fft_filter(x, gain_fn):
    """zero-phase filter by a gain curve over frequency (Hz); x mono or (n, 2)"""
    n = len(x)
    N = 1 << int(math.ceil(math.log2(n + 1024)))
    f = np.fft.rfftfreq(N, 1 / SR)
    g = gain_fn(f)
    if x.ndim == 1:
        return np.fft.irfft(np.fft.rfft(x, N) * g, N)[:n]
    return np.stack([np.fft.irfft(np.fft.rfft(x[:, c], N) * g, N)[:n] for c in range(x.shape[1])], 1)


def bp(f, lo, hi, order=2):
    """a soft band-pass gain curve"""
    f = np.maximum(f, 1e-3)
    return 1 / np.sqrt(1 + (lo / f) ** (2 * order)) / np.sqrt(1 + (f / hi) ** (2 * order))


def env(n, a, d, curve=4.0):
    """attack a seconds, exponential decay d seconds"""
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4) * curve / 4)
    return e


def noise(n):
    return RNG.standard_normal(n)


def modal(freqs, decays, amps, n):
    t = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * t + RNG.uniform(0, 6)) * np.exp(-t / d) for f, d, a in zip(freqs, decays, amps))


def karplus(freq, dur, bright=0.5):
    """a plucked string (Karplus-Strong): the score's melody voice"""
    n = int(dur * SR)
    p = max(2, int(SR / freq))
    buf = RNG.uniform(-1, 1, p)
    buf = fft_filter(np.tile(buf, 3), lambda f: bp(f, 20, 2000 + 6000 * bright))[:p]
    out = np.empty(n)
    k = 0.996
    for i in range(n):
        j = i % p
        out[i] = buf[j]
        buf[j] = k * 0.5 * (buf[j] + buf[(j + 1) % p])
    return out * env(n, 0.002, dur * 0.8)


# ---------------------------------------------------------------- the material voices (one hit = one landing slot)
def voice(kind, n_parts, rng):
    n = int(SR * 0.6)
    det = rng.uniform(0.9, 1.1)
    if kind == "stone_heavy":
        t = np.arange(n) / SR
        thump = np.sin(2 * np.pi * (48 + 40 * np.exp(-t * 18)) * det * t) * np.exp(-t / 0.18)
        grit = fft_filter(noise(n), lambda f: bp(f, 150, 1400)) * env(n, 0.001, 0.05)
        x = thump * 0.9 + grit * 0.35
    elif kind in ("stone", "stone_light"):
        hi = 1.0 if kind == "stone" else 1.7
        click = fft_filter(noise(n), lambda f: bp(f, 700 * hi * det, 3200 * hi * det, 3)) * env(n, 0.0005, 0.03)
        body = modal([210 * hi * det, 520 * hi * det, 1240 * hi * det], [0.05, 0.03, 0.02], [0.6, 0.35, 0.2], n)
        x = click * 0.8 + body * 0.6
    elif kind in ("wood", "wood_light"):
        hi = 1.0 if kind == "wood" else 1.8
        x = modal([180 * hi * det, 470 * hi * det, 1020 * hi * det, 2210 * hi * det], [0.16, 0.09, 0.05, 0.025], [0.7, 0.5, 0.3, 0.12], n)
        x += fft_filter(noise(n), lambda f: bp(f, 800, 5000)) * env(n, 0.0005, 0.015) * 0.4
    elif kind == "paper":
        x = fft_filter(noise(n), lambda f: bp(f, 2400 * det, 9000, 2)) * env(n, 0.012, 0.09) * 0.8
        x += modal([900 * det], [0.03], [0.15], n)
    elif kind == "straw":
        g = env(n, 0.02, 0.16) * (0.6 + 0.4 * np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * rng.uniform(25, 45))))
        x = fft_filter(noise(n), lambda f: bp(f, 1500 * det, 7000, 2)) * g * 0.8
    elif kind == "metal":
        x = modal([620 * det, 1711 * det, 3348 * det], [0.35, 0.22, 0.12], [0.5, 0.35, 0.2], n)
    elif kind == "glass":
        x = modal([2400 * det, 5100 * det], [0.25, 0.12], [0.4, 0.2], n)
    else:  # soft: cushions, cloth, small things
        x = fft_filter(noise(n), lambda f: bp(f, 90, 700)) * env(n, 0.004, 0.06)
        x += modal([1900 * det], [0.08], [0.05], n)
    x = x / (np.max(np.abs(x)) + 1e-9)
    return x * (0.5 + 0.22 * math.log2(1 + n_parts))


# ---------------------------------------------------------------- the composed score
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hz(name, octave):
    return 440.0 * 2 ** ((NOTE[name[0]] + (1 if "#" in name else -1 if "b" in name else 0) + 12 * (octave - 4) - 9) / 12)


def pad(freqs, dur, cutoff, detune=0.004):
    """a soft saw pad, several detuned voices, low-passed"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for f in freqs:
        for d in (-detune, 0, detune):
            ph = RNG.uniform(0, 1)
            x += 2 * ((t * f * (1 + d) + ph) % 1.0) - 1
    x = fft_filter(x, lambda fr: 1 / np.sqrt(1 + (fr / cutoff) ** 4))
    return x / (len(freqs) * 3)


def compose(tl, dur):
    """D minor-ish: Dm - Bb - F - C per bar; a pulse that grows through the build, a swell on the wave,
    a plucked pentatonic line after it, the last chord under the title"""
    beat = 60.0 / tl["bpm"]
    bar = beat * 4
    down = tl.get("downbeat", 0.0)
    T_w = tl["T"]["wave"]
    first = tl["parts"][0]["t"] if tl["parts"] else 1.0
    n = int(dur * SR) + SR
    out = np.zeros((n, 2))
    chords = [("D", "F", "A"), ("Bb", "D", "F"), ("F", "A", "C"), ("C", "E", "G")]

    def put(x, t0, gain=1.0, pan=0.0):
        i = int(t0 * SR)
        if i >= n:
            return
        x = x[: n - i]
        out[i:i + len(x), 0] += x * gain * math.cos((pan + 1) * math.pi / 4)
        out[i:i + len(x), 1] += x * gain * math.sin((pan + 1) * math.pi / 4)
    nb = int(dur / bar) + 2
    for k in range(nb):
        t0 = down + k * bar
        if t0 > dur:
            break
        ch = chords[k % 4]
        before = t0 < T_w - 0.01
        prog = min(1.0, max(0.0, (t0 - first) / max(1.0, T_w - first)))
        if before and t0 + bar > first - bar:
            cutoff = 300 + 1600 * prog ** 1.5
            put(pad([hz(c, 3) for c in ch], bar + 0.4, cutoff), t0, 0.16 + 0.12 * prog)
            put(karplus(hz(ch[0], 2), bar * 0.9, 0.3), t0, 0.35)  # bass on the downbeat
            for b in range(4):  # the pulse: a soft kick on every beat, louder as it builds
                tt = t0 + b * beat
                if tt < first - beat or tt >= T_w - 0.02:
                    continue
                m = int(0.3 * SR)
                tk = np.arange(m) / SR
                kick = np.sin(2 * np.pi * (50 + 70 * np.exp(-tk * 30)) * tk) * np.exp(-tk / 0.12)
                put(kick, tt, 0.25 + 0.3 * prog)
        elif not before:
            put(pad([hz(c, 3) for c in ch] + [hz(ch[0], 4)], bar + 1.2, 2600), t0, 0.22)
            put(karplus(hz(ch[0], 2), bar * 0.95, 0.35), t0, 0.32)
    # the riser into the wave, the crash and the swell on it
    m = int(bar * SR)
    tr = np.arange(m) / SR
    riser = fft_filter(noise(m), lambda f: bp(f, 600, 9000)) * (tr / (bar)) ** 2.5
    put(riser, T_w - bar, 0.32)
    m = int(3.5 * SR)
    crash = fft_filter(noise(m), lambda f: bp(f, 300, 12000)) * env(m, 0.004, 1.6)
    put(crash, T_w, 0.33)
    m = int(0.9 * SR)
    tb = np.arange(m) / SR
    boom = np.sin(2 * np.pi * (38 + 30 * np.exp(-tb * 6)) * tb) * np.exp(-tb / 0.5)
    put(boom, T_w, 0.6)
    sw = pad([hz("D", 3), hz("A", 3), hz("D", 4), hz("F", 4), hz("A", 4)], 4.0, 3200)
    put(sw * env(len(sw), 0.25, 3.2), T_w, 0.42)
    # the plucked line after the wave (D minor pentatonic), sparse, on the eighths
    scale = [("D", 4), ("F", 4), ("G", 4), ("A", 4), ("C", 5), ("D", 5)]
    line = [5, 3, 4, 2, None, 3, 1, None, 2, 0, None, None, 3, 4, 5, None]
    t = T_w + bar / 2
    i = 0
    while t < dur - 1.5:
        nt = line[i % len(line)]
        if nt is not None:
            put(karplus(hz(*scale[nt]), 1.6, 0.6), t, 0.42, pan=0.25 * math.sin(i))
        t += beat / 2 if i % 4 else beat
        i += 1
    # fade out over the last 1.4 s
    fo = int(1.4 * SR)
    e = int(dur * SR)
    out[e - fo:e] *= np.linspace(1, 0, fo)[:, None]
    out[e:] = 0
    return out[: int(dur * SR)]


# ---------------------------------------------------------------- loudness (ITU-R BS.1770-4) and the ceiling
def k_weight(x):
    """the K-weighting curve (high shelf +4 dB above ~1.5 kHz, high-pass at ~38 Hz) applied by magnitude"""
    def g(f):
        f = np.maximum(f, 1e-3)
        shelf = np.sqrt((1 + (f / 1681.97) ** 2 * 10 ** (3.999843 / 10)) / (1 + (f / 1681.97) ** 2))
        hp = (f / 38.135) ** 2 / np.sqrt(1 + (f / 38.135) ** 4)
        return shelf * hp
    return fft_filter(x, g)


def lufs(x):
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = []
    for i in range(0, len(y) - blk, hop):
        ms.append(np.mean(y[i:i + blk] ** 2, axis=0).sum())
    ms = np.array(ms)
    L = -0.691 + 10 * np.log10(ms + 1e-12)
    g1 = ms[L > -70]
    if not len(g1):
        return -99.0
    rel = -0.691 + 10 * np.log10(np.mean(g1)) - 10
    g2 = ms[(L > -70) & (L > rel)]
    return float(-0.691 + 10 * np.log10(np.mean(g2)))


def true_peak(x, up=4):
    n = len(x)
    N = 1 << int(math.ceil(math.log2(n)))
    peaks = []
    for c in range(x.shape[1]):
        X = np.fft.rfft(x[:, c], N)
        Y = np.zeros(N * up // 2 + 1, complex)
        Y[: len(X)] = X
        y = np.fft.irfft(Y, N * up) * up
        peaks.append(np.max(np.abs(y)))
    return 20 * math.log10(max(peaks) + 1e-12)


def limit(x, ceiling_db=-1.2, look=0.004, release=0.08):
    """a look-ahead peak limiter in 1 ms blocks"""
    thr = 10 ** (ceiling_db / 20)
    b = int(SR / 1000)
    nb = len(x) // b + 1
    pk = np.zeros(nb)
    a = np.max(np.abs(x), axis=1)
    for i in range(nb):
        seg = a[i * b:(i + 1) * b]
        pk[i] = seg.max() if len(seg) else 0
    need = np.minimum(1.0, thr / np.maximum(pk, 1e-9))
    la = int(look * 1000)
    g = np.ones(nb)
    cur = 1.0
    rel = math.exp(-1 / (release * 1000))
    for i in range(nb):
        target = need[i:i + la + 1].min()
        cur = target if target < cur else cur * rel + target * (1 - rel)
        g[i] = cur
    gs = np.repeat(g, b)[: len(x)]
    return x * gs[:, None]


def master(x, target=-14.0, tp_max=-1.0):
    """gain to the target loudness, then the limiter; lower the limiter's ceiling until the true peak holds too
    (normalising after limiting pushes inter-sample peaks back over)"""
    ceil = tp_max - 0.3
    y = x
    for _ in range(10):
        y = x * 10 ** ((target - lufs(x)) / 20)
        y = limit(y, ceil)
        y = y * 10 ** ((target - lufs(y)) / 20)
        tp = true_peak(y)
        if tp <= tp_max:
            break
        ceil -= (tp - tp_max) + 0.1
    L = lufs(y)
    return y, L, true_peak(y)


# ---------------------------------------------------------------- a track of your own
def read_wav(path):
    with wave.open(path) as w:
        sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(w.getnframes())
    dt = {2: np.int16, 4: np.int32}[sw]
    x = np.frombuffer(raw, dt).astype(np.float64) / float(np.iinfo(dt).max)
    x = x.reshape(-1, ch)
    if ch == 1:
        x = np.repeat(x, 2, 1)
    if sr != SR:  # resample by FFT
        n2 = int(len(x) * SR / sr)
        x = np.stack([np.fft.irfft(np.fft.rfft(x[:, c]), n2) * n2 / len(x) for c in range(2)], 1)
    return x[:, :2]


def analyse(x):
    """tempo (onset autocorrelation), the first strong downbeat, and the swell (the biggest quarter-second jump in level)"""
    m = x.mean(1)
    hop = 512
    frames = len(m) // hop
    e = np.array([np.sqrt(np.mean(m[i * hop:(i + 1) * hop] ** 2)) for i in range(frames)])
    on = np.maximum(0, np.diff(np.log(e + 1e-6)))
    on -= on.mean()
    ac = np.correlate(on, on, "full")[len(on) - 1:]
    fps = SR / hop
    lags = np.arange(len(ac)) / fps
    ok = (lags > 60 / 180) & (lags < 60 / 60)
    lag = lags[ok][np.argmax(ac[ok])]
    bpm = 60 / lag
    down = float(np.argmax(on[: int(fps * 4)]) / fps)
    w = max(2, int(0.25 * fps))  # the biggest quarter-second jump in level: the moment the swell arrives
    sm = np.convolve(e, np.ones(w) / w, "same")
    rise = sm[w:] - sm[:-w]
    swell = float((np.argmax(rise) + w) / fps)
    return dict(bpm=round(float(bpm), 2), downbeat=round(down, 3), swell=round(swell, 3))


# ---------------------------------------------------------------- assembly
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out", nargs="?", help="the film's output folder (has timeline.json)")
    ap.add_argument("--music", help="a WAV of your own instead of the composed score")
    ap.add_argument("--swell", type=float, help="where the track's swell is (s); found if not given")
    ap.add_argument("--analyse", help="print tempo / downbeat / swell of a WAV and stop")
    ap.add_argument("--lufs", type=float, default=-14.0)
    a = ap.parse_args()
    if a.analyse:
        print(json.dumps(analyse(read_wav(a.analyse)), indent=1))
        return
    tl = json.load(open(os.path.join(a.out, "timeline.json"), encoding="utf-8"))
    dur = tl["duration"]
    n = int(dur * SR)
    fx = np.zeros((n + SR, 2))
    rng = np.random.default_rng(9)
    sound_of = {r["id"]: r.get("sound", "wood") for r in tl["rows"]}
    cam = tl["camera"]
    fps = tl["fps"]

    cx0 = float(np.mean([p["x"] for p in tl["parts"]])) if tl["parts"] else 0.0
    cy0 = float(np.mean([p["y"] for p in tl["parts"]])) if tl["parts"] else 0.0

    def pan_of(t, x, y, z):
        """left-right on screen: the part's direction against the camera's right vector"""
        c = cam[min(len(cam) - 1, int(t * fps))]
        dx, dy = x - c["x"], y - c["y"]
        fwd = np.array([c["fx"], c["fy"]]) if "fx" in c else np.array([cx0 - c["x"], cy0 - c["y"]])
        if np.linalg.norm(fwd) < 1e-3:
            return 0.0
        fwd /= np.linalg.norm(fwd)
        right = np.array([fwd[1], -fwd[0]])
        d = math.hypot(dx, dy) + 1e-3
        return float(np.clip((dx * right[0] + dy * right[1]) / d, -0.8, 0.8)) * 0.8
    slots = {}
    for p in tl["parts"]:
        key = (round(p["t"], 3), p["stage"])
        slots.setdefault(key, []).append(p)
    for (t, st), ps in sorted(slots.items()):
        x = voice(sound_of.get(st, "wood"), len(ps), rng)
        mx = float(np.mean([q["x"] for q in ps]))
        my = float(np.mean([q["y"] for q in ps]))
        pan = pan_of(t, mx, my, 0)
        layers = 1 if len(ps) < 4 else 2 if len(ps) < 16 else 3
        for k in range(layers):
            i = int((t + k * 0.011 + rng.uniform(0, 0.004)) * SR)
            seg = x[: len(fx) - i] * (0.55 if k else 1.0)
            pk = float(np.clip(pan + rng.uniform(-0.25, 0.25) * (k > 0), -1, 1))
            fx[i:i + len(seg), 0] += seg * math.cos((pk + 1) * math.pi / 4) * 0.35
            fx[i:i + len(seg), 1] += seg * math.sin((pk + 1) * math.pi / 4) * 0.35
    T_w = tl["T"]["wave"]
    # lights clicking on, a warm hum under them
    for t in tl.get("lights", []):
        m = int(0.08 * SR)
        c = fft_filter(noise(m), lambda f: bp(f, 1500, 6000)) * env(m, 0.0005, 0.01) * 0.25
        i = int(t * SR)
        fx[i:i + m] += c[:, None]
    # wind and birds once the land is alive
    i0 = int(T_w * SR)
    m = n - i0
    if m > 0:
        wind = fft_filter(noise(m), lambda f: bp(f, 120, 900)) * (0.5 + 0.5 * np.sin(np.arange(m) / SR * 0.7 + 1)) * 0.05
        wind *= np.minimum(1, np.arange(m) / (1.5 * SR))
        fx[i0:i0 + m, 0] += wind
        fx[i0:i0 + m, 1] += np.roll(wind, 3000)
        for k in range(7):
            t = T_w + 1.2 + k * rng.uniform(0.7, 1.4)
            if t > dur - 1:
                break
            mm = int(0.18 * SR)
            tt = np.arange(mm) / SR
            f0 = rng.uniform(2800, 4200)
            chirp = np.sin(2 * np.pi * (f0 + 1800 * np.sin(tt * 40)) * tt) * env(mm, 0.01, 0.06) * 0.05
            i = int(t * SR)
            pn = rng.uniform(-0.7, 0.7)
            fx[i:i + mm, 0] += chirp * math.cos((pn + 1) * math.pi / 4)
            fx[i:i + mm, 1] += chirp * math.sin((pn + 1) * math.pi / 4)
    fx = fx[:n]
    report = dict(hits=len(slots), landings=len(tl["parts"]))
    if a.music:
        mus = read_wav(a.music)
        an = analyse(mus)
        swell = a.swell if a.swell is not None else an["swell"]
        off = T_w - swell  # where the track starts on the film's clock
        music = np.zeros((n, 2))
        if off >= 0:
            seg = mus[: n - int(off * SR)]
            music[int(off * SR):int(off * SR) + len(seg)] = seg
        else:
            seg = mus[int(-off * SR):int(-off * SR) + n]
            music[: len(seg)] = seg
        fo = int(1.4 * SR)
        music[n - fo:] *= np.linspace(1, 0, fo)[:, None]
        music *= 0.6
        report.update(music=os.path.basename(a.music), track=an, swell=swell, offset=round(off, 3))
    else:
        music = compose(tl, dur)
        report.update(music="composed in code", bpm=tl["bpm"])
    rms = lambda v: 20 * math.log10(np.sqrt(np.mean(v ** 2)) + 1e-12)  # noqa: E731
    report.update(fx_rms=round(rms(fx), 1), music_rms=round(rms(music), 1))
    mix = fx + music
    mix, L, tp = master(mix, a.lufs)
    report.update(lufs=round(L, 2), true_peak=round(tp, 2), duration=round(len(mix) / SR, 3))
    path = os.path.join(a.out, "score.wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())
    json.dump(report, open(os.path.join(a.out, "score.json"), "w"), indent=1)
    print(f"{path}: {report['hits']} hits for {report['landings']} landings, {L:.2f} LUFS, true peak {tp:.2f} dBTP")


if __name__ == "__main__":
    main()
