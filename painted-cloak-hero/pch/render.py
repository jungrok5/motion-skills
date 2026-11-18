"""Renders, all from the fixed-light review scene (Cycles PNG frames; ffmpeg adds the HUD and the inset):

  concept     front + back view of the hero, cloak included (source step 1) -> concept/front.png, back.png
  turnaround  front, 3/4 and side both ways, back
  cast sheet  motion poses from both sides (walk contact / passing, run, turn mid, idle) — the body check
  clip        one clip, looped, the camera orbiting from the front round to the profile while the light stays put,
              the floor scrolling under a walk; HUD: title, "<Clip> [kind] t s", "frame / frames" (source step 8)
  review      every clip one after another -> review.mp4
"""
import math
import os
import shutil
import subprocess
import bpy
from mathutils import Vector
from . import scene as SC
from .bake import assign

FONT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'fonts', 'Inter-Medium.otf')


def open_blend(path):
    bpy.ops.wm.open_mainfile(filepath=path)


def _render(path):
    s = bpy.context.scene
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)


def set_clip(clip, frame=1):
    rig = bpy.data.objects['rig']
    assign(rig, bpy.data.actions[clip['action']])
    s = bpy.context.scene
    s.frame_start, s.frame_end = 1, clip['n'] + 1
    s.frame_set(frame)


def set_floor(clip, t, grid):
    """The hero walks on the spot; the floor slides back under it at the walk's speed (wrapped to one grid step, so
    it never runs out and never jumps)."""
    fl = bpy.data.objects.get('floor')
    if fl is None:
        return
    d = (clip['speed'] * t) % grid if clip['speed'] > 0 else 0.0
    f = Vector(clip['fwd'])
    fl.location = (-f.x * d, -f.y * d, 0)


def view(out_png, yaw_rel, H, res=(640, 720), samples=16, fill=0.9, lens=50, aim=0.5):
    """The hero (on the spot, facing -Y) from a camera at yaw_rel degrees round it: 0 = in front of its face,
    +90 = at its left side, -90 = at its right side, 180 = behind."""
    s = bpy.context.scene
    SC.setup_render(res, samples)
    tall = H * 1.16
    target = Vector((0, 0, tall * aim))
    dist = SC.frame_dist(tall, lens, fill, aspect=res[0] / res[1])
    cam = SC.orbit_camera('view_cam', target, yaw_rel, dist, 0.05 * H, lens)
    prev = s.camera
    s.camera = cam
    _render(out_png)
    s.camera = prev
    bpy.data.objects.remove(cam, do_unlink=True)
    return out_png


def concept(dir_, H, clip, samples=24):
    """Source step 1: one front and one back view, cloak included. Written only where none was given."""
    os.makedirs(dir_, exist_ok=True)
    set_clip(clip, 1)
    out = {}
    for name, yaw in (('front', 0), ('back', 180)):
        p = os.path.join(dir_, f'{name}.png')
        if not os.path.exists(p):
            view(p, yaw, H, res=(600, 800), samples=samples, fill=0.8, aim=0.47)
        out[name] = p
    return out


def turnaround(out_dir, H, clip, samples=16):
    d = os.path.join(out_dir, 'turn')
    os.makedirs(d, exist_ok=True)
    set_clip(clip, 1)
    views = [('front', 0), ('3q-left', 40), ('left', 90), ('back', 180), ('right', -90), ('3q-right', -40)]
    paths = [view(os.path.join(d, f'{n}.png'), y, H, samples=samples) for n, y in views]
    _sheet(paths, [n for n, _ in views], os.path.join(out_dir, 'turnaround.png'), cols=6)
    return os.path.join(out_dir, 'turnaround.png')


