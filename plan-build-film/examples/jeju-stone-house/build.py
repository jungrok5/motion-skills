"""제주 돌집 스테이 (a Jeju stone house stay): the worked example of plan-build-film. Two houses face each other across
a yard - 안거리 (main) and 밖거리 (outer) - with basalt rubble walls laid stone by stone, a timber front of posts,
beams and 띠살 lattice doors, a rounded thatch roof laid in bundles and tied down with a rope net, a 돌담 field-stone
wall round the lot with a 정낭 pole gate, a jar terrace and a tangerine tree in the yard (where the wave starts).

Every number comes from plan.json. Every part is its own object under a stage; the film flies them in by stage.

    blender -b --factory-startup -P examples/jeju-stone-house/build.py -- hero yard hall --res 960x540 --samples 32
    (kit/film.py runs this same file in film mode)
"""
import json
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ.get("PBF_KIT") or os.path.join(HERE, "..", "..", "kit"))
import pbf as K  # noqa: E402

OPTS, SHOTS_ARG = K.args(("hero", "yard", "hall"))
scene = K.setup(OPTS, samples=32)
PLAN = json.load(open(os.path.join(HERE, "plan.json"), encoding="utf-8"))
rng = random.Random(11)
LOOK = K.sky(OPTS.get("look", "golden"))

# ---------------------------------------------------------------- materials (the look: see BRIEF.md "the look")
M = dict(
    basalt=K.stone("basalt", (0.36, 0.35, 0.34), pores=1.0, moss=0.35),
    basalt_dark=K.stone("basalt_dark", (0.24, 0.235, 0.23), pores=1.1, moss=0.15),
    plinth=K.stone("plinth", (0.33, 0.32, 0.31), pores=0.5),
    cedar=K.wood("cedar", (0.50, 0.34, 0.21), grain=10),
    cedar_v=K.wood("cedar_v", (0.46, 0.31, 0.19), grain=10, axis="Z"),
    pole=K.wood("pole", (0.42, 0.31, 0.22), grain=6, rough=0.75),
    board=K.wood("board", (0.62, 0.44, 0.27), grain=16, rough=0.42, axis="Y"),
    oiled=K.pbr("oiled_paper", (0.80, 0.58, 0.28), rough=0.28, spec=0.6),
    earth=K.stone("earth_floor", (0.43, 0.36, 0.29), pores=0.2, rough=0.95),
    hanji=K.fabric("hanji", (0.93, 0.90, 0.82), rough=0.9),
    thatch=K.fibre("thatch", (0.66, 0.54, 0.34), along="Y", streak=55),
    rope=K.fibre("rope", (0.36, 0.29, 0.19), along="X", streak=90),
    onggi=K.pbr("onggi", (0.30, 0.18, 0.11), rough=0.25, spec=0.7),
    cushion=K.fabric("cushion", (0.55, 0.30, 0.22)),
    cushion2=K.fabric("cushion2", (0.78, 0.72, 0.58)),
    linen=K.fabric("linen", (0.86, 0.83, 0.76)),
    brass=K.metal("brass", (0.72, 0.55, 0.30), rough=0.35),
    celadon=K.pbr("celadon", (0.62, 0.72, 0.64), rough=0.15, spec=0.7),
    leaf=K.leaf("tangerine_leaf", (0.12, 0.24, 0.08)),
    fruit=K.pbr("tangerine", (0.95, 0.48, 0.08), rough=0.45),
    bark=K.wood("bark", (0.30, 0.24, 0.18), grain=4, rough=0.9, axis="Z"),
    lamp=K.glow("paper_lamp", (1.0, 0.72, 0.42), 5.0, base=(0.95, 0.9, 0.8)),
    yard=K.stone("yard_earth", (0.56, 0.49, 0.40), pores=0.3, rough=0.95),
    grass=K.ground("grass", (0.33, 0.37, 0.20), (0.36, 0.30, 0.22), patch=0.35),
    pine=K.leaf("pine", (0.10, 0.17, 0.08)),
    orchard=K.leaf("orchard", (0.14, 0.26, 0.09)),
    sea=K.water("sea", (0.08, 0.20, 0.26)),
)


