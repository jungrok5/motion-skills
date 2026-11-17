"""Review sheets (render, then score with references/BRIEF.md's rubric before any reel).

  turnaround    front, left side, right side, back, top, three-quarter from the left and from the right, with the
                figure — the "front / back / left / right agree" check for a machine (left and right are both drawn)
  motion        the walk's key poses from BOTH sides (contact, passing, lift, set-down of one foot), the idle's two
                extremes, the big move's gather / peak / overshoot — the "does it gather, does it land" check
  plates        every close-up plate, labelled
"""
import os
from . import render as R


def turnaround(ctx, out, res=(640, 640), samples=20):
    d = os.path.join(os.path.dirname(out), 'sheet_frames')
    R.pose_machine(ctx, 'rest', 0.0)
    views = [('front', 0, 3), ('three-quarter left', 50, 6), ('left', 90, 3), ('back', 180, 3), ('right', -90, 3),
             ('three-quarter right', -50, 6), ('top', -90, 88)]
    ps = []
    for name, yaw, el in views:
        p = os.path.join(d, f'turn_{name.replace(" ", "_")}.png')
        R.view(ctx, p, yaw=yaw, elev=el, lens=50, fill=0.84, res=res, samples=samples, ortho=(name == 'top'))
        ps.append(p)
    return R.grid(ps, out, 4, cell=(res[0] // 2 * 1, res[1] // 2 * 1), labels=[v[0] for v in views])


def motion(ctx, out, res=(480, 360), samples=14):
    mc = ctx.mc
    d = os.path.join(os.path.dirname(out), 'sheet_frames')
    T = mc.mot.T
    frames = []
    first = mc.kin.limbs[0].name
    off = mc.mot.off.get(first, 0.0)
    du = mc.mot.duty
    keyp = [('contact', 0.0), ('mid-stance', du / 2), ('lift', du + 0.02), ('swing', du + (1 - du) * 0.45),
            ('set-down', 0.985)]
    for side, yaw in (('left', 90), ('right', -90)):
        for name, ph in keyp:
            t = (ph + off) * T
            frames.append((f'walk {name} ({first}) · from {side}', 'walk', t, yaw))
    idle_p = mc.M['idle']['period']
    frames.append(('idle breath in', 'idle', idle_p / 12, -60))         # breath = sin(3wt): peak at L/12
    frames.append(('idle breath out', 'idle', idle_p / 4, -60))         # trough at L/4
    for mv, spec in mc.mot.moves.items():
        keys = spec['keys']
        ch = max((c for c in keys if c.split('.')[0] in ('body', 'neck', 'head')),
                 key=lambda c: max(abs(v - keys[c][0][1]) for _, v in keys[c]) if not isinstance(keys[c][0][1], (list, tuple)) else 0)
        ks = keys[ch]
        i_pk = max(range(len(ks)), key=lambda i: abs(ks[i][1] - ks[0][1]))
        t_ant = ks[1][0] if i_pk > 1 else ks[0][0]
        t_pk = ks[i_pk][0]
        t_rec = ks[min(len(ks) - 1, i_pk + 2)][0]
        for lab, t in (('gather', t_ant), ('peak', t_pk), ('recover', t_rec)):
            frames.append((f'{mv} {lab}', mv, t, -55))
    ps = []
    for i, (lab, act, t, yaw) in enumerate(frames):
        R.pose_machine(ctx, act, t, travel=False)
        p = os.path.join(d, f'motion_{i:02d}.png')
        R.view(ctx, p, yaw=yaw, elev=4, lens=50, fill=0.86, res=res, samples=samples, figure=False)
        ps.append(p)
    return R.grid(ps, out, 5, cell=res, labels=[f[0] for f in frames])


def plates(ctx, out, res=(640, 360), samples=24):
    d = os.path.join(os.path.dirname(out), 'sheet_frames')
    R.pose_machine(ctx, 'rest', 0.0)
    ps = []
    for p in ctx.mc.M['plates']:
        ps.append(R.plate(ctx, os.path.join(d, f'plate_{p["name"].replace(" ", "_")}.png'), p, res=res,
                          samples=samples))
    return R.grid(ps, out, 4, cell=res, labels=[p['name'] for p in ctx.mc.M['plates']])
