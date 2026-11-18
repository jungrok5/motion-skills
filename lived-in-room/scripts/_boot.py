"""Shared start-up for the scripts: find the project (cwd or --project) and the lr library (the project's own copy
first, then the skill's lib/). Works under `python3` with the bpy module and under `blender -b -P script.py -- args`."""
import argparse
import os
import sys

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def argv():
    a = sys.argv[1:]
    return a[a.index('--') + 1:] if '--' in a else a


def parser(desc):
    p = argparse.ArgumentParser(description=desc, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--project', default='.', help='project folder (has room.py); default: current directory')
    return p


def boot(project, need_bpy=True):
    root = os.path.abspath(project)
    if not os.path.exists(os.path.join(root, 'room.py')):
        sys.exit(f'{root}: no room.py here. Run from a project folder or pass --project <dir> '
                 f'(start one with: python3 {os.path.join(SKILL, "scripts", "new_room.py")} my-room)')
    lib = root if os.path.isdir(os.path.join(root, 'lr')) else os.path.join(SKILL, 'lib')
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
    from lr.project import Project
    return Project(root)


def quiet():
    """Blender prints a line per sample to stdout; send its chatter to out/blender.log and keep ours."""
    sys.stdout.flush()
    return os.dup(1)


class Hush:
    """with Hush(path): … — Blender's own stdout goes to a log file for the duration."""
    def __init__(self, path):
        self.path = path

    def __enter__(self):
        sys.stdout.flush()
        self.keep = os.dup(1)
        self.f = os.open(self.path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
        os.dup2(self.f, 1)

    def __exit__(self, *a):
        sys.stdout.flush()
        os.dup2(self.keep, 1)
        os.close(self.f)
        os.close(self.keep)


def parse_when(project, spec):
    """'night:0.5' → the middle of the night walk; 'night:3.2s' → 3.2 seconds in; 'night:40' → frame 40;
    'night' → the middle. Returns (version, frame)."""
    v, _, fr = spec.partition(':')
    n = project.frames(v)
    if not fr:
        f = (n + 1) // 2
    elif fr.endswith('s'):
        f = 1 + round(float(fr[:-1]) * project.fps)
    elif '.' in fr:
        f = 1 + round(float(fr) * (n - 1))
    else:
        f = int(fr)
    return v, max(1, min(n, f))


def develop(project, version, exr_path, frame=0, look=None, film_w=None):
    """Linear EXR → the finished 8-bit picture (numpy array)."""
    import numpy as np
    from lr import exr, finish
    lin = exr.read_rgb(exr_path)
    L = dict(look or project.look_for(version))
    if L.get('auto'):
        lum = lin @ finish.LUM
        med = float(np.median(lum))
        L['exposure'] = float(np.log2(max(1e-6, (L['auto'] / 255.0) ** 2.2 * 0.9) / max(1e-6, med)))
    return finish.finish(lin, L, frame=frame, film_w=film_w or project.size[0])
