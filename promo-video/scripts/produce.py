"""produce.py — the whole pipeline for one video, with gates: check → render → sound → verify → final contact sheet.

Usage (from the project root):
  python3 <skill>/scripts/produce.py <video>/index.html [--fmt p|l|both] [--force]

  1. check.mjs      automatic QA of the page (layout, safe zones, captions, pen marks, fonts, determinism).
                    Any ERROR stops here (--force skips the gate, never for a delivery).
  2. render.mjs     30 fps MP4 per format. Output paths come from <video>/mix.json "videos" when it exists
                    (…-landscape.mp4 / …-portrait.mp4), else out/<video>-<fmt>.mp4.
  3. mix.py --mux   if <video>/mix.json exists: narration/music/SFX → −14 LUFS → muxed (true peak kept ≤ −1 dB).
  4. verify         frames = DUR × 30, audio present and as long as the video, −16…−12 LUFS, true peak ≤ −1 dB.
  5. sheet          12 frames from the final MP4 → out/<video>-<fmt>-final.jpg — LOOK at it before handing over.
Prints READY or NOT READY with the reasons.
"""
import argparse, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def run(cmd, **kw):
    print('$', ' '.join(cmd), flush=True)
    return subprocess.run(cmd, **kw)


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,nb_read_frames,duration',
                          '-of', 'json', path], capture_output=True, text=True).stdout
    st = json.loads(out or '{}').get('streams', [])
    v = next((s for s in st if s['codec_type'] == 'video'), {})
    a = next((s for s in st if s['codec_type'] == 'audio'), None)
    loud = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr if a else ''
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', loud)
    p = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', loud)
    return {'frames': int(v.get('nb_read_frames', 0)), 'vdur': float(v.get('duration', 0)),
            'adur': float(a['duration']) if a else None,
            'lufs': float(i[-1]) if i else None, 'peak': float(p[-1]) if p and p[-1] != '-inf' else None}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('page'); ap.add_argument('--fmt', default='p', choices=['p', 'l', 'both'])
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    page = os.path.abspath(a.page)
    vdir, name = os.path.dirname(page), os.path.basename(os.path.dirname(page))
    fmts = ['l', 'p'] if a.fmt == 'both' else [a.fmt]
    label = {'l': 'landscape', 'p': 'portrait'}
    mixf = os.path.join(vdir, 'mix.json')
    spec = json.load(open(mixf)) if os.path.exists(mixf) else None
    problems = []

    # stale timing: captions/mix changed after timing.js was written
    tj = os.path.join(vdir, 'timing.js')
    for src in ('captions.txt',) + (('mix.json',) if spec and spec.get('narration') else ()):   # mix.json matters only with narration
        sp = os.path.join(vdir, src)
        if os.path.exists(tj) and os.path.exists(sp) and os.path.getmtime(sp) > os.path.getmtime(tj) + 1:
            problems.append(f'{src} is newer than timing.js — re-run caption-timing.py')
    if problems and not a.force:
        print('NOT READY:\n  ' + '\n  '.join(problems)); sys.exit(1)

    # 1. check
    r = run(['node', os.path.join(HERE, 'check.mjs'), a.page, '--fmt', a.fmt, '--sheet', f'out/{name}-check-{{fmt}}.jpg'],
            capture_output=True, text=True)
    print(r.stdout[-6000:], r.stderr[-2000:])
    dur = float(re.findall(r'\] ([\d.]+)s,', r.stdout)[0]) if re.findall(r'\] ([\d.]+)s,', r.stdout) else None
    if r.returncode != 0 and not a.force:
        print('NOT READY: check.mjs found errors (listed above). Fix them, then run produce.py again.'); sys.exit(1)

    # 2. render, to the paths mix.json will mux into
    outs = {}
    for f in fmts:
        if spec and spec.get('videos'):
            cand = [os.path.normpath(os.path.join(vdir, v)) for v in spec['videos']]
            hit = [c for c in cand if c.endswith(f'-{label[f]}.mp4')] or (cand if len(cand) == 1 else [])
            if not hit:
                print(f'NOT READY: mix.json "videos" has no …-{label[f]}.mp4 entry'); sys.exit(1)
            outs[f] = hit[0]
        else:
            outs[f] = os.path.abspath(f'out/{name}-{label[f]}.mp4')
        rr = run(['node', os.path.join(HERE, 'render.mjs'), a.page, '--fmt', f, '--out', outs[f]])
        if rr.returncode != 0 or not os.path.exists(outs[f]):
            print('NOT READY: render failed'); sys.exit(1)

    # 3. sound
    if spec:
        rr = run([sys.executable, os.path.join(HERE, 'mix.py'), mixf, '--mux'], capture_output=True, text=True)
        print(rr.stdout, rr.stderr[-2000:])
        if rr.returncode != 0:
            print('NOT READY: mix.py failed'); sys.exit(1)
        for line in rr.stdout.splitlines():
            if 'WARNING' in line or 'EMPTY' in line or 'likely inaudible' in line or 'mask the voice' in line:
                problems.append('mix: ' + line.strip())
        dur = float(spec.get('dur', dur or 0)) or dur

    # 4. verify + 5. final sheet
    for f, path in outs.items():
        m = probe(path)
        want = round((dur or m['vdur']) * 30)
        if abs(m['frames'] - want) > 1: problems.append(f'{os.path.basename(path)}: {m["frames"]} frames, expected {want}')
        if spec:
            if m['adur'] is None: problems.append(f'{os.path.basename(path)}: no audio track')
            else:
                if abs(m['adur'] - m['vdur']) > 0.15: problems.append(f'{os.path.basename(path)}: audio {m["adur"]:.2f}s vs video {m["vdur"]:.2f}s')
                if m['lufs'] is None or not (-16.0 <= m['lufs'] <= -12.0): problems.append(f'{os.path.basename(path)}: loudness {m["lufs"]} LUFS (want −14 ±2)')
                if m['peak'] is not None and m['peak'] > -1.0: problems.append(f'{os.path.basename(path)}: true peak {m["peak"]} dB (want ≤ −1)')
        sheet = os.path.abspath(f'out/{name}-{label[f]}-final.jpg')
        n = 12; fr = [int(m['frames'] * (i + 0.5) / n) for i in range(n)]          # exact frame numbers: one tile each
        sel = '+'.join(f'eq(n\\,{k})' for k in fr)
        tw = 300 if f == 'p' else 480
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', path, '-vf', f"select='{sel}',scale={tw}:-1,tile=6x2:padding=6:color=white",
                        '-frames:v', '1', '-vsync', 'vfr', sheet])
        print(f'{label[f]}: {path}\n  {m["frames"]} frames, {m["vdur"]:.2f}s video, audio {m["adur"]}, {m["lufs"]} LUFS, peak {m["peak"]} dB'
              f'\n  final contact sheet: {sheet}')
    if problems:
        print('NOT READY:\n  ' + '\n  '.join(problems)); sys.exit(1)
    print('READY — now open the final contact sheet(s) and look at every frame before handing over.')


if __name__ == '__main__':
    main()
