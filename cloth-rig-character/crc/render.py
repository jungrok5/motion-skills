"""Renders: the review video (fixed camera, grey floor, back-view concept in the corner, HUD), stills, the
turnaround and the cast sheet. Cycles renders PNG frames; ffmpeg adds the inset and the HUD and encodes the MP4."""
import json
import math
import os
import shutil
import subprocess
import bpy
from mathutils import Vector
from . import scene as SC

FONT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'fonts', 'Inter-Medium.otf')


def open_blend(path):
    bpy.ops.wm.open_mainfile(filepath=path)


def _render(path):
    s = bpy.context.scene
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)


def frames(out_dir, res=(1280, 720), samples=16, every=1, only=None, resume=True):
    """Render the review camera's frames to out/frames/0001.png ..."""
    s = bpy.context.scene
    SC.setup_render(res, samples)
    s.camera = bpy.data.objects['review_cam']
    d = os.path.join(out_dir, 'frames')
    os.makedirs(d, exist_ok=True)
    todo = only or list(range(s.frame_start, s.frame_end + 1, every))
    for f in todo:
        p = os.path.join(d, f'{f:04d}.png')
        if resume and os.path.exists(p):
            continue
        s.frame_set(f)
        _render(p)
    return d


def _char_root(f):
    """World position + yaw of the character root at frame f (from the evaluated rig)."""
    s = bpy.context.scene
    s.frame_set(f)
    rig = bpy.data.objects['rig']
    pb = rig.pose.bones['root']
    M = rig.matrix_world @ pb.matrix
    yaw = math.degrees(M.to_euler().z)
    return M.translation.copy(), yaw


def view(out_png, frame, yaw_rel, H, res=(640, 720), samples=16, height=None, fill=0.9, lens=50, hat=True, aim=0.47):
    """Render the character at `frame` from a camera at yaw_rel degrees around it (0 = in front of its face,
    +90 = at its left side, -90 = at its right side)."""
    s = bpy.context.scene
    SC.setup_render(res, samples)
    pos, yaw = _char_root(frame)
    tall = H * (1.16 if hat else 1.04)
    target = Vector((pos.x, pos.y, tall * aim))
    dist = SC.frame_dist(tall, lens, fill, aspect=res[0] / res[1])
    cam = SC.orbit_camera('view_cam', target, yaw + yaw_rel, dist, height if height is not None else 0.04 * H, lens)
    s.camera = cam
    s.frame_set(frame)
    _render(out_png)
    bpy.data.objects.remove(cam, do_unlink=True)
    return out_png


def turnaround(out_dir, H, frame=1, samples=16):
    """Front, 3/4 and side both ways, back: the concept sheet the review inset uses."""
    d = os.path.join(out_dir, 'turn')
    os.makedirs(d, exist_ok=True)
    views = [('front', 0), ('3q-left', 40), ('left', 90), ('back', 180), ('right', -90), ('3q-right', -40)]
    paths = []
    for name, y in views:
        paths.append(view(os.path.join(d, f'{name}.png'), frame, y, H, samples=samples))
    _sheet(paths, [n for n, _ in views], os.path.join(out_dir, 'turnaround.png'), cols=6)
    return os.path.join(d, 'back.png')


def castsheet(out_dir, H, data, samples=12):
    """Cast sheet: turnaround row + motion poses seen from both sides (walk contact / passing, turn, idle blink)."""
    d = os.path.join(out_dir, 'cast')
    os.makedirs(d, exist_ok=True)
    fps = data['fps']
    picks = []
    for c in data['clips']:
        f0 = int(round(c['t0'] * fps)) + 1
        n = int(round(c['dur'] * fps))
        if c['type'] == 'walk':
            picks += [(f'{c["label"]} a', f0 + int(n * 0.55)), (f'{c["label"]} b', f0 + int(n * 0.68))]
        elif c['type'] in ('turn', 'spin'):
            picks += [(f'{c["label"]} mid', f0 + int(n * 0.5))]
        else:
            picks += [(c['label'], f0 + int(n * 0.45))]
    paths, labels = [], []
    for lab, f in picks:
        for side, y in (('R', -90), ('L', 90)):
            paths.append(view(os.path.join(d, f'{len(paths):02d}.png'), f, y, H, res=(480, 600), samples=samples))
            labels.append(f'{lab} · {"right" if side == "R" else "left"} side · f{f}')
    _sheet(paths, labels, os.path.join(out_dir, 'cast-motion.png'), cols=4)
    return os.path.join(out_dir, 'cast-motion.png')


