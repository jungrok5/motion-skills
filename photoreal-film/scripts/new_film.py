#!/usr/bin/env python3
"""Start a film project.

  new_film.py my-film --title "HOROLOGY" --shots macro,parts,hero,world,title [--copy-lib]

Creates my-film/ with film.py, BRIEF.md (the form to fill in first), shots/<id>.py (one commented page per shot),
score.py and .gitignore. --copy-lib copies the pf library into the project so it runs without the skill folder.
Without --shots you get a copy of the two-shot starter, which renders as it is.
"""
import argparse
import os
import re
import shutil
import sys

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


SCORE = '''"""The sound of the film, placed on its timeline in seconds. `score.py --list` prints the cut times."""
from pf import sound


def score(sc, film):
    sound.auto(film, sc)        # a bed, a whoosh into every cut, a hit on the last shot: replace with cues for this film
    # t = {s['id'].split('_')[0]: s['start'] / film.fps for s in film.shots}
    # sc.ticks(t['s01'] + 0.3, t['s02'] - 0.2, rate=6, gain=0.2)       # something turning
    # sc.clunk(t['s03'] + 1.1, 0.6)                                    # a part seating
    # sc.swell(t['s04'], t['s05'], (146.83, 220.0, 329.63), 0.3)       # the open air of the wide shot
'''


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('dir')
    ap.add_argument('--title')
    ap.add_argument('--shots', help='comma list of short names, in film order')
    ap.add_argument('--frames', type=int, default=48, help='frames per shot to start with')
    ap.add_argument('--copy-lib', action='store_true')
    a = ap.parse_args()
    root = os.path.abspath(a.dir)
    if os.path.exists(os.path.join(root, 'film.py')):
        sys.exit(f'{root} already has a film.py')
    os.makedirs(os.path.join(root, 'shots'), exist_ok=True)
    title = a.title or os.path.basename(root).replace('-', ' ').upper()
    brief = open(os.path.join(SKILL, 'references', 'BRIEF.md')).read()
    m = re.search(r'```markdown\n(.*?)```', brief, re.S)
    open(os.path.join(root, 'BRIEF.md'), 'w').write((m.group(1) if m else brief).replace('__TITLE__', title))
    shutil.copy(os.path.join(SKILL, 'starter', '.gitignore'), os.path.join(root, '.gitignore'))
    if not a.shots:
        for f in ('film.py', 'score.py', 'shots/s01_dial.py', 'shots/s02_title.py'):
            shutil.copy(os.path.join(SKILL, 'starter', f), os.path.join(root, f))
        txt = open(os.path.join(root, 'film.py')).read().replace("title='STARTER'", f'title={title!r}')
        open(os.path.join(root, 'film.py'), 'w').write(txt)
    else:
        names = [re.sub(r'[^a-z0-9]+', '_', n.strip().lower()).strip('_') for n in a.shots.split(',') if n.strip()]
        ids = [f's{i + 1:02d}_{n}' for i, n in enumerate(names)]
        tpl = open(os.path.join(SKILL, 'templates', 'shot.py')).read()
        for sid in ids:
            src = open(os.path.join(SKILL, 'starter', 'shots', 's02_title.py')).read() if sid.endswith('_title') else tpl.replace('__ID__', sid)
            open(os.path.join(root, 'shots', sid + '.py'), 'w').write(src)
        rows = '\n'.join(f"        dict(id='{sid}', frames={a.frames}),{'  # fade_in=(\"black\", 8)' if i == 0 else ''}" for i, sid in enumerate(ids))
        film = open(os.path.join(SKILL, 'starter', 'film.py')).read()
        film = re.sub(r'"""STARTER.*?"""', f'"""{title} — one line: what the film is. See BRIEF.md."""', film, flags=re.S)
        film = film.replace("title='STARTER'", f'title={title!r}')
        film = re.sub(r"    shots=\[\n.*?\n    \],", f"    shots=[\n{rows}\n    ],", film, flags=re.S)
        open(os.path.join(root, 'film.py'), 'w').write(film)
        open(os.path.join(root, 'score.py'), 'w').write(SCORE)
    if a.copy_lib:
        shutil.copytree(os.path.join(SKILL, 'lib', 'pf'), os.path.join(root, 'pf'), ignore=shutil.ignore_patterns('__pycache__'))
    rel = os.path.relpath(os.path.join(SKILL, 'scripts'), root)
    print(f'{root}\n  1. fill in BRIEF.md\n  2. cd {a.dir} && python3 {rel}/render.py --still s01:0.5\n  3. python3 {rel}/contact.py   then  check.py, render.py --all, finish.py, score.py, encode.py')


if __name__ == '__main__':
    main()
