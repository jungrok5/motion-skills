"""The film as data and the Shot a scene is built in.

A project is a folder with film.py (FILM = {...}) and shots/<id>.py, each with build(s). A shot is a pure
function of its frame number: build(s) makes the set once and registers what moves through s.animate / s.shoot;
the library bakes those functions to linear keys on every frame (and one frame either side, for motion blur).
"""
import importlib.util
import math
import os
import sys

from . import util

DEFAULT_LOOK = dict(
    exposure=0.0,          # stops, applied to the linear render
    bloom=0.10,            # glow of everything brighter than `bloom_at`
    bloom_at=1.0,
    halation=0.25,         # red-orange glow of the brightest points, as on film stock
    streak=0.0,            # horizontal anamorphic streak from the brightest points
    ca=0.0012,             # chromatic aberration: red/blue scale difference at the frame edge
    distortion=0.0,        # barrel (+) / pincushion (−)
    vignette=0.35,
    tonemap='agx',         # 'agx' | 'filmic' | 'linear'
    contrast=1.12,
    saturation=1.0,
    lift=(0.0, 0.0, 0.0),  # added to shadows (display space)
    shadows='#0b1722',     # split tone: tint pushed into the shadows …
    highlights='#ffd9a8',  # … and into the highlights
    split=0.22,            # strength of the split tone
    black=0.012,           # film black is never 0
    grain=0.055,
    grain_size=1.4,        # px at film size
    soften=0.25,           # takes the CG edge off: fraction of a 1-px blur mixed in
)


