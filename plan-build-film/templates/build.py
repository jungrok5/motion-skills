"""__TITLE__: the building, as code. Every part its own object under a stage (the film flies them in by stage and
counts them). The numbers come from plan.json. This file was written by scripts/new-project.py as a working skeleton
(a timber pavilion on a stone plinth, a gable roof of boards, a tree in front): replace it with what the brief
describes, part by part, the way a carpenter would build it.

    blender -b --factory-startup -P __PROJECT__/build.py -- hero inside --res 960x540 --samples 32
"""
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ.get("PBF_KIT") or os.path.join(HERE, "__KIT_REL__"))
import pbf as K  # noqa: E402

OPTS, SHOTS_ARG = K.args(("hero", "inside"))
scene = K.setup(OPTS, samples=32)
PLAN = json.load(open(os.path.join(HERE, "plan.json"), encoding="utf-8"))
rng = random.Random(3)
LOOK = K.sky(OPTS.get("look", PLAN.get("look", "golden")))

M = dict(
    stone=K.stone("stone", (0.48, 0.46, 0.43), pores=0.5),
    timber=K.wood("timber", (0.55, 0.38, 0.22), grain=10),
    timber_v=K.wood("timber_v", (0.52, 0.36, 0.21), grain=10, axis="Z"),
    board=K.wood("board", (0.64, 0.47, 0.30), grain=14, axis="Y"),
    roof=K.wood("roof_board", (0.30, 0.24, 0.19), grain=8, rough=0.7, axis="Y"),
    glass=K.glass(),
    cushion=K.fabric("cushion", (0.70, 0.40, 0.28)),
    leaf=K.leaf("leaf", (0.18, 0.30, 0.10)),
    bark=K.wood("bark", (0.30, 0.24, 0.18), grain=4, rough=0.9, axis="Z"),
    lamp=K.glow("lamp", (1.0, 0.75, 0.45), 4.0),
    yard=K.stone("yard", (0.55, 0.50, 0.42), pores=0.3, rough=0.95),
    grass=K.ground("grass", (0.33, 0.37, 0.20)),
)
b = PLAN["buildings"][0]
x0, x1, y0, y1 = b["x0"], b["x1"], b["y0"], b["y1"]
p, wt, ridge = b["plinth"], b["wall_top"], b["ridge"]
xs = [x0 + sum(b["bays"][:i]) for i in range(len(b["bays"]) + 1)]

with K.stage("foundation"):
    K.box("plinth", x0 - 0.3, x1 + 0.3, y0 - 0.3, y1 + 0.3, 0.0, p, M["stone"], 0.02)
    for x in xs:
        for y in (y0, y1):
            K.rock("post_stone", (x, y, p - 0.04), (0.4, 0.4, 0.12), M["stone"], seed=rng.randint(0, 999), rough=0.1)
with K.stage("frame"):
    for x in xs:
        for y in (y0, y1):
            K.box("post", x - 0.09, x + 0.09, y - 0.09, y + 0.09, p + 0.08, wt, M["timber"])
        K.box("tie_beam", x - 0.08, x + 0.08, y0 - 0.1, y1 + 0.1, wt, wt + 0.2, M["timber"])
        K.beam("king_post", (x, (y0 + y1) / 2, wt + 0.2), (x, (y0 + y1) / 2, ridge - 0.1), 0.12, 0.12, M["timber"])
    for y in (y0, y1):
        K.box("plate", x0 - 0.1, x1 + 0.1, y - 0.08, y + 0.08, wt + 0.2, wt + 0.34, M["timber"])
    K.box("ridge", x0 - 0.5, x1 + 0.5, (y0 + y1) / 2 - 0.08, (y0 + y1) / 2 + 0.08, ridge - 0.1, ridge + 0.08, M["timber"])
with K.stage("floor"):
    n = int((x1 - x0) / 0.2)
    for i in range(n):
        a = x0 + 0.1 + (x1 - x0 - 0.2) * i / n
        K.box("floor_board", a + 0.003, a + (x1 - x0 - 0.2) / n - 0.003, y0 + 0.1, y1 - 0.1, p + 0.08, p + 0.11, M["board"], 0.003)
