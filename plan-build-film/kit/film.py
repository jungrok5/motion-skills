"""The film of a building building itself on its own drawing. Runs a project's build.py in film mode, lays the sheet
on a desk at the real scale, wraps every material (white clay -> the real thing as a wave passes), flies the parts in
by stage with each landing on the beat grid, grows the site when the wave reaches it, switches the lights on, flies the
camera (straight down on the sheet through a long lens -> a spiral down -> an orbit -> a dive inside -> a turn), writes
timeline.json for the sound and the counter, measures the camera's clearance, and renders frames (resumable).

    blender -b --factory-startup -P <skill>/kit/film.py -- --project <project> --res 960x540 --samples 32
        [--plan]                 timeline + clearance only, no frames
        [--stills 0,6.5,13.8]    single moments to out/<name>/film_stills/
        [--step 2] [--from 3 --to 9] [--noblur]

Reads <project>/film.json (stages, beats, wave, camera keys) and <project>/sheet.json (pixels <-> metres).
Writes $PBF_OUT/<name>/ (default ./pbf-out/<name>): frames/f_0001.png ..., timeline.json, audit.json.
"""
import json
import math
import os
import random
import sys
import time

import bpy
from mathutils import Matrix, Vector

KIT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, KIT)
os.environ["PBF_KIT"] = KIT
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if "--project" not in argv:
    sys.exit("film.py: --project <folder with build.py, film.json, sheet.json> is required")
PROJ = os.path.abspath(argv[argv.index("--project") + 1])
NAME = os.path.basename(PROJ.rstrip("/"))
os.environ["PBF_NAME"] = NAME
if "--film" not in sys.argv:
    sys.argv.append("--film")
t_start = time.time()
BUILD = os.path.join(PROJ, "build.py")
G = {"__file__": BUILD, "__name__": "pbf_build"}
exec(compile(open(BUILD, encoding="utf-8").read(), BUILD, "exec"), G)
import pbf as K  # noqa: E402  (the same module build.py used)

OPTS = K.OPTS
scene = bpy.context.scene
FJ = json.load(open(os.path.join(PROJ, "film.json"), encoding="utf-8"))
if not os.path.exists(os.path.join(PROJ, "sheet.json")):
    sys.exit("film.py: no sheet.json - run scripts/draw-sheet.py <project> (or scripts/calibrate.py for a sketch) first")
SJ = json.load(open(os.path.join(PROJ, "sheet.json"), encoding="utf-8"))
if not os.path.exists(os.path.join(PROJ, SJ.get("image", "sheet.png"))):
    sys.exit(f"film.py: {SJ.get('image', 'sheet.png')} is missing - run scripts/draw-sheet.py {PROJ}")
FPS = int(FJ.get("fps", 24))
T_END = float(FJ["duration"])
NF = int(round(T_END * FPS))
BEAT = 60.0 / float(FJ["bpm"])
DOWN = float(FJ.get("downbeat", 0.0))
GRID = BEAT / int(FJ.get("grid", 4))
OUT = K.outdir(NAME)
FRAMES = str(OPTS.get("out", os.path.join(OUT, "frames")))
os.makedirs(FRAMES, exist_ok=True)
rng = random.Random(24)
print(f"film: {NAME} {T_END}s at {FPS} fps, {FJ['bpm']} bpm (beat {BEAT:.4f}s, grid {GRID:.4f}s)")


def F(t):
    return 1 + int(round(t * FPS))


def T(f):
    return (f - 1) / FPS


def B(beat):
    return DOWN + beat * BEAT


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def smoother(x):
    x = clamp(x)
    return x * x * x * (x * (6 * x - 15) + 10)


def snap(t):
    return DOWN + round((t - DOWN) / GRID) * GRID


def back(u, s=1.2):
    """ease-out with a small overshoot: a part arrives, passes its seat by a hair and settles"""
    return 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2


# ---------------------------------------------------------------- the sheet on the desk, at the real scale
PXX, PXY = SJ.get("px_per_m_xy", [SJ["px_per_m"], SJ["px_per_m"]])  # calibrate.py --anisotropic keeps one per axis
OX, OY = SJ["origin_px"]
IW, IH = SJ["size_px"]
SX0, SX1 = (0 - OX) / PXX, (IW - OX) / PXX
SY1, SY0 = (OY - 0) / PXY, (OY - IH) / PXY
SHEET_C = Vector(((SX0 + SX1) / 2, (SY0 + SY1) / 2, 0.0))
Z_PAPER = 0.006