class Film:
    def __init__(self, root):
        self.root = os.path.abspath(root)
        if self.root not in sys.path:
            sys.path.insert(0, self.root)
        spec = importlib.util.spec_from_file_location('film_def', os.path.join(self.root, 'film.py'))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.mod = mod
        d = mod.FILM
        self.title = d.get('title', os.path.basename(self.root))
        self.fps = d.get('fps', 24)
        self.size = tuple(d.get('size', (1920, 804)))
        self.bars = d.get('bars', (1920, 1080))          # the delivered frame; None = no letterbox
        self.seed = d.get('seed', 1)
        self.look = {**DEFAULT_LOOK, **d.get('look', {})}
        self.shots = []
        start = 0
        for s in d['shots']:
            s = dict(s)
            s.setdefault('look', {})
            s['start'] = start                             # global index of the shot's first frame (0-based)
            start += s['frames']
            self.shots.append(s)
        self.frames = start
        self.duration = start / self.fps

    def shot(self, sid):
        for s in self.shots:
            if s['id'] == sid or s['id'].split('_')[0] == sid:
                return s
        raise KeyError(f'no shot "{sid}" in film.py (have: {", ".join(s["id"] for s in self.shots)})')

    def out(self, *parts):
        p = os.path.join(self.root, 'out', *parts)
        os.makedirs(os.path.dirname(p) if os.path.splitext(p)[1] else p, exist_ok=True)
        return p

    def exr(self, sid, frame):
        return self.out('exr', sid, f'{frame:04d}.exr')

    def plate_path(self, sid, frame):
        return self.out('plates', f'{sid}_{frame:04d}.png')

    def at(self, gframe):
        """Global frame index → (shot dict, local frame 1..n)."""
        for s in self.shots:
            if gframe < s['start'] + s['frames']:
                return s, gframe - s['start'] + 1
        raise IndexError(gframe)

    def look_for(self, s):
        return {**self.look, **s.get('look', {})}

    def build(self, sid, quality='final', **over):
        """Reset Blender and build one shot. Returns the Shot (shot.scene is ready to render)."""
        from . import scene as sc
        s = self.shot(sid)
        scn = sc.reset()
        q = sc.setup(scn, self.size, self.fps, quality, shutter=s.get('shutter', 0.5), **over)
        scn.frame_start, scn.frame_end = 1, s['frames']
        shot = Shot(self, s, scn, quality, q)
        path = os.path.join(self.root, 'shots', s['id'] + '.py')
        spec = importlib.util.spec_from_file_location('shot_' + s['id'], path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.build(shot)
        shot.bake()
        return shot


class Shot:
    """What build(s) receives. Frames are local: 1..s.n. Everything that moves is a function of the frame."""

    def __init__(self, film, d, scene, quality, q):
        self.film, self.d, self.scene, self.quality, self.q = film, d, scene, quality, q
        self.id = d['id']
        self.n = d['frames']
        self.fps = film.fps
        self.cam = None
        self._anims = []
        self._cam_fn = None
        self.checks = []          # filled during bake: problems found while building (focus, clipping …)
        self.focus_log = {}

    # -- time ----------------------------------------------------------------------------------------
    def u(self, f):
        """Frame → 0..1 across the shot."""
        return (f - 1) / max(1, self.n - 1)

    def sec(self, f):
        return (f - 1) / self.fps

    def rng(self, tag=''):
        return util.rng(f'{self.film.seed}/{self.id}/{tag}')

    # -- camera --------------------------------------------------------------------------------------
    def camera(self, lens=50.0, fstop=2.8, sensor=36.0, blades=0, squeeze=1.0, clip=(0.005, 2000.0)):
        """The lens of the shot. lens in mm on a 36 mm sensor (macro 90-120, portrait 85, normal 35-50, wide 18-24).
        fstop sets depth of field for real: f/1.4-2.8 for macro and hero shots, f/5.6-11 for landscapes.
        squeeze > 1 gives the oval bokeh of an anamorphic lens (1.3-2.0)."""
        import bpy
        c = bpy.data.cameras.new('cam')
        c.lens, c.sensor_width = lens, sensor
        c.clip_start, c.clip_end = clip
        c.dof.use_dof = True
        c.dof.aperture_fstop = fstop
        c.dof.aperture_blades = blades
        c.dof.aperture_ratio = squeeze
        ob = bpy.data.objects.new('cam', c)
        self.scene.collection.objects.link(ob)
        ob.rotation_mode = 'QUATERNION'
        self.scene.camera = ob
        self.cam = ob
        return ob

    def shoot(self, fn):
        """fn(f) → dict(pos=(x,y,z), look=(x,y,z), focus=(x,y,z) | metres, roll=deg, up=(x,y,z), lens=mm, fstop=N).
        pos and look are required; focus defaults to the look point; up defaults to +Z (give it for top-down shots).
        Called for every frame of the shot."""
        self._cam_fn = fn

    def shake(self, f, pos=0.002, rot=0.15, speed=1.0, seed=0.0):
        """Hand-held life for a camera: returns ((dx, dy, dz), roll_deg). A function of the frame only."""
        t = self.sec(f) * speed
        d = tuple(util.fbm1(t * 1.7 + k * 31.0, seed + k) * pos for k in range(3))
        return d, util.fbm1(t * 1.3 + 77.0, seed + 9.0) * rot

    # -- animation -----------------------------------------------------------------------------------
    def animate(self, target, fn):
        """fn(f) → {data_path: value}. target is any Blender datablock or struct: an object ('location',
        'rotation_euler', 'scale'), a light data block ('energy'), a node socket ('default_value'),
        a modifier ('time') … Baked with linear keys on frames 0..n+1."""
        self._anims.append((target, fn))

    def spin(self, ob, rpm, axis=2, phase=0.0):
        """Constant rotation (wheels, gears, platters). rpm may be negative."""
        base = tuple(ob.rotation_euler)

        def fn(f):
            r = list(base)
            r[axis] = base[axis] + phase + self.sec(f) * rpm / 60.0 * math.tau
            return {'rotation_euler': tuple(r)}
        self.animate(ob, fn)

    def plate(self, sid, frame):
        """Path of a *finished* frame of another shot (rendered on demand by render.py), to use as an image in
        this one: a photograph on a desk, a screen, a postcard — the cut where a world turns out to be a picture."""
        s = self.film.shot(sid)
        p = self.film.plate_path(s['id'], frame)
        if not os.path.exists(p):
            raise FileNotFoundError(f'plate {os.path.relpath(p, self.film.root)} is missing: list it in film.py as '
                                    f'plates=[("{s["id"]}", {frame})] on shot {self.id} and render through render.py')
        return p

    # -- bake ----------------------------------------------------------------------------------------
    def bake(self):
        from mathutils import Euler, Matrix, Vector
        scene = self.scene
        self._warned_up = False
        frames = range(0, self.n + 2)
        for target, fn in self._anims:
            for f in frames:
                for path, val in fn(f).items():
                    setattr(target, path, val)
                    target.keyframe_insert(data_path=path, frame=f)
        if self.cam is None:
            self.checks.append('no camera: call s.camera() and s.shoot() in build()')
            return
        if self._cam_fn is None:
            self.checks.append('no camera move: call s.shoot(fn)')
            return
        cam, data = self.cam, self.cam.data
        prev = None
        for f in frames:
            d = self._cam_fn(f)
            pos, look = Vector(d['pos']), Vector(d['look'])
            fwd = (look - pos).normalized()
            upv = Vector(d.get('up', (0, 0, 1))).normalized()
            if abs(fwd.dot(upv)) > 0.9995:                      # looking straight along "up": the shot must say which way is up
                upv = Vector((0, 1, 0))
                if 'up' not in d and not self._warned_up:
                    self._warned_up = True
                    self.checks.append('camera looks straight up/down: pass up=(x, y, z) in s.shoot() so the frame does not spin')
            right = fwd.cross(upv).normalized()
            q = Matrix((right, right.cross(fwd), -fwd)).transposed().to_quaternion()
            if d.get('roll'):
                q = q @ Euler((0, 0, math.radians(d['roll']))).to_quaternion()
            if prev is not None and q.dot(prev) < 0:
                q.negate()
            prev = q.copy()
            cam.location, cam.rotation_quaternion = pos, q
            cam.keyframe_insert('location', frame=f)
            cam.keyframe_insert('rotation_quaternion', frame=f)
            fo = d.get('focus', look)
            dist = float(fo) if isinstance(fo, (int, float)) else (Vector(fo) - pos).dot((look - pos).normalized())
            data.dof.focus_distance = max(dist, data.clip_start * 1.01)
            data.dof.keyframe_insert('focus_distance', frame=f)
            if 'lens' in d:
                data.lens = d['lens']
                data.keyframe_insert('lens', frame=f)
            if 'fstop' in d:
                data.dof.aperture_fstop = d['fstop']
                data.dof.keyframe_insert('aperture_fstop', frame=f)
            self.focus_log[f] = (tuple(pos), tuple(look), data.dof.focus_distance, data.lens, data.dof.aperture_fstop)
        scene.frame_set(1)
