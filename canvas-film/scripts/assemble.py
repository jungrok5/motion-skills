"""Join the rendered scenes into one film, in film.json order (each scene opens from and closes to black).
   Run from the film project root:
     python3 <skill>/scripts/assemble.py h        → out/film-h.mp4   (1920×1080)
     python3 <skill>/scripts/assemble.py v        → out/film-v.mp4   (1080×1920)
     python3 <skill>/scripts/assemble.py h en     → out/film-h-en.mp4 (scenes rendered with --lang en)
   Picture: out/<scene>[-<lang>]-<h|v>.mp4.  Sound: scenes/<scene>.wav, loudness-normalised to −16 LUFS per scene.
   Missing scenes are skipped and listed.
   Add --upload to also write film-<h|v>…-upload.mp4: the copy to upload to YouTube/Instagram (H.265, closed GOP, a
   keyframe every 2 s, no B-frames, ~250–350 MB for 14 min). Video sites re-encode each upload in chunks cut at keyframes;
   with open-GOP/B-frame files some renditions show a later frame for a moment at every scene start ("the start jumps"),
   on some phones only. The master itself is also written with fixed 2 s closed GOPs."""
import os, json, subprocess, sys

ROOT = os.path.abspath(os.environ.get('FILM_ROOT', '.'))
pos = [a for a in sys.argv[1:] if not a.startswith('--')]   # h|v [lang] [--upload]
ori = pos[0] if pos else 'h'; lang = pos[1] if len(pos) > 1 else ''
ORDER = [s['id'] if isinstance(s, dict) else s for s in json.load(open(os.path.join(ROOT, 'film.json')))['scenes']]
OUT = os.path.join(ROOT, 'out'); suf = f'-{lang}' if lang else ''
have, missing = [], []
for s in ORDER:
    v, a = os.path.join(OUT, f'{s}{suf}-{ori}.mp4'), os.path.join(ROOT, 'scenes', f'{s}.wav')
    (have if os.path.exists(v) and os.path.exists(a) else missing).append((s, v, a))
if missing: print('skipped (not rendered or no sound yet):', ', '.join(m[0] for m in missing))
if not have: sys.exit('nothing to assemble')
args = ['ffmpeg', '-y', '-loglevel', 'error']
for _, v, a in have: args += ['-i', v, '-i', a]
parts = ''.join(f'[{2 * i}:v:0]setsar=1,fps=30[v{i}];[{2 * i + 1}:a:0]aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a{i}];' for i in range(len(have)))
streams = ''.join(f'[v{i}][a{i}]' for i in range(len(have)))
dst = os.path.join(OUT, f'film-{ori}{suf}.mp4')
args += ['-filter_complex', parts + f'{streams}concat=n={len(have)}:v=1:a=1[v][a]', '-map', '[v]', '-map', '[a]',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst]
subprocess.run(args, check=True)
print('→', dst, '·', len(have), 'scenes:', ' → '.join(h[0] for h in have))

if '--upload' in sys.argv:   # the copy for video sites: closed GOP, fixed 2 s keyframes, no B-frames (see the docstring)
    up = dst[:-4] + '-upload.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', dst, '-map', '0:v', '-map', '0:a', '-c:v', 'libx265', '-preset', 'fast',
                    '-x265-params', 'crf=20:bframes=0:open-gop=0:keyint=60:min-keyint=60:vbv-maxrate=3600:vbv-bufsize=7200:log-level=error',
                    '-pix_fmt', 'yuv420p', '-tag:v', 'hvc1', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', up], check=True)
    print('→', up, '(upload copy)')