def paper_mat():
    m, N, L, b = K.new_mat("sheet")
    tex = N.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(PROJ, SJ.get("image", "sheet.png")), check_existing=True)
    uv = N.new("ShaderNodeTexCoord")
    L.new(uv.outputs["UV"], tex.inputs["Vector"])
    L.new(tex.outputs["Color"], b.inputs["Base Color"])
    K.inp(b, "Roughness", 0.92)
    K.inp(b, ["Specular IOR Level", "Specular"], 0.15)
    return m


me = bpy.data.meshes.new("sheet")
me.from_pydata([(SX0, SY0, Z_PAPER), (SX1, SY0, Z_PAPER), (SX1, SY1, Z_PAPER), (SX0, SY1, Z_PAPER)], [], [(0, 1, 2, 3)])
uvl = me.uv_layers.new(name="UVMap")
for li, (u, v) in zip(range(4), ((0, 0), (1, 0), (1, 1), (0, 1))):
    uvl.data[li].uv = (u, v)
me.materials.append(paper_mat())
SHEET = bpy.data.objects.new("sheet", me)
scene.collection.objects.link(SHEET)
DESK_M = K.wood("desk", (0.42, 0.27, 0.16), grain=2.2, rough=0.38, axis="X")
DESK = K.box("desk", SHEET_C.x - 1500, SHEET_C.x + 1500, SHEET_C.y - 1500, SHEET_C.y + 1500, -0.03, Z_PAPER - 0.003, DESK_M, 0.0, part=False)
PAPER_OBJS = [SHEET, DESK]
props = FJ.get("props", {})
if "cup" in props:  # a cup of coffee on the desk: it says "this is a model on a table"
    cx, cy, r = props["cup"]
    cup_m = K.pbr("cup", (0.93, 0.92, 0.9), rough=0.18, spec=0.6)
    PAPER_OBJS.append(K.lathe("cup", cx, cy, 0.0, [(0, 0), (r * 0.78, 0), (r, r * 0.25), (r * 1.02, r * 1.55), (r * 0.95, r * 1.58), (r * 0.9, r * 0.3), (0, r * 0.3)], cup_m, seg=40, part=False))
    PAPER_OBJS.append(K.lathe("saucer", cx, cy, 0.0, [(0, 0), (r * 1.7, 0), (r * 1.75, r * 0.12), (0, r * 0.08)], cup_m, seg=40, part=False))
    coffee = K.pbr("coffee", (0.12, 0.06, 0.03), rough=0.05, spec=0.7)
    PAPER_OBJS.append(K.cyl("coffee", cx, cy, r * 0.93, r * 1.3, r * 1.36, coffee, seg=40, part=False))
if "pencil" in props:
    (ax, ay), (bx, by) = props["pencil"]
    lead = K.pbr("pencil_wood", (0.85, 0.66, 0.42), rough=0.6)
    paint = K.pbr("pencil_paint", (0.95, 0.72, 0.12), rough=0.35)
    d = Vector((bx - ax, by - ay, 0))
    PAPER_OBJS.append(K.beam("pencil", (ax, ay, 0.45), (bx - d.normalized().x * 1.6, by - d.normalized().y * 1.6, 0.45), 0.85, 0.8, paint, bevel=0.2, part=False))
    tip = Vector((bx, by, 0.25))
    PAPER_OBJS.append(K.tube("pencil_tip", [tip - d.normalized() * 1.6 + Vector((0, 0, 0.2)), tip], [0.42, 0.05], lead, seg=10, part=False))
print(f"film: sheet {SX1 - SX0:.1f} x {SY1 - SY0:.1f} m, centre {SHEET_C.x:.1f}, {SHEET_C.y:.1f}")

