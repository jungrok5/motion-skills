# The look — what makes a simple 3D scene read as a cinematic render

The worked example recreates four reference renders (stylised night/golden-hour scenes posted as "made with Opus 5.5":
a red tram in the rain, a brownstone street after snow, a downtown in fog, a clock tower in a puddle). None of them has
detailed geometry: boxes with window grids, lofted vehicles, bare procedural trees, capsule people. What sells them:

| ingredient | in the references | in the engine |
|---|---|---|
| practical lights in frame | street lamps, lit windows, headlights, a lit crown | `film.lamp`, `K.streetLamp`, facade emissive windows (HDR, values 3–8) |
| fog with depth | clear 0–15 m, thick beyond 40 m, lamps haloed | height fog in every material with `start` (clear air); analytic in-scatter per lamp with a forward phase (`phaseMix` .9, `anisotropy` .8) |
| wet ground | long vertical streaks of every light, sharp in puddles | `wetMaterial`: planar mirror + its own atmosphere + a streak blur; puddle mask; rain ripples; setts |
| silhouettes against a slightly lighter sky | bare tree lace over navy fog | sky dome fogged like the scene; trees darker than the fog behind them; coverage-aware depth |
| weather that defocuses | near snowflakes as discs, rain streaks bright only near lamps | `addPrecip`: per-particle CoC, lamp-lit, motion-blurred streaks, far fade |
| a lens | shallow DOF on the near ground, a little CA and vignette | physical CoC from depth, 64-tap gather, near-field bleed, CA ∝ r², cos⁴-ish vignette |
| a film stock | AgX-like highlight roll-off (lamps go warm-white), visible grain | AgX + grade (lift / gain / split tone / contrast in log), mid-tone weighted grain |
| one thing alive | tram moving, walker and dog, fog flowing, leaves falling | `onFrame(t)` — slow, continuous, deterministic |

## Reference analysis (numbers to aim for)
Luminance (0–255, sRGB) of the rain reference, measured on a 540×960 resize:

| region | median | 5th–95th pct |
|---|---|---|
| whole frame | 11 | 2–68 |
| sky behind the trees (top right) | 9 | 4–19 (navy: R 4, G 9, B 17) |
| pale building | 24 | 9–54 |
| wet ground (bottom quarter) | 3 | 1–29 |

The first attempt had a median of 81: everything (fog, ground sheen, building) was 4–15× too bright. Night references are
**dark with bright accents**; only the practicals, their halos, the tram windows and their reflections are bright.

Per shot (what each reference does, what the example does):
- **Rain / tram** — camera ~0.4 m over wet setts, lens ~35 mm-equiv. (fov 50° vertical on 9:16), horizon at 60 % down.
  Key = practicals only: lamps, a wall lamp, the tram's interior (warm) and headlights. Fog: start 14 m, navy, dense far.
- **Snow / street** — camera in the tyre tracks, one-point perspective, horizon 58 % down. Lantern pools warm on the snow,
  deep saturated blue sky (blue hour), windows lit tall and narrow (~25 %), a walker 30 m out, flakes near the lens as discs.
- **Fog / skyline** — drone above a cloud sea (camera 240 m, cloud top 200 m), long lens (fov 34°), towers 400–900 m out with
  fine mullion grids, offices lit by floors, red aviation lights blinking. Cloud lit lavender from the sky, orange from below.
- **Autumn / puddle** — the picture is a reflection: camera 0.5 m over water, pitched ~30° down, frame turned 180°
  (`look.flip`), DOF on the *reflected* distance (`virtualDepth`), puddle edges only in the corners, golden sun raking the
  tower from the side that ends up on the right after the flip, leaves falling far away (sharp) and near (bokeh).

## Settings that worked (start here)
| | rain night | snow blue hour | fog skyline | golden puddle |
|---|---|---|---|---|
| fog density / start / colour | .022 / 14 / navy .9 | .018 / 8 / blue .55 | .0011 / 120 / blue .5 + cloud slab | .006 / 6 / sky .5 |
| lamp scatter / phaseMix | .3 / .93 | .32 / .9 | 0 | 0 |
| DOF focus / aperture | subject / 2.6 | walker / 3.2 | tower / 2.2 | 52 m (reflected) / 3.6 |
| exposure / contrast | .42 / 1.12 | .55 / 1.1 | .9 / 1.08 | .95 / 1.08 |
| grain | .045 | .05 | .075 | .05 |
