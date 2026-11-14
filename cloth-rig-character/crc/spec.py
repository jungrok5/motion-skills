"""character.json: what the brief decided, in numbers. Loaded with defaults; project parts.py (if any) registers
extra part builders before the build."""
import json
import os
import importlib.util

DEFAULT_CLIPS = [
    {'type': 'idle', 'dur': 2.0, 'blinks': [0.9]},
    {'type': 'turn', 'dur': 1.4, 'to': 62},
    {'type': 'walk', 'dur': 2.8},
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
    m.setdefault('start', {'x': -0.35, 'y': 0.1, 'yaw': -20})
    r = spec.setdefault('review', {})
    r.setdefault('title', 'HERO / ANIMATION REVIEW')
    r.setdefault('bg', '#8c8ea0')
    r.setdefault('floor', '#77798a')
    r.setdefault('camera', {})
    spec['_dir'] = os.path.dirname(os.path.abspath(path))
    proj_parts = os.path.join(spec['_dir'], 'parts.py')
    if os.path.exists(proj_parts):
        s = importlib.util.spec_from_file_location('project_parts', proj_parts)
        mod = importlib.util.module_from_spec(s)
        s.loader.exec_module(mod)
    return spec
