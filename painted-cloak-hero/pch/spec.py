"""character.json: what the brief decided, in numbers. Loaded with defaults; project parts.py (if any) registers
extra part builders before the build."""
import json
import os
import importlib.util

DEFAULT_CLIPS = [
    {'type': 'idle', 'dur': 4.0, 'blinks': [1.2, 3.1]},
    {'type': 'walk', 'dur': 1.0},
    {'type': 'turn', 'dur': 2.2, 'by': 180},
]


def load(path):
    with open(path, encoding='utf-8') as f:
        spec = json.load(f)
    spec.setdefault('name', os.path.splitext(os.path.basename(path))[0])
    spec.setdefault('body', {})
    spec.setdefault('face', {})
    spec.setdefault('parts', [])
    m = spec.setdefault('motion', {})
    m.setdefault('fps', 24)
    m.setdefault('clips', DEFAULT_CLIPS)
    r = spec.setdefault('review', {})
    r.setdefault('title', 'HERO / ANIMATION REVIEW')
    r.setdefault('bg', '#7d7a97')
    r.setdefault('floor', '#76738f')
    r.setdefault('grid', '#8c89a3')
    r.setdefault('camera', {})
    spec['_dir'] = os.path.dirname(os.path.abspath(path))
    proj_parts = os.path.join(spec['_dir'], 'parts.py')
    if os.path.exists(proj_parts):
        s = importlib.util.spec_from_file_location('project_parts', proj_parts)
        mod = importlib.util.module_from_spec(s)
        s.loader.exec_module(mod)
    return spec
