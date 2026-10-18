"""synth.py — a tiny numpy instrument + sound-effect kit for promo-video soundtracks (deterministic, no samples needed).

Import it from a video's sound.py (mix.py puts this folder on sys.path):
    import synth as s
    T = s.Track(dur); T.add(t, s.marimba(72, 0.6), gain, pan=-0.2); return s.finish(s.reverb(T.stereo()), dur)

Instruments: ks_pluck, marimba, glock, epiano, pad, pluck_bass, sub_bass, stab, saw_bl, additive
Drums:       kick, snare, clap, hat, shaker, rim
UI sfx:      pop, swoosh, chime, shutter, buzz, tick, rip
Helpers:     midi, env, noise, hp, lp, Track, reverb, finish, write_wav, load (any audio file -> mono), clip, tempo
Song recipes built with this kit: references/song-recipes.py and examples/*/sound.py.
"""
import subprocess, wave
import numpy as np

SR = 44100
def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def env(n, a=0.005, d=0.1, s=0.0, r=0.05, hold=None):
    """ADSR envelope of length n samples. hold = seconds before release."""
    t = np.arange(n) / SR
    e = np.ones(n)
    ai = t < a
    e[ai] = t[ai] / a
    di = (t >= a)
    e[di] = s + (1 - s) * np.exp(-(t[di] - a) / max(d, 1e-4))
    if hold is not None:
        ri = t >= hold
        e[ri] *= np.exp(-(t[ri] - hold) / max(r, 1e-4))
    return e