# ---------------------------------------------------------------- the wave: one node group every material reads
T_WAVE = B(float(FJ["wave"]["beat"]))
ORIGIN = Vector(K.POINTS[FJ["wave"].get("origin", "focus")])
WAVE_KEYS = [(T_WAVE + a, r) for a, r in FJ["wave"]["keys"]]
WG = bpy.data.node_groups.new("wave", "ShaderNodeTree")
WG.interface.new_socket("alive", in_out="OUTPUT", socket_type="NodeSocketFloat")
WG.interface.new_socket("edge", in_out="OUTPUT", socket_type="NodeSocketFloat")
gn, gl = WG.nodes, WG.links
g_out = gn.new("NodeGroupOutput")
geo = gn.new("ShaderNodeNewGeometry")
dist = gn.new("ShaderNodeVectorMath")
dist.operation = "DISTANCE"
gl.new(geo.outputs["Position"], dist.inputs[0])
dist.inputs[1].default_value = ORIGIN
R = gn.new("ShaderNodeValue")
R.name = "R"
BAND = gn.new("ShaderNodeValue")
BAND.name = "BAND"
BAND.outputs[0].default_value = 1.6
d_r = K.math_node(gn, gl, "SUBTRACT", R.outputs[0], dist.outputs["Value"])
alive = K.math_node(gn, gl, "DIVIDE", d_r, BAND.outputs[0])
alive_c = gn.new("ShaderNodeMapRange")
alive_c.interpolation_type = "SMOOTHERSTEP"
gl.new(alive, alive_c.inputs["Value"])
gl.new(alive_c.outputs[0], g_out.inputs["alive"])
edge = gn.new("ShaderNodeMapRange")
edge.inputs["From Min"].default_value = 0.0
edge.inputs["From Max"].default_value = 0.35
edge.inputs["To Min"].default_value = 1.0
edge.inputs["To Max"].default_value = 0.0
gl.new(K.math_node(gn, gl, "ABSOLUTE", alive), edge.inputs["Value"])
gl.new(edge.outputs[0], g_out.inputs["edge"])


def R_at(t):
    """the front's distance from the origin: eased out of it, then spreading geometrically to the horizon"""
    ks = WAVE_KEYS
    if t <= ks[0][0]:
        return ks[0][1]
    if t >= ks[-1][0]:
        return ks[-1][1]
    i = max(j for j in range(len(ks) - 1) if ks[j][0] <= t)
    u = (t - ks[i][0]) / (ks[i + 1][0] - ks[i][0])
    a, b = ks[i][1], ks[i + 1][1]
    if i == 0 or a <= 0:
        return a + (b - a) * smoother(u)
    return a * (b / a) ** u


def reach(d):
    f = F(T_WAVE)
    while R_at(T(f)) < d and f < NF:
        f += 1
    return T(f)


for f in range(1, NF + 1):
    if f == 1 or F(T_WAVE - 0.2) <= f <= F(WAVE_KEYS[-1][0] + 0.2) or f == NF:
        R.outputs[0].default_value = R_at(T(f))
        R.outputs[0].keyframe_insert("default_value", frame=f)
BAND.outputs[0].keyframe_insert("default_value", frame=F(T_WAVE + 1.6))
BAND.outputs[0].default_value = 20.0
BAND.outputs[0].keyframe_insert("default_value", frame=F(T_WAVE + 3.4))

SITE_STAGES = set(FJ.get("site_stages", ["site"]))
STAGE_IDS = [s["id"] for s in FJ["stages"]]
COLORS = {s["id"]: tuple(s["color"]) for s in FJ["stages"]}
part_mats, site_mats = set(), set()
for o, st in K.PARTS:
    if o.name not in bpy.data.objects or not getattr(o.data, "materials", None):
        continue
    for m in o.data.materials:
        if m:
            (site_mats if st in SITE_STAGES else part_mats).add(m.name)
site_only = site_mats - part_mats
paper_names = {m.name for o in PAPER_OBJS for m in o.data.materials if m}
CLAY = (0.80, 0.79, 0.76)


def output_src(m):
    out = next((n for n in m.node_tree.nodes if n.type == "OUTPUT_MATERIAL"), None)
    if not out or not out.inputs["Surface"].links:
        return None, None
    return out, out.inputs["Surface"].links[0].from_socket


