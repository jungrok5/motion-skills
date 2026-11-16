"""A project on disk → a built room. A project is a folder with

    room.py        ROOM = dict(title, fps, size, seed, versions={name: dict(seconds, look)}, look, views, …)
    inventory.py   INVENTORY = [dict(id, name, n, size, method, support, use, ref), …]   every kind of thing, listed first
    skeleton.py    build(r)      the building: shell, openings, windows, door, fixed services
    props.py       builders for the things of THIS room (designed for the topic)
    layout.py      furnish(r)    every thing put, hung, stuck, suspended, leant or fixed — with why it is there
    film.py        light(r), motion(r), camera(r)   per version (r.v): the hour, what moves, the walk

The model (skeleton + layout) is built the same for every version; only light, motion and the walk differ.
"""
import importlib.util
import os
import sys

from . import finish as fin


class Project:
    def __init__(self, root):
        self.root = os.path.abspath(root)
        if self.root not in sys.path:
            sys.path.insert(0, self.root)
        self.cfg = self._load('room').ROOM
        self.inventory = list(self._load('inventory').INVENTORY)
        c = self.cfg
        self.title = c.get('title', os.path.basename(self.root))
        self.fps = c.get('fps', 24)
        self.size = tuple(c.get('size', (1920, 1080)))
        self.seed = c.get('seed', 1)
        self.versions = dict(c['versions'])
        self.look = {**fin.DEFAULT_LOOK, **c.get('look', {})}
        self.views = dict(c.get('views', {}))

    def _load(self, name):
        path = os.path.join(self.root, name + '.py')
        if not os.path.exists(path):
            raise FileNotFoundError(f'{path} is missing')
        spec = importlib.util.spec_from_file_location(f'lrproj_{name}', path)
        mod = importlib.util.module_from_spec(spec)
        sys.modules.pop(f'lrproj_{name}', None)
        spec.loader.exec_module(mod)
        return mod

    def frames(self, version):
        if version == 'work':
            return 1
        return max(1, round(self.versions[version]['seconds'] * self.fps))

    def out(self, *parts):
        p = os.path.join(self.root, 'out', *parts)
        os.makedirs(os.path.dirname(p) if os.path.splitext(p)[1] else p, exist_ok=True)
        return p

    def exr(self, version, frame):
        return self.out('exr', version, f'{frame:04d}.exr')

    def png(self, version, frame):
        return self.out('frames', version, f'{frame:05d}.png')

    def look_for(self, version):
        if version == 'work':
            return {**fin.DEFAULT_LOOK, 'bloom': 0.0, 'halation': 0.0, 'grain': 0.0, 'vignette': 0.0, 'split': 0.0, 'contrast': 1.0,
                    'distortion': 0.0, 'ca': 0.0, 'auto': 118.0}
        return {**self.look, **self.versions[version].get('look', {})}

    def build(self, version, quality='preview', view=None, mode=None, model_only=False, **over):
        """Reset Blender and build the room for one version ('work' = the same room under the work light, seen
        from a review view). mode='supports' paints every thing by its support type. Returns the Room."""
        from . import scene as sc
        from .room import Room
        if version != 'work' and version not in self.versions:
            raise KeyError(f'no version "{version}" in room.py (have: {", ".join(self.versions)})')
        scn = sc.reset()
        q = sc.setup(scn, self.size, self.fps, quality, **over)
        scn.frame_start, scn.frame_end = 1, self.frames(version)
        r = Room(self, version, scn, q, quality)
        self._load('skeleton').build(r)
        r.walls()
        self._load('layout').furnish(r)
        if model_only:
            return r
        film = self._load('film')
        if version == 'work':
            r.work_light()
            v = self.view(view or 'plan', r)
            r.camera(lens=v.get('lens', 20.0))
            r.view(v['pos'], v['look'], ortho=v.get('ortho'))
            for name in v.get('hide', ()):
                if name in r.items:
                    r.items[name].ob.hide_render = True
            if hasattr(film, 'plate'):
                film.plate(r)
        else:
            film.light(r)
            film.motion(r)
            film.camera(r)
        if mode == 'supports':
            paint_supports(r)
        r.bake()
        return r

    def view(self, name, r):
        if name == 'plan':
            return dict(pos=(r.W / 2, r.D / 2, r.H + 6), look=(r.W / 2, r.D / 2, 0), ortho=max(r.W, r.D * 16 / 9) * 1.06,
                        hide=['ceiling', 'cornice'] + [n for n, it in r.items.items() if 'ceiling' in it.on])
        if name not in self.views:
            raise KeyError(f'no view "{name}" in room.py views (have: plan, {", ".join(self.views)})')
        return dict(self.views[name])


SUPPORT_COLORS = dict(place='#4f8fd8', hang='#e2a13a', stick='#d75fa6', suspend='#8a63d2', lean='#3fb58a', fix='#8b8f98',
                      skeleton='#d9d6cf')


def paint_supports(r):
    """Replace every material by one flat colour per support type: the picture that shows, at a glance, what each
    thing claims to be held by."""
    import bpy
    from .util import rgba
    mats = {}
    for k, c in SUPPORT_COLORS.items():
        m = bpy.data.materials.new('support ' + k)
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = rgba(c)
        b.inputs['Roughness'].default_value = 0.8
        mats[k] = m
    for it in r.items.values():
        me = it.ob.data
        me.materials.clear()
        me.materials.append(mats['skeleton' if it.cls == 'skeleton' else it.support])
        me.polygons.foreach_set('material_index', [0] * len(me.polygons))
