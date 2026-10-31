#!/usr/bin/env python3
"""You cannot listen, so measure: for each scene's sound spec, mix the narration and the bed (music + SFX) separately the way
mix.py does, and print, per narration line, the voice level and the bed under it (active-speech RMS, dBFS, after mix.py's peak
normalisation), plus the full mix per second. Generalised from the 「마지막 도넛」 sound check. Run from the film project root:

  python3 <skill>/scripts/sound-levels.py ep1-find ep2-standoff …

Targets that worked on the donut film: voice ≈ −20…−23 dBFS, the bed under a line ≈ 10–13 dB lower (a −10 dB duck), the bed
≥ 30 dB lower only for a deliberate silence before a climax; each scene's mix ≈ −16.5…−18 LUFS before assemble.py's −16.
Narration cues are the "sfx" entries with "kind": "narration" (and "text", "len").
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mix as M


def render(scene, keep):
    spec = json.load(open(os.path.join(M.HERE, scene + '.sound.json'), encoding='utf-8'))
    out = np.zeros((int(spec['duration'] * M.SR), 2))
    cues = sorted([*spec.get('music', []), *spec.get('sfx', [])], key=lambda c: c['at'])
    ducks = sorted(spec.get('ducks', []), key=lambda d: d['from'])
    for d in ducks + [None]:
        while cues and (d is None or cues[0]['at'] < d['from']):
            c = cues.pop(0)
            if keep(c): M.place(out, M.load(M.find(scene, c)), c)
        if d is None: break
        g = np.ones(len(out)); a, b = int(d['from'] * M.SR), min(len(out), int(d['to'] * M.SR)); r = max(1, int(d.get('ramp', .3) * M.SR)); lo = 10 ** (d['db'] / 20)
        g[a:a + r] = np.linspace(1, lo, len(g[a:a + r])); g[a + r:b] = lo; out *= g[:, None]
    return out, spec


for scene in sys.argv[1:]:
    full, spec = render(scene, lambda c: True)
    nar, _ = render(scene, lambda c: c.get('kind') == 'narration')
    bed, _ = render(scene, lambda c: c.get('kind') != 'narration')
    pk = np.abs(full).max() or 1; norm = 20 * np.log10(.89 / pk) if pk > .89 else 0
    print(f'== {scene}: mix peak {20 * np.log10(pk):+.1f} dBFS → normalisation {norm:+.1f} dB')
    S = M.SR
    for c in spec.get('sfx', []):
        if c.get('kind') != 'narration': continue
        a, b = int(c['at'] * S), int((c['at'] + c.get('len', 2)) * S)
        v = nar[a:b]; w = int(.02 * S); m = len(v) // w
        if m == 0: continue
        e = np.sqrt((v[:m * w].reshape(m, w, 2) ** 2).mean((1, 2))); act = e > 10 ** (-45 / 20)
        if not act.any(): print(f"  {c['id']}: silent?"); continue
        bv = bed[a:b][:m * w].reshape(m, w, 2)
        vr = 20 * np.log10(np.sqrt((e[act] ** 2).mean())); br = 10 * np.log10((bv[act] ** 2).mean() + 1e-12)
        print(f"  {c['id']:5s} {c['at']:5.2f}s  voice {vr + norm:6.1f}  bed under it {br + norm:6.1f}  → voice +{vr - br:4.1f} dB  「{c.get('text', '')}」")
    bins = [10 * np.log10((full[t * S:(t + 1) * S] ** 2).mean() + 1e-12) + norm for t in range(int(spec['duration']))]
    print('  full mix per second (dBFS):', ' '.join(f'{v:4.0f}' for v in bins))