def _esc(t):
    return t.replace('\\', '\\\\').replace(':', '\\:').replace("'", "’").replace('%', '\\%')


def _sheet(paths, labels, out, cols=4):
    """Tile images with a label under each (ffmpeg xstack + drawtext)."""
    n = len(paths)
    rows = math.ceil(n / cols)
    ins = []
    for p in paths:
        ins += ['-i', p]
    fl = []
    for i, lab in enumerate(labels):
        fl.append(f"[{i}:v]drawtext=fontfile='{FONT}':text='{_esc(lab)}':x=12:y=h-30:fontsize=20:fontcolor=white:"
                  f"box=1:boxcolor=black@0.45:boxborderw=6[v{i}]")
    lay = []
    for i in range(n):
        cx, cy = i % cols, i // cols
        xs = '+'.join(['w0'] * cx) or '0'
        ys = '+'.join(['h0'] * cy) or '0'
        lay.append(f'{xs}_{ys}')
    fl.append(''.join(f'[v{i}]' for i in range(n)) + f"xstack=inputs={n}:layout={'|'.join(lay)}:fill=0x5c5e6a[o]")
    cmd = ['ffmpeg', '-loglevel', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fl), '-map', '[o]', out]
    subprocess.run(cmd, check=True)
    return out


def compose(out_dir, data, back_png, out_mp4, res=(1280, 720), title=None):
    """frames + back-view inset (top right) + HUD (top left) -> MP4."""
    fps = data['fps']
    n = data['n']
    W, Hh = res
    iw = int(W * 0.2)
    title = title or data['review'].get('title', 'HERO / ANIMATION REVIEW')
    draws = [f"drawtext=fontfile='{FONT}':text='{_esc(title)}':x=24:y=20:fontsize={int(Hh * 0.03)}:fontcolor=white"]
    for c in data['clips']:
        a, b = c['t0'], c['t0'] + c['dur']
        kind = {'walk': 'locomotion', 'turn': 'locomotion', 'spin': 'locomotion'}.get(c['type'], 'in place')
        txt = _esc(f"{c['label'].capitalize()} [{kind}]")
        draws.append(f"drawtext=fontfile='{FONT}':text='{txt}  %{{eif\\:t-{a:.3f}\\:d}}.%{{eif\\:mod((t-{a:.3f})*100\\,100)\\:d\\:2}} s':"
                     f"x=24:y={int(Hh * 0.03) + 30}:fontsize={int(Hh * 0.026)}:fontcolor=white@0.92:"
                     f"enable='between(t,{a:.3f},{b - 1e-3:.3f})'")
    draws.append(f"drawtext=fontfile='{FONT}':text='%{{eif\\:n+1\\:d}} / {n}':x=24:y={int(Hh * 0.03) + 30 + int(Hh * 0.036)}:"
                 f"fontsize={int(Hh * 0.026)}:fontcolor=white@0.85")
    fc = (f"[1:v]scale={iw}:-1,pad=iw+4:ih+4:2:2:color=white@0.85[ins];"
          f"[0:v][ins]overlay=W-w-24:20," + ','.join(draws) + "[o]")
    cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(out_dir, 'frames', '%04d.png'),
           '-i', back_png, '-filter_complex', fc, '-map', '[o]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
           '-movflags', '+faststart', out_mp4]
    subprocess.run(cmd, check=True)
    return out_mp4