def wrap(m):
    """paper and desk: visible until the wave, then gone. Site: nothing until the wave. Parts: white clay that
    flashes its stage colour as it lands, the real material once the wave has passed, a warm line on the front."""
    if not m or not m.use_nodes or m.get("wrapped"):
        return
    out, src = output_src(m)
    if src is None:
        return
    N, L = m.node_tree.nodes, m.node_tree.links
    g = N.new("ShaderNodeGroup")
    g.node_tree = WG
    mix = N.new("ShaderNodeMixShader")
    L.new(g.outputs["alive"], mix.inputs[0])
    tr = N.new("ShaderNodeBsdfTransparent")
    if m.name in paper_names:
        L.new(src, mix.inputs[1])
        L.new(tr.outputs[0], mix.inputs[2])
        L.new(mix.outputs[0], out.inputs["Surface"])
    elif m.name in site_only:
        L.new(tr.outputs[0], mix.inputs[1])
        L.new(src, mix.inputs[2])
        L.new(mix.outputs[0], out.inputs["Surface"])
    else:
        clay = N.new("ShaderNodeBsdfPrincipled")
        K.inp(clay, "Roughness", 0.6)
        fl = N.new("ShaderNodeAttribute")
        fl.attribute_type = "OBJECT"
        fl.attribute_name = "flash"
        tn = N.new("ShaderNodeAttribute")
        tn.attribute_type = "OBJECT"
        tn.attribute_name = "tint"
        L.new(K.mix_rgb(N, L, fl.outputs["Fac"], CLAY, tn.outputs["Vector"]), clay.inputs["Base Color"])
        L.new(tn.outputs["Vector"], clay.inputs["Emission Color"])
        L.new(K.math_node(N, L, "MULTIPLY", fl.outputs["Fac"], 1.8), clay.inputs["Emission Strength"])
        L.new(clay.outputs[0], mix.inputs[1])
        L.new(src, mix.inputs[2])
        ed = N.new("ShaderNodeEmission")
        ed.inputs["Color"].default_value = (1.0, 0.64, 0.32, 1)
        L.new(K.math_node(N, L, "MULTIPLY", g.outputs["edge"], float(OPTS.get("edge", 1.4))), ed.inputs["Strength"])
        add = N.new("ShaderNodeAddShader")
        L.new(mix.outputs[0], add.inputs[0])
        L.new(ed.outputs[0], add.inputs[1])
        L.new(add.outputs[0], out.inputs["Surface"])
    m["wrapped"] = True


for m in list(bpy.data.materials):
    wrap(m)

# ---------------------------------------------------------------- world: a bright studio while it is built, the sky once it is alive
WN, WL = scene.world.node_tree.nodes, scene.world.node_tree.links
bg = WN["Background"]
sky_src = bg.inputs["Color"].links[0].from_socket
wmix = WN.new("ShaderNodeMix")
wmix.data_type = "RGBA"
WL.new(sky_src, K.sock(wmix, "B_Color"))
K.sock(wmix, "A_Color").default_value = (0.80, 0.81, 0.84, 1)
WL.new(K.sock(wmix, "Result_Color", out=True), bg.inputs["Color"])
sky_strength = bg.inputs["Strength"].default_value
ld = bpy.data.lights.new("studio_sun", "SUN")
ld.energy, ld.color, ld.angle = 3.0, (1.0, 0.97, 0.92), math.radians(6)
STUDIO = bpy.data.objects.new("studio_sun", ld)
STUDIO.rotation_euler = (math.radians(40), 0, math.radians(-30))
scene.collection.objects.link(STUDIO)
LOOK_E = K.SUN.data.energy if K.SUN else 0.0
for f in sorted({1, F(T_WAVE), F(T_WAVE + 0.8), F(T_WAVE + 1.8), F(T_WAVE + 2.6), NF}):
    t = T(f)
    k = smoother((t - (T_WAVE + 0.1)) / 2.2)
    wmix.inputs[0].default_value = k
    wmix.inputs[0].keyframe_insert("default_value", frame=f)
    bg.inputs["Strength"].default_value = 1.0 + (sky_strength - 1.0) * k
    bg.inputs["Strength"].keyframe_insert("default_value", frame=f)
    STUDIO.data.energy = 3.0 * (1 - smoother((t - T_WAVE) / 1.6))
    STUDIO.data.keyframe_insert("energy", frame=f)
    if K.SUN:
        K.SUN.data.energy = LOOK_E * smoother((t - T_WAVE) / 1.8)
        K.SUN.data.keyframe_insert("energy", frame=f)

# ---------------------------------------------------------------- the build: every part lands on the beat grid
PARTS = [(o, st) for o, st in K.PARTS if o.name in bpy.data.objects]
CEN = Vector((sum(o.location.x for o, s in PARTS if s not in SITE_STAGES) / max(1, sum(1 for _, s in PARTS if s not in SITE_STAGES)),
              sum(o.location.y for o, s in PARTS if s not in SITE_STAGES) / max(1, sum(1 for _, s in PARTS if s not in SITE_STAGES)), 0))
