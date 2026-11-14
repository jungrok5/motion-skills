# LESSONS — what went wrong, why, and the fix

**Determinism**
- A cloud near the horizon differed between two renders of the same instant (about 90 pixels) → texture look-ups with
  automatic mip selection *inside a ray-march loop*; derivatives are undefined in non-uniform control flow, so
  neighbouring pixels that had left the loop fed garbage into the level of detail → every look-up inside a loop or a
  branch uses `textureLod(…, 0.0)` (the air pass, `drCloudSun`, the moon's face); rock and ground take their look-ups
  out of `if` blocks.
- After the pearl was seized the whole frame differed slightly from run to run → the pearl's glow read the head's
  matrix before the creature had been posed for this frame, so it carried the *previous* frame's position → frame
  functions with order < 50 (creatures) run first, then the light, then the camera.
- A world-matrix read (`matrixWorld`) in a frame function is always last frame's → compute from the matrices set this
  frame (`parts.point()`), never from what the renderer updated.

**The picture**
- Peaks read as cones with a rock texture → a profile with an apron, near-vertical walls and a rounded crown; buttress
  fins in plan; each of the five gets a ring of lower spires. Displacement mostly sideways so strata stay level.
- Everything turned one colour at sunrise (orange) and at the storm's height (white) → mist density is the first
  suspect, then the glow terms: thin the mist, keep the horizon colour cool and let only the `warm` band carry the sun,
  give point glows a short reach. `check.mjs` warns "flat picture" when a shot has no contrast.
- The last tableau was a backlit haze → the key light became a *film light* (`keyDir`) from the front-right while the
  sun's disc stays where the composition wants it; the change of direction lands exactly on the cut.
- The final coil round the summit was 350 m away and eight pixels thick, and half out of frame → the dragon's last
  ring flies in front of the peaks at 200 m instead. A long body needs to be within ~250 m of a 48° lens to read.
- A low shot showed grass floating in the air → the lens was under the ground and saw the land from below → `DR.film`
  takes `ground(x, z)` and lifts the lens above it.
- The pavilion's platform hung over the lake → its site was inside the shoreline, where the height function returned
  the lake bed before the "level ground" rule ran → the spit of land is part of the lake branch of the height function.
- Bare, pale hillsides behind the pavilion → real trees are too few to cover a slope and the forest paint only began at
  190 m → paint from 80 m, darker ground rock, rock only on slopes steeper than about 50°.
- Plume grass glowed white at night → its colour ramp ended almost white; ground-cover ramps stay below 0.6 linear.
- A hexagonal hatch in the haze → interleaved-gradient jitter survives a 2×2 upsample → white-noise jitter and a 4×4
  depth-aware gaussian when the air buffer is joined to the picture.
- The chase shot showed empty sky → the lens aimed between the head and a pearl far to the side → aim at the neck with
  a small pull toward the goal.
- A basic material with a vertex hook failed to compile → three's basic vertex shader only includes the normal stage
  behind `#if`; `DR.mat` hooks `begin_vertex` for `base: 'basic'` and for depth materials.

**The creature**
- The frame matrix for riders was left-handed and "forward" pointed at the tail → forward = normal × binormal; test with
  the cast sheet (head from the front must show a face).
- The summit circle creased the body (turn radius 2.4 m for a 2.35 m body) → one control point carried a 115° turn;
  rings need points every 40–60° of arc. The audit prints the place and time of the worst bend.
- Top speed 146 m/s between two keys → keys too close in time for their distance; the audit prints top speed and the
  hardest pull.

**Time (four CPU cores, no GPU)**
- A 1080p frame took 10.8 s → 7.8 million triangles a frame over three passes. In order of what helped: one mesh per
  massif so frustum, shadow box and mirror cull them, and a half-density twin shown from afar; tree detail chosen once
  from the distance to the nearest lens position, pulled in (`lodBias` 0.42); small plants and inland trees out of the
  mirror; far trees out of the shadow pass; multisampling off (it was 38 % of the frame; FXAA carries it — on a GPU
  it stays on). 10.8 s → 3.7 s.
- A depth pre-pass made it slower, not faster → the cost is triangles, not shaded pixels.
- Three render workers produced frames no faster than one → the rasteriser already uses every core; use `--workers 1`.
- Fewer, larger instance groups changed nothing → draw calls are not the cost here.
- Look development at `--scale .25`–`.5` on stills and sheets; the full render once, in the background, with `--keep`
  so a shot can be re-rendered alone.

**Working with helpers**
- Three agents built the plants, the buildings and the score in parallel against a written engine contract
  (`ENGINE-API`-style brief: the law of pure functions, the material hooks, how to render a test film). What made that
  work: each owned named files only; each had to render stills and judge them; the beat sheet was written first so
  sound and picture shared one clock.