# ---------------------------------------------------------------- a house addressed by (u, v): u along it, v from its front
class House:
    def __init__(s, b):
        s.b = b
        s.front = b["front"]
        s.L = b["x1"] - b["x0"]
        s.D = b["y1"] - b["y0"]
        s.t = b["wall"]
        s.p = b["plinth"]
        s.edges = [0.0]
        for w in b["bays"]:
            s.edges.append(s.edges[-1] + w)
        s.id = b["id"]

    def W(s, u, v, z=0.0):
        b = s.b
        return (b["x0"] + u, b["y0"] + v, z) if s.front == "S" else (b["x1"] - u, b["y1"] - v, z)

    def box(s, name, u0, u1, v0, v1, z0, z1, mat, bevel=0.004):
        (x0, y0, _), (x1, y1, _) = s.W(u0, v0), s.W(u1, v1)
        return K.box(f"{s.id}_{name}", min(x0, x1), max(x0, x1), min(y0, y1), max(y0, y1), z0, z1, mat, bevel)

    def beam(s, name, a, b_, w, h, mat):
        return K.beam(f"{s.id}_{name}", s.W(*a), s.W(*b_), w, h, mat)

    # -- roof shape: a rounded loaf, its bottom on the rafters
    def roof_top(s, u, v):
        b, o = s.b, b_o(s.b)
        vc, hv = s.D / 2, s.D / 2 + o
        pv = max(0.0, 1 - (abs(v - vc) / hv) ** 2.2) ** 0.5
        e = min(u + o, s.L + o - u) / 1.5
        ku = 1 - (1 - min(1.0, max(0.0, e))) ** 2
        return b["eave"] + (b["ridge"] - b["eave"]) * pv * ku

    def rafter_z(s, v):
        o = b_o(s.b)
        vc = s.D / 2
        z_r, z_e = s.b["ridge"] - 0.42, s.b["eave"] - 0.22
        return z_e + (z_r - z_e) * (1 - abs(v - vc) / (vc + o))


def b_o(b):
    return b.get("overhang", 0.6)


def rubble(h, name, axis, a0, a1, c, z0, z1, gaps, mat):
    """a basalt rubble wall laid course by course: axis 'u' runs along u at v=c, 'v' along v at u=c.
    gaps: [(a0, a1, z_bottom, z_top)] window holes; a timber lintel spans each."""
    n = 0
    z = z0
    course = 0
    while z < z1 - 0.06:
        ch = min(rng.uniform(0.22, 0.30), z1 - z)
        a = a0 - (rng.uniform(0.0, 0.2) if course % 2 else 0.0)
        a = max(a, a0)
        while a < a1 - 0.05:
            ln = min(rng.uniform(0.30, 0.52), a1 - a)
            hit = None
            for g0, g1, gz0, gz1 in gaps:
                if a < g1 and a + ln > g0 and z < gz1 and z + ch > gz0:
                    hit = (g0, g1)
            if hit:
                if hit[0] - a > 0.12:
                    ln = hit[0] - a
                else:
                    a = hit[1]
                    continue
            mid = a + ln / 2
            th = h.t * rng.uniform(0.86, 1.0)
            if axis == "u":
                x, y, _ = h.W(mid, c)
                size = (ln * 1.04, th, ch * 1.2)
                yaw = 0.0 + rng.uniform(-0.05, 0.05)
            else:
                x, y, _ = h.W(c, mid)
                size = (ln * 1.04, th, ch * 1.2)
                yaw = math.pi / 2 + rng.uniform(-0.05, 0.05)
            K.rock(f"{h.id}_{name}_stone", (x, y, z), size, mat if rng.random() > 0.25 else M["basalt_dark"],
                   seed=rng.randint(0, 9999), rough=0.34, sub=1, yaw=yaw, face=0.36)
            n += 1
            a += ln
        z += ch
        course += 1
    return n


def lattice_leaf(h, tag, at, a0, a1, z0, z1, along="u"):
    """a 띠살 door or window leaf: frame, six muntins, three bands of three rails, one sheet of hanji.
    along='u': the leaf spans u a0..a1 in the plane v=at (a closed leaf in the front wall).
    along='v': it spans v a0..a1 in the plane u=at (a leaf swung open 90 degrees, or a partition's door)."""
    fw, ft, mw = 0.055, 0.045, 0.016

    def B(name, b0, b1, zz0, zz1, d0, d1, mat=None):
        if along == "u":
            return h.box(f"{tag}_{name}", b0, b1, at + d0, at + d1, zz0, zz1, mat or M["cedar_v"], 0.002)
        return h.box(f"{tag}_{name}", at + d0, at + d1, b0, b1, zz0, zz1, mat or M["cedar_v"], 0.002)
    B("stile", a0, a0 + fw, z0, z1, -ft / 2, ft / 2)
    B("stile", a1 - fw, a1, z0, z1, -ft / 2, ft / 2)
    B("rail", a0 + fw, a1 - fw, z0, z0 + fw * 1.4, -ft / 2, ft / 2)
    B("rail", a0 + fw, a1 - fw, z1 - fw, z1, -ft / 2, ft / 2)
    inner = a1 - a0 - 2 * fw
    for i in range(1, 7):
        uu = a0 + fw + inner * i / 7
        B("muntin", uu - mw / 2, uu + mw / 2, z0 + fw * 1.4, z1 - fw, -ft / 4, ft / 4)
    span = z1 - z0
    for band in (0.14, 0.5, 0.86):
        for k in (-1, 0, 1):
            zz = z0 + span * band + k * 0.05
            B("band", a0 + fw, a1 - fw, zz - mw / 2, zz + mw / 2, -ft / 4, ft / 4)
    B("hanji", a0 + fw, a1 - fw, z0 + fw * 1.4, z1 - fw, ft / 4, ft / 4 + 0.004, M["hanji"])
    return 18


