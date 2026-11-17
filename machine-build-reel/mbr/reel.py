"""The reel — the source video's grammar, as shots computed from the machine's own size and motion.

  1 walk      static camera, low three-quarter; the machine walks past the 1.75 m figure        (travel, ~9 s)
  2 assembly  parts arrive in build order — feet first, structure before shells, lights last; slow orbit (~9 s)
  3 stride    low and close among the legs, the figure in the foreground, shallow focus            (travel, ~7 s)
  4 move      the big move (a spec 'moves' entry: gathers, acts, recovers), wide, with the figure
  5 head      close on the head: the 'wake' move (lights stutter on, looks left, right)
  6 sheet     the reference: refs/concept.png if there is one, else the design sheet (line drawings + numbers)
  7 plates    every close-up plate in one grid
  8 compare   pairs, reference | built: refs/plates/<name>.png (a generated or drawn reference) or, code-only,
              the same camera as a line drawing | the render; then the full views
Sections are separated by a dip to dark. Every frame is a pure function of (section, frame) → resumable: existing
PNGs are skipped. Each section is encoded on its own, then joined: out/reel/reel.mp4.
"""
import json
import math
import os
import random
import bpy
from mathutils import Matrix, Vector
from . import render as R, studio as ST

SECTIONS = ('walk', 'assembly', 'stride', 'move', 'head', 'sheet', 'plates', 'compare')


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def back_out(x, k=1.6):
    """Ease out with a small overshoot: parts land, go a touch past, settle (inertia)."""
    x = max(0.0, min(1.0, x))
    x -= 1
    return x * x * ((k + 1) * x + k) + 1


