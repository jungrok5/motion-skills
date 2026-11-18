#!/usr/bin/env python3
"""Join the developed frames into a film per version and one of all versions back to back.

  encode.py [--width 1920]        out/frames/<version>/*.png → out/<version>.mp4, out/film.mp4
                                  (default width: the width the frames were rendered at — nothing is enlarged)

When only every Nth frame was rendered (render.py --step N) the film is encoded at fps / N and says so.
"""
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--width', type=int, default=None)
    ap.add_argument('--crf', type=int, default=17)
    a = ap.parse_args(_boot.argv())
    P = _boot.boot(a.project, need_bpy=False)
    made = []
    for v in P.versions:
        n = P.frames(v)
        have = [f for f in range(1, n + 1) if os.path.exists(P.png(v, f))]
        if not have:
            print(f'{v}: no developed frames (finish.py)')
            continue
        step = 1
        if len(have) < n:
            gaps = {b - a_ for a_, b in zip(have, have[1:])}
            if len(gaps) == 1:
                step = gaps.pop()
            else:
                print(f'{v}: {len(have)} of {n} frames, unevenly: render the rest first')
                continue
        tmp = P.out('tmp', 'seq_' + v)
        shutil.rmtree(tmp, ignore_errors=True)
        os.makedirs(tmp)
        for i, f in enumerate(have, 1):
            os.symlink(P.png(v, f), os.path.join(tmp, f'{i:05d}.png'))
        from PIL import Image
        fw, fh = Image.open(P.png(v, have[0])).size
        w = (a.width or fw) // 2 * 2
        h = round(w * fh / fw / 2) * 2
        out = P.out(f'{v}.mp4')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', f'{P.fps / step:g}', '-i', os.path.join(tmp, '%05d.png'), '-vf',
                        f'scale={w}:{h}:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', str(a.crf), '-preset', 'slow', '-movflags', '+faststart', out], check=True)
        shutil.rmtree(tmp)
        made.append(out)
        note = '' if step == 1 else f'  (one frame in {step} was rendered: {P.fps / step:g} fps — render the rest for {P.fps} fps)'
        print(f'out/{v}.mp4  {len(have)} frames, {len(have) * step / P.fps:.1f} s, {w}x{h}, {os.path.getsize(out) / 1e6:.1f} MB{note}')
    if len(made) > 1:
        lst = P.out('tmp', 'concat.txt')
        open(lst, 'w').write(''.join(f"file '{m}'\n" for m in made))
        out = P.out('film.mp4')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', out], check=True)
        print(f'out/film.mp4  {os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
