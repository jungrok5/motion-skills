"""mix.py — build a promo video's soundtrack from a mix spec and (optionally) mux it into the MP4s.

Usage (from the project root):
  python3 <skill>/scripts/mix.py <video>/mix.json [--mux] [--report]

mix.json (all paths relative to the mix.json file; every block is optional except "dur"):
{
  "dur": 30.0,                                   # video length in seconds (= window.DUR of the page)
  "narration": {                                 # ONE ElevenLabs take with [long pause] between lines
    "take": "audio/narration.mp3",
    "lines": 7,                                  # how many lines the take holds
    "thr": -50,                                  # dB; frames above it count as speech
    "gap_cap": 0.18,                             # shorten pauses *inside* a line to this many seconds
    "splits": [2.3, 7.5, 14.1, 21.1, 27.0, 33.0],# optional: take times (s) between lines when auto-split guesses wrong
    "cues": [[0.35, 1.0], [4.4, 1.05], null]     # per line: [start_s, speed(, keep_first_n_parts)]; null = drop line
  },
  "sound": "sound.py",                           # python module: song(dur) -> stereo array, sfx(add, sfx_dir)
  "music": "audio/music.wav",                    # a music file (e.g. ElevenLabs Music); overrides song() when given
  "music_level": 0.36,                           # music gain under the mix (before ducking); see SKILL.md for tuning
  "duck_db": -10,                                # music drop while the voice speaks
  "sfx_dir": "audio/sfx",                        # passed to sfx(); holds ElevenLabs SFX takes (stamp.mp3 …)
  "out": "out/soundtrack.wav",                   # final loudness-normalised mix (-14 LUFS, true peak ≈ -1.5 dB)
  "videos": ["out/video-landscape.mp4", "out/video-portrait.mp4"]   # --mux replaces their audio track in place
}
"""
import argparse, importlib.util, json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import synth  # noqa: E402
from synth import SR  # noqa: E402


# ---------------- narration: one take -> lines placed on cue ----------------
def speech_segments(x, thr_db, min_gap=0.12, min_len=0.06):
    hop = int(0.01 * SR)
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, 1) + 1e-12)
    on = 20 * np.log10(rms) > thr_db
    segs, start = [], None
    for i, v in enumerate(on):
        if v and start is None:
            start = i
        if not v and start is not None:
            segs.append([start * 0.01, i * 0.01]); start = None
    if start is not None:
        segs.append([start * 0.01, n * 0.01])
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < min_gap:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [s for s in merged if s[1] - s[0] >= min_len]


def split_lines(segs, n_lines, splits=None):
    """Group speech segments into lines: by explicit split times, else at the n-1 longest pauses."""
    if splits:
        lines = [[] for _ in range(n_lines)]
        for s in segs:
            k = sum(1 for b in splits if (s[0] + s[1]) / 2 > b)
            lines[min(k, n_lines - 1)].append(s)
        return lines
    gaps = [(segs[i + 1][0] - segs[i][1], i) for i in range(len(segs) - 1)]
    cut = sorted(i for _, i in sorted(gaps, reverse=True)[:n_lines - 1])
    lines, cur = [], []
    for i, s in enumerate(segs):
        cur.append(s)
        if i in cut:
            lines.append(cur); cur = []
    lines.append(cur)
    return lines


def render_line(x, segs, gap_cap, pad=0.04):
    parts = []
    for k, (a, b) in enumerate(segs):
        i0, i1 = max(0, int((a - pad) * SR)), min(len(x), int((b + pad) * SR))
        seg = x[i0:i1].copy()
        f = int(0.012 * SR)
        seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        parts.append(seg)
        if k < len(segs) - 1:
            g = min(gap_cap, segs[k + 1][0] - b)
            parts.append(np.zeros(int(max(0, g - 2 * pad) * SR)))
    return np.concatenate(parts)


def narration(spec, dur, base, report):
    out = np.zeros(int((dur + 2) * SR))
    if not spec or not spec.get('take'):
        report.append('  narration: none')
        return out
    x = synth.load(os.path.join(base, spec['take']))
    segs = speech_segments(x, spec.get('thr', -50))
    lines = split_lines(segs, spec['lines'], spec.get('splits'))
    report.append(f'  narration: {len(segs)} speech parts in {len(x) / SR:.1f}s take -> {len(lines)} lines')
    placed = []
    for i, (ln, cue) in enumerate(zip(lines, spec['cues'])):
        if cue is None:
            report.append(f'  line {i + 1}: skipped')
            continue
        if not ln:
            report.append(f'  line {i + 1}: EMPTY (check splits / thr)')
            continue
        t0, sp = cue[0], cue[1]
        if len(cue) > 2:
            ln = ln[:cue[2]]
        y = synth.tempo(render_line(x, ln, spec.get('gap_cap', 0.18)), sp)
        y = y / (np.max(np.abs(y)) + 1e-9) * 0.9
        j = int(t0 * SR)
        out[j:j + len(y)] += y[:len(out) - j]
        placed.append((t0, t0 + len(y) / SR))
        report.append(f'  line {i + 1}: take {ln[0][0]:.2f}-{ln[-1][1]:.2f}s ({len(ln)} parts) -> {t0:.2f}-{t0 + len(y) / SR:.2f}s @x{sp}')
    for (a0, a1), (b0, _) in zip(placed, placed[1:]):
        if a1 > b0:
            report.append(f'  WARNING lines overlap: one ends {a1:.2f}s, next starts {b0:.2f}s')
    if placed and placed[-1][1] > dur:
        report.append(f'  WARNING narration ends at {placed[-1][1]:.2f}s > video {dur}s')
    return out


