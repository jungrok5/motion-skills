# MODULES — the project contract

A colossus project is a folder:

```
my-colossus/
  BRIEF.md          the film on paper (written first)
  colossus.js       every number: the box, the stance, the gait, the look, the ground, anchors, sound, shots, timeline
  mods/body.js      THE STRUCTURE (one or more of your own modules: mods/ship.js, mods/building.js, mods/chassis.js…)
  index.html        loads engine/main.js with an import map for three
  engine/           copied in by new-colossus.mjs (the skill's examples are served with the skill's engine instead)
  out/ shots/       renders (git-ignored)
```

`engine/main.js` imports `colossus.js`, builds the renderer, sky, lights and post chain, then loads every path in
`MODS` in order inside try/catch (a broken module never blocks the others) and calls `update(t, frame)` on each one
per frame. Everything is a pure function of `t`.

## colossus.js

Plain data + one shot function. **It imports nothing** (Node scripts copy it next to the engine to read the gait).

| export | what |
|---|---|
| `TITLE` | page title |
| `CFG` | `BODY_LEN, BODY_DEPTH, BODY_H` the structure's box (walker-local, origin = centre of its base); `RIDE_H` base height above the ground; `CHASSIS_H` machinery band below the base; `LEG_X` hip columns (one leg each side per column); `HIP_Y, HIP_Z` hip height (walker-local) and half-spread; `FOOT_Z` foot track half-width; `FOOT_X` or `SPLAY`/`FOOT_DX` foot home x; `LEG_SCALE` (1 = thigh 12.5 m, shin 18 m, ankle 1.9 m); `LEG_PAINT` `{armorA, armorB, armorY, cyl, mud, claw}`; anything else your body module wants (`FLOORS`, `HULL_D` …) |
| `GAIT` | `T` cycle s, `duty`, `stride` m, `lift` m, `bob`, `shudder`, `surge`, `sway`, `roll`, `shake` (see GAIT.md) |
| `LOOK` | overrides of the engine look (colours `[r,g,b]` linear, directions `[x,y,z]`), see LOOK.md |
| `MODS` | module paths from the project root, in build order: `'engine/mods/ground'`, `'mods/body'`, `'engine/mods/legs'`, `'engine/mods/fx'`, `'engine/mods/atmo'` |
| `ANCHORS` | where the atmosphere hangs its effects (below); omitted keys are derived from the box |
| `GROUND` | options for the ground module (below) |
| `SOUND` | options for `scripts/audio.mjs` (SOUND.md) |
| `DURATION`, `TIMELINE` | `[{ shot, start, end }]`, contiguous from 0 to `DURATION` |
| `shots(h)` | returns `{ name: { cam(tl, t) } }`; `h = { P, lerp, mix3, ease, SPEED, CFG }`, `P(t)` = walker x. See SHOTS.md |

## A module

```js
export async function create(ctx) { /* build */ return { update(t, frame) { /* pure function of t */ } }; }
```

`ctx`: `THREE`, `scene`, `walker` (the moving Group — parent the structure to it), `CFG`, `gait`
(`footState`, `bodyPose`, `impacts`, `solveKnee`, `LEGS`, `NLEGS`, `SPEED`, `GAIT`), `LOOK`, `Mats` / `weathered` /
`applyWeather` (weathered PBR materials), `TEX` (`mulberry32`, `canvasTexture`, `detailTexture`), `rng(seed)`,
`renderer`, `camera`, `post`, `Q` (URL params), `anchors`, `ground`, `puddlesNear` (set by the ground module).
`frame` = `{ t, dt, frame, camera, pose:{x,y,z,roll,pitch,yaw}, shot }`.

### engine/kit.js (for the body)

`new Kit(ctx, seed)` → `K.batch()` (one future mesh with vertex colours): `box`, `boxC`, `cyl`, `quad`, `grid` (a
surface from a point grid — hulls, roofs, lofts), `catenary` (cables, ropes); `K.push(m4)/K.pop()` transform stack;
`K.lin(hex)` linear colour; `K.mat('paint'|'steel'|'concrete'|'paintedMetal'|'rust', {w})` weathered material taking
vertex colours; `K.mesh(batch, mat, {parent, shadow, name})`. `windowColour(R, pLit)` amber window radiance.
`lagSwing(gait, t, {T, zeta, gain, axis})` closed-form follow-through angle for anything hanging off the body.