with K.stage("walls"):  # vertical boards on three sides; the front (y0) stays open
    for (xa, xb, ya, yb) in ((x0, x1, y1 - 0.03, y1 + 0.03), (x0 - 0.03, x0 + 0.03, y0 + 0.2, y1), (x1 - 0.03, x1 + 0.03, y0 + 0.2, y1)):
        along_x = (xb - xa) > (yb - ya)
        L = (xb - xa) if along_x else (yb - ya)
        n = int(L / 0.18)
        for i in range(n):
            a = (xa if along_x else ya) + L * i / n
            if along_x:
                K.box("wall_board", a + 0.003, a + L / n - 0.003, ya, yb, p + 0.11, wt, M["timber_v"], 0.002)
            else:
                K.box("wall_board", xa, xb, a + 0.003, a + L / n - 0.003, p + 0.11, wt, M["timber_v"], 0.002)
with K.stage("roof"):
    yc = (y0 + y1) / 2
    o = 0.6
    for x in [x0 - 0.4 + (x1 - x0 + 0.8) * i / 12 for i in range(13)]:
        for ye in (y0 - o, y1 + o):
            K.beam("rafter", (x, yc, ridge + 0.02), (x, ye, wt + 0.34 - o * (ridge - wt) / (yc - y0) * 0.5), 0.07, 0.1, M["timber"])
    for side in (-1, 1):
        ye = (y0 - o) if side < 0 else (y1 + o)
        ze = wt + 0.34 - o * (ridge - wt) / (yc - y0) * 0.5
        n = 9
        slope = (ridge + 0.02 - ze) / abs(ye - yc)  # the rafters' pitch: each board lies on it
        for i in range(n):
            a = (i + 0.5) / n
            yy, zz = yc + (ye - yc) * a, ridge + 0.02 + (ze - ridge - 0.02) * a + 0.08
            K.beam("roof_board", (x0 - 0.5, yy, zz), (x1 + 0.5, yy, zz), abs(ye - yc) / n * 1.06, 0.04, M["roof"], up=(0, side * slope, 1))
with K.stage("interior"):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 + 0.4
    K.box("bench", cx - 1.0, cx + 1.0, cy - 0.25, cy + 0.25, p + 0.45, p + 0.5, M["board"])
    for dx in (-0.9, 0.9):
        K.box("bench_leg", cx + dx - 0.04, cx + dx + 0.04, cy - 0.2, cy + 0.2, p + 0.11, p + 0.45, M["timber"])
    K.box("cushion", cx - 0.5, cx + 0.5, cy - 0.22, cy + 0.22, p + 0.5, p + 0.58, M["cushion"], 0.03)
    K.box("lantern", cx + 1.4, cx + 1.6, y1 - 0.4, y1 - 0.2, p + 0.11, p + 0.6, M["lamp"])
    K.light("lantern_light", "POINT", (cx + 1.5, y1 - 0.3, p + 0.45), 15.0, (1.0, 0.75, 0.45), 0.06)
tr = PLAN["tree"]
with K.stage("garden"):
    tx, ty = tr["at"]
    K.tube("tree_trunk", [(tx, ty, 0), (tx + 0.1, ty, 1.4), (tx, ty + 0.1, 2.4)], [0.12, 0.09, 0.06], M["bark"], seg=8)
    for k in range(6):
        K.blob("tree_crown", (tx + rng.uniform(-0.8, 0.8), ty + rng.uniform(-0.8, 0.8), tr["height"] * rng.uniform(0.65, 0.85)), rng.uniform(0.7, 1.0), M["leaf"], seed=k)
K.point("focus", (tx, ty, 1.5))
with K.stage("site"):
    lot = PLAN["lot"]
    K.box("yard_ground", lot["x0"], lot["x1"], lot["y0"], lot["y1"], -0.05, 0.004, M["yard"], 0.0)
    K.grid_mesh("land", -300, 300, -300, 300, 60, 60, lambda x, y: 0.0003 * max(0, abs(x) + abs(y) - 40) ** 1.6, M["grass"])

cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
K.shot("hero", loc=(cx + 14, cy - 16, 9), target=(cx, cy, 1.4), lens=35, ev=LOOK["ev"])
K.shot("inside", loc=(cx + 1.0, y1 - 0.6, p + 1.2), target=(cx - 1.0, y0 - 5.0, 1.2), lens=24, ev=LOOK["ev"] + 0.5)
K.finish(OPTS, SHOTS_ARG, name="__NAME__")
