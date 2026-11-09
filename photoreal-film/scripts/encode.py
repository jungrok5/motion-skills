#!/usr/bin/env python3
"""Frames + score → out/film.mp4 (H.264, high quality) and out/film-share.mp4 (smaller, for posting).

  encode.py [--crf 15] [--no-audio] [--name film]
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _boot  # noqa: E402


def main():
    ap = _boot.parser(__doc__)
    ap.add_argument('--crf', type=int, default=15)
    ap.add_argument('--no-audio', action='store_true')
    ap.add_argument('--name', default='film')
    a = ap.parse_args(_boot.argv())
    film = _boot.boot(a.project, need_bpy=False)
    frames = film.out('frames')
    have = [f for f in range(1, film.frames + 1) if os.path.exists(os.path.join(frames, f'{f:05d}.png'))]
    if len(have) != film.frames:
        miss = sorted(set(range(1, film.frames + 1)) - set(have))
        sys.exit(f'{len(miss)} of {film.frames} frames are missing in out/frames (first: {miss[0]}). Run render.py then finish.py.')
    wav = film.out('score.wav')
    audio = (not a.no_audio) and os.path.exists(wav)
    out = film.out(a.name + '.mp4')
    cmd = ['ffmpeg', '-y', '-v', 'error', '-framerate', str(film.fps), '-i', os.path.join(frames, '%05d.png')]
    if audio:
        cmd += ['-i', wav]
    cmd += ['-c:v', 'libx264', '-preset', 'slow', '-crf', str(a.crf), '-pix_fmt', 'yuv420p', '-tune', 'grain',
            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart']
    if audio:
        cmd += ['-af', 'loudnorm=I=-15:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest']
    subprocess.run(cmd + [out], check=True)
    share = film.out(a.name + '-share.mp4')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', out, '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart'] + (['-c:a', 'aac', '-b:a', '160k'] if audio else ['-an']) + [share], check=True)
    for p in (out, share):
        print(f'{os.path.relpath(p, film.root)}  {os.path.getsize(p) / 1e6:.1f} MB')
    if not audio and not a.no_audio:
        print('(no out/score.wav: run score.py for sound)')


if __name__ == '__main__':
    main()
