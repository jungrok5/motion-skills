#!/usr/bin/env python3
"""Start a room: the project files of the starter (a small room that builds as it is) and the two documents to fill
in FIRST — BRIEF.md (who lives here, in what building, at which two hours) and RESEARCH.md (where the numbers come from).

  new_room.py my-room --title "방의 이름"

Then: write BRIEF.md and RESEARCH.md → inventory.py → skeleton.py → props.py + layout.py → film.py.
`check.py` fails until the two documents are filled in; that is on purpose.
"""
import argparse
import os
import shutil
import sys

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('dir')
    ap.add_argument('--title', default=None)
    a = ap.parse_args()
    dst = os.path.abspath(a.dir)
    if os.path.exists(dst) and os.listdir(dst):
        sys.exit(f'{dst} exists and is not empty')
    os.makedirs(dst, exist_ok=True)
    src = os.path.join(SKILL, 'starter')
    for f in ('room.py', 'inventory.py', 'skeleton.py', 'props.py', 'layout.py', 'film.py', '.gitignore'):
        shutil.copy(os.path.join(src, f), os.path.join(dst, f))
    title = a.title or os.path.basename(dst)
    p = os.path.join(dst, 'room.py')
    s = open(p, encoding='utf-8').read().replace("title='창가 책상'", f'title={title!r}')
    open(p, 'w', encoding='utf-8').write(s)
    for f in ('BRIEF.md', 'RESEARCH.md'):
        s = open(os.path.join(SKILL, 'templates', f), encoding='utf-8').read().replace('__TITLE__', title)
        open(os.path.join(dst, f), 'w', encoding='utf-8').write(s)
    rel = os.path.relpath(os.path.join(SKILL, 'scripts'), dst)
    print(f'{dst}\n  BRIEF.md, RESEARCH.md   fill these in first (read {os.path.relpath(os.path.join(SKILL, "references", "BRIEF.md"), dst)})\n'
          f'  room.py inventory.py skeleton.py props.py layout.py film.py   the starter room: replace it with yours\n'
          f'next:  cd {a.dir} && python3 {rel}/audit.py && python3 {rel}/render.py --view plan')


if __name__ == '__main__':
    main()