## Rules for every module (from the source film's module contract)

1. **Determinism**: `update(t)` is a pure function of `t`. No accumulated state, no `Math.random()` / `Date.now()`
   in update; use `ctx.rng(seed)` at build time. Frames render offline in any order.
2. **No swimming textures**: the walker moves, so never use world-space noise on walker parts. The weathering
   shader works in mesh-local space and needs no UVs. Give identical parts a different `w.offset`.
3. **HDR linear**: output goes fog → DOF → bloom → ACES → grade → grain. Lit warm windows / lamps are radiance
   `(2.4, 1.1, 0.32)` (core) down to `(0.9, 0.38, 0.1)` (dim) — tungsten amber, never white or lemon.
4. **Lights**: the engine owns sky, key, hemisphere and environment. A body may add **≤ 6 warm PointLights**
   (`castShadow = false`, decay 2, a sensible distance).
5. **Shadows** on significant geometry only (one 4096 map). Small parts do not cast.
6. **Performance**: merge (kit batches) and instance aggressively; ≤ 2048² textures; the whole frame ≤ ~7 M
   triangles (`check.mjs` reports it). Build in seconds.
7. **Only edit your own files**. The engine is shared; if the engine needs a change, change it in the skill and
   note it in `references/LESSONS.md`.
8. Prefer opaque or alpha-hashed geometry: post fog is applied from depth, so blended things are not fogged.
9. **Normals**: a surface that closes to a point (a bow, a spire, a lifeboat end) must not produce a zero normal —
   one NaN pixel blooms into a white blob with a black hole (`kit.grid` guards this; your own geometry must too).

## The ground (engine/mods/ground.js) — `GROUND`

| key | default | |
|---|---|---|
| `puddle {cell, p}` | 22, 0.30 | standing water: cell size (m), share of cells with a puddle |
| `hero` | `[]` | up to 4 hand-placed puddles `[x, z, a, b, rot]` (world) where shots look at water |
| `mud` | 0.12 | share of bare mud (0 = meadow, 0.95 = mudflat) |
| `ruts` | `{z: 35}` | two water-filled tyre tracks at ±z; `null` = none |
| `tint`, `grassMul`, `soilMul`, `vegTint` | | colour multipliers for the ground, grass, soil, plants |
| `glow` | `[0.42,0.17,0.045]` | the lit structure smeared on wet ground (darker for fewer windows) |
| `veg` | all 1 | density × per layer: `grassNear, grassMid, grassTall, weeds, umbels, stalksFar, reeds, stones` |
| `far` | `{trees: 26, shrubs: 80, poles: true}` | silhouettes in the fog |
| `fences` | two field fences | `[[x0,z0,x1,z1,step,gap]]` |
| `bushes`, `debris`, `debrisMix` | 46, 26, `[0.4,0.75,0.9]` | scatter beside the lane |
| `keepClear` | `[]` | `[[x, z, r]]` where the scatter must not land (in front of a lens) |
| `scenery(k)` | | hand-placed bushes / trees / fences / your own geometry: `k.treeAt, k.shrubAt, k.bushAt, k.fenceRun, k.parts, k.colorize, k.tube, k.r, k.THREE` |
| `dressing(k)` | | hand-placed props: `k.tyre, k.plank, k.chunk, k.sign, k.pipe, k.put(geo, colour, x,y,z, ry,rx,rz)` |

A topic whose ground is not a field (snow, desert, city street, shallow sea) writes its own `mods/ground.js`
from this one, keeping the contract: world-space shader, footprints from `gait`, `ctx.puddlesNear` if it has water.

## ANCHORS (walker-local)

| key | |
|---|---|
| `glows` | `[x, y, z, radius, r, g, b]` × ≤ 10: volumetric warm halos in the post fog |
| `lamps` | `[x, y, z]` belly lamps: light cones, drips and moths hang from them |
| `hazes` | `[x, y, z, kind, halfW, halfH, intensity]` warm haze slabs before lit faces (kind 1 +z face, 2 −z, 3 +x end, 4 −x end) |
| `smoke` | `[x, y, z]` chimneys / funnels |
| `vents` | `[x, y, z]` steam or water running off the belly |
| `rain` | `{x, y0, y1, z, lit}` box of rain lit by windows near the faces |
| `drips` | `{x, y, z}` drips off the belly edge |
| `spill` | `{halfLen, y}` warm light spill on the fog banks |
