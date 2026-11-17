"""Actuator anchor search — let the script pick what a person would fudge.

Every action is sampled; for each hydraulic joint the hinge angle range is collected. Candidate anchor pairs
(how far up the upper part, how far down the lower part, which side, how far off the axis) are scored, and the pair
kept is the one with the largest *smallest* lever arm over the whole range such that

  * the barrel is as long as the shortest pin-to-pin length allows (Bl = Lmin - eyes - margin),
  * the rod (Rl = Bl) still has >= 20 % of its length inside the barrel at the longest stretch,
  * the actuator line never passes closer to the pivot than the joint drum plus the barrel (it cannot clip the drum
    and it always has leverage).

If no candidate passes, the build fails and says which joint and why (a joint that folds too far for any
cylinder: lower its range or move the anchors by hand in the spec).
"""
import math
from .kin import up_length

EYES = 2.2      # eye ends, in barrel radii


def _len_and_lever(a_up, h_up, a_lo, h_lo, d):
    """Pin-to-pin length and lever arm for relative hinge angle d (rad), pivot at the origin, upper part along -X
    before rotation... computed in the joint's own 2D frame: upper part direction 0, lower part direction d."""
    # upper part points from its top toward the pivot along +x (direction angle 0): anchor is behind the pivot
    ux, uy = -a_up, h_up
    c, s = math.cos(d), math.sin(d)
    lx, ly = a_lo * c - h_lo * s, a_lo * s + h_lo * c
    dx, dy = lx - ux, ly - uy
    L = math.hypot(dx, dy)
    lever = abs(dx * (-uy) - dy * (-ux)) / max(L, 1e-9)       # distance from pivot to the line
    return L, lever


def search(limb, j, rel_angles, width, r_drum):
    """rel_angles: hinge angles (rad, lower part relative to upper part direction) seen in every action."""
    up_len = up_length(limb, j)
    lo_len = limb.segs[j]
    best = None
    r_bar = max(0.06, 0.32 * width)
    lo_a = min(rel_angles)
    hi_a = max(rel_angles)
    samples = [lo_a + (hi_a - lo_a) * i / 24 for i in range(25)]
    for fu in (0.25, 0.32, 0.4, 0.5, 0.6, 0.7):
        for fl in (0.14, 0.2, 0.27, 0.34, 0.42, 0.5):
            for sgn in (1, -1):
                for hu in (0.9, 1.25, 1.6, 2.0):
                    for hl in (0.9, 1.25, 1.6):
                        a_up, a_lo = fu * up_len, fl * lo_len
                        h_up, h_lo = sgn * hu * width, sgn * hl * width
                        Ls, lev = [], []
                        for d in samples:
                            L, lv = _len_and_lever(a_up, h_up, a_lo, h_lo, d)
                            Ls.append(L)
                            lev.append(lv)
                        Lmin, Lmax = min(Ls), max(Ls)
                        eyes = EYES * r_bar
                        Bl = Lmin - eyes - 1.4 * r_bar - 0.03 * Lmin     # fully closed, the barrel still clears the far lug
                        if Bl < 3 * r_bar:
                            continue
                        Rl = Bl
                        overlap = Bl + Rl + eyes - Lmax
                        if overlap < 0.2 * Bl:
                            continue
                        mlev = min(lev)
                        if mlev < r_drum + r_bar:
                            continue
                        score = mlev - 0.02 * (abs(h_up) + abs(h_lo))
                        if best is None or score > best[0]:
                            best = (score, dict(a_up=a_up, h_up=h_up, a_lo=a_lo, h_lo=h_lo, Bl=Bl, Rl=Rl, r=r_bar,
                                                Lmin=Lmin, Lmax=Lmax, lever=mlev, overlap_min=overlap / Bl,
                                                range_deg=[math.degrees(lo_a), math.degrees(hi_a)]))
    return best[1] if best else None


def assign(kin, motion, fps=12, width_of=None):
    """Sample every action, search every actuated joint, write anchors into the limbs (and return a report)."""
    from .kin import D2R
    acts = motion.actions()
    rel = {}
    for name, (dur, loop) in list(acts.items()) + [('rest', (0.1, False))]:
        n = max(2, int(dur * fps))
        for i in range(n + 1):
            t = dur * i / n
            cmd = motion.cmd(name, t, travel=True)
            Rm, Bm = kin.body_matrix(cmd)
            for l in kin.limbs:
                sol = l.solve(Bm, cmd['limbs'][l.name]['p'], cmd['limbs'][l.name].get('gamma'))
                th = [l.parent_dir2()] + sol['th']
                for j in range(l.n):
                    if not (l.acts[j] if j < len(l.acts) else 0):
                        continue
                    d = th[j + 1] - th[j]
                    d = (d + math.pi) % (2 * math.pi) - math.pi
                    rel.setdefault((l.name, j), []).append(d)
    report = {}
    for l in kin.limbs:
        width = float(l.s.get('width', 0.5))
        for j in range(l.n):
            if (l.name, j) not in rel:
                continue
            jn = l.joint_names[j]
            if jn in (l.s.get('anchors') or {}) and l.s['anchors'][jn].get('fixed'):
                l.anchors[jn] = l.s['anchors'][jn]
                continue
            r_drum = float(l.s.get('drum', 0.9 * width)) * 0.5 * (1.25 if j == 0 else 1.0)
            res = search(l, j, rel[(l.name, j)], width, r_drum)
            if res is None:
                raise RuntimeError(f'actuator {jn}_{l.name}: no anchor pair keeps the rod in its barrel over '
                                   f'{math.degrees(min(rel[(l.name, j)])):.0f}..{math.degrees(max(rel[(l.name, j)])):.0f} deg; '
                                   f'reduce that joint\'s range (gait lift / move keys) or give fixed anchors')
            # side by side along the pin axis, alternating, clear of the covers on a ceramic limb
            lat_k = float(l.s.get('act_lat', 1.9 if l.s.get('style', 'ceramic') == 'ceramic' else 1.6))
            # the hip barrel goes outboard (away from the hull), the next one inboard, and so on
            out_sign = -l.side if (l.kind != 'insect' and l.side) else 1
            res['lat'] = (0.55 if j % 2 == 0 else -0.55) * width * lat_k * out_sign
            l.anchors[jn] = res
            report[f'{jn}_{l.name}'] = res
    return report
