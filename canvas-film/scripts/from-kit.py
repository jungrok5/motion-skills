#!/usr/bin/env python3
"""Start scenes from packaged style kits (kits/<slug>/) instead of a blank canvas.

  python3 <skill>/scripts/from-kit.py my-film --kit charcoal [--kit bass …] [--id seed]
→ my-film/film.json (creates or extends), my-film/scenes/
     lib.js (harness), story.js (captions + end card), kit-<slug>.js (vendored: later kit changes never touch this film),
     script.js (one kit) or script-<slug>.js (several kits — templates use different beat names; merge into one
     script.js once the storyboard is final), <id>-<slug>.html (the kit's template: replace its placeholder subject)
Then: write the script, draw the film's image with the kit (kits/<slug>/STYLE.md), stills, sound, render or publish.
"""
import argparse, json, os, shutil, sys

ap = argparse.ArgumentParser()
ap.add_argument('project'); ap.add_argument('--kit', action='append', required=True); ap.add_argument('--id', default='scene')
a = ap.parse_args()
skill = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = os.path.join(skill, 'kits')
have = sorted(d for d in os.listdir(K) if os.path.exists(os.path.join(K, d, 'kit.js')))
for k in a.kit:
    if k not in have: sys.exit(f'no kit "{k}" (have: {", ".join(have)})')
sc = os.path.join(a.project, 'scenes'); os.makedirs(os.path.join(sc, 'audio'), exist_ok=True)
os.makedirs(os.path.join(a.project, 'out'), exist_ok=True)
shutil.copy(os.path.join(skill, 'harness', 'lib.js'), sc)
shutil.copy(os.path.join(K, '_shared', 'story.js'), sc)
fj = os.path.join(a.project, 'film.json')
film = json.load(open(fj, encoding='utf-8')) if os.path.exists(fj) else {'title': '', 'source': 'ko', 'scenes': []}
for k in a.kit:
    shutil.copy(os.path.join(K, k, 'kit.js'), os.path.join(sc, f'kit-{k}.js'))
    sname = 'script.js' if len(a.kit) == 1 else f'script-{k}.js'
    if not os.path.exists(os.path.join(sc, sname)):
        shutil.copy(os.path.join(K, k, 'script.example.js'), os.path.join(sc, sname))
    sid = f'{a.id}-{k}'
    page = open(os.path.join(K, k, 'template.html'), encoding='utf-8').read().replace('src="script.js"', f'src="{sname}"')
    open(os.path.join(sc, sid + '.html'), 'w', encoding='utf-8').write(page)
    label = open(os.path.join(K, k, 'STYLE.md'), encoding='utf-8').readline().lstrip('# ').strip()
    if not any(s['id'] == sid for s in film['scenes']): film['scenes'].append({'id': sid, 'label': label, 'dur': 30})
json.dump(film, open(fj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('→', a.project, '·', ', '.join(f'{a.id}-{k}' for k in a.kit))