BBOX = {}
bpy.context.view_layer.update()
for o, st in PARTS:  # each part's box where it rests: the checks use it to see what holds what up
    ws = [o.matrix_world @ Vector(c) for c in o.bound_box]
    BBOX[o.name] = ([round(min(v[i] for v in ws), 3) for i in range(3)], [round(max(v[i] for v in ws), 3) for i in range(3)])
for o, st in PARTS:
    o["tint"] = COLORS.get(st, (0.85, 0.85, 0.85))
    o["flash"] = 0.0
groups = {}
for o, st in PARTS:
    groups.setdefault(st, []).append(o)
missing = [st for st in groups if st not in STAGE_IDS and st not in SITE_STAGES]
if missing:
    print(f"film: WARNING stages in build.py but not in film.json (they will not fly): {missing}")


def ang(o):
    return math.atan2(o.location.y - CEN.y, o.location.x - CEN.x)


def order_key(kind):
    if kind == "height":  # bottom course first: nothing lands on air
        return lambda o: (round((o.location.z - o.dimensions.z / 2) / 0.02), ang(o) + rng.uniform(-0.4, 0.4))
    if kind == "angle":
        return lambda o: ang(o) + rng.uniform(-0.25, 0.25)
    if kind == "radial":
        return lambda o: (o.location - CEN).length + rng.uniform(-1.0, 1.0)
    if kind == "panel":  # a leaf at a time, its pieces in quick order
        return lambda o: (round(o.location.x * 1.5) / 1.5, round(o.location.y * 1.5) / 1.5, o.location.z)
    if kind == "xy":
        return lambda o: o.location.x + o.location.y + rng.uniform(-2.0, 2.0)
    return order_key("height")


def offset_for(fly, o):
    if fly == "rise":
        return Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), -2.6)), 0.12
    if fly == "slide":
        r = Vector((o.location.x - CEN.x, o.location.y - CEN.y, 0))
        r = r.normalized() if r.length > 0.1 else Vector((1, 0, 0))
        return r * rng.uniform(2.0, 4.0) + Vector((0, 0, rng.uniform(1.0, 2.5))), 0.05
    h = rng.uniform(6, 11)
    side = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)) * rng.uniform(0.5, 2.5)
    return Vector((0, 0, h)) + side, 0.1


def key_flash(o, t_land):
    o["flash"] = 0.0
    o.keyframe_insert('["flash"]', frame=1)
    o.keyframe_insert('["flash"]', frame=max(2, F(t_land - 0.3)))
    o["flash"] = 1.0
    o.keyframe_insert('["flash"]', frame=max(3, F(t_land - 0.12)))
    o.keyframe_insert('["flash"]', frame=F(t_land + 0.04))
    o["flash"] = 0.0
    o.keyframe_insert('["flash"]', frame=F(t_land + 0.7))


def pop(o, t0, dur, base=None):
    rest_l, rest_s = o.location.copy(), o.scale.copy()
    b = Vector(base) if base is not None else rest_l
    off = rest_l - b
    o.scale = (0, 0, 0)
    o.location = b
    o.keyframe_insert("scale", frame=max(1, F(t0) - 1))
    o.keyframe_insert("location", frame=max(1, F(t0) - 1))
    for f in range(F(t0), F(t0 + dur) + 1):
        k = back(clamp((T(f) - t0) / dur), 0.9)
        o.scale = (rest_s.x * k, rest_s.y * k, rest_s.z * k)
        o.location = b + off * k
        o.keyframe_insert("scale", frame=f)
        o.keyframe_insert("location", frame=f)
    o.location, o.scale = rest_l, rest_s


