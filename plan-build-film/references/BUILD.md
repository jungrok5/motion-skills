# Building it like a carpenter (kit/pbf.py)

The building is one Python script run by Blender. Every part a builder would set by hand is its own object, made by a
kit primitive inside a stage, so the film can fly it in, count it and check what holds it up.

```python
import os, sys
sys.path.insert(0, os.environ.get("PBF_KIT") or "<relative path to kit>")
import pbf as K
OPTS, SHOTS = K.args(("hero",))
scene = K.setup(OPTS, samples=32)          # Cycles: GPU (OptiX/CUDA/HIP/Metal/oneAPI) if any, else CPU; PBR Neutral
LOOK = K.sky(OPTS.get("look", "golden"))   # golden | day | dusk: physical sky + matching sun; LOOK["ev"]
with K.stage("frame"):
    K.cyl("post", x, y, 0.12, z0, z1, K.wood("pole", (0.42, 0.31, 0.22)))
K.point("focus", (x, y, z))                # the wave's origin
K.shot("hero", loc=(..), target=(..), lens=32, ev=LOOK["ev"])
K.finish(OPTS, SHOTS, name="<project>")    # the audit; stills unless in film mode
```

## Primitives (metres; each returns the object, origin at its centre)

| call | for |
|---|---|
| `box(name, x0, x1, y0, y1, z0, z1, mat, bevel=0.004)` | boards, sills, slabs, panels, furniture blocks |
| `beam(name, a, b, w, h, mat, up=(0,0,1))` | any member between two points: rafters, braces, purlins, king posts |
| `prism(name, [(x, y)…], z0, z1, mat)` | an odd-shaped slab or floor |
| `cyl(name, x, y, r, z0, z1, mat, seg, r1=None)` | round posts, poles, cones, cups |
| `sphere(name, c, r, mat, scale)` | fruit, knobs |
| `rock(name, c_bottom, (sx, sy, sz), mat, seed, rough, sub, yaw, face)` | a stone: noise on an icosphere, its bottom flat; `face=0.36` cuts the wall faces flat (a laid stone is not a ball) |
| `tube(name, [p…], r or [r…], mat, seg)` | ropes, branches, pipes, a pencil |
| `blob(name, c, r, mat, seed, rough, squash)` | a crown of leaves, a shrub, a columnar tree (`squash` > 1) |
| `lathe(name, x, y, z, [(r, h)…], mat)` | jars, pots, cups, lamp shades |
| `shell(name, x0, x1, y0, y1, nx, ny, ztop(x, y), thick, mat)` | a slab following a height field: thatch bundles, a curved roof, a terrain block (`thick` may be a function) |
| `grid_mesh(name, x0, x1, y0, y1, nx, ny, z(x, y), mat)` | ground, hills |
| `light(name, kind, loc, energy, color, size)` | a light the film switches on after the wave |

Bevels are cut into the mesh (no modifiers): a flying part is never a deforming mesh, which runs a GPU out of memory
under motion blur (blueprint baked theirs before keying for the same reason).

## Materials (procedural; colours are sRGB as you would pick them)

`pbr`, `wood(axis=X|Y|Z)` (straight grain along the member's long axis: give boards along y `axis="Y"`, vertical
boards `axis="Z"`), `stone(pores, moss)`, `plaster`, `metal`, `glass` (Transparent + Glossy by Fresnel, no
refraction), `fibre(along)` (straw, thatch, rope, woven mats), `fabric`, `leaf`, `ground` (grass with earth patches),
`water`, `glow` (an emitter the film switches on with the lights). `scan(name, "<polyhaven id>", fallback, scale)`
uses a Poly Haven CC0 set fetched by `scripts/fetch-assets.py`, else the fallback, so a fresh copy still builds.

## Stages

A stage is one system a builder sets in one go: foundation, walls, frame, floor, doors / glazing, roof, interior,
yard / garden. Its parts land together in one colour and fill one row of the counter. `site_stages` (default
`site`) hold the land, water and distant trees: they never fly or count; they appear when the wave reaches them
(trees with `o["base"] = (x, y, z)` grow from that point). Six to nine stages read well; a row with 3 parts or 3,000
reads badly (merge or split).

## What holds what up

The audit (`K.finish` -> `audit.json`) lists every part whose box, grown by 5 mm, touches nothing: fix all of them.
`check.py` then fails any part that lands before the part under it. So build in the order things rest:

- **Rubble walls course by course:** each course's stones sit on the one below (flat bottoms, height x1.2 so
  courses overlap); stagger the joints; a mud core inside stops daylight through the joints; window gaps skip stones
  and get a lintel and a sill. A dry-stone field wall leaves a gap now and then (`fence_run` in the example).
- **Timber:** stones under posts, posts on them, sills between posts, plates on walls, beams on posts and plates,
  king posts on beams, purlins and the ridge on top. Thresholds belong to the frame (the front wall stands on them).
- **Lattice doors and windows:** frame (stiles, rails), muntins, band rails, then the paper or glass: 18 parts a leaf.
  An open leaf is the same leaf turned 90 degrees against its jamb (`along="v"`).
- **Roofs:** rafters, then the skin in pieces (thatch bundles across the length; boards, tiles or panels in rows),
  then what ties it (a rope net, ridge caps, battens). Rafters only where the skin covers them by 0.2 m: a rounded
  hip end is too low for full rafters, and a beam end through a roof reads as a dot from above.
- **Furniture** stands on floors; cups on trays on tables; lids on jars.

## Stills against the references

`blender -b --factory-startup -P <project>/build.py -- hero yard hall --res 960x540 --samples 32` writes
`pbf-out/<name>/stills/`. Put each beside its reference and list what differs: proportions, materials, light, what is
missing, what pokes through. Typical first-round findings (from the example): stones read as pebbles (cut faces,
fewer subdivisions, more noise), grain shows rings (straight bands along the member), grass too lime, rafters
through a rounded hip, joints letting light through, distant trees reading as stacked balls (columnar blobs).
