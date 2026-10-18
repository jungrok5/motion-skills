"""Song recipes for promo videos, built with scripts/synth.py (reference code: copy one into your video's sound.py as song()).

Each was written against a specific storyboard, so the comments name scene times; keep the shape, move the times.
  song_paper      20 s  paper collage / stop-motion — ukulele-like plucks, claps, playful
  song_chat       24 s  chat-app story — soft lo-fi keys, notification-friendly, light groove
  song_editorial  21 s  magazine / editorial — slow cinematic piano + strings-like pads, low pulse
  song_whiteboard 37 s  whiteboard explainer — light marimba + shaker bed that stays out of the voice's way
  song_promo      30 s  premium navy/gold kinetic promo — tension -> drop -> confident chorus -> resolve
(The 30 s minimal promo and the 128 bpm beat-synced pop short are in examples/*/sound.py.)

Run one:  python3 references/song-recipes.py promo out.wav     (from the skill folder)
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts'))
from synth import *  # noqa: E402,F401,F403
import numpy as np  # noqa: E402


def song_paper(dur=20.0):
    """Playful marimba + pizzicato, 120 bpm, C major. Bars of 2 s."""
    T = Track(dur)
    beat = 0.5
    prog = [(48, [60, 64, 67]), (45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62])]  # C Am F G
    mel = [72, 76, 79, 76, 74, 72, 74, 76,  72, 69, 72, 76, 74, 72, 69, 67,
           69, 72, 77, 76, 74, 72, 69, 72,  71, 74, 79, 77, 76, 74, 71, 74]
    bars = int(dur / 2)
    for b in range(bars):
        root, ch = prog[b % 4]
        t0 = b * 2
        last = b == bars - 1
        if last:
            root, ch = 48, [60, 64, 67]
        # pizz bass on beats 1 and 3, pickup on 4&
        for k, off in enumerate((0, 1.0, 1.75)):
            nt = root if k < 2 else root + 7
            if last and off > 0:
                break
            T.add(t0 + off, ks_pluck(midi(nt), 0.6, bright=0.3, damp=0.99, seed=b * 3 + k), 0.55)
        # marimba chord comp on off-beats
        for off in (0.5, 1.5):
            if last:
                break
            for i, nn in enumerate(ch):
                T.add(t0 + off, marimba(nn, 0.4), 0.18, pan=-0.3 + 0.3 * i)
        # melody (8ths), skip in first bar for intro breathing room
        if 0 < b < bars - 1:
            for i in range(4):
                nn = mel[((b - 1) % 4) * 8 + i * 2]
                T.add(t0 + i * beat, marimba(nn, 0.5), 0.32, pan=0.2)
                if i % 2 == 1:
                    T.add(t0 + i * beat + 0.25, marimba(mel[((b - 1) % 4) * 8 + i * 2 + 1], 0.35), 0.2, pan=0.2)
        # shaker 8ths + snap on 2 & 4
        if not last:
            for i in range(8):
                T.add(t0 + i * 0.25, shaker(seed=i + b), 0.8 if i % 2 else 0.45, pan=0.4)
            for off in (0.5, 1.5):
                T.add(t0 + off, clap(0.18, seed=b), 0.35, pan=-0.1)
            T.add(t0, kick(0.3, 120, 50, 0.4), 0.35)
            T.add(t0 + 1.0, kick(0.3, 120, 50, 0.4), 0.25)
        if b % 2 == 0 and b < bars - 1:
            T.add(t0, glock(84, 1.0), 0.12, pan=0.5)
    # ending chord + glock sparkle
    t_end = (bars - 1) * 2
    for i, nn in enumerate([60, 64, 67, 72]):
        T.add(t_end, marimba(nn, 1.5), 0.3, pan=-0.3 + 0.2 * i)
    for i, nn in enumerate([79, 84, 88]):
        T.add(t_end + 0.08 * i, glock(nn, 1.6), 0.14, pan=0.5)
    T.add(t_end, ks_pluck(midi(36), 1.8, bright=0.3, damp=0.995, seed=99), 0.6)
    st = reverb(T.stereo(), wet=0.18, decay=1.2)
    return finish(st, dur, fade_out=0.6)


def song_chat(dur=24.0):
    """Lo-fi chill hop, 84 bpm, Fmaj7 Em7 Dm7 Cmaj7."""
    T = Track(dur)
    bpm = 84
    beat = 60 / bpm
    bar = beat * 4
    chords = [(41, [57, 60, 64, 69]), (40, [55, 59, 62, 67]), (38, [53, 57, 60, 65]), (36, [52, 55, 59, 64])]
    nb = int(np.ceil(dur / bar))
    swing = 0.06
    for b in range(nb):
        t0 = b * bar
        root, ch = chords[b % 4]
        # rhodes: chord on 1, re-hit on 2& lightly
        for i, nn in enumerate(ch):
            T.add(t0 + 0.012 * i, epiano(nn, bar * 0.95, 0.8), 0.16, pan=-0.25 + 0.17 * i)
            T.add(t0 + beat * 2.5 + 0.01 * i, epiano(nn + 12 if i == 3 else nn, beat * 1.4, 0.5), 0.07, pan=0.2)
        T.add(t0, sub_bass(root, beat * 1.8), 0.32)
        T.add(t0 + beat * 2.5, sub_bass(root + 7, beat * 1.2), 0.24)
        if b == 0:
            continue  # first bar: keys only (intro)
        # drums
        T.add(t0, kick(0.4, 110, 45, 0.3), 0.55)
        T.add(t0 + beat * 2.5 + swing, kick(0.4, 110, 45, 0.3), 0.4)
        for k in (1, 3):
            T.add(t0 + beat * k, rim(), 0.28, pan=0.1)
            T.add(t0 + beat * k, snare(0.2, 200, seed=b * 4 + k), 0.18)
        for i in range(8):
            off = i * beat / 2 + (swing if i % 2 else 0)
            T.add(t0 + off, hat(seed=i + b * 8), 0.3 if i % 2 else 0.5, pan=0.35)
    # vinyl crackle
    n = int((dur + 3) * SR)
    rng = np.random.default_rng(11)
    crack = np.zeros(n)
    idx = rng.integers(0, n, int(dur * 25))
    crack[idx] = rng.uniform(-1, 1, len(idx))
    crack = hp(crack) * 0.25 + lp(noise(n, 12), 0.02) * 0.02
    T.L += crack[:len(T.L)]
    T.R += np.roll(crack, 300)[:len(T.R)]
    st = reverb(T.stereo(), wet=0.22, decay=1.6)
    # lo-fi tone: soften highs
    st = np.stack([lp(st[:, 0], 0.35), lp(st[:, 1], 0.35)], 1)
    return finish(st, dur, fade_in=0.3, fade_out=1.0)


def song_editorial(dur=21.0):
    """Minimal house, exactly 120 bpm from t=0 (beats every 0.5 s). Drop at 1.5 s."""
    T = Track(dur)
    beat = 0.5
    chords = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]  # Am F C G
    # intro 0 - 1.5: ticking clock-like hats + riser
    for i in range(6):
        T.add(i * 0.25, hat(seed=i), 0.35 + 0.08 * i, pan=0.3 * (-1) ** i)
    n = int(1.5 * SR)
    t = np.arange(n) / SR
    riser = hp(noise(n, 21)) * (t / 1.5) ** 2 * 0.25
    T.add(0, riser, 1.0)
    total_beats = int(dur / beat)
    for k in range(3, total_beats):  # start on beat 3 (1.5 s)
        tt = k * beat
        bar = (k - 3) // 4
        root, ch = chords[bar % 4]
        end = tt >= 20.0
        if end:
            break
        # breakdown at the blue services section (11.0 - 11.5): drop kick for one beat
        brk = 10.95 <= tt < 11.45
        if not brk:
            T.add(tt, kick(0.4, 160, 48, 1.0), 0.75)
        T.add(tt + beat / 2, hat(seed=k, open_=True), 0.22, pan=0.25)
        T.add(tt + beat / 4, hat(seed=k + 50), 0.12, pan=-0.3)
        T.add(tt + 3 * beat / 4, hat(seed=k + 90), 0.12, pan=-0.3)
        if (k - 3) % 2 == 1:
            T.add(tt, clap(seed=k), 0.45)
        # bass on off 8ths
        T.add(tt + beat / 2, pluck_bass(root, 0.22), 0.45)
        # chord stabs: syncopated
        if (k - 3) % 4 in (0, 2):
            T.add(tt + (0.75 * beat if (k - 3) % 4 == 2 else 0), stab([n + 12 for n in ch], 0.28), 0.9, pan=0.15)
    # impacts on cuts
    for tc in (1.5, 6.0, 11.45, 16.5):
        T.add(tc, kick(0.9, 200, 35, 1.4), 0.5)
        sw = hp(noise(int(0.6 * SR), int(tc * 10))) * np.linspace(1, 0, int(0.6 * SR)) ** 3 * 0.25
        T.add(tc, sw, 0.8, pan=0.0)
    # final stab
    T.add(20.0, stab([69, 72, 76, 81], 1.2, 0.6), 1.2)
    T.add(20.0, kick(1.0, 170, 38, 1.2), 0.7)
    st = reverb(T.stereo(), wet=0.15, decay=1.4)
    return finish(st, dur, fade_in=0.01, fade_out=0.8)


def song_whiteboard(dur=37.0):
    """Warm ukulele-style plucks, 100 bpm, C G Am F, light percussion."""
    T = Track(dur)
    beat = 0.6
    bar = beat * 4
    chords = [(48, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (45, [57, 60, 64, 69]), (41, [57, 60, 65, 69])]
    strum = [0, 1, 1.5, 2.5, 3]  # beat positions
    nb = int(np.ceil(dur / bar))
    for b in range(nb):
        t0 = b * bar
        root, ch = chords[b % 4]
        last = t0 + bar > dur - 1.0
        for si, pos in enumerate(strum):
            if last and pos > 0:
                break
            for i, nn in enumerate(ch if si % 2 == 0 else ch[::-1]):
                T.add(t0 + pos * beat + i * 0.012, ks_pluck(midi(nn), 0.9, bright=0.6, damp=0.993, seed=b * 40 + si * 5 + i),
                      0.075 if si else 0.1, pan=-0.2 + 0.13 * i)
        T.add(t0, ks_pluck(midi(root - 12 + 12), 1.4, bright=0.2, damp=0.996, seed=b), 0.3)
        T.add(t0 + 2 * beat, ks_pluck(midi(root + 7 - 12 + 12), 1.0, bright=0.2, damp=0.996, seed=b + 7), 0.22)
        if b >= 1 and not last:
            for k in (1, 3):
                T.add(t0 + k * beat, clap(0.2, seed=b + k), 0.18)
            for i in range(8):
                T.add(t0 + i * beat / 2, shaker(seed=b * 8 + i), 0.5 if i % 2 else 0.3, pan=0.4)
            T.add(t0, kick(0.3, 110, 50, 0.2), 0.25)
        if b % 4 == 0:
            T.add(t0, glock(84 if b % 8 == 0 else 79, 1.4), 0.08, pan=0.45)
    # ending: tonic chord ring
    tl = dur - 2.2
    for i, nn in enumerate([60, 64, 67, 72, 76]):
        T.add(tl + i * 0.03, ks_pluck(midi(nn), 2.2, bright=0.6, damp=0.997, seed=500 + i), 0.12, pan=-0.3 + 0.15 * i)
    T.add(tl, glock(84, 2.0), 0.1, pan=0.4)
    st = reverb(T.stereo(), wet=0.2, decay=1.5)
    return finish(st, dur, fade_in=0.2, fade_out=1.5)


def song_promo(dur=30.0):
    """Original navy/gold promo. 120 bpm, scene wipes at 9.5 / 14.5 / 21 / 26 s land on beats.
    0-9.5 tense (A minor, sparse), 9.5-26 bright (C major) building up, 26-30 resolve."""
    T = Track(dur)
    beat = 0.5
    # --- tense intro: Am F Am E, low pulse + piano
    tense = [(45, [57, 60, 64]), (41, [57, 60, 65]), (45, [57, 60, 64]), (40, [56, 59, 64])]
    for b in range(5):  # 0 - 10 s, bars of 2 s
        t0 = b * 2.0
        root, ch = tense[b % 4]
        if t0 >= 9.5:
            break
        for i in range(8):
            tt = t0 + i * 0.25
            if tt >= 9.3:
                break
            T.add(tt, pluck_bass(root, 0.2), 0.32 if i % 2 == 0 else 0.2)
        for i, nn in enumerate(ch):
            T.add(t0 + 0.01 * i, epiano(nn, 1.9, 0.6), 0.1, pan=-0.2 + 0.2 * i)
        if b >= 1:
            T.add(t0, kick(0.5, 90, 40, 0.3), 0.35)
            T.add(t0 + 1.0, kick(0.5, 90, 40, 0.3), 0.25)
        T.add(t0 + 1.5, glock(ch[-1] + 12, 0.8), 0.05, pan=0.4)
    # riser into 9.5
    n = int(1.2 * SR); t = np.arange(n) / SR
    T.add(8.3, hp(noise(n, 31)) * (t / 1.2) ** 2 * 0.3, 1.0)
    # --- bright section: C G Am F
    bright = [(48, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (45, [57, 60, 64, 69]), (41, [57, 60, 65, 69])]
    t = 9.5
    bar = 0
    while t < 26.0:
        root, ch = bright[bar % 4]
        full = t >= 14.5
        for i, nn in enumerate(ch):
            T.add(t + 0.01 * i, epiano(nn, 1.9, 0.7), 0.1, pan=-0.25 + 0.17 * i)
        T.add(t, pad(root + 24, 2.0, 0.5), 0.8)
        # arpeggio 8ths
        arp = ch + [ch[1] + 12]
        for i in range(4 if not full else 8):
            step = 0.5 if not full else 0.25
            T.add(t + i * step, marimba(arp[i % len(arp)] + 12, 0.35), 0.12, pan=0.3)
        for i in range(4):
            tt = t + i * beat
            T.add(tt + 0.25, pluck_bass(root, 0.22), 0.4)
            if full:
                T.add(tt, kick(0.4, 140, 45, 0.8), 0.55)
                T.add(tt + 0.25, hat(seed=int(tt * 10), open_=True), 0.12, pan=0.25)
                if i % 2 == 1:
                    T.add(tt, clap(seed=int(tt * 10)), 0.35)
            elif i % 2 == 0:
                T.add(tt, kick(0.4, 110, 45, 0.4), 0.3)
            T.add(tt, hat(seed=int(tt * 7) + 3), 0.08, pan=-0.3)
        t += 2.0
        bar += 1
    # wipe impacts
    for tc in (9.5, 14.5, 21.0, 26.0):
        T.add(tc, kick(1.0, 180, 36, 1.2), 0.5)
        T.add(tc, glock(84, 1.2), 0.08, pan=0.4)
    # --- resolve: Fmaj7 -> C, final sting with the search button
    for i, nn in enumerate([53, 57, 60, 64, 69]):
        T.add(26.0 + 0.02 * i, epiano(nn, 2.0, 0.6), 0.11, pan=-0.3 + 0.15 * i)
    T.add(26.0, pad(65, 2.0, 0.45), 0.8)
    T.add(26.0, sub_bass(41, 1.9), 0.3)
    for i, nn in enumerate([48, 55, 60, 64, 67, 72]):
        T.add(28.0 + 0.02 * i, epiano(nn, 2.0, 0.7), 0.11, pan=-0.3 + 0.12 * i)
    T.add(28.0, pad(60, 2.0, 0.45), 0.8)
    T.add(28.0, sub_bass(36, 2.0), 0.3)
    for i, nn in enumerate([79, 84, 88]):
        T.add(29.4 + 0.06 * i, glock(nn, 1.0), 0.1, pan=0.4)
    st = reverb(T.stereo(), wet=0.2, decay=1.6)
    return finish(st, dur, fade_in=0.05, fade_out=0.6)


SONGS = {'promo': song_promo, 'paper': song_paper, 'chat': song_chat, 'editorial': song_editorial, 'whiteboard': song_whiteboard}

if __name__ == '__main__':
    name, out = sys.argv[1], sys.argv[2]
    write_wav(out, SONGS[name]())
    print('wrote', out)
