"""What makes the room a film: the small things that move, the light of each hour, and the phone in the hand of
the person who walks in. Mixed into Room.

Everything is a function of the frame number and is baked to linear keys on frames 0..n+1 (one frame either side
so motion blur has a neighbour) — no drivers, no physics cache, nothing carried from frame to frame.
"""
import math

import bpy
from mathutils import Matrix, Vector

from . import geo, mat, util

TAU = math.tau


def _col(color):
    return util.kelvin(color) if isinstance(color, (int, float)) else util.rgba(color)[:3]


class ShootMixin:
    def _shoot_init(self):
        self._anims = []
        self.motions = []          # dict(name, kind, note): the list of things that move, for the brief and the check
        self.lights = []           # dict(name, watts, kind)
        self.cam = None
        self._walk = None
        self._view = None
        self.cam_log = {}
        self.pan_cap = None
        self._phone = None
        self.plate = None
        self.beacons = []
        self.outside = []
        self.hazed = False

    # -- motion -----------------------------------------------------------------------------------------
    def animate(self, target, fn, name=None, kind='move', note=''):
        """fn(f) → {data_path: value} for any Blender struct: an object ('location', 'rotation_euler'), a light's data
        ('energy'), a node socket ('default_value'). Give it a name and it counts as one of the room's motions."""
        self._anims.append((target, fn, name))
        if name:
            self.motions.append(dict(name=name, kind=kind, note=note))

    def spin(self, ob, rpm, axis=2, name=None, note=''):
        """Steady rotation: a fan, a tape reel, a turntable."""
        base = tuple(ob.rotation_euler)

        def fn(f):
            r = list(base)
            r[axis] = base[axis] + self.sec(f) * rpm / 60.0 * TAU
            return {'rotation_euler': tuple(r)}
        self.animate(ob, fn, name, 'spin', note or f'{rpm:g} rpm')

    def tick(self, hand, axis=1, name=None, start=0.0, sweep=False):
        """A clock's second hand: 6° a second, with the little overshoot of a quartz movement (sweep=True: a
        continuous hand). `start` = seconds already on the dial at frame 1."""
        base = tuple(hand.rotation_euler)

        def fn(f):
            t = self.sec(f) + start
            if sweep:
                a = t
            else:
                k = math.floor(t)
                a = k + util.back_out(min(1.0, (t - k) / 0.14), 1.9)
            r = list(base)
            r[axis] = base[axis] - a * TAU / 60.0
            return {'rotation_euler': tuple(r)}
        self.animate(hand, fn, name, 'tick', 'one step a second')

    def flicker(self, target, amount=0.04, speed=6.0, name=None, path=None, seed=None):
        """A lamp that is not perfectly steady (mains ripple, an old bulb, a heater element): ± amount of its value.
        target = a light object, a light data block, or a strength socket."""
        t = target.data if hasattr(target, 'data') and hasattr(target.data, 'energy') else target
        path = path or ('energy' if hasattr(t, 'energy') else 'default_value')
        base = getattr(t, path)
        sd = float(seed if seed is not None else (hash(name or str(len(self._anims))) % 997))

        def fn(f):
            x = self.sec(f) * speed
            return {path: base * (1 + amount * (0.7 * util.fbm1(x, sd) + 0.3 * util.noise1(x * 3.7, sd + 5)))}
        self.animate(t, fn, name, 'flicker', f'±{amount * 100:g}%')

    def blink(self, target, per_min, on=1.0, off=0.0, duty=0.5, phase=0.0, soft=0.12, name=None, path=None, kind='blink'):
        """Something that flashes a fixed number of times a minute (a beacon, a standby LED, a cursor)."""
        t = target.data if hasattr(target, 'data') and hasattr(target.data, 'energy') else target
        path = path or ('energy' if hasattr(t, 'energy') else 'default_value')
        period = 60.0 / per_min

        def fn(f):
            x = ((self.sec(f) + phase) % period) / period
            e = soft * 0.5
            up = util.smooth(x / e) if e > 0 else 1.0
            down = util.smooth((x - duty) / e) if e > 0 else (1.0 if x > duty else 0.0)
            return {path: off + (on - off) * max(0.0, up - down)}
        self.animate(t, fn, name, kind, f'{per_min:g} per minute')

    def flutter(self, ob, axis=0, amp=5.0, freq=1.1, name=None, rest=0.0, seed=None, note=''):
        """A light thing stirred by moving air, hinged at its origin (a sticky note by its glue strip, a towel on its
        rail, a calendar page on its nail). amp in degrees; the air comes in gusts, not as a sine."""
        base = tuple(ob.rotation_euler)
        sd = float(seed if seed is not None else (hash(ob.name) % 991))

        def fn(f):
            t = self.sec(f)
            gust = 0.55 + 0.45 * util.fbm1(t * 0.35, sd + 3)
            a = math.radians(rest + amp * gust * (0.65 * util.fbm1(t * freq, sd) + 0.35 * math.sin(TAU * freq * 1.7 * t + sd)))
            r = list(base)
            r[axis] = base[axis] + a
            return {'rotation_euler': tuple(r)}
        self.animate(ob, fn, name, 'flutter', note or f'±{amp:g}°')

    def travel(self, ob, fn_loc, name=None, kind='travel', note=''):
        """fn_loc(seconds) → (x, y, z): a drop running down the glass, a toy rolling."""
        self.animate(ob, lambda f: {'location': tuple(fn_loc(self.sec(f)))}, name, kind, note)

    def pages(self, material, count, hold=3.0, name=None, start=0, times=None):
        """A screen that changes: the material is mat-pages made by kit.screen_pages (an atlas of `count` pages side
        by side); this steps its mapping. hold = seconds per page, or times = [seconds at which it changes]."""
        node = next(n for n in material.node_tree.nodes if n.type == 'MAPPING')
        sock = node.inputs['Location']

        def fn(f):
            t = self.sec(f)
            k = sum(1 for x in times if t >= x) if times else int(t // hold)
            return {'default_value': (((start + k) % count) / count, 0.0, 0.0)}
        self.animate(sock, fn, name, 'screen', f'{count} pages')

    # -- light ------------------------------------------------------------------------------------------
    def lit(self, on):
        """Is something that is on in `on` (a version name, a list of them, or None = always) on in this version?
        Nothing of the room's own is on in the 'work' version: that one is lit by the work light."""
        if self.v == 'work':
            return False
        return on is None or self.v == on or (not isinstance(on, str) and self.v in on)

    def lamp(self, name, loc, watts, color=2700, radius=0.03, on=None, spot=None, aim=None, blend=0.4, size=None, parent=None, visible=False):
        """A light source. loc in the room (or in `parent`'s frame). spot = cone angle in degrees (needs aim);
        size = (w, h) makes it an area light (a panel, a window's glow). Returns the light object, or None when this
        version has it switched off — a lamp's shade, bulb and stand are things and stay in the room either way."""
        if not self.lit(on):
            return None
        kind = 'AREA' if size else 'SPOT' if spot else 'POINT'
        l = bpy.data.lights.new(name, kind)
        l.energy = watts
        l.color = _col(color)
        if kind == 'AREA':
            l.shape = 'RECTANGLE'
            l.size, l.size_y = size
        else:
            l.shadow_soft_size = radius
        if kind == 'SPOT':
            l.spot_size = math.radians(spot)
            l.spot_blend = blend
        ob = bpy.data.objects.new(name, l)
        self.scene.collection.objects.link(ob)
        ob.location = loc
        if parent is not None:
            ob.parent = parent
        if aim is not None:
            d = Vector(aim) - Vector(loc)
            ob.rotation_mode = 'QUATERNION'
            ob.rotation_quaternion = d.to_track_quat('-Z', 'Y')
        ob.visible_camera = visible
        self.lights.append(dict(name=name, watts=watts, kind=kind))
        return ob

    def glow(self, material, strength, on=None):
        """Set an emissive material (mat.emit, or a screen) for this version: `strength` when on, 0 when off. A screen
        that is off goes black."""
        lit = self.lit(on) and strength > 0
        s = mat.emit_socket(material)
        s.default_value = strength if lit else 0.0
        pw = material.node_tree.nodes.get('lr_power')
        if pw is not None:
            pw.outputs[0].default_value = 1.0 if lit else 0.0
        return s

    def backdrop(self, image, wall, distance=40.0, width=140.0, strength=1.0, z=None, u=None, name='plate'):
        """The world outside is ONE picture on a plate `distance` metres beyond the window, `width` metres wide —
        not a model. `image` is a Pillow image (lr.draw.skyline). The plate lights the room through the window."""
        w_px, h_px = image.size
        height = width * h_px / w_px
        m = mat.picture(name, image, rough=1.0, emission=strength)
        for n in m.node_tree.nodes:                                  # a picture of a city emits, it does not reflect
            if n.type == 'BSDF_PRINCIPLED':
                n.inputs['Base Color'].default_value = (0, 0, 0, 1)
                for l in list(n.inputs['Base Color'].links):
                    m.node_tree.links.remove(l)
        p = geo.Part(name)
        p.sheet(width, height, at=(0, 0, -height / 2), image=m, t=0.02)
        ob = p.build()
        c = self.wall_pt(wall, self.wall_len(wall) / 2 if u is None else u, self.H * 0.55 if z is None else z, -distance)
        geo.place(ob, tuple(c), rz=self.wall_rz(wall))
        ob.visible_shadow = False
        self.plate = dict(ob=ob, wall=wall, center=c, width=width, height=height, mat=m, distance=distance)
        self.outside.append(ob)
        return self.plate

    def plate_pt(self, u, v, toward=0.4):
        """World point at picture fraction (u from the left, v from the TOP), `toward` metres nearer than the plate."""
        P = self.plate
        right = Vector((1, 0, 0)) if P['wall'] == 'N' else Vector((-1, 0, 0)) if P['wall'] == 'S' else Vector((0, -1, 0)) if P['wall'] == 'E' else Vector((0, 1, 0))
        return P['center'] + right * ((u - 0.5) * P['width']) + Vector((0, 0, (0.5 - v) * P['height'])) + self.wall_normal(P['wall']) * toward

    def beacon(self, u, v, per_min=None, size=0.35, strength=60.0, color='#ff2010', phase=None, duty=0.5, on=None, name=None):
        """A light on a far roof, at picture fraction (u, v). per_min = flashes a minute (None = steady). The range
        allowed for a flashing beacon comes from the rule you researched: ROOM['beacon_range'] (default 20–60)."""
        lo, hi = self.cfg.get('beacon_range', (20, 60))
        nm = name or self.name('beacon')
        if per_min is not None and not (lo <= per_min <= hi):
            self.problems.append(f'beacon {nm}: {per_min:g} flashes a minute is outside the researched range {lo}–{hi}')
        m = mat.emit(color, strength, name=nm, off='#0a0a0a')
        p = geo.Part(nm)
        p.sphere(size / 2, at=(0, 0, -size / 2), mat=m, seg=8, rings=4)
        ob = p.build()
        geo.place(ob, tuple(self.plate_pt(u, v)))
        ob.visible_shadow = False
        self.outside.append(ob)
        s = mat.emit_socket(m)
        if not self.lit(on):
            s.default_value = 0.0
            ob.hide_render = True                                    # a far light that is off is not a black dot on the sky
        elif per_min is not None:
            ph = self.rng('beacon/' + nm).uniform(0, 60.0 / per_min) if phase is None else phase
            self.blink(s, per_min, on=strength, off=strength * 0.02, duty=duty, phase=ph, name=nm, kind='beacon')
        self.beacons.append(dict(name=nm, per_min=per_min, u=u, v=v))
        return ob

    def outdoors(self, ob):
        """Register something you built OUTSIDE the room (a terrace deck, a parapet, a tank on the roof): it is
        rendered, seen through the window with true parallax, and left out of the room's inventory and audit."""
        ob.visible_shadow = True
        self.outside.append(ob)
        return ob

    def hands(self, hour_hand, minute_hand, h, m, axis=1):
        """Set a clock's hour and minute hands for this version (they turn about `axis`, like the second hand)."""
        for hand, turns in ((hour_hand, ((h % 12) + m / 60.0) / 12.0), (minute_hand, m / 60.0)):
            e = list(hand.rotation_euler)
            e[axis] = e[axis] - turns * TAU
            hand.rotation_euler = tuple(e)

    def daylight(self, elev=12.0, azim=0.0, strength=3.0, color=5200, angle=1.0, name='sun'):
        """A sun. elev = its height in degrees. azim = where it stands, in plan degrees: 0 = straight out from the
        plan-north (+Y) wall, positive toward plan-east (+X), negative toward plan-west. For a window in the plan-north
        wall that is the sun's true azimuth minus the window's true bearing: look both up (FILM.md)."""
        l = bpy.data.lights.new(name, 'SUN')
        l.energy = strength
        l.color = _col(color)
        l.angle = math.radians(angle)
        ob = bpy.data.objects.new(name, l)
        self.scene.collection.objects.link(ob)
        e, a = math.radians(elev), math.radians(azim)
        d = Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))
        ob.rotation_mode = 'QUATERNION'
        ob.rotation_quaternion = (-d).to_track_quat('-Z', 'Y')
        self.lights.append(dict(name=name, watts=strength, kind='SUN'))
        return ob

    def ambient(self, color='#0a0e14', strength=1.0):
        """World colour: what the sky gives to every surface that faces a window."""
        from . import scene as sc
        return sc.world(self.scene, color, strength)

    def haze(self, density=0.02, color=(1, 1, 1), aniso=0.55, margin=0.03, name='haze'):
        """Air you can see: a box of thin haze filling the room. Light from the window becomes a soft beam. Keep it
        thin (0.01–0.05 per metre); it costs about half again as much render time."""
        p = geo.Part(name)
        p.box((self.W - 2 * margin, self.D - 2 * margin, self.H - 2 * margin), at=(self.W / 2, self.D / 2, margin),
              mat=mat.volume(name, density, color, aniso), bevel=0)
        ob = p.build()
        ob.visible_shadow = False
        self.outside.append(ob)
        self.hazed = True
        self.scene.cycles.volume_step_rate = 4.0
        return ob

    def phone_light(self, on_at, watts=1.5, angle=80.0, color=6500, off_at=None, name='phone light', blend=0.75):
        """The visitor switches on the torch of the phone they are filming with: a hard white circle that moves with
        the camera and tells the viewer someone is holding it. Call after r.camera()."""
        if self.cam is None:
            raise RuntimeError('r.camera() first')
        l = bpy.data.lights.new(name, 'SPOT')
        l.color = _col(color)
        l.spot_size = math.radians(angle)
        l.spot_blend = blend                                         # a phone's LED is a wide soft flood, not a theatre spot
        l.shadow_soft_size = 0.004
        ob = bpy.data.objects.new(name, l)
        self.scene.collection.objects.link(ob)
        ob.parent = self.cam
        ob.location = (0.011, 0.028, 0.0)                         # the LED sits beside the lens, not on it

        def fn(f):
            t = self.sec(f)
            a = util.clamp((t - on_at) / 0.06)
            if off_at is not None:
                a *= 1 - util.clamp((t - off_at) / 0.06)
            return {'energy': watts * a}
        self.animate(l, fn, name, 'light', f'on at {on_at:g} s')
        self._phone = dict(on_at=on_at, off_at=off_at, watts=watts)
        self.lights.append(dict(name=name, watts=watts, kind='SPOT'))
        return ob

    def work_light(self):
        """Even, bright, shadowless-ish light for LOOKING at the room (review stills, the plan, the audit pictures).
        A dark, moody frame hides exactly the faults a review is for."""
        self.ambient('#ffffff', 0.35)
        l = bpy.data.lights.new('work', 'AREA')
        l.shape = 'RECTANGLE'
        l.size, l.size_y = self.W * 0.8, self.D * 0.8
        l.energy = 45.0 * self.W * self.D
        l.color = (1, 1, 1)
        ob = bpy.data.objects.new('work', l)
        self.scene.collection.objects.link(ob)
        ob.location = (self.W / 2, self.D / 2, self.H - 0.03)
        return ob

    # -- camera -----------------------------------------------------------------------------------------
    def camera(self, lens=24.0, fstop=4.0, sensor=36.0, clip=(0.03, 600.0)):
        """The phone's main camera, as its full-frame equivalent: 24–26 mm, and f/4–f/8 for the depth of field of a
        small sensor (most of the room sharp, a near thing soft)."""
        c = bpy.data.cameras.new('cam')
        c.lens, c.sensor_width = lens, sensor
        c.clip_start, c.clip_end = clip
        c.dof.use_dof = True
        c.dof.aperture_fstop = fstop
        ob = bpy.data.objects.new('cam', c)
        self.scene.collection.objects.link(ob)
        ob.rotation_mode = 'QUATERNION'
        self.scene.camera = ob
        self.cam = ob
        return ob

    def walk(self, keys, shake=0.35, step=0.65, bob=0.010, pan_cap=40.0, af=0.22, hunt=0.45):
        """The hand-held walk. keys = [dict(t=seconds, pos=(x, y, z), look=(x, y, z), close=False, hunt=False,
        focus=(x, y, z))]: where the phone is and what it points at. Two keys with the same pos = standing still.
          shake    hand tremor in degrees (less while `close`: people brace to frame a detail)
          step     step length in metres: the picture rises and falls once per step while walking, and only then
          pan_cap  the fastest the view may turn, degrees a second — check.py fails a walk that whips round
          af       seconds the autofocus takes to follow; hunt = how far it overshoots at a key with hunt=True
        """
        if self.cam is None:
            raise RuntimeError('r.camera() first')
        ks = sorted(keys, key=lambda k: k['t'])
        if len(ks) < 2:
            raise ValueError('a walk needs at least two keys')
        self._walk = dict(keys=ks, shake=shake, step=step, bob=bob, af=af, hunt=hunt)
        self.pan_cap = pan_cap

    def view(self, pos, look, lens=None, ortho=None, fstop=16.0):
        """A fixed camera (review views). ortho = width in metres for a plan or an elevation."""
        if self.cam is None:
            self.camera()
        self._view = dict(pos=Vector(pos), look=Vector(look))
        c = self.cam.data
        if lens:
            c.lens = lens
        c.dof.aperture_fstop = fstop
        if ortho:
            c.type = 'ORTHO'
            c.ortho_scale = ortho
            c.dof.use_dof = False

    # -- bake -------------------------------------------------------------------------------------------
    @staticmethod
    def _hermite(ks, key, t):
        if t <= ks[0]['t']:
            return Vector(ks[0][key])
        if t >= ks[-1]['t']:
            return Vector(ks[-1][key])
        i = max(j for j in range(len(ks) - 1) if ks[j]['t'] <= t)
        p0, p1 = Vector(ks[i][key]), Vector(ks[i + 1][key])
        t0, t1 = ks[i]['t'], ks[i + 1]['t']

        def tangent(j):
            if j <= 0 or j >= len(ks) - 1:
                return Vector((0, 0, 0))
            a, b, c = Vector(ks[j - 1][key]), Vector(ks[j][key]), Vector(ks[j + 1][key])
            if (b - a).length < 1e-6 or (c - b).length < 1e-6:        # arriving at or leaving a stop: come to rest
                return Vector((0, 0, 0))
            return (c - a) / (ks[j + 1]['t'] - ks[j - 1]['t'])
        s = (t - t0) / (t1 - t0)
        dt = t1 - t0
        m0, m1 = tangent(i), tangent(i + 1)
        h00, h10, h01, h11 = 2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s, -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2
        return p0 * h00 + m0 * (h10 * dt) + p1 * h01 + m1 * (h11 * dt)

    def _flag(self, ks, key, t):
        if t <= ks[0]['t']:
            return 1.0 if ks[0].get(key) else 0.0
        for a, b in zip(ks, ks[1:]):
            if a['t'] <= t <= b['t']:
                s = util.smooth((t - a['t']) / (b['t'] - a['t']))
                return (1.0 if a.get(key) else 0.0) * (1 - s) + (1.0 if b.get(key) else 0.0) * s
        return 1.0 if ks[-1].get(key) else 0.0

    def bake(self):
        frames = range(0, self.n + 2)
        for target, fn, _name in self._anims:
            for f in frames:
                for path, val in fn(f).items():
                    setattr(target, path, val)
                    target.keyframe_insert(data_path=path, frame=f)
        cam = self.cam
        if cam is None:
            self.problems.append('no camera: call r.camera() and r.walk() in film.camera(r)')
            return
        if self._view is not None:
            self._set_cam(self._view['pos'], self._view['look'], 0.0)
            return
        if self._walk is None:
            self.problems.append('no walk: call r.walk(keys) in film.camera(r)')
            return
        W = self._walk
        ks = W['keys']
        seed = float(self.project.seed)
        dist, prev_p, prev_f, af_d, prev_q = 0.0, None, None, None, None
        up = Vector((0, 0, 1))
        hunts = [k['t'] for k in ks if k.get('hunt')]
        for f in frames:
            t = self.sec(f)
            p = self._hermite(ks, 'pos', t)
            lk = self._hermite(ks, 'look', t)
            speed = 0.0
            if prev_p is not None:
                d = (Vector((p.x, p.y, 0)) - Vector((prev_p.x, prev_p.y, 0))).length
                dist += d
                speed = d * self.fps
            prev_p = p.copy()
            sf = util.clamp(speed / 0.7)
            fwd0 = (lk - p).normalized()
            right = fwd0.cross(up)
            right = right.normalized() if right.length > 1e-6 else Vector((1, 0, 0))
            up2 = right.cross(fwd0)
            pan = 0.0 if prev_f is None else math.degrees(prev_f.angle(fwd0)) * self.fps
            prev_f = fwd0.copy()
            close = self._flag(ks, 'close', t)
            A = W['shake'] * (1 - 0.55 * close) * (1 + 0.6 * sf)
            yaw = A * (0.75 * util.fbm1(t * 1.1, seed + 1) + 0.25 * util.fbm1(t * 4.0, seed + 2) + 0.08 * util.noise1(t * 9.5, seed + 3))
            pit = A * (0.75 * util.fbm1(t * 1.3, seed + 4) + 0.25 * util.fbm1(t * 4.3, seed + 5) + 0.08 * util.noise1(t * 10.1, seed + 6))
            roll = 0.6 * A * util.fbm1(t * 0.9, seed + 7) + 0.5 * sf * math.sin(math.pi * dist / W['step'])
            pos = p + up * (W['bob'] * sf * math.sin(TAU * dist / W['step'])) + right * (0.5 * W['bob'] * sf * math.sin(math.pi * dist / W['step']))
            fwd = (fwd0 + right * math.tan(math.radians(yaw)) + up2 * math.tan(math.radians(pit))).normalized()
            fo = None
            for a, b in zip(ks, ks[1:]):
                if a['t'] <= t <= b['t'] and a.get('focus') is not None and b.get('focus') is not None:
                    s = util.smooth((t - a['t']) / (b['t'] - a['t']))
                    fo = Vector(a['focus']).lerp(Vector(b['focus']), s)
            target = max(0.12, ((fo if fo is not None else lk) - pos).dot(fwd))
            af_d = target if af_d is None else af_d + (target - af_d) * (1 - math.exp(-(1.0 / self.fps) / max(W['af'], 1e-3)))
            focus = af_d
            for th in hunts:
                tau = t - th
                if 0 <= tau <= 0.9:
                    focus *= 1 + W['hunt'] * math.exp(-tau / 0.2) * math.sin(TAU * 2.2 * tau)
            q = self._set_cam(pos, pos + fwd, roll, prev_q)
            prev_q = q
            cam.keyframe_insert('location', frame=f)
            cam.keyframe_insert('rotation_quaternion', frame=f)
            cam.data.dof.focus_distance = max(focus, cam.data.clip_start * 1.05)
            cam.data.dof.keyframe_insert('focus_distance', frame=f)
            self.cam_log[f] = dict(t=t, pos=tuple(pos), fwd=tuple(fwd), look=tuple(lk), speed=speed, pan=pan, focus=focus,
                                   target=target, close=close, shake=A)
        self.scene.frame_set(1)

    def _set_cam(self, pos, look, roll=0.0, prev=None):
        from mathutils import Euler
        cam = self.cam
        fwd = (Vector(look) - Vector(pos)).normalized()
        upv = Vector((0, 0, 1))
        if abs(fwd.dot(upv)) > 0.9995:
            upv = Vector((0, 1, 0))
        right = fwd.cross(upv).normalized()
        q = Matrix((right, right.cross(fwd), -fwd)).transposed().to_quaternion()
        if roll:
            q = q @ Euler((0, 0, math.radians(roll))).to_quaternion()
        if prev is not None and q.dot(prev) < 0:
            q.negate()
        cam.location, cam.rotation_quaternion = Vector(pos), q
        return q.copy()