class Reel:
    def __init__(self, ctx, out_dir, res=(1280, 720), samples=32, cfg=None):
        self.ctx = ctx
        self.mc = ctx.mc
        self.out = out_dir
        self.res = res
        self.samples = samples
        self.fps = self.mc.fps
        self.cfg = dict(self.mc.M.get('reel', {}))
        self.cfg.update(cfg or {})
        R.pose_machine(ctx, 'rest', 0.0)
        lo, hi = R.machine_bounds(ctx)
        self.H = hi.z
        self.Lx = hi.x - lo.x
        self.figure = bpy.data.objects.get('Figure')
        self.fig0 = Vector(self.mc.M.get('figure_at', (0, 0, 0)))

    # ---- shots ---------------------------------------------------------------------------------------------------
    def dur(self, name, default):
        return float(self.cfg.get(f'{name}_dur', default))

    def frames(self, name):
        return int(round(self.dur(name, {'walk': 9, 'assembly': 9, 'stride': 7, 'head': 0, 'move': 0}[name]) * self.fps))

    def walk_setup(self, closeness=1.0):
        """Where the walk starts so the machine passes the figure mid-shot."""
        v = self.mc.mot.v
        d = self.dur('walk', 9.0)
        x0 = self.fig0.x - v * d * 0.55
        return x0, v

    def set_root_offset(self, dx):
        self.ctx.arm.location = (dx, 0, 0)

    def shot_walk(self, f):
        t = f / self.fps
        x0, v = self.walk_setup()
        R.pose_machine(self.ctx, 'walk', t + self.cfg.get('walk_t0', 0.6), travel=True)
        self.set_root_offset(x0 - v * self.cfg.get('walk_t0', 0.6))
        H = self.H
        tgt = Vector((self.fig0.x + 0.1 * H, 0.0, 0.47 * H))
        yaw = self.cfg.get('walk_yaw', -62.0)
        d = ST.frame_dist(H * 1.12, 35, 0.95)
        loc = R.orbit_loc(tgt, yaw, -2.0, d)
        loc.z = max(loc.z, 1.6)
        R.place(loc, tgt, 35)

    def shot_stride(self, f):
        t = f / self.fps
        x0, v = self.walk_setup()
        t0 = self.cfg.get('stride_t0', 2.0)
        R.pose_machine(self.ctx, 'walk', t + t0, travel=True)
        self.set_root_offset(x0 - v * t0 + 0.1 * v * self.dur('stride', 7))
        H = self.H
        fx = self.fig0.x
        cam = Vector((fx + 0.36 * H + 0.03 * H * t, self.fig0.y - 0.3 * H, 1.5))
        tgt = Vector((fx - 0.05 * H + 0.05 * H * t, -0.05 * H, 0.36 * H))
        R.place(cam, tgt, 24, fstop=5.6, focus=self.fig0 + Vector((0, 0, 1.0)))

    def shot_move(self, f, name=None):
        name = name or self.cfg.get('move', next((k for k in self.mc.mot.moves if k != 'wake'), None))
        t = f / self.fps
        R.pose_machine(self.ctx, name, t)
        self.set_root_offset(0.0)
        H = self.H
        tgt = Vector((0.1 * H, 0.0, 0.34 * H))
        yaw = self.cfg.get('move_yaw', -38.0) + 6.0 * ease(t / self.mc.mot.moves[name]['dur'])
        loc = R.orbit_loc(tgt, yaw, 3.0, ST.frame_dist(H * 1.1, 35, 0.95))
        loc.z = max(loc.z, 1.6)
        R.place(loc, tgt, 35)

    def shot_head(self, f):
        name = 'wake' if 'wake' in self.mc.mot.moves else None
        t = f / self.fps
        R.pose_machine(self.ctx, name or 'idle', t)
        self.set_root_offset(0.0)
        pb = self.ctx.arm.pose.bones['head']
        Mh = self.ctx.arm.matrix_world @ pb.matrix
        hl = self.mc.M['head'].get('len', 2.0)
        # frame the head's rest position (the camera holds still; the head moves through the frame)
        W, _ = self.mc.pose(name or 'idle', self.mc.mot.moves[name]['dur'] if name else 0.0)
        Hm = W['head']
        c = Hm @ Vector((0, hl * 0.2, -hl * 0.1))
        R3 = Hm.to_3x3()
        look_from = (R3 @ Vector((-0.75, 0.8, 0.0))).normalized()          # front-left three-quarter of the head
        loc = c + look_from * hl * 4.2 + Vector((0, 0, -hl * 0.45))
        R.place(loc, c, 50, fstop=5.6, focus=c)

    def shot_assembly(self, f):
        n = self.frames('assembly')
        t = f / max(1, n - 1)
        R.pose_machine(self.ctx, 'rest', 0.0)
        self.set_root_offset(0.0)
        parts = [o for o in bpy.data.collections['Machine'].objects if o.type == 'MESH']
        stages = sorted({o.get('stage', 0) for o in parts})
        ns = len(stages)
        H = self.H
        rnd = random.Random(11)
        for o in sorted(parts, key=lambda o: o.name):
            if '_basis0' not in o:
                o['_basis0'] = [list(r) for r in o.matrix_basis]
            st = o.get('stage', 0)
            i = stages.index(st)
            a0 = 0.04 + 0.78 * i / ns + rnd.uniform(0, 0.05)
            a1 = a0 + 0.14
            s = (t - a0) / (a1 - a0)
            B = Matrix(o['_basis0'])
            if s <= 0:
                o.hide_render = True
                continue
            o.hide_render = False
            if s >= 1:
                o.matrix_basis = B
                continue
            k = back_out(s)
            off = Vector((rnd.uniform(-0.05, 0.05) * H, rnd.uniform(-0.05, 0.05) * H, 0.55 * H)) * (1 - k)
            Pw = (o.parent.matrix_world @ o.parent.pose.bones[o.parent_bone].matrix @
                  Matrix.Translation((0, o.parent.data.bones[o.parent_bone].length, 0)))
            o.matrix_basis = Pw.inverted() @ Matrix.Translation(off) @ Pw @ B
        lights_on = ease((t - 0.9) / 0.08)
        R.set_light(self.ctx, lights_on)
        tgt = Vector((0, 0, 0.42 * H))
        yaw = -70 + 50 * t
        loc = R.orbit_loc(tgt, yaw, 8.0, ST.frame_dist(H * 1.05, 35, 0.9))
        R.place(loc, tgt, 35)

    def reset_assembly(self):
        for o in bpy.data.collections['Machine'].objects:
            if '_basis0' in o:
                o.matrix_basis = Matrix(o['_basis0'])
                del o['_basis0']
            o.hide_render = False

    # ---- rendering -----------------------------------------------------------------------------------------------
    def render_section(self, name, step=1, limit=None):
        d = os.path.join(self.out, f'{SECTIONS.index(name) + 1:02d}_{name}')
        os.makedirs(d, exist_ok=True)
        if name == 'move':
            mv = self.cfg.get('move', next((k for k in self.mc.mot.moves if k != 'wake'), None))
            n = int(self.mc.mot.moves[mv]['dur'] * self.fps)
        elif name == 'head':
            n = int(self.mc.mot.moves['wake']['dur'] * self.fps) if 'wake' in self.mc.mot.moves else 0
        else:
            n = self.frames(name)
        fn = {'walk': self.shot_walk, 'stride': self.shot_stride, 'move': self.shot_move, 'head': self.shot_head,
              'assembly': self.shot_assembly}[name]
        if self.figure:
            self.figure.hide_render = False
            self.figure.location = self.fig0
        made = []
        for f in range(0, n if limit is None else min(n, limit), step):
            p = os.path.join(d, f'{f:05d}.png')
            made.append(p)
            if os.path.exists(p):
                continue
            fn(f)
            R.render(p, self.res, self.samples)
        if name == 'assembly':
            self.reset_assembly()
        self.set_root_offset(0.0)
        return d, n

    def boards(self, refs_dir=None):
        """Stills for the sheet / plates / compare sections."""
        ctx, mc = self.ctx, self.mc
        d = os.path.join(self.out, 'boards')
        os.makedirs(d, exist_ok=True)
        R.pose_machine(ctx, 'rest', 0.0)
        self.set_root_offset(0.0)
        if self.figure:
            self.figure.location = self.fig0
        out = {'plates': [], 'compare': []}
        res = self.res
        cell = (res[0] // 2, res[1] // 2)
        # close-up plates: render + (code-only) line drawing from the same camera
        for p in mc.M['plates']:
            slug = p['name'].replace(' ', '_')
            built = os.path.join(d, f'plate_{slug}.png')
            if not os.path.exists(built):
                R.plate(ctx, built, p, res=res, samples=self.samples)
            ref = None
            if refs_dir and os.path.exists(os.path.join(refs_dir, 'plates', f'{slug}.png')):
                ref = os.path.join(refs_dir, 'plates', f'{slug}.png')
            else:
                ref = os.path.join(d, f'drawing_{slug}.png')
                if not os.path.exists(ref):
                    loc, tgt = R.plate_camera(ctx, p, res[0] / res[1], 70.0)
                    R.place(loc, tgt, 70.0)
                    R.drawing(ctx, ref, res)
            out['plates'].append((p['name'], built))
            out['compare'].append((p['name'], ref, built, ref.startswith(d)))
        # full views
        views = [('front', 0.0, 3.0), ('left', 90.0, 3.0), ('three-quarter', -45.0, 6.0)]
        for name, yaw, el in views:
            built = os.path.join(d, f'view_{name}.png')
            if not os.path.exists(built):
                R.view(ctx, built, yaw=yaw, elev=el, lens=50, fill=0.86, res=res, samples=self.samples)
            ref = os.path.join(refs_dir, f'{name}.png') if refs_dir else None
            if not (ref and os.path.exists(ref)):
                ref = os.path.join(d, f'drawing_view_{name}.png')
                if not os.path.exists(ref):
                    R.view(ctx, os.path.join(d, '_tmp.png'), yaw=yaw, elev=el, lens=50, fill=0.86, res=(64, 36), samples=1)
                    R.drawing(ctx, ref, res)
            out['compare'].append((name, ref, built, ref.startswith(d)))
        # the design sheet (code-only reference): orthographic line drawings with the numbers
        sheet = os.path.join(d, 'sheet.png')
        concept = os.path.join(refs_dir, 'concept.png') if refs_dir else None
        if concept and os.path.exists(concept):
            out['sheet'] = concept
        else:
            if not os.path.exists(sheet):
                design_sheet(ctx, sheet, d, res)
            out['sheet'] = sheet
        with open(os.path.join(d, 'boards.json'), 'w') as f:
            json.dump(out, f, indent=1)
        return out

    # ---- assembly into the film --------------------------------------------------------------------------------
    def encode(self, boards, out_mp4, title=None):
        fps = self.fps
        W, H = self.res
        clips = []
        tmp = os.path.join(self.out, 'clips')
        os.makedirs(tmp, exist_ok=True)
        fade = 0.4

        def fades(dur):
            return f'fade=t=in:st=0:d={fade},fade=t=out:st={max(0.0, dur - fade):.3f}:d={fade}'

        for name in ('walk', 'assembly', 'stride', 'move', 'head'):
            d = os.path.join(self.out, f'{SECTIONS.index(name) + 1:02d}_{name}')
            if not os.path.isdir(d) or not os.listdir(d):
                continue
            n = len([x for x in os.listdir(d) if x.endswith('.png')])
            dur = n / fps
            c = os.path.join(tmp, f'{name}.mp4')
            R.ff(['-framerate', str(fps), '-i', os.path.join(d, '%05d.png'), '-vf',
                  f'scale={W}:{H},{fades(dur)},format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', c])
            clips.append(c)

        def still(img, dur, c, zoom=True, label=None):
            vf = f'scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x101012'
            n = int(round(dur * fps))
            if zoom:      # a slow push-in: one input image -> n frames
                vf += f",scale={W * 2}:{H * 2},zoompan=z='1+0.04*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={fps}"
                inp = ['-i', img]
            else:
                inp = ['-loop', '1', '-framerate', str(fps), '-t', f'{dur:.3f}', '-i', img]
            if label:
                vf += ',' + R.label(label, size=max(16, H // 30))
            vf += f',{fades(dur)},format=yuv420p'
            R.ff(inp + ['-vf', vf, '-frames:v', str(n), '-r', str(fps), '-c:v', 'libx264', '-crf', '18',
                        '-preset', 'medium', c])
            clips.append(c)

        still(boards['sheet'], 3.5, os.path.join(tmp, 'sheet.mp4'))
        grid = os.path.join(self.out, 'boards', 'plates_grid.png')
        R.grid([p for _, p in boards['plates']], grid, 4, cell=(W // 4, H // 4), labels=[n for n, _ in boards['plates']])
        still(grid, 3.0, os.path.join(tmp, 'plates.mp4'))
        for i, (name, ref, built, drawn) in enumerate(boards['compare']):
            pair = os.path.join(self.out, 'boards', f'pair_{i:02d}.png')
            R.grid([ref, built], pair, 2, cell=(W // 2, H // 2), pad=0,
                   labels=[('drawing · ' if drawn else 'reference · ') + name, 'built · ' + name])
            still(pair, 2.2, os.path.join(tmp, f'pair_{i:02d}.mp4'), zoom=False)
        lst = os.path.join(tmp, 'list.txt')
        with open(lst, 'w') as f:
            for c in clips:
                f.write(f"file '{os.path.abspath(c)}'\n")
        R.ff(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out_mp4])
        return out_mp4


def design_sheet(ctx, path, d, res):
    """Front, left, top, three-quarter as line drawings, with the machine's numbers underneath."""
    mc = ctx.mc
    ps = []
    for name, yaw, el, ortho in (('front', 0.0, 0.0, True), ('left', 90.0, 0.0, True), ('top', -90.0, 89.0, True),
                                 ('three-quarter', -40.0, 12.0, False)):
        p = os.path.join(d, f'sheet_{name}.png')
        if not os.path.exists(p):
            R.view(ctx, os.path.join(d, '_tmp.png'), yaw=yaw, elev=el, lens=50, fill=0.84, res=(64, 36), samples=1,
                   ortho=ortho)
            R.drawing(ctx, p, (res[0] // 2, res[1] // 2))
        ps.append(p)
    info = mc.M
    g = mc.mot
    lo, hi = R.machine_bounds(ctx)
    lab = [f"FRONT · height {hi.z:.1f} m", f"LEFT · length {hi.x - lo.x:.1f} m",
           f"TOP · stride {g.S:.1f} m · cycle {g.T:.1f} s", f"{info['title']} · {len(mc.kin.limbs)} limbs · figure {info['figure']} m"]
    R.grid(ps, path, 2, cell=(res[0] // 2, res[1] // 2), labels=lab, bg='0xf2f1ee', pad=0, label_y='14')
    return path
