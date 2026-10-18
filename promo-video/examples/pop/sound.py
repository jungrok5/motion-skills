"""Sound for examples/pop — a beat-synced kinetic short (128 bpm, 40 beats = 18.75 s).

song(dur) -> stereo float array (44.1 kHz); sfx(add, sfx_dir) places effects.
Every hit is on the same beat grid the video cuts on (BEAT = 60/128 s).
"""
import os
import numpy as np
import synth as s  # mix.py puts scripts/ on sys.path
from synth import (SR, Track, kick, clap, hat, snare, pluck_bass, stab, sub_bass, glock, pad,  # noqa: E402
                   noise, hp, reverb, finish)

BEAT = 60 / 128
B = lambda n: n * BEAT  # beat -> seconds

# Am F C G (A minor / C major pop)
PROG = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]


def impact(dur=1.2, seed=0):
    """big boom: low kick + noise burst tail"""
    y = kick(dur, 220, 32, 1.5)
    n = min(len(y), int(0.5 * SR)); t = np.arange(n) / SR
    y[:n] += hp(noise(n, seed)) * np.exp(-t / 0.09) * 0.5
    return y


def riser(dur, seed=1):
    n = int(dur * SR); t = np.arange(n) / SR
    return hp(noise(n, seed)) * (t / dur) ** 2.5 * 0.4