def additive(freq, dur, partials, decay_scale=1.0):
    """partials: list of (ratio, amp, decay_seconds)"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for ratio, amp, dec in partials:
        f = freq * ratio
        if f > SR / 2 - 500:
            continue
        y += amp * np.sin(2 * np.pi * f * t) * np.exp(-t / (dec * decay_scale))
    return y


def saw_bl(freq, dur, nh=14, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k in range(1, nh + 1):
        if freq * k > 12000:
            break
        y += (1 / k) * (bright ** (k - 1)) * np.sin(2 * np.pi * freq * k * t)
    return y


def ks_pluck(freq, dur, bright=0.5, damp=0.996, seed=0):
    """Karplus-Strong plucked string, processed one period at a time."""
    n = int(dur * SR)
    N = max(2, int(SR / freq))
    rng = np.random.default_rng(seed)
    buf = rng.uniform(-1, 1, N)
    # soften the excitation
    for _ in range(int((1 - bright) * 4)):
        buf = 0.5 * (buf + np.roll(buf, 1))
    buf -= buf.mean()
    out = np.zeros(n + N)
    out[:N] = buf
    i = N
    while i < n:
        prev = out[i - N:i]
        nxt = damp * 0.5 * (prev + np.concatenate(([out[i - N - 1] if i - N - 1 >= 0 else prev[-1]], prev[:-1])))
        out[i:i + N] = nxt
        i += N
    y = out[:n]
    return y / (np.max(np.abs(y)) + 1e-9)


def noise(n, seed=0):
    return np.random.default_rng(seed).uniform(-1, 1, n)


def hp(x, k=1):
    for _ in range(k):
        x = np.diff(x, prepend=0)
    return x


def lp(x, a=0.2):
    """cheap low-pass: moving average of width ~1/a"""
    w = max(1, int(1 / a))
    return np.convolve(x, np.ones(w) / w, mode='same')


# ---------- drums ----------
def kick(dur=0.45, f0=150, f1=45, punch=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.16)
    click = noise(n, 3) * np.exp(-t / 0.004) * 0.3 * punch
    return y + click


def snare(dur=0.25, tone=190, seed=1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = hp(noise(n, seed)) * np.exp(-t / 0.06)
    tn = np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.05)
    return 0.6 * nz + 0.5 * tn


def clap(dur=0.3, seed=2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = hp(noise(n, seed))
    e = np.zeros(n)
    for off in (0, 0.011, 0.022):
        tt = t - off
        e += np.where(tt >= 0, np.exp(-np.clip(tt, 0, None) / (0.012 if off < 0.02 else 0.09)), 0)
    return nz * e * 0.6


def hat(dur=0.06, seed=4, open_=False):
    d = 0.25 if open_ else dur
    n = int(d * SR)
    t = np.arange(n) / SR
    return hp(noise(n, seed), 2) * np.exp(-t / (0.08 if open_ else 0.015)) * 0.35


def shaker(dur=0.09, seed=5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return hp(noise(n, seed), 2) * e * 0.18


def rim(dur=0.08):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * 0.5 + hp(noise(n, 9)) * 0.4) * np.exp(-t / 0.012)


# ---------- instruments ----------
def marimba(note, dur=0.6):
    f = midi(note)
    return additive(f, dur, [(1, 1, 0.35), (3.93, 0.25, 0.06), (9.2, 0.08, 0.02)]) * env(int(dur * SR), a=0.002, d=10)


def glock(note, dur=1.2):
    f = midi(note)
    return additive(f, dur, [(1, 1, 0.8), (2.76, 0.4, 0.25), (5.4, 0.2, 0.1), (8.9, 0.1, 0.05)]) * env(int(dur * SR), a=0.001, d=10)


def epiano(note, dur=1.6, vel=1.0):
    """FM-ish Rhodes"""
    f = midi(note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * f * t) * 1.6 * np.exp(-t / 0.25) * vel
    car = np.sin(2 * np.pi * f * t + mod)
    bell = np.sin(2 * np.pi * f * 4 * t) * 0.12 * np.exp(-t / 0.08)
    return (car + bell) * env(n, a=0.004, d=1.3, s=0.0) * 0.8


def pad(note, dur, bright=0.55):
    y = 0
    for det in (-0.08, 0.0, 0.07):
        y = y + saw_bl(midi(note + det), dur, nh=10, bright=bright)
    n = len(y)
    t = np.arange(n) / SR
    a = np.clip(t / 0.25, 0, 1) * np.clip((dur - t) / 0.35, 0, 1)
    return lp(y, 0.08) * a * 0.12


def pluck_bass(note, dur=0.4):
    f = midi(note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.05)
    return y * env(n, a=0.003, d=0.22, s=0.0)


def sub_bass(note, dur):
    f = midi(note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(2 * np.pi * 2 * f * t)
    a = np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.06, 0, 1)
    return y * a


def stab(notes, dur=0.3, bright=0.7):
    y = 0
    for nn in notes:
        y = y + saw_bl(midi(nn), dur, nh=12, bright=bright) + saw_bl(midi(nn + 0.1), dur, nh=12, bright=bright)
    n = len(y)
    return lp(y, 0.12) * env(n, a=0.002, d=0.09, s=0.0) * 0.12


# ---------- mixing helpers ----------
class Track:
    def __init__(self, dur):
        self.L = np.zeros(int((dur + 3) * SR))
        self.R = np.zeros_like(self.L)
        self.dur = dur

    def add(self, t, sig, gain=1.0, pan=0.0):
        i = int(t * SR)
        if i >= len(self.L) or i < 0:
            return
        j = min(len(self.L), i + len(sig))
        s = sig[:j - i] * gain
        self.L[i:j] += s * np.sqrt((1 - pan) / 2) * 1.414
        self.R[i:j] += s * np.sqrt((1 + pan) / 2) * 1.414

    def stereo(self):
        return np.stack([self.L, self.R], 1)


def reverb(st, wet=0.25, decay=1.4, seed=7):
    n = int(decay * 1.6 * SR)
    t = np.arange(n) / SR
    out = st.copy()
    for ch in range(2):
        ir = noise(n, seed + ch) * np.exp(-t / (decay / 6.9))
        ir = lp(ir, 0.35)
        ir /= np.sqrt(np.sum(ir ** 2))
        L = len(st) + n
        nfft = 1 << (L - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(st[:, ch], nfft) * np.fft.rfft(ir, nfft), nfft)[:len(st)]
        out[:, ch] = st[:, ch] + wet * y
    return out


def finish(st, dur, fade_in=0.05, fade_out=1.2, peak=0.85):
    n = int(dur * SR)
    st = st[:n].copy()
    st -= st.mean(0)
    t = np.arange(n) / SR
    g = np.clip(t / fade_in, 0, 1) * np.clip((dur - t) / fade_out, 0, 1)
    st *= g[:, None]
    st = np.tanh(st / (np.max(np.abs(st)) + 1e-9) * 1.2)  # gentle saturation
    st *= peak / (np.max(np.abs(st)) + 1e-9)
    return st


def write_wav(path, st):
    data = (np.clip(st, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


# ---------- file io (ffmpeg) ----------
def load(path, sr=SR):
    """Any audio file -> mono float64 at sr."""
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64)


def load_stereo(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '2', '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64).reshape(-1, 2)


def tempo(x, speed):
    """Time-stretch a mono signal without changing pitch (ffmpeg atempo)."""
    if abs(speed - 1) < 1e-3:
        return x
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-af', f'atempo={speed}', '-f', 'f32le', '-'],
                       input=x.astype('<f4').tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype='<f4').astype(np.float64)


def clip(x, a, b):
    """Cut seconds a..b out of a signal (e.g. one hit from an ElevenLabs SFX take)."""
    return x[int(a * SR):int(b * SR)].copy()


# ---------- synthesized UI sound effects ----------
def env_exp(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def pop(f0=900, f1=1500, dur=0.09):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.025) * np.clip(t / 0.003, 0, 1)


def swoosh(dur=0.35, rise=True, seed=0):
    n = int(dur * SR); t = np.arange(n) / SR
    e = np.sin(np.pi * t / dur) ** 2
    nz = noise(n, seed)
    lo = lp(nz, 0.05); hi = hp(nz)
    mixk = t / dur if rise else 1 - t / dur
    return (lo * (1 - mixk) * 2.5 + hi * mixk * 0.6) * e


def chime():
    out = np.zeros(int(0.9 * SR))
    for k, (f, dt) in enumerate(((1318.5, 0), (1760, 0.11))):
        n = int(0.7 * SR); t = np.arange(n) / SR
        y = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * env_exp(n, 0.22) * np.clip(t / 0.004, 0, 1)
        i = int(dt * SR); out[i:i + n] += y[:len(out) - i]
    return out * 0.6


def shutter():
    out = np.zeros(int(0.15 * SR))
    for k, dt in enumerate((0.0, 0.07)):
        n = int(0.03 * SR); t = np.arange(n) / SR
        y = hp(noise(n, 50 + k)) * np.exp(-t / 0.006) + np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.004) * 0.4
        i = int(dt * SR); out[i:i + n] += y
    return out


def buzz():
    out = np.zeros(int(0.35 * SR))
    for dt in (0.0, 0.16):
        n = int(0.12 * SR); t = np.arange(n) / SR
        y = np.sign(np.sin(2 * np.pi * 180 * t)) * 0.3 * np.clip((0.12 - t) / 0.02, 0, 1) * np.clip(t / 0.005, 0, 1)
        i = int(dt * SR); out[i:i + n] += lp(y, 0.2)
    return out


def tick(f=2600, dur=0.03):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env_exp(n, 0.006)


def rip(dur=0.25, seed=3):
    n = int(dur * SR); t = np.arange(n) / SR
    crackle = hp(noise(n, seed)) * (noise(n, seed + 1) > 0.6)
    return (crackle * 0.8 + hp(noise(n, seed + 2)) * 0.3) * np.sin(np.pi * t / dur)