def build_house(b):
    h = House(b)
    L, D, t, p = h.L, h.D, h.t, h.p
    o = b_o(b)
    wt = b["wall_top"]
    # -------------------------------------------------- foundation: plinth, its edge stones, post stones, steps
    with K.stage("foundation"):
        h.box("plinth", -0.35, L + 0.35, -0.55, D + 0.2, 0.0, p - 0.06, M["plinth"], 0.02)
        u = -0.35
        while u < L + 0.3:
            ln = min(rng.uniform(0.45, 0.7), L + 0.35 - u)
            x, y, _ = h.W(u + ln / 2, -0.42)
            K.rock(f"{h.id}_edge_stone", (x, y, 0.0), (ln * 1.02, 0.3, p * 1.05), M["basalt"], seed=rng.randint(0, 9999), rough=0.1, yaw=0.0)
            u += ln
        for e in h.edges:
            ue = min(max(e, 0.14), L - 0.14)
            x, y, _ = h.W(ue, 0.12)
            K.rock(f"{h.id}_post_stone", (x, y, p - 0.07), (0.42, 0.42, 0.14), M["basalt_dark"], seed=rng.randint(0, 9999), rough=0.12)
        for op in b["openings"]:
            if op["wall"] == "front" and op["kind"] in ("door", "doors"):
                c = (h.edges[op["bay"]] + h.edges[op["bay"] + 1]) / 2
                x, y, _ = h.W(c, -0.95)
                K.rock(f"{h.id}_step", (x, y, 0.0), (0.9, 0.5, 0.2), M["basalt"], seed=rng.randint(0, 9999), rough=0.12, yaw=0.0)
    # -------------------------------------------------- walls: basalt rubble, back and both ends
    gaps = {"back": [], "left": [], "right": []}
    for op in b["openings"]:
        if op["wall"] in gaps:
            c = op.get("u", op.get("v"))
            z0 = p + op.get("sill", 0.8)
            gaps[op["wall"]].append((c - op["w"] / 2, c + op["w"] / 2, z0, z0 + op["h"]))
    with K.stage("walls"):
        # the mud core the stones are bedded in (Jeju walls are plastered inside): no daylight through the joints
        mud = K.plaster("mud_core", (0.42, 0.36, 0.29))
        h.box("core_back", 0.12, L - 0.12, D - t / 2 - 0.1, D - t / 2 + 0.1, p - 0.06, wt - 0.04, mud, 0.0)
        h.box("core_left", t / 2 - 0.1, t / 2 + 0.1, 0.3, D - t / 2 - 0.1, p - 0.06, wt - 0.04, mud, 0.0)
        h.box("core_right", L - t / 2 - 0.1, L - t / 2 + 0.1, 0.3, D - t / 2 - 0.1, p - 0.06, wt - 0.04, mud, 0.0)
        rubble(h, "back", "u", 0.0, L, D - t / 2, p - 0.06, wt, gaps["back"], M["basalt"])
        rubble(h, "left", "v", 0.26, D - t, t / 2, p - 0.06, wt, gaps["left"], M["basalt"])
        rubble(h, "right", "v", 0.26, D - t, L - t / 2, p - 0.06, wt, [], M["basalt"])
        for wall, gl in gaps.items():
            for g0, g1, z0, z1 in gl:
                if wall == "back":
                    h.box("lintel", g0 - 0.15, g1 + 0.15, D - t, D, z1, z1 + 0.14, M["cedar"])
                    h.box("sill", g0, g1, D - t, D, z0 - 0.08, z0, M["cedar"])
                else:
                    uu = t / 2 if wall == "left" else L - t / 2
                    h.box("lintel", uu - t / 2, uu + t / 2, g0 - 0.15, g1 + 0.15, z1, z1 + 0.14, M["cedar"])
                    h.box("sill", uu - t / 2, uu + t / 2, g0, g1, z0 - 0.08, z0, M["cedar"])
    # -------------------------------------------------- frame: posts, beams, purlins, king posts, wall plates
    zb = wt  # beam seat
    with K.stage("frame"):
        for e in h.edges:
            ue = min(max(e, 0.14), L - 0.14)
            x, y, _ = h.W(ue, 0.12)
            K.cyl(f"{h.id}_post", x, y, 0.12, p + 0.07, zb, M["pole"], seg=14)
        h.box("plate_back", 0.0, L, D - t + 0.05, D - 0.05, wt, wt + 0.14, M["cedar"])
        h.box("plate_left", 0.05, t - 0.05, 0.25, D - t + 0.05, wt, wt + 0.14, M["cedar"])
        h.box("plate_right", L - t + 0.05, L - 0.05, 0.25, D - t + 0.05, wt, wt + 0.14, M["cedar"])
        h.beam("purlin_front", (-0.3, 0.12, zb + 0.1), (L + 0.3, 0.12, zb + 0.1), 0.2, 0.2, M["pole"])
        vc = D / 2
        zr = b["ridge"] - 0.42 - 0.12
        for e in h.edges:
            ue = min(max(e, 0.14), L - 0.14)
            h.beam("crossbeam", (ue, 0.0, zb + 0.24), (ue, D - 0.05, zb + 0.24), 0.2, 0.24, M["pole"])
            h.beam("king_post", (ue, vc, zb + 0.36), (ue, vc, zr - 0.09), 0.15, 0.15, M["cedar"])
        h.beam("ridge", (-0.3, vc, zr), (L + 0.3, vc, zr), 0.2, 0.2, M["pole"])
        h.beam("purlin_back", (-0.3, D - t / 2, wt + 0.24), (L + 0.3, D - t / 2, wt + 0.24), 0.18, 0.18, M["pole"])
        for i in range(len(h.edges) - 1):  # the sill between posts that the front wall stands on
            u0 = min(max(h.edges[i], 0.14), L - 0.14) + 0.12
            u1 = min(max(h.edges[i + 1], 0.14), L - 0.14) - 0.12
            h.box("threshold", u0, u1, 0.06, 0.2, p - 0.06, p + 0.18, M["cedar"])
    # -------------------------------------------------- floors: hall boards on joists, oiled paper, earth
    rooms = {r["id"]: r for r in b["rooms"]}
    with K.stage("floor"):
        for r in b["rooms"]:
            u0 = max(h.edges[r["bays"][0]], t) + 0.02
            u1 = min(h.edges[r["bays"][1] + 1], L - t) - 0.02
            v0, v1 = 0.22, D - t - 0.02
            if r["floor"] == "boards":
                for vj in (0.4, D / 2 - 0.1, D - t - 0.25):
                    h.box("joist", u0, u1, vj - 0.06, vj + 0.06, p - 0.06, p + 0.08, M["cedar"])
                n = int((u1 - u0) / 0.21)
                for i in range(n):
                    a = u0 + (u1 - u0) * i / n
                    h.box("floor_board", a + 0.003, a + (u1 - u0) / n - 0.003, v0, v1, p + 0.08, p + 0.115, M["board"], 0.003)
            elif r["floor"] == "paper":
                h.box("ondol", u0, u1, v0, v1, p - 0.06, p + 0.1, M["earth"], 0.0)
                h.box("oiled_paper", u0, u1, v0, v1, p + 0.1, p + 0.115, M["oiled"], 0.002)
            else:
                h.box("earth", u0, u1, v0, v1, p - 0.06, p - 0.02, M["earth"], 0.0)
    # -------------------------------------------------- doors and windows: lattice leaves, boarded infill, partitions
    with K.stage("doors"):
        zt = zb - 0.02
        for i in range(len(h.edges) - 1):
            u0 = min(max(h.edges[i], 0.14), L - 0.14) + 0.12
            u1 = min(max(h.edges[i + 1], 0.14), L - 0.14) - 0.12
            op = next((o_ for o_ in b["openings"] if o_["wall"] == "front" and o_.get("bay") == i), None)
            c = (u0 + u1) / 2
            w = min(op["w"], u1 - u0 - 0.1) if op else 0
            oz0 = p + 0.18 if op and op["kind"] != "window" else (p + op.get("sill", 0.8) if op else zt)
            oz1 = min(oz0 + (op["h"] if op else 0), zt - 0.22)
            if op:
                h.box("lintel", u0, u1, 0.06, 0.2, oz1, oz1 + 0.1, M["cedar"])
            # boarded infill: beside, above and under the opening
            def boards(a0, a1, z0, z1):
                if a1 - a0 < 0.06 or z1 - z0 < 0.06:
                    return
                n = max(1, int(round((a1 - a0) / 0.24)))
                for k in range(n):
                    aa = a0 + (a1 - a0) * k / n
                    h.box("wall_board", aa + 0.002, aa + (a1 - a0) / n - 0.002, 0.09, 0.15, z0, z1, M["cedar_v"], 0.002)
            if not op:
                boards(u0, u1, p + 0.18, zt)
                continue
            boards(u0, c - w / 2, p + 0.18, oz1)
            boards(c + w / 2, u1, p + 0.18, oz1)
            boards(u0, u1, oz1 + 0.1, zt)
            if op["kind"] == "window":
                boards(c - w / 2, c + w / 2, p + 0.18, oz0)
                h.box("window_frame", c - w / 2, c + w / 2, 0.06, 0.2, oz0 - 0.06, oz0, M["cedar"])
            leaves = 2 if op["kind"] == "doors" else (1 if op["kind"] == "door" else 2)
            lw = w / leaves
            for k in range(leaves):
                a0 = c - w / 2 + k * lw
                if op.get("open"):  # swung out 90 degrees against the jamb, into the yard
                    hinge = c - w / 2 + 0.03 if k == 0 else c + w / 2 - 0.03
                    lattice_leaf(h, "door", hinge, -0.03 - lw, -0.03, oz0 + 0.02, oz1 - 0.02, along="v")
                else:
                    lattice_leaf(h, "door" if op["kind"] != "window" else "window", 0.12, a0 + 0.004, a0 + lw - 0.004, oz0 + 0.02, oz1 - 0.02)
        # partitions between rooms: a timber stud frame faced with plaster, a sliding door in each
        for r in b["rooms"][1:]:
            ue = h.edges[r["bays"][0]]
            h.box("partition_stud", ue - 0.05, ue + 0.05, 0.22, D - t, p + 0.12, zt, M["cedar"])
            h.box("partition_head", ue - 0.06, ue + 0.06, 0.22, D - t, zt - 0.12, zt, M["cedar"])
            for v0, v1 in ((0.3, D / 2 - 0.55), (D / 2 + 0.55, D - t - 0.05)):
                h.box("partition_panel", ue - 0.04, ue + 0.04, v0, v1, p + 0.12, zt - 0.12, K.plaster("mud_plaster", (0.74, 0.66, 0.55)))
            lattice_leaf(h, "slide", ue, D / 2 - 0.55, D / 2 + 0.55, p + 0.14, zt - 0.16, along="v")
    # -------------------------------------------------- roof: rafters, thatch bundles, the rope net
    with K.stage("roof"):
        vc = D / 2
        n_r = int((L + 2 * o) / 0.5)
        for i in range(n_r + 1):
            uu = -o + 0.15 + (L + 2 * o - 0.3) * i / n_r
            if h.roof_top(uu, vc) - h.rafter_z(vc) < 0.3:
                continue  # the rounded hip: the thatch is too low here to cover a rafter
            for sgn in (-1, 1):
                v_end = vc
                while abs(v_end - vc) < vc + o - 0.25 and h.roof_top(uu, v_end + sgn * 0.05) - h.rafter_z(v_end + sgn * 0.05) > 0.22:
                    v_end += sgn * 0.05
                a = h.W(uu, vc, h.rafter_z(vc) + 0.02)
                bb = h.W(uu, v_end, h.rafter_z(v_end))
                K.tube(f"{h.id}_rafter", [a, bb], [0.055, 0.05], M["pole"], seg=7)
        nb = max(5, int(round((L + 2 * o) / 1.4)))
        for i in range(nb):
            u0 = -o + (L + 2 * o) * i / nb
            u1 = -o + (L + 2 * o) * (i + 1) / nb

            def top(x, y, _h=h):
                uu, vv = _uv(_h, x, y)
                return _h.roof_top(uu, vv)

            def thick(x, y, _h=h):
                uu, vv = _uv(_h, x, y)
                return max(0.16, _h.roof_top(uu, vv) - _h.rafter_z(vv) - 0.06)
            (xa, ya, _), (xb, yb, _) = h.W(u0, -o), h.W(u1, D + o)
            K.shell(f"{h.id}_thatch", min(xa, xb), max(xa, xb), min(ya, yb), max(ya, yb), 6, 26, top, thick, M["thatch"])
        # the net: ropes along the house and across it, tied over the thatch
        for k in range(9):
            vv = -o + 0.25 + (D + 2 * o - 0.5) * k / 8
            pts = [h.W(uu, vv, h.roof_top(uu, vv) + 0.025) for uu in [-o + 0.1 + (L + 2 * o - 0.2) * j / 40 for j in range(41)]]
            K.tube(f"{h.id}_rope", pts, 0.03, M["rope"], seg=5)
        n_x = int((L + 2 * o) / 0.42)
        for k in range(n_x + 1):
            uu = -o + 0.2 + (L + 2 * o - 0.4) * k / n_x
            pts = [h.W(uu, vv, h.roof_top(uu, vv) + 0.035) for vv in [-o + 0.08 + (D + 2 * o - 0.16) * j / 30 for j in range(31)]]
            K.tube(f"{h.id}_rope", pts, 0.03, M["rope"], seg=5)
    return h


