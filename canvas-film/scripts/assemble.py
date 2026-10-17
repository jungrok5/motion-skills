"""Join the rendered scenes into one film, in film.json order (each scene opens from and closes to black).
   Run from the film project root:
     python3 <skill>/scripts/assemble.py h        → out/film-h.mp4   (1920×1080)
     python3 <skill>/scripts/assemble.py v        → out/film-v.mp4   (1080×1920)
     python3 <skill>/scripts/assemble.py h en     → out/film-h-en.mp4 (scenes rendered with --lang en)
   Picture: out/<scene>[-<lang>]-<h|v>.mp4.  Sound: scenes/<scene>.wav, loudness-normalised to −16 LUFS per scene.
   Missing scenes are skipped and listed."""
import os, json, subprocess, sys

ROOT = os.path.abspath(os.environ.get('FILM_ROOT', '.'))
ori = sys.argv[1] if len(sys.argv) > 1 else 'h'
lang = sys.argv[2] if len(sys.argv) > 2 else ''
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
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst]
subprocess.run(args, check=True)
print('→', dst, '·', len(have), 'scenes:', ' → '.join(h[0] for h in have))
