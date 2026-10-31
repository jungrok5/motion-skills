#!/usr/bin/env python3
"""Derived audio for a film's soundtrack: narration lines with tightened pauses and matched loudness, and music "tails" (a take
re-started at an offset so a later part of it lands on a beat). Generalised from the 「마지막 도넛」 sound tools.
Run from the film project root:

  python3 <skill>/scripts/audio-cuts.py --info scenes/audio/ep1-find__n1.mp3 …   # per take: length, where speech starts/ends,
                                                                                  # the pauses inside it (to choose segments)
  python3 <skill>/scripts/audio-cuts.py                                          # build everything in scenes/audio/cuts.json

scenes/audio/cuts.json:
  { "target_db": -18,                                   active-speech RMS every narration line is brought to (dBFS)
    "narration": { "<out>": { "take": "<file stem in scenes/audio>", "segs": [[a, b], …], "gaps": [s, …], "tempo": 1.0 } },
    "tails":     { "<out>": { "take": "<stem>", "at": <s into the take>, "len": <s> } } }
A narration line = the take's segments [a, b] (s) joined with the given silences, 12 ms fades at every edge, gain to target_db,
optional ffmpeg atempo (1.1–1.15 tightens a slow read without changing pitch), peak-limited to 0.89 → scenes/audio/<out>.mp3.
Never touches the raw takes. Name the outputs <scene>__<id>-cut / -tail and point the sound.json cue's "src" at them.
"""
import json, os, subprocess, sys
import numpy as np

SR = 48000
A = os.path.join(os.path.abspath(os.environ.get('FILM_ROOT', '.')), 'scenes', 'audio')


def load(p):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64)


def info(p, thr=-40, win=.02):
    x = load(p); n = int(win * SR); m = len(x) // n
    db = 20 * np.log10(np.sqrt((x[:m * n].reshape(m, n) ** 2).mean(1) + 1e-12))
    on = np.where(db > thr)[0]
    s, e = (on[0] * win, (on[-1] + 1) * win) if len(on) else (0, 0)
    gaps = [(round(float(on[i] * win + win), 2), round(float(on[i + 1] * win), 2)) for i in np.where(np.diff(on) > int(.15 / win))[0]] if len(on) else []
    print(f"{os.path.basename(p):34s} len {len(x) / SR:5.2f}  speech {s:5.2f}–{e:5.2f}  max {20 * np.log10(np.abs(x).max() + 1e-9):6.1f} dB"
          f"  rms {10 * np.log10((x ** 2).mean() + 1e-12):6.1f} dB  pauses {gaps}")


def enc(x, out, tempo=1.0, limit=False):
    af = ([f'atempo={tempo}'] if tempo != 1.0 else []) + (['alimiter=limit=0.89:attack=2:release=40:level=disabled'] if limit else [])
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-i', '-'] + (['-af', ','.join(af)] if af else [])
    subprocess.run(cmd + ['-ac', '2', '-c:a', 'libmp3lame', '-b:a', '192k', out], input=np.ascontiguousarray(np.clip(x, -4, 4).astype('<f4')).tobytes(), check=True)


def fade(seg, k=int(.012 * SR)):
    seg = seg.copy(); k = min(k, len(seg) // 2)
    if k: seg[:k] *= np.linspace(0, 1, k); seg[len(seg) - k:] *= np.linspace(1, 0, k)
    return seg


if __name__ == '__main__':
    if '--info' in sys.argv:
        for p in sys.argv[sys.argv.index('--info') + 1:]: info(p)
        sys.exit()
    spec = json.load(open(os.path.join(A, 'cuts.json'), encoding='utf-8'))
    target = spec.get('target_db', -18.0)
    for out, c in spec.get('narration', {}).items():
        x = load(os.path.join(A, c['take'] + '.mp3')); parts = []
        for i, (a, b) in enumerate(c['segs']):
            parts.append(fade(x[int(a * SR):int(b * SR)]))
            if i < len(c.get('gaps', [])): parts.append(np.zeros(int(c['gaps'][i] * SR)))
        y = np.concatenate(parts); w = int(.02 * SR); m = len(y) // w
        r = np.sqrt((y[:m * w].reshape(m, w) ** 2).mean(1)); act = r[r > 10 ** (-40 / 20)]
        g = 10 ** ((target - 20 * np.log10(np.sqrt((act ** 2).mean()))) / 20) if len(act) else 1
        tempo = c.get('tempo', 1.0); enc(y * g, os.path.join(A, out + '.mp3'), tempo, limit=True)
        print(f'{out:26s} {len(y) / SR / tempo:5.2f}s  gain {20 * np.log10(g):+5.1f} dB  tempo {tempo}')
    for out, c in spec.get('tails', {}).items():
        x = load(os.path.join(A, c['take'] + '.mp3'))[int(c['at'] * SR):int((c['at'] + c['len']) * SR)]
        enc(x, os.path.join(A, out + '.mp3')); print(f"{out:26s} {len(x) / SR:5.2f}s from {c['take']} @ {c['at']}s")