def _uv(h, x, y):
    b = h.b
    return (x - b["x0"], y - b["y0"]) if h.front == "S" else (b["x1"] - x, b["y1"] - y)


HOUSES = [build_house(b) for b in PLAN["buildings"]]
AN = HOUSES[0]

# ---------------------------------------------------------------- interior (안거리 상방 and 구들, 밖거리 방)
with K.stage("interior"):
    p = AN.p + 0.115
    tu, tv = 5.0, 2.5
    tx, ty, _ = AN.W(tu, tv)
    K.box("low_table_top", tx - 0.6, tx + 0.6, ty - 0.375, ty + 0.375, p + 0.30, p + 0.35, M["board"], 0.01)
    for dx in (-0.52, 0.52):
        for dy in (-0.3, 0.3):
            K.box("low_table_leg", tx + dx - 0.035, tx + dx + 0.035, ty + dy - 0.035, ty + dy + 0.035, p, p + 0.30, M["cedar"])
    K.box("tray", tx - 0.28, tx + 0.18, ty - 0.18, ty + 0.12, p + 0.35, p + 0.37, M["cedar"], 0.005)
    K.lathe("teapot", tx - 0.12, ty - 0.03, p + 0.37, [(0.0, 0), (0.07, 0.0), (0.09, 0.05), (0.085, 0.1), (0.05, 0.13), (0.02, 0.15), (0.0, 0.15)], M["celadon"])
    for k, (cx, cy) in enumerate(((0.07, -0.1), (0.1, 0.05), (0.32, -0.15), (0.35, 0.18))):
        K.lathe("cup", tx + cx, ty + cy, p + (0.37 if k < 2 else 0.35), [(0.0, 0), (0.025, 0), (0.035, 0.05), (0.033, 0.055), (0.0, 0.055)], M["celadon"])
    for k, (cu, cv) in enumerate(((tu - 1.0, tv), (tu + 1.0, tv), (tu - 0.3, tv - 0.85), (tu + 0.3, tv + 0.85))):
        x, y, _ = AN.W(cu, cv)
        K.box("cushion", x - 0.28, x + 0.28, y - 0.28, y + 0.28, p, p + 0.09, M["cushion"] if k % 2 else M["cushion2"], 0.035)
    x, y, _ = AN.W(3.3, 3.8)
    K.box("chest_body", x - 0.55, x + 0.55, y - 0.2, y + 0.2, p + 0.06, p + 0.72, M["cedar"], 0.008)
    K.box("chest_plinth", x - 0.5, x + 0.5, y - 0.18, y + 0.18, p, p + 0.06, M["cedar"])
    for dx in (-0.3, 0.3):
        K.box("chest_hinge", x + dx - 0.06, x + dx + 0.06, y - 0.205, y - 0.198, p + 0.45, p + 0.62, M["brass"], 0.002)
    K.box("chest_lock", x - 0.07, x + 0.07, y - 0.207, y - 0.198, p + 0.36, p + 0.46, M["brass"], 0.002)
    x, y, _ = AN.W(6.9, 3.6)
    K.box("lamp_base", x - 0.13, x + 0.13, y - 0.13, y + 0.13, p, p + 0.04, M["cedar"])
    for dx in (-0.1, 0.1):
        for dy in (-0.1, 0.1):
            K.box("lamp_post", x + dx - 0.012, x + dx + 0.012, y + dy - 0.012, y + dy + 0.012, p + 0.04, p + 0.62, M["cedar"])
    K.box("lamp_shade", x - 0.098, x + 0.098, y - 0.098, y + 0.098, p + 0.18, p + 0.6, M["lamp"], 0.002)
    K.light("hall_lamp", "POINT", (x, y, p + 0.42), 22.0, (1.0, 0.74, 0.46), 0.08)
    # 구들: folded bedding stacked by the wall
    x, y, _ = AN.W(8.75, 3.6)
    for k, (hh, mat) in enumerate(((0.12, M["linen"]), (0.1, M["cushion"]), (0.12, M["linen"]), (0.08, M["cushion2"]))):
        z0 = p + sum(v for v, _ in ((0.12, 0), (0.1, 0), (0.12, 0), (0.08, 0))[:k])
        K.box("bedding", x - 0.55, x + 0.55, y - 0.3, y + 0.3, z0, z0 + hh, mat, 0.03)
    # 정지: a shelf of pots
    x, y, _ = AN.W(1.25, 3.85)
    for zz in (AN.p, AN.p + 0.5):
        K.box("shelf", x - 0.55, x + 0.55, y - 0.18, y + 0.18, zz + 0.4, zz + 0.44, M["cedar"])
    for dx in (-0.5, 0.5):
        K.box("shelf_leg", x + dx - 0.03, x + dx + 0.03, y - 0.15, y + 0.15, AN.p - 0.02, AN.p + 0.94, M["cedar"])
    for zz, dx in ((AN.p + 0.44, -0.3), (AN.p + 0.44, 0.05), (AN.p + 0.94, -0.2), (AN.p + 0.94, 0.25)):
        K.lathe("pot", x + dx, y, zz, [(0, 0), (0.08, 0), (0.12, 0.08), (0.1, 0.18), (0.07, 0.2), (0.0, 0.2)], M["onggi"])
    for k, (rid, e) in enumerate((("sangbang", 26.0), ("gudeul", 16.0), ("jeonggi", 8.0))):
        r = next(r_ for r_ in AN.b["rooms"] if r_["id"] == rid)
        uc = (AN.edges[r["bays"][0]] + AN.edges[r["bays"][1] + 1]) / 2
        K.light(f"room_{rid}", "AREA", AN.W(uc, AN.D / 2, AN.b["wall_top"] - 0.1), e, (1.0, 0.78, 0.55), 1.2)
    BK = HOUSES[1]
    x, y, _ = BK.W(2.4, 2.6)
    K.box("desk", x - 0.6, x + 0.6, y - 0.3, y + 0.3, BK.p + 0.4, BK.p + 0.44, M["board"])
    K.box("desk_side", x - 0.6, x - 0.56, y - 0.28, y + 0.28, BK.p + 0.115, BK.p + 0.4, M["cedar"])
    K.box("desk_side", x + 0.56, x + 0.6, y - 0.28, y + 0.28, BK.p + 0.115, BK.p + 0.4, M["cedar"])
    K.light("room_bakgeori", "AREA", BK.W(2.4, BK.D / 2, BK.b["wall_top"] - 0.1), 18.0, (1.0, 0.78, 0.55), 1.2)

