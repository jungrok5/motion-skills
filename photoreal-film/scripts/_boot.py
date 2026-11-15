"""Shared start-up for the scripts: find the project (cwd or --project) and the pf library (the project's own copy
first, then the skill's lib/). Works under `python3` with the bpy module and under `blender -b -P script.py -- args`."""
import argparse
import os
import sys

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def argv():
    a = sys.argv[1:]
    return a[a.index('--') + 1:] if '--' in a else a


def parser(desc):
    p = argparse.ArgumentParser(description=desc)
    p.add_argument('--project', default='.', help='project folder (has film.py); default: current directory')
    return p


def boot(project, need_bpy=True):
    root = os.path.abspath(project)
    if not os.path.exists(os.path.join(root, 'film.py')):
        sys.exit(f'{root}: no film.py here. Run from a project folder or pass --project <dir> '
                 f'(start one with: python3 {os.path.join(SKILL, "scripts", "new_film.py")} my-film)')
    lib = root if os.path.isdir(os.path.join(root, 'pf')) else os.path.join(SKILL, 'lib')
    for p in (lib, root):
        if p not in sys.path:
            sys.path.insert(0, p)
    if need_bpy:
        try:
            import bpy  # noqa: F401
        except ImportError:
            sys.exit('Blender\'s Python module is missing. Install it for this Python:  pip install bpy\n'
                     '(bpy wheels target one Python version each: bpy 5.x needs Python 3.13). '
                     'Or run inside Blender:  blender -b -P <script> -- <args>')
        from pf.film import Film
        return Film(root)
    import pf  # noqa: F401
    from pf.film import Film
    return Film(root)


def parse_frame(film, spec):
    """'s03:40' → local frame 40; 's03:0.5' → the middle; 's03' → the middle. Returns (shot dict, frame)."""
    sid, _, fr = spec.partition(':')
    s = film.shot(sid)
    if not fr:
        f = (s['frames'] + 1) // 2
    elif '.' in fr:
        f = 1 + round(float(fr) * (s['frames'] - 1))
    else:
        f = int(fr)
    return s, max(1, min(s['frames'], f))