def castsheet(out_dir, H, clips, samples=12):
    """Motion poses from both sides: walk / run contact and passing, the turn mid-way, idle — plus the planted-foot
    view. Score it with references/BODY.md before rendering clips."""
    d = os.path.join(out_dir, 'cast')
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    picks = []
    for c in clips:
        n = c['n']
        if c['type'] in ('walk', 'run'):
            picks += [(c, f'{c["label"]} contact', 1), (c, f'{c["label"]} passing', n // 4 + 1)]
        elif c['type'] == 'turn':
            picks += [(c, f'{c["label"]} wind-up', max(1, int(n * 0.08))), (c, f'{c["label"]} mid', int(n * 0.32))]
        else:
            picks += [(c, c['label'], int(n * 0.45))]
    paths, labels = [], []
    for c, lab, f in picks:
        set_clip(c, f)
        for side, y in (('right', -90), ('left', 90)):
            paths.append(view(os.path.join(d, f'{len(paths):02d}.png'), y, H, res=(420, 560), samples=samples))
            labels.append(f'{lab} · {side} side · f{f}')
    _sheet(paths, labels, os.path.join(out_dir, 'cast-motion.png'), cols=4)
    return os.path.join(out_dir, 'cast-motion.png')


def clip_frames(out_dir, sp, body, data, clip, loops=None, res=(1280, 720), samples=16, resume=True, every=1):
    """Frames of one clip's review: `loops` passes of the clip, camera orbiting, light fixed, floor scrolling."""
    from .build import place_camera, orbit_yaw
    s = bpy.context.scene
    SC.setup_render(res, samples)
    cam = bpy.data.objects['review_cam']
    s.camera = cam
    n = clip['n']
    if loops is None:
        loops = max(1, int(math.ceil(float(sp['review'].get('clipSeconds', 3.0)) / clip['dur']))) if clip['loop'] else 1
    total = n * loops + (0 if clip['loop'] else 1)
    d = os.path.join(out_dir, 'clips', clip['label'], 'frames')
    if not resume:
        shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    set_clip(clip, 1)
    fps = clip['fps']
    for k in range(0, total, every):
        p = os.path.join(d, f'{k + 1:04d}.png')
        if resume and os.path.exists(p):
            continue
        s.frame_set(k % n + 1 if clip['loop'] else min(k, n) + 1)
        set_floor(clip, k / fps, data['grid'])
        place_camera(cam, sp, body, orbit_yaw(sp, k / max(1, total - 1)))
        _render(p)
    set_floor(clip, 0, data['grid'])
    return d, total


def _esc(t):
    return t.replace('\\', '\\\\').replace(':', '\\:').replace("'", "’").replace('%', '\\%')


def _sheet(paths, labels, out, cols=4):
    """Tile images with a label under each (ffmpeg xstack + drawtext)."""
    n = len(paths)
    ins = []
    for p in paths:
        ins += ['-i', p]
    fl = []
    for i, lab in enumerate(labels):
        fl.append(f"[{i}:v]drawtext=fontfile='{FONT}':text='{_esc(lab)}':x=12:y=h-30:fontsize=18:fontcolor=white:"
                  f"box=1:boxcolor=black@0.45:boxborderw=6[v{i}]")
    lay = []
    for i in range(n):
        cx, cy = i % cols, i // cols
        xs = '+'.join(['w0'] * cx) or '0'
        ys = '+'.join(['h0'] * cy) or '0'
        lay.append(f'{xs}_{ys}')
    if n == 1:
        fl.append('[v0]copy[o]')
    else:
        fl.append(''.join(f'[v{i}]' for i in range(n)) + f"xstack=inputs={n}:layout={'|'.join(lay)}:fill=0x5c5e6a[o]")
    cmd = ['ffmpeg', '-loglevel', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fl), '-map', '[o]', out]
    subprocess.run(cmd, check=True)
    return out


KIND = {'walk': 'locomotion', 'run': 'locomotion', 'idle': 'loop', 'turn': 'one-shot'}


def compose_clip(frames_dir, clip, title, inset_png, out_mp4, res=(1280, 720)):
    """frames + concept inset (top right) + HUD (top left): title, '<Clip> [kind] t s', 'frame / frames'."""
    fps = clip['fps']
    n = clip['n'] if clip['loop'] else clip['n'] + 1
    W, Hh = res
    iw = int(W * 0.17)
    fs1, fs2 = int(Hh * 0.032), int(Hh * 0.028)
    kind = KIND.get(clip['type'], 'loop' if clip['loop'] else 'one-shot')
    label = _esc(f"{clip['label'].capitalize()} [{kind}]")
    tclip = f"mod(t\\,{clip['dur']:.4f})" if clip['loop'] else 't'
    draws = [
        f"drawtext=fontfile='{FONT}':text='{_esc(title)}':x=26:y=22:fontsize={fs1}:fontcolor=white",
        f"drawtext=fontfile='{FONT}':text='{label}  %{{eif\\:{tclip}\\:d}}.%{{eif\\:mod({tclip}*100\\,100)\\:d\\:2}} s':"
        f"x=26:y={22 + fs1 + 12}:fontsize={fs2}:fontcolor=white@0.92",
        f"drawtext=fontfile='{FONT}':text='%{{eif\\:mod(n\\,{n})+1\\:d}} / {n}':x=26:y={22 + fs1 + 12 + fs2 + 10}:"
        f"fontsize={fs2}:fontcolor=white@0.85",
    ]
    fc = (f"[1:v]scale={iw}:-1,pad=iw+4:ih+4:2:2:color=white@0.7[ins];"
          f"[0:v][ins]overlay=W-w-24:20," + ','.join(draws) + "[o]")
    cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(frames_dir, '%04d.png'),
           '-i', inset_png, '-filter_complex', fc, '-map', '[o]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
           '-movflags', '+faststart', out_mp4]
    subprocess.run(cmd, check=True)
    return out_mp4


def concat(mp4s, out_mp4):
    lst = out_mp4 + '.txt'
    with open(lst, 'w') as f:
        for p in mp4s:
            f.write(f"file '{os.path.abspath(p)}'\n")
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out_mp4], check=True)
    os.remove(lst)
    return out_mp4