# ---------------------------------------------------------------- yard: 돌담, 정낭, jars, path, the tangerine tree
LOT = PLAN["lot"]
FEN = PLAN["fence"]
with K.stage("yard"):
    ft, fh = FEN["thick"], FEN["height"]
    g = FEN["gate"]

    def fence_run(xa, ya, xb, yb):
        Lr = math.dist((xa, ya), (xb, yb))
        ang = math.atan2(yb - ya, xb - xa)
        z = 0.0
        course = 0
        while z < fh - 0.1:
            ch = rng.uniform(0.28, 0.4)
            a = rng.uniform(0, 0.25) if course % 2 else 0.0
            while a < Lr - 0.1:
                ln = min(rng.uniform(0.34, 0.58), Lr - a)
                if rng.random() < 0.07 and course > 0:  # Jeju walls let the wind through: a gap now and then
                    a += ln * 0.6
                    continue
                m = a + ln / 2
                K.rock("fence_stone", (xa + math.cos(ang) * m, ya + math.sin(ang) * m, z), (ln * 1.0, ft * rng.uniform(0.8, 1.05), ch * 1.2),
                       M["basalt"] if rng.random() > 0.3 else M["basalt_dark"], seed=rng.randint(0, 99999), rough=0.38, sub=1,
                       yaw=ang + rng.uniform(-0.12, 0.12), face=0.4)
                a += ln
            z += ch * 0.92
            course += 1
    x0, x1, y0, y1 = LOT["x0"], LOT["x1"], LOT["y0"], LOT["y1"]
    h2 = ft / 2
    fence_run(x0 + h2, y0 + h2, x1 - h2, y0 + h2)
    fence_run(x1 - h2, y1 - h2, x0 + h2, y1 - h2)
    fence_run(x0 + h2, y1 - h2 - 0.3, x0 + h2, y0 + h2 + 0.3)
    fence_run(x1 - h2, y0 + h2 + 0.3, x1 - h2, g["y0"] - 0.3)
    fence_run(x1 - h2, g["y1"] + 0.3, x1 - h2, y1 - h2 - 0.3)
    # 정낭: two stone posts with three holes each, three poles across (all three down: someone is home)
    for yy in (g["y0"] - 0.05, g["y1"] + 0.05):
        K.box("jeongjuseok", x1 - h2 - 0.14, x1 - h2 + 0.14, yy - 0.12, yy + 0.12, 0.0, 1.2, M["basalt_dark"], 0.03)
    for k, zz in enumerate((0.45, 0.72, 0.98)):
        K.tube("jeongnang_pole", [(x1 - h2, g["y0"] - 0.25, zz), (x1 - h2, g["y1"] + 0.25, zz + 0.02)], 0.035, M["pole"], seg=7)
    for (px_, py_) in PLAN["path"]:
        K.rock("path_stone", (px_, py_, 0.0), (0.62, 0.5, 0.1), M["basalt"], seed=rng.randint(0, 9999), rough=0.12)
    jars = PLAN["items"][0]
    for (cx, cy), r in zip(jars["at"], jars["r"]):
        hgt = r * 2.6
        K.lathe("jar", cx, cy, 0.0, [(0, 0), (r * 0.62, 0), (r, hgt * 0.45), (r * 0.9, hgt * 0.8), (r * 0.55, hgt * 0.95), (r * 0.5, hgt), (0, hgt)], M["onggi"], seg=24)
        K.lathe("jar_lid", cx, cy, hgt - 0.01, [(0, 0), (r * 0.6, 0), (r * 0.55, 0.06), (r * 0.15, 0.1), (0, 0.1)], M["onggi"], seg=24)
    # the tangerine tree: trunk, limbs, a dark glossy crown, fruit
    tr = PLAN["tree"]
    cx, cy = tr["at"]
    H = tr["height"]
    K.tube("tree_trunk", [(cx, cy, 0.0), (cx + 0.05, cy - 0.02, 0.6), (cx + 0.02, cy + 0.03, 1.1)], [0.11, 0.09, 0.08], M["bark"], seg=9)
    limbs = []
    for k in range(5):
        a = k / 5 * math.tau + 0.4
        tip = (cx + math.cos(a) * tr["crown"] * 0.55, cy + math.sin(a) * tr["crown"] * 0.55, H * rng.uniform(0.62, 0.8))
        mid = (cx + math.cos(a) * 0.4, cy + math.sin(a) * 0.4, 1.5)
        K.tube("tree_limb", [(cx + 0.02, cy + 0.03, 1.05), mid, tip], [0.07, 0.05, 0.03], M["bark"], seg=7)
        limbs.append(tip)
    blobs = []
    for k in range(9):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0.2, tr["crown"] * 0.55)
        c = (cx + math.cos(a) * r, cy + math.sin(a) * r, H * rng.uniform(0.6, 0.82))
        rad = rng.uniform(0.7, 1.0)
        K.blob("tree_crown", c, rad, M["leaf"], seed=k + 3, rough=0.3, squash=0.78)
        blobs.append((c, rad))
    for k in range(44):
        c, rad = blobs[k % len(blobs)]
        a = rng.uniform(0, math.tau)
        el = rng.uniform(-0.6, 0.5)
        pos = (c[0] + math.cos(a) * math.cos(el) * rad * 0.98, c[1] + math.sin(a) * math.cos(el) * rad * 0.98, c[2] + math.sin(el) * rad * 0.78 * 0.98)
        K.sphere("tangerine", pos, 0.05, M["fruit"], sub=1, scale=(1, 1, 0.88))