events = []
t_key = time.time()
for sd in FJ["stages"]:
    st = sd["id"]
    objs = groups.get(st, [])
    if not objs:
        print(f"film: stage '{st}' has no parts")
        continue
    a, b = B(sd["beats"][0]), B(sd["beats"][1])
    pops = tuple(sd.get("pop", ()))
    flyers = [o for o in objs if not o.name.startswith(pops)] if pops else list(objs)
    growers = [o for o in objs if o not in flyers]
    flyers.sort(key=order_key(sd.get("order", "height")))
    n = len(flyers)
    for i, o in enumerate(flyers):
        land = snap(a + (b - a) * i / max(1, n - 1))
        small = max(o.dimensions) < 0.4
        dur = (0.42 if small else 0.62) + rng.random() * 0.22
        ts = land - dur
        off, tumble = offset_for(sd.get("fly", "drop"), o)
        rest_l, rest_r, rest_s = o.location.copy(), o.rotation_euler.copy(), o.scale.copy()
        axis = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized()
        spin = axis * tumble * rng.uniform(1.0, 6.0)
        f0, f1 = F(ts), F(land)
        o.scale = (0, 0, 0)
        o.location = rest_l + off
        o.keyframe_insert("scale", frame=max(1, f0 - 1))
        o.keyframe_insert("location", frame=max(1, f0 - 1))
        for f in range(f0, f1 + 1):
            u = clamp((T(f) - ts) / dur)
            w = 1 - back(u, 0.9)
            o.location = rest_l + off * w
            o.rotation_euler = (rest_r.x + spin.x * w, rest_r.y + spin.y * w, rest_r.z + spin.z * w)
            k = 0.4 + 0.6 * clamp(u * 3)
            o.scale = (rest_s.x * k, rest_s.y * k, rest_s.z * k)
            o.keyframe_insert("location", frame=f)
            o.keyframe_insert("rotation_euler", frame=f)
            o.keyframe_insert("scale", frame=f)
        o.location, o.rotation_euler, o.scale = rest_l, rest_r, rest_s
        key_flash(o, land)
        events.append(dict(t=round(land, 4), launch=round(ts, 4), stage=st, name=o.name.split(".")[0], size=round(max(o.dimensions), 3),
                           x=round(o.location.x, 2), y=round(o.location.y, 2), z=round(o.location.z, 2), lo=BBOX[o.name][0], hi=BBOX[o.name][1]))
    for j, o in enumerate(sorted(growers, key=lambda o: o.location.z)):
        t_land = snap(a + (b - a) * (0.25 + 0.75 * (j + 0.5) / max(1, len(growers))))
        dur = 0.8 if max(o.dimensions) > 0.5 else 0.45
        base = o.get("base") or (o.location.x, o.location.y, o.location.z - o.dimensions.z / 2)
        pop(o, t_land - dur * 0.7, dur, base)
        key_flash(o, t_land)
        events.append(dict(t=round(t_land, 4), launch=round(t_land - dur * 0.7, 4), stage=st, name=o.name.split(".")[0], size=round(max(o.dimensions), 3),
                           x=round(o.location.x, 2), y=round(o.location.y, 2), z=round(o.location.z, 2), lo=BBOX[o.name][0], hi=BBOX[o.name][1], grow=True))
print(f"film: keyed {len(events)} landings in {time.time() - t_key:.1f} s")

n_site = 0
for st in SITE_STAGES:
    for o in groups.get(st, []):
        if "base" in o:
            b = Vector(o["base"])
            pop(o, reach((b - ORIGIN).length) + rng.uniform(0.0, 0.25), 0.9, b)
            n_site += 1
print(f"film: {n_site} site pieces timed to the wave")

# ---------------------------------------------------------------- lights: off while it is built, on just behind the wave
T_LIGHTS = B(float(FJ.get("lights_beat", FJ["wave"]["beat"] + 1)))
light_on = []
for o, st in K.LIGHTS:
    t_on = max(T_LIGHTS, reach((o.location - ORIGIN).length) + 0.15) + rng.uniform(0.0, 0.25)
    e = o.data.energy
    o.data.energy = 0.0
    o.data.keyframe_insert("energy", frame=1)
    o.data.keyframe_insert("energy", frame=F(t_on) - 1)
    o.data.energy = e
    o.data.keyframe_insert("energy", frame=F(t_on + 0.4))
    light_on.append(round(t_on, 3))
for sk in K.EMISSIVE:
    e = sk.default_value
    sk.default_value = 0.0
    sk.keyframe_insert("default_value", frame=1)
    sk.keyframe_insert("default_value", frame=F(T_LIGHTS))
    sk.default_value = e
    sk.keyframe_insert("default_value", frame=F(T_LIGHTS + 0.6))


# ---------------------------------------------------------------- the camera
def pchip(xs, ys):
    """monotone cubic through the keys: no overshoot between keys (a camera never swings past where it is going)"""
    n = len(xs)
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    dl = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n
    m[0], m[-1] = dl[0], dl[-1]
    for i in range(1, n - 1):
        if dl[i - 1] * dl[i] <= 0:
            m[i] = 0.0
        else:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i])

    def f(x):
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        i = max(j for j in range(n - 1) if xs[j] <= x)
        t = (x - xs[i]) / h[i]
        h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
        return h00 * ys[i] + h10 * h[i] * m[i] + h01 * ys[i + 1] + h11 * h[i] * m[i + 1]
    return f