def duck_gain(voice, depth_db=-10, att=0.04, rel=0.35):
    """Music gain curve: depth_db while the voice is active (> -38 dBFS), smooth attack/release."""
    hop = int(0.01 * SR)
    n = len(voice) // hop
    rms = np.sqrt(np.mean(voice[:n * hop].reshape(n, hop) ** 2, 1) + 1e-12)
    act = (20 * np.log10(rms) > -38).astype(float)
    g = np.zeros(n)
    a_up, a_dn = np.exp(-0.01 / att), np.exp(-0.01 / rel)
    s = 0.0
    for i in range(n):
        coef = a_up if act[i] > s else a_dn
        s = coef * s + (1 - coef) * act[i]
        g[i] = s
    return np.repeat(10 ** (depth_db * g / 20), hop)


def load_module(path):
    spec = importlib.util.spec_from_file_location(os.path.splitext(os.path.basename(path))[0], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build(spec_path, mux=False):
    base = os.path.dirname(os.path.abspath(spec_path))
    spec = json.load(open(spec_path))
    dur = float(spec['dur'])
    n = int(dur * SR)
    rel = lambda p: os.path.join(base, p)
    report = [f'[{spec_path}]']

    voice = narration(spec.get('narration'), dur, base, report)[:n]
    mod = load_module(rel(spec['sound'])) if spec.get('sound') else None

    sfx = np.zeros(int((dur + 2) * SR))

    def add(t, y, g):
        i = int(t * SR)
        if 0 <= i < len(sfx):
            sfx[i:i + len(y)] += (y * g)[:len(sfx) - i]

    if mod and hasattr(mod, 'sfx'):
        mod.sfx(add, rel(spec.get('sfx_dir', '.')))
    sfx = sfx[:n]

    if spec.get('music'):
        mus = synth.load_stereo(rel(spec['music']))
        report.append(f'  music: {spec["music"]}')
    elif mod and hasattr(mod, 'song'):
        mus = mod.song(dur)
        report.append('  music: song() from ' + spec['sound'])
    else:
        mus = np.zeros((n, 2))
        report.append('  music: none')
    mus = mus[:n]
    if len(mus) < n:
        mus = np.vstack([mus, np.zeros((n - len(mus), 2))])

    g = duck_gain(voice, spec.get('duck_db', -10.0))[:n]
    if len(g) < n:
        g = np.concatenate([g, np.ones(n - len(g))])
    mix = mus * (g * spec.get('music_level', 0.36))[:, None]
    mix += (voice * 0.95)[:, None]
    mix += np.stack([sfx * 0.95, sfx * 0.9], 1)
    t = np.arange(n) / SR
    mix *= np.clip((dur - t) / 0.4, 0, 1)[:, None]  # 0.4 s tail fade so the last frame is quiet

    out = rel(spec.get('out', 'out/soundtrack.wav'))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out.replace('.wav', '.pre.wav')
    synth.write_wav(tmp, mix / (np.max(np.abs(mix)) + 1e-9) * 0.7)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-af',
                    'loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.78:level=false', '-ar', str(SR), out], check=True)
    os.remove(tmp)
    report.append(f'  wrote {os.path.relpath(out)}')
    if mux:
        for v in spec.get('videos', []):
            src = rel(v)
            if not os.path.exists(src):
                report.append(f'  skip mux, missing {v}')
                continue
            dst = src.replace('.mp4', '.tmp.mp4')
            # no -shortest: it can drop the last video frames; the soundtrack is exactly dur long
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-i', out, '-map', '0:v:0', '-map', '1:a:0',
                            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst], check=True)
            os.replace(dst, src)
            report.append(f'  muxed {v}')
    print('\n'.join(report))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('spec', nargs='+', help='one or more mix.json files')
    ap.add_argument('--mux', action='store_true', help='replace the audio track of spec["videos"]')
    a = ap.parse_args()
    for s in a.spec:
        build(s, a.mux)