K.point("focus", (cx, cy, 1.6))
K.point("yard", ((x0 + x1) / 2, 8.0, 1.0))
K.point("hall", AN.W(5.0, 2.0, 1.1))

# ---------------------------------------------------------------- the site: appears with the wave (never counted, never flown)
with K.stage("site"):
    K.box("yard_ground", x0 + 0.3, x1 - 0.3, y0 + 0.3, y1 - 0.3, -0.05, 0.004, M["yard"], 0.0)

    def land(x, y):
        # flat lot, fields rising gently to the north-west, falling to the sea in the south-east, an oreum to the north
        dx, dy = x - 10.0, y - 8.0
        r_lot = max(0.0, max(abs(dx) - 14, abs(dy) - 12))
        z = 0.0
        z += 0.004 * r_lot ** 1.5 * (0.6 + 0.4 * math.sin(x * 0.02 + y * 0.013))
        z += 1.6 * math.sin(x * 0.031) * math.cos(y * 0.027) * min(1.0, r_lot / 30)
        d_o = math.dist((x, y), (-120.0, 300.0))
        z += 58.0 * max(0.0, 1 - (d_o / 130.0) ** 2) ** 1.4
        z -= max(0.0, (-(y) - 90.0) * 0.06)
        return z
    K.grid_mesh("land", -420, 440, -420, 560, 120, 120, land, M["grass"])
    K.box("sea", -2000, 2000, -2600, -130, -3.2, -3.0, M["sea"], 0.0)
    # field walls and an orchard next door, black stone lines over the green
    for row in range(5):
        yy = 33 + row * 3.2
        for k in range(9):
            xx = -16 + k * 3.4
            o_ = K.blob("orchard_tree", (xx, yy, land(xx, yy) + 1.1), 1.15, M["orchard"], seed=row * 20 + k, rough=0.25, squash=0.8)
            o_["base"] = (xx, yy, land(xx, yy))
    # 삼나무 windbreaks: rows of tall narrow cedars round the orchard (Jeju's wind)
    for (xa, ya, xb, yb) in ((-20, 30, 14, 30), (-20, 47.5, 14, 47.5), (-21, 30, -21, 47.5), (-30, -14, -30, 18)):
        n = int(math.dist((xa, ya), (xb, yb)) / 2.4)
        for k in range(n + 1):
            xx, yy = xa + (xb - xa) * k / n, ya + (yb - ya) * k / n
            hgt = rng.uniform(8.5, 11.5)
            zg = land(xx, yy)
            o_ = K.blob("cedar_tree", (xx, yy, zg + hgt * 0.5), 1.5, M["pine"], seed=k * 7 + int(xa), rough=0.22, squash=hgt / 3.0)
            o_["base"] = (xx, yy, zg)

# ---------------------------------------------------------------- shots (the stills; the film reuses them as keys)
K.shot("hero", loc=(31.0, -16.0, 15.5), target=(9.0, 8.2, 1.4), lens=32, ev=LOOK["ev"])
K.shot("yard", loc=(17.3, 7.4, 1.55), target=(6.0, 11.0, 2.0), lens=26, ev=LOOK["ev"])
K.shot("hall", loc=AN.W(5.6, 3.7, AN.p + 1.05), target=AN.W(3.6, -4.0, 1.2), lens=22, ev=LOOK["ev"] + 0.7)
K.shot("top", loc=(10.0, 8.0, 70.0), target=(10.0, 8.01, 0.0), lens=35, ev=LOOK["ev"])

K.finish(OPTS, SHOTS_ARG, name="jeju-stone-house")
