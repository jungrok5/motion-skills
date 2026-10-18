"""pick-music.py — compare generated music variations against the video's scene cuts, then cut the winner to length.

ElevenLabs Music gives 4 variations per prompt and none follows the requested timeline exactly. Look at where each one
actually builds, drops and fades, and pick the one whose shape matches the scene cuts.

Compare (prints a loudness line per file, 0.5 s per column, with the scene cuts marked; writes one spectrogram sheet):
  python3 <skill>/scripts/pick-music.py compare music/*.mp3 --cuts 4.2,8.2,12.6,17,21.6,25.8 --sheet out/music-sheet.png
Cut the pick to the video (optional delay so a drop lands on a cut, short fade at the end):
  python3 <skill>/scripts/pick-music.py cut music/v3.mp3 --dur 30 --delay 0.2 --out audio/music.wav
"""
import argparse, os, subprocess
import numpy as np


def profile(path, step=0.5):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16) / 32768
    h = int(16000 * step)
    return [20 * np.log10(np.sqrt(np.mean(x[i * h:(i + 1) * h] ** 2)) + 1e-9) for i in range(len(x) // h)], len(x) / 16000


def compare(files, cuts, sheet, step=0.5):
    cut_cols = {int(round(c / step)) for c in cuts}
    n = max(len(profile(f, step)[0]) for f in files[:1]) if files else 0
    head = ''.join('|' if i in cut_cols else ('·' if i % int(2 / step) == 0 else ' ') for i in range(n))
    print(f'{"":>28} {head}   (| = scene cut, · = every 2 s)')
    shades = ' .:-=+*#%@'
    for f in files:
        prof, dur = profile(f, step)
        # -50 dB .. -10 dB mapped onto 10 shades: quiet intros, drops and fades are visible at a glance
        line = ''.join(shades[int(np.clip((v + 50) / 40, 0, 0.999) * len(shades))] for v in prof)
        print(f'{os.path.basename(f)[:28]:>28} {line}   {dur:.1f}s')
    for f in files:
        prof, _ = profile(f, step)
        print(f'{os.path.basename(f)[:40]}: ' + ' '.join(f'{v:.0f}' for v in prof))
    if sheet and files:
        os.makedirs(os.path.dirname(os.path.abspath(sheet)), exist_ok=True)
        args, fl = [], ''
        for i, f in enumerate(files):
            args += ['-i', f]
            label = os.path.basename(f)[:24].replace(':', '').replace("'", '')
            fl += (f'[{i}:a]showspectrumpic=s=900x160:legend=0:fscale=log:stop=8000,'
                   f"drawtext=text='{i + 1} {label}':fontcolor=white:fontsize=20:x=5:y=5[v{i}];")
        fl += ''.join(f'[v{i}]' for i in range(len(files))) + (f'vstack={len(files)}' if len(files) > 1 else 'null')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', *args, '-filter_complex', fl, '-frames:v', '1', sheet], check=True)
        print('sheet:', sheet, '(time runs left → right over each file\'s own length)')


def cut(src, dur, delay, out, fade=0.6):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    af = (f'adelay={int(delay * 1000)}:all=1,' if delay > 0 else (f'atrim=start={-delay},asetpts=PTS-STARTPTS,' if delay < 0 else ''))
    af += f'apad,atrim=0:{dur},afade=t=out:st={max(0, dur - fade)}:d={fade}'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ar', '44100', '-ac', '2', out], check=True)
    print('wrote', out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('compare'); c.add_argument('files', nargs='+'); c.add_argument('--cuts', default='')
    c.add_argument('--sheet'); c.add_argument('--step', type=float, default=0.5)
    k = sub.add_parser('cut'); k.add_argument('src'); k.add_argument('--dur', type=float, required=True)
    k.add_argument('--delay', type=float, default=0.0, help='seconds; positive = start later, negative = skip the start')
    k.add_argument('--out', required=True)
    a = ap.parse_args()
    if a.cmd == 'compare':
        compare(a.files, [float(v) for v in a.cuts.split(',') if v], a.sheet, a.step)
    else:
        cut(a.src, a.dur, a.delay, a.out)
