"""A synthesised score: drones, whooshes, mechanical clicks, hits and swells placed on the film's timeline.
numpy only, deterministic (every noise source is seeded), written as a 48 kHz stereo WAV.

    sc = Score(film.duration, seed=film.seed)
    sc.drone(0, 18, 55, 0.25)          # a bed under everything
    sc.whoosh(2.0, 2.25, 0.5)          # air rushing into the cut at 2.25 s
    sc.clunk(5.3, 0.6)                 # a part seats itself
    sc.hit(15.9, 0.9)                  # the title lands
    sc.save('out/score.wav')
"""
import wave

import numpy as np

SR = 48000


class Score:
    def __init__(self, duration, seed=1, sr=SR):
        self.sr = sr
        self.n = int(round(duration * sr))
        self.dry = np.zeros((self.n, 2), np.float64)
        self.wet = np.zeros((self.n, 2), np.float64)      # what goes to the reverb
        self.rs = np.random.RandomState(seed)
        self.duration = duration

    # -- plumbing ------------------------------------------------------------------------------------
    def _t(self, dur):
        return np.arange(int(round(dur * self.sr))) / self.sr

    def _noise(self, n, lo, hi, tilt=0.0):
        """Band-limited noise by shaping the spectrum (no filter state: the same seed gives the same sound)."""
        spec = np.fft.rfft(self.rs.standard_normal(n))
        f = np.fft.rfftfreq(n, 1 / self.sr)
        g = 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 6) / (1 + (f / hi) ** 6)
        if tilt:
            g = g * (np.maximum(f, 20.0) / 1000.0) ** tilt
        x = np.fft.irfft(spec * g, n)
        return x / (np.abs(x).max() + 1e-9)

    def add(self, t0, mono, gain=1.0, pan=0.0, reverb=0.2):
        """Mix a mono signal in at time t0. pan -1..1, reverb = send level."""
        i = int(round(t0 * self.sr))
        if i >= self.n:
            return
        if i < 0:
            mono, i = mono[-i:], 0
        mono = mono[:self.n - i] * gain
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        st = np.stack([mono * l, mono * r], 1) * np.sqrt(2)
        self.dry[i:i + len(mono)] += st
        if reverb:
            self.wet[i:i + len(mono)] += st * reverb

    @staticmethod
    def env(t, attack, release, hold=0.0, power=2.0):
        dur = t[-1] if len(t) else 0
        a = np.clip(t / max(attack, 1e-4), 0, 1) ** (1 / power)
        r = np.clip((dur - t) / max(release, 1e-4), 0, 1) ** power
        return a * r

    # -- instruments ---------------------------------------------------------------------------------
    def drone(self, t0, t1, freq=55.0, gain=0.25, air=0.25, fade=1.5, pan=0.0):
        """A low bed: a few detuned partials that beat slowly, plus dark air."""
        t = self._t(t1 - t0)
        x = np.zeros_like(t)
        for k, (m, a) in enumerate(((1, 1.0), (1.005, 0.7), (2.0, 0.35), (2.99, 0.18), (0.5, 0.5))):
            lfo = 1 + 0.25 * np.sin(2 * np.pi * (0.07 + 0.03 * k) * t + k)
            x += a * lfo * np.sin(2 * np.pi * freq * m * t + k * 1.7)
        x = x / 2.6 + air * self._noise(len(t), 60, 420, -0.5)
        self.add(t0, x * self.env(t, fade, fade), gain, pan, reverb=0.35)

    def whoosh(self, t0, t1, gain=0.5, lo=300.0, hi=5000.0, tail=0.25, pan=(-0.6, 0.6)):
        """Air accelerating into a cut: the peak lands at t1, then a short tail. Put one before every hard cut."""
        t = self._t(t1 - t0 + tail)
        u = np.clip(t / (t1 - t0), 0, 1)
        x = np.zeros_like(t)
        bands = np.geomspace(lo, hi, 5)
        for k in range(4):                                   # the band the energy sits in climbs with u
            w = np.exp(-((u * 3.0 - k) ** 2) * 1.6)
            x += w * self._noise(len(t), bands[k], bands[k + 1])
        e = np.where(t <= (t1 - t0), u ** 3.2, np.exp(-(t - (t1 - t0)) / (tail * 0.3)))
        pn = np.linspace(pan[0], pan[1], len(t))
        i = int(round(t0 * self.sr))
        sig = x * e * gain
        for ch, g in ((0, np.cos((pn + 1) * np.pi / 4)), (1, np.sin((pn + 1) * np.pi / 4))):
            j = max(0, i)
            seg = (sig * g * np.sqrt(2))[j - i:self.n - i]
            self.dry[j:j + len(seg), ch] += seg
            self.wet[j:j + len(seg), ch] += seg * 0.3

    def tick(self, t, gain=0.3, pitch=3200.0, pan=0.0):
        """One tooth of a small mechanism."""
        tt = self._t(0.05)
        x = np.sin(2 * np.pi * pitch * tt) * np.exp(-tt * 260) + 0.6 * self._noise(len(tt), 2500, 9000) * np.exp(-tt * 500)
        self.add(t, x, gain, pan, reverb=0.25)

    def ticks(self, t0, t1, rate=8.0, gain=0.2, pitch=3200.0, accel=0.0, pan=0.0):
        """A run of ticks: a ring turning through its detents. accel > 0 speeds the run up."""
        t, k = t0, 0
        while t < t1:
            self.tick(t, gain * (0.8 + 0.4 * self.rs.rand()), pitch * (0.97 + 0.06 * self.rs.rand()), pan)
            t += 1.0 / (rate * (1 + accel * (t - t0)))
            k += 1

    def clunk(self, t, gain=0.5, size=1.0, pan=0.0):
        """Metal seating on metal: a part clicking home, a bayonet locking. size > 1 = heavier."""
        tt = self._t(0.35)
        x = np.zeros_like(tt)
        for f, a, d in ((820, 1.0, 38), (1730, 0.6, 55), (2950, 0.35, 80), (190, 0.9, 22)):
            x += a * np.sin(2 * np.pi * f / size * tt + self.rs.rand() * 6) * np.exp(-tt * d)
        x += 0.8 * self._noise(len(tt), 900, 7000) * np.exp(-tt * 180)
        self.add(t, x / 2.2, gain, pan, reverb=0.3)

    def shutter(self, t, gain=0.7, speed=0.055):
        """A focal-plane shutter: first curtain, second curtain, the mechanism ringing off."""
        self.clunk(t, gain, 0.8, -0.1)
        self.clunk(t + speed, gain * 0.85, 0.7, 0.1)
        tt = self._t(0.4)
        self.add(t + speed, np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 14) * 0.08 * gain, reverb=0.5)

    def hit(self, t, gain=0.8, low=38.0, length=2.2):
        """A sub drop with a soft transient: a title landing, a big cut."""
        tt = self._t(length)
        f = low + 70 * np.exp(-tt * 9)
        ph = 2 * np.pi * np.cumsum(f) / self.sr
        x = np.sin(ph) * np.exp(-tt * 2.2) + 0.5 * self._noise(len(tt), 40, 300) * np.exp(-tt * 9) \
            + 0.25 * self._noise(len(tt), 1500, 8000) * np.exp(-tt * 60)
        self.add(t, x, gain, 0.0, reverb=0.45)

    def riser(self, t0, t1, gain=0.4, f0=180.0, f1=1400.0):
        """Tension climbing into a moment."""
        tt = self._t(t1 - t0)
        u = tt / (t1 - t0)
        ph = 2 * np.pi * np.cumsum(f0 * (f1 / f0) ** u) / self.sr
        x = (0.5 * np.sin(ph) + 0.3 * np.sin(ph * 1.5) + 0.7 * self._noise(len(tt), 800, 9000, 0.3)) * u ** 2.5
        x[-int(0.004 * self.sr):] *= np.linspace(1, 0, int(0.004 * self.sr))
        self.add(t0, x, gain, 0.0, reverb=0.35)

    def swell(self, t0, t1, notes=(146.83, 220.0, 261.63, 329.63), gain=0.3, attack=None, release=None, bright=0.5):
        """A held chord that breathes in and out: the open air of a wide shot. notes in Hz."""
        tt = self._t(t1 - t0)
        x = np.zeros_like(tt)
        for k, f in enumerate(notes):
            for h in range(1, 7):
                a = (1.0 / h) ** (2.2 - bright)
                det = 1 + 0.0015 * np.sin(2 * np.pi * 0.11 * tt + k + h)
                x += a * np.sin(2 * np.pi * f * h * tt * det + k * 2.1 + h)
        x /= len(notes) * 1.6
        d = t1 - t0
        self.add(t0, x * self.env(tt, attack or d * 0.45, release or d * 0.4), gain, 0.0, reverb=0.7)

    def shimmer(self, t0, t1, base=1760.0, gain=0.12):
        """High glassy partials: light on water, a flare, a burn to white."""
        tt = self._t(t1 - t0)
        x = np.zeros_like(tt)
        for k in range(7):
            f = base * (1 + 0.5 * k) * (1 + 0.004 * self.rs.randn())
            x += np.sin(2 * np.pi * f * tt + k) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.9 + 0.37 * k) * tt + k * 1.3)) / (1 + k * 0.6)
        d = t1 - t0
        self.add(t0, x / 3 * self.env(tt, d * 0.5, d * 0.5), gain, 0.0, reverb=0.8)

    def rumble(self, t0, t1, gain=0.3, lo=25.0, hi=120.0):
        """Weight and speed: wind, surf, an engine far off."""
        tt = self._t(t1 - t0)
        d = t1 - t0
        self.add(t0, self._noise(len(tt), lo, hi) * self.env(tt, d * 0.3, d * 0.3), gain, 0.0, reverb=0.2)

    def surf(self, t0, t1, gain=0.3, period=3.2):
        """Waves on a shore: broadband noise breathing slowly."""
        tt = self._t(t1 - t0)
        d = t1 - t0
        w = 0.55 + 0.45 * np.sin(2 * np.pi * tt / period - 1.0)
        x = self._noise(len(tt), 180, 5200, -0.35) * w ** 1.6
        self.add(t0, x * self.env(tt, min(0.6, d * 0.3), min(0.5, d * 0.3)), gain, 0.0, reverb=0.25)

    # -- master --------------------------------------------------------------------------------------
    def mix(self, reverb_time=2.0, peak_db=-1.5):
        n = int(reverb_time * self.sr)
        tt = np.arange(n) / self.sr
        out = self.dry.copy()
        for ch in range(2):                                  # a plain exponential-noise room, one per ear
            ir = self.rs.standard_normal(n) * np.exp(-tt * 6.9 / reverb_time)
            ir[:int(0.012 * self.sr)] *= 0.2
            m = self.n + n - 1
            y = np.fft.irfft(np.fft.rfft(self.wet[:, ch], m) * np.fft.rfft(ir, m), m)[:self.n]
            out[:, ch] += y * 0.05
        fade = int(0.02 * self.sr)
        out[:fade] *= np.linspace(0, 1, fade)[:, None]
        out[-fade:] *= np.linspace(1, 0, fade)[:, None]
        out = np.tanh(out * 1.2) / 1.2                       # gentle saturation instead of clipping
        pk = np.abs(out).max() + 1e-9
        return out * (10 ** (peak_db / 20) / pk)

    def save(self, path, **kw):
        out = self.mix(**kw)
        pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
        with wave.open(path, 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(self.sr)
            w.writeframes(pcm.tobytes())
        return path


def auto(film, sc=None):
    """A serviceable score from the cut list alone: a bed, a whoosh into every cut, a click on it, a hit on the
    last shot. A project overrides this with score.py: def score(sc, film)."""
    sc = sc or Score(film.duration, film.seed)
    sc.drone(0, film.duration, 49.0, 0.22)
    for i, s in enumerate(film.shots):
        t = s['start'] / film.fps
        if i == 0:
            sc.hit(0.05, 0.5)
            continue
        sc.whoosh(max(0, t - 0.4), t, 0.4, pan=(-0.5, 0.5) if i % 2 else (0.5, -0.5))
        if i == len(film.shots) - 1:
            sc.riser(max(0, t - 1.2), t, 0.3)
            sc.hit(t, 0.9)
        else:
            sc.clunk(t, 0.25)
    return sc