CAM = FJ["camera"]
keys = []
for k in CAM["keys"]:
    if "shot" in k:
        s = K.SHOTS[k["shot"]]
        k = dict(t=k["t"], loc=s["loc"], target=s["target"], lens=s["lens"])
    keys.append(k)
kt = [k["t"] for k in keys]
locs = [Vector(k["loc"]) for k in keys]
yaws, pitches = [], []
for k, L_ in zip(keys, locs):
    d = Vector(k["target"]) - L_
    yaws.append(math.atan2(d.y, d.x))
    pitches.append(math.atan2(d.z, math.hypot(d.x, d.y)))
for i in range(1, len(yaws)):  # unwrap: turn the short way round
    while yaws[i] - yaws[i - 1] > math.pi:
        yaws[i] -= math.tau
    while yaws[i] - yaws[i - 1] < -math.pi:
        yaws[i] += math.tau
fx, fy, fz = (pchip(kt, [L_[i] for L_ in locs]) for i in range(3))
fyaw, fpitch = pchip(kt, yaws), pchip(kt, pitches)
flens = pchip(kt, [math.log(k["lens"]) for k in keys])
OP = CAM["open"]
T_HOLD, T_DESC = float(OP.get("hold", 0.8)), float(OP.get("end", kt[0]))
LENS0 = float(OP.get("lens", 200.0))
AZ0 = math.radians(float(OP.get("az", -90)))
H0 = max((SX1 - SX0) / 36.0, (SY1 - SY0) / (36.0 * scene.render.resolution_y / scene.render.resolution_x)) * LENS0 * 1.02  # the whole sheet fills the frame
k0 = keys[0]
off0 = Vector(k0["loc"]) - Vector(k0["target"])
D1 = off0.length
EL1 = math.asin(off0.z / D1)
AZ1 = math.atan2(off0.y, off0.x)
while AZ1 - AZ0 > math.pi:
    AZ1 -= math.tau
while AZ1 - AZ0 < -math.pi:
    AZ1 += math.tau


def cam_at(t):
    """(loc, forward, up, lens)"""
    if t < T_DESC:
        u = smoother((t - T_HOLD) / (T_DESC - T_HOLD))
        lens = math.exp(math.log(LENS0) + (math.log(k0["lens"]) - math.log(LENS0)) * u)
        d = math.exp(math.log(H0) + (math.log(D1) - math.log(H0)) * u)
        el = math.pi / 2 + (EL1 - math.pi / 2) * u
        az = AZ0 + (AZ1 - AZ0) * u
        tgt = SHEET_C.lerp(Vector(k0["target"]), u)
        loc = tgt + d * Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
        fwd = (tgt - loc).normalized()
        up = Vector((0, 0, 1)) if el < math.radians(89.5) else -Vector((math.cos(az), math.sin(az), 0))
        return loc, fwd, up, lens
    loc = Vector((fx(t), fy(t), fz(t)))
    yw, pt = fyaw(t), fpitch(t)
    fwd = Vector((math.cos(pt) * math.cos(yw), math.cos(pt) * math.sin(yw), math.sin(pt)))
    return loc, fwd, Vector((0, 0, 1)), math.exp(flens(t))


cd = bpy.data.cameras.new("film_cam")
cd.sensor_width = 36.0
cd.clip_start, cd.clip_end = 0.05, 6000.0
CAMO = bpy.data.objects.new("film_cam", cd)
scene.collection.objects.link(CAMO)
scene.camera = CAMO
CAMO.rotation_mode = "QUATERNION"
cam_path = []
for f in range(1, NF + 1):
    loc, fwd, up, lens = cam_at(T(f))
    right = fwd.cross(up).normalized()
    upv = right.cross(fwd)
    rot = Matrix((right, upv, -fwd)).transposed()
    CAMO.location = loc
    CAMO.rotation_quaternion = rot.to_quaternion()
    cd.lens = lens
    CAMO.keyframe_insert("location", frame=f)
    CAMO.keyframe_insert("rotation_quaternion", frame=f)
    cd.keyframe_insert("lens", frame=f)
    cam_path.append((loc.copy(), fwd.copy(), lens))