def groove(T, b0, b1, full=True, bass=True, chords=True):
    """4-on-the-floor groove between beats b0..b1 (exclusive)."""
    for b in range(b0, b1):
        t = B(b)
        root, ch = PROG[(b // 4) % 4]
        T.add(t, kick(0.4, 160, 46, 1.0), 0.8)
        T.add(t + BEAT / 2, hat(seed=b, open_=True), 0.18, pan=0.25)
        for k in (1, 3):
            T.add(t + k * BEAT / 4, hat(seed=b * 7 + k), 0.12, pan=-0.3)
        if b % 2 == 1:
            T.add(t, clap(seed=b), 0.5)
            if full:
                T.add(t, snare(0.18, 210, seed=b), 0.18)
        if bass:
            T.add(t + BEAT / 2, pluck_bass(root - 12 + 12, 0.2), 0.5)
            T.add(t + 3 * BEAT / 4, pluck_bass(root, 0.12), 0.25)
        if chords and b % 2 == 0:
            T.add(t + (BEAT * 0.75 if b % 4 == 2 else 0), stab([n + 12 for n in ch], 0.22, 0.75), 0.9, pan=0.15)


def song(dur=18.75):
    T = Track(dur)
    # b0, b1: two single hits ("이거." "어디서.")
    for b in (0, 1):
        T.add(B(b), impact(0.45, b), 0.7)
        T.add(B(b), stab([69, 72, 76], 0.3, 0.6), 1.0)
    # b2-3 "팔아요?": rising question stab + riser
    T.add(B(2), impact(0.6, 2), 0.7)
    for i, nn in enumerate([76, 79, 81, 84]):
        T.add(B(2) + i * BEAT / 2, stab([nn], 0.18, 0.8), 0.9, pan=0.2)
    T.add(B(2.5), riser(BEAT * 1.5, 3), 0.8)
    # b4-7 problem: tense half-time groove (minor, no chords), glitchy hats
    for b in range(4, 8):
        t = B(b)
        T.add(t, kick(0.35, 150, 44, 0.8), 0.7)
        for k in range(4):
            T.add(t + k * BEAT / 4, hat(seed=b * 4 + k), 0.1 + 0.05 * (k % 2), pan=0.3 * (-1) ** k)
        T.add(t + BEAT / 2, pluck_bass(45, 0.18), 0.45)
        T.add(t, stab([57, 60, 63], 0.12, 0.5), 0.6)  # dissonant flat 3 -> "stuck"
    # b8-9 "사진 한 장이면": strip back + riser into the drop
    T.add(B(8), sub_bass(45, B(2) - 0.05), 0.25)
    T.add(B(8), riser(B(2), 5), 1.0)
    for k in range(8):
        T.add(B(8) + k * BEAT / 4, snare(0.12, 230, seed=40 + k), 0.06 + 0.03 * k)
    # b10 "끝." DROP
    T.add(B(10), impact(1.4, 10), 1.0)
    groove(T, 10, 20)
    for b in (12, 14, 16, 18):  # step changes
        T.add(B(b), impact(0.5, b), 0.35)
    # b20-23 cost: groove continues, stamp handled in sfx
    groove(T, 20, 24)
    # b24-25 question: filtered break (only kick + pad)
    for b in (24, 25):
        T.add(B(b), kick(0.4, 120, 45, 0.4), 0.45)
    T.add(B(24), pad(64, B(2), 0.4), 0.9)
    T.add(B(24.5), riser(B(1.5), 7), 0.7)
    # b26 answer: drop back in
    T.add(B(26), impact(1.0, 26), 0.8)
    groove(T, 26, 32)
    T.add(B(30), riser(B(2), 9), 0.6)
    # b32 end card: big hit, lighter groove, final chord on b36
    T.add(B(32), impact(1.6, 32), 1.0)
    groove(T, 32, 36, full=False, chords=False)
    for i, nn in enumerate([57, 60, 64, 69, 72]):
        T.add(B(36) + 0.01 * i, stab([nn], 1.6, 0.55), 1.0, pan=-0.3 + 0.15 * i)
    T.add(B(36), sub_bass(33, 2.2), 0.4)
    T.add(B(36), kick(1.0, 170, 36, 1.2), 0.6)
    for i, nn in enumerate([81, 84, 88]):
        T.add(B(36) + 0.06 * i, glock(nn, 1.6), 0.1, pan=0.4)
    st = reverb(T.stereo(), wet=0.12, decay=1.2)
    return finish(st, dur, fade_in=0.005, fade_out=0.9)


def sfx(add, sfx_dir):
    sa = s.load(os.path.join(sfx_dir, 'slap.mp3'))
    st = s.load(os.path.join(sfx_dir, 'stamp.mp3'))
    ty = s.load(os.path.join(sfx_dir, 'typing.mp3'))
    slap = s.clip(sa, 0.08, 0.45)
    stamp = s.clip(st, 0.28, 0.8)
    # hook words
    add(B(0), s.tick(3200, 0.03), 0.25)
    add(B(1), s.tick(2600, 0.03), 0.25)
    add(B(2.5), s.pop(500, 900, 0.12), 0.35)       # polaroid appears
    add(B(2.5), slap, 0.4)
    # problem: search typing + four sticker slaps
    y = s.clip(ty, 0.05, 0.05 + BEAT * 1.4); f = int(0.02 * SR); y[-f:] *= np.linspace(1, 0, f)
    add(B(4), y, 0.3)
    for b in (4, 5, 6, 7):
        add(B(b), slap, 0.5)
        add(B(b), s.pop(300 + 40 * b, 520 + 40 * b, 0.08), 0.15)
    add(B(4.05), s.buzz(), 0.15)                     # "검색 결과 없음"
    # photo: shutter on the polaroid
    add(B(8.5), s.shutter(), 0.55)
    add(B(8.5), s.swoosh(0.25, True, 3), 0.2)
    # steps: icon slams half a beat after each number
    for i, b in enumerate((12, 14, 16, 18)):
        add(B(b + 0.5), s.swoosh(0.2, True, 10 + i), 0.25)
        add(B(b + 0.5), s.pop(700 + 120 * i, 1200 + 120 * i, 0.1), 0.3)
        add(B(b + 1.0), s.tick(2400, 0.03), 0.15)
    # cost stamp + stickers
    add(B(21) - 0.01, stamp, 0.9)
    for b in (22, 23):
        add(B(b), slap, 0.45)
    # answer chime
    add(B(26), s.chime(), 0.3)
    # end card
    add(B(32), s.swoosh(0.5, False, 4), 0.3)
    add(B(35), s.pop(800, 1300, 0.1), 0.25)
    add(B(36), s.chime(), 0.3)
