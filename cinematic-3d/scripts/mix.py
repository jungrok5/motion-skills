#!/usr/bin/env python3
"""cinematic-3d · mix.py — one ambience bed per shot → audio/mix.wav, cut to the film's timeline.

  python3 <skill>/scripts/mix.py            (run in the project root, next to film.json)

For each shot in film.json it takes audio/<id>.mp3 (or "sound": "<file>" on the shot), levels it to -20 LUFS (+ "gain" dB on
the shot), trims it to the shot's length plus the dissolve, crossfades it in and out over the same dissolve as the picture,
and lays it at the shot's start. The sum is limited to -1.5 dBTP and normalised to -16 LUFS (phone / web loudness).
Shot lengths come from window.DURATION in each page (read from the rendered out/<id>.mp4 when present, else "dur" or 7 s).
Generate the beds with ElevenLabs sound effects: set duration_seconds explicitly (the default picks ~1 s clips).
"""
import json, os, subprocess, sys

film = json.load(open('film.json'))
X = film.get('dissolve', .8)

def dur(shot):
    f = os.path.join('out', shot['id'] + '.mp4')
    if os.path.exists(f):
        return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))
    return shot.get('dur', 7)

inputs, chains, t = [], [], 0.0
for i, s in enumerate(film['shots']):
    src = s.get('sound', os.path.join('audio', s['id'] + '.mp3'))
    d = dur(s)
    if not os.path.exists(src):
        print('no sound for', s['id'], '(skipped)', file=sys.stderr); t += d - X; continue
    n = len(inputs) // 2; inputs += ["-i", src]
    length = d + (X if i < len(film['shots']) - 1 else 0)
    fin = X if i else 0.01
    chains.append(f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-20:TP=-3:LRA=11,volume={s.get('gain', 0)}dB,"
                  f"apad,atrim=0:{length:.3f},afade=t=in:d={fin},afade=t=out:st={length - X:.3f}:d={X},adelay={int(t * 1000)}|{int(t * 1000)}[a{n}]")
    t += d - X
if not chains: sys.exit('no sounds found in audio/')
mix = ''.join(f'[a{k}]' for k in range(len(chains)))
graph = ';'.join(chains) + f';{mix}amix=inputs={len(chains)}:normalize=0,alimiter=limit=0.84:level=false,loudnorm=I=-16:TP=-1.5:LRA=11[out]'
os.makedirs('audio', exist_ok=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', graph, '-map', '[out]', '-ar', '48000', '-t', f'{t + X:.3f}', 'audio/mix.wav'], check=True)
print('audio/mix.wav', f'{t + X:.2f} s')