evk = CAM.get("ev", [[0, 0]])
fev = pchip([e[0] for e in evk], [e[1] for e in evk]) if len(evk) > 1 else (lambda t: evk[0][1])
for f in range(1, NF + 1, 2):
    scene.view_settings.exposure = fev(T(f))
    scene.view_settings.keyframe_insert("exposure", frame=f)

# ---------------------------------------------------------------- clearance: the camera never sits in or against something
dg = bpy.context.evaluated_depsgraph_get()
clear = []
step = int(OPTS.get("clear_step", 2))
t_c = time.time()
for f in range(F(T_WAVE), NF + 1, step):  # once the house stands
    scene.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    loc, fwd, lens = cam_path[f - 1]
    right = fwd.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(fwd)
    half = math.atan(18.0 / lens)
    dists = []
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -0.56), (0, 0.56), (-1, -0.56), (1, -0.56), (-1, 0.56), (1, 0.56)):
        d = (fwd + right * math.tan(half) * dx + up * math.tan(half) * dy).normalized()
        hit, pos, *_ = scene.ray_cast(dg, loc, d, distance=500.0)
        dists.append((pos - loc).length if hit else 500.0)
    clear.append(dict(t=round(T(f), 3), center=round(dists[0], 3), min=round(min(dists), 3)))
print(f"film: clearance on {len(clear)} frames in {time.time() - t_c:.1f} s, nearest {min(c['min'] for c in clear):.2f} m ahead")

# ---------------------------------------------------------------- the timeline: what the sound, the counter and the checks read
rows = [dict(id=s["id"], label=s["label"], color=s["color"], sound=s.get("sound", "wood")) for s in FJ["stages"]]
TL = dict(name=NAME, duration=T_END, fps=FPS, bpm=FJ["bpm"], downbeat=DOWN, grid=int(FJ.get("grid", 4)),
          T=dict(hold=T_HOLD, descent=T_DESC, wave=T_WAVE, lights=T_LIGHTS, title=float(FJ.get("title_in", T_END - 2.5))),
          wave_keys=WAVE_KEYS, rows=rows, parts=sorted(events, key=lambda e: e["t"]), lights=sorted(set(light_on)),
          site_pops=n_site, clearance=clear, title=FJ.get("title", NAME), subtitle=FJ.get("subtitle", ""),
          credit=FJ.get("credit", ""), hud=FJ.get("hud", {}),
          camera=[dict(t=round(T(i + 1), 3), x=round(p[0].x, 3), y=round(p[0].y, 3), z=round(p[0].z, 3),
                      fx=round(p[1].x, 4), fy=round(p[1].y, 4), fz=round(p[1].z, 4), lens=round(p[2], 2)) for i, p in enumerate(cam_path)])
json.dump(TL, open(os.path.join(OUT, "timeline.json"), "w"), indent=0, ensure_ascii=False)
print(f"film: timeline {os.path.join(OUT, 'timeline.json')}: {len(events)} landings on {len({e['t'] for e in events})} beats-slots")

# ---------------------------------------------------------------- render
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, NF
scene.render.use_motion_blur = not OPTS.get("noblur")
scene.render.motion_blur_shutter = 0.5
scene.render.use_persistent_data = True
print(f"film: set up in {time.time() - t_start:.1f} s", flush=True)
if OPTS.get("blend"):
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "film.blend"))
if OPTS.get("plan"):
    sys.exit(0)
if OPTS.get("stills"):
    od = K.outdir(NAME, "film_stills")
    for tt in str(OPTS["stills"]).split(","):
        scene.frame_set(F(float(tt)))
        scene.render.filepath = os.path.join(od, f"t_{float(tt):05.2f}.png")
        bpy.ops.render.render(write_still=True)
        print(f"film: still {scene.render.filepath}", flush=True)
    sys.exit(0)
f0 = F(float(OPTS["from"])) if "from" in OPTS else 1
f1 = min(NF, F(float(OPTS["to"]))) if "to" in OPTS else NF
stp = int(OPTS.get("step", 1))
for f in range(f0, f1 + 1, stp):
    path = os.path.join(FRAMES, f"f_{f:04d}.png")
    if os.path.exists(path) and os.path.getsize(path) > 0 and not OPTS.get("overwrite"):
        continue
    scene.frame_set(f)
    scene.render.filepath = path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"film: frame {f}/{NF} in {time.time() - t0:.1f} s", flush=True)
print(f"film: done in {time.time() - t_start:.1f} s")
