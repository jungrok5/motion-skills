---
name: pixel-world-compiler
description: Compile a living pixel-art world from a topic — give it a place and a subject ("a reindeer herders' camp on a frozen river", "rice terraces under a hill village", "a fishing harbour at dawn") and it researches the real latitude, sun, materials, plant and animal sizes, writes them as tables, and a deterministic compiler derives every pixel. One sun at the real latitude, season and hour sets shadow direction and length. Ramps come from each surface's reflectance under that sun, locked to one palette of at most 64 colours. Sprites store material, normal and occlusion, never colour. Everything is sized from one axiom: 26 px = 1.70 m. Terrain comes from analytic fields with real relief (terraces, river valleys). Plants and buildings are placed where their conditions hold. People and quadrupeds are rigged from measured proportions and move by gait laws (Froude speed and stride, Hildebrand contact schedules), so planted feet never slide. The output is a walkable live page (arrow keys), a cast sheet, stills, and a 1080p tour MP4, and a check script proves every law with numbers. Code-only. Use when asked for a pixel-art world, a top-down / 3/4 pixel landscape, a pixel village or biome, a game-world mock-up that must be consistent, a "world compiler", or a living pixel diorama you can walk in ("픽셀아트 월드", "픽셀 마을 만들어줘", "도트 그래픽 세계", "걸어다닐 수 있는 픽셀 맵", "이 주제로 픽셀 월드 만들어줘", "주제만 바꿔서 같은 스타일로", "pixel art world", "pixel biome", "nature-grounded pixel world", "walkable pixel scene"). Source — made from https://github.com/trinity-works/frostwind.
---

# pixel-world-compiler

A nature-grounded pixel-world compiler. An LLM cannot see, so it should not draw: it writes **tables** (a latitude,
reflectances, plant heights, a siting rule, a body's shoulder height and mass) with the authority of each row, and the
compiler derives the pixels. The 480×270 frame is composed from those tables alone. Light comes from a real sun.
Colour comes from reflectance under that sun, snapped to a locked palette. Sizes come from one axiom
(26 px = 1.70 m), and motion comes from gait laws. The page is a pure function of `t`, so stills, the tour MP4 and
`check.mjs` see the same pixels. The page also walks: arrow keys take the traveller through the world.

> Nothing is drawn that can be derived. Nothing is chosen that can be measured. Nothing is claimed that cannot be checked.

Made from **Frostwind** by Trinity Labs (https://github.com/trinity-works/frostwind, MIT; live at
project-frostwind.fly.dev): its derivation layer is the method here. That means the scale axiom, store reasons not
results, ramps from Rayleigh sun × albedo on an Oklab ladder with Naka–Rushton response, cabinet projection with even
depths, Hildebrand gaits, the frame gate that every pixel is a declared palette entry, and "a check names an authority
and says what moved". This skill is a smaller Canvas 2D rewrite with its own code (`lib/`), not a copy of its WebGL
engine. It turns the method into a topic → world workflow, proven on two worlds Frostwind does not have:
`examples/tundra-camp` (69° N, March) and `examples/terrace-village` (25° N, June).

## Fixed (the style) · designed per topic
**Fixed:** the 480×270 canvas scaled ×4 nearest-neighbour; the 26 px = 1.70 m axiom; cabinet projection (k = ½,
buildings with a 45° return); one sun per world from latitude / declination / hour; ramps derived from reflectance
under it; the ≤ 64-colour lock and the two-level posterise with a checker band; channel sprites (material, normal,
occlusion, height); one wind axis; flat-elevation figures rigged from Drillis–Contini ratios; planted-feet locomotion;
`check.mjs` laws.
**Per topic (always new):** the place and its sun; land and water; every material and its reflectance; the cover;
ground rules; species and where they grow; the places, their siting rule and their built forms; trails; every body,
its measured size, mass, gait and look; the beats and the tour; any new form registered in `world.js`. The two
examples are examples of the style, not menus. A new topic gets a new brief and new tables.

## What's in this folder
| path | what |
|---|---|
| `lib/fw-core.js` | authorities: seeded `rng` / `hash` / `noise` / `fbm`; `FW.SCALE`, `FW.px`, `FW.pxEven`, `FW.floor` (medium overrides, recorded); Oklab; `FW.sun` (alt, az, beam, sky, shadow vector); `FW.blackbody`; `FW.buildPalette` (ramps + the 64 lock + LUT); `FW.makeResolver`; `FW.Spr` channel sprite; `sphereN`, `cylN` |
| `lib/fw-forms.js` | growth grammars and built forms → channel sprites: `tree` (conifer with droop-lines, broadleaf, birch / bare, bamboo; snow takes highlight positions), `boulder`, `house` (cabinet box, gable, overhang that casts, recessed door, lit glazing, stilts), `cone` (lavvu / tipi), `stack`, `rack`, `fence`, `post`, `dome`; helpers `H.box`, `H.blob`, `H.cyl`, `H.line`; `FW.forms.register` |
| `lib/fw-body.js` | `FW.body`: `human(look)`, `quad(spec)`; `gait.froude`, `gait.symmetric` (Hildebrand); `walkFeet` (planted feet along any path); two-bone IK with fixed bend sides; idle, big moves (`lift`, `toss`) with phases; stepped turns; `actor(body, start, phi, plan)` = a pure function of t |
| `lib/fw-world.js` | `FW.compile(world)`: fields (relief, river, lakes, terraces, trails, moisture), the ground raster with risers, tufts, siting, affordance-gated flora, static shadows from the one sun |
| `lib/fw-run.js` | `FW.world(table)`: the scene, camera (tour keys or follow), compositing (ground, cloud and body shadows, water glints, reflections, sway, fire, smoke, drift), the cast sheet (`?sheet=cast`), the live walk, the page contract, `FW_CHECK()` |
| `templates/` | `world.html` (the page), `world.js` (a minimal commented world that passes check), `BRIEF.md` (the blank brief) |
| `scripts/new-world.mjs` | start a project: `lib/` + `index.html` + `world.js` + `BRIEF.md` (`--from <example>`, `--lib-only`) |
| `scripts/render.mjs` | stills (`--stills 0,8`), contact sheet (`--sheet 8`), cast sheet (`--cast`), the tour MP4 |
| `scripts/check.mjs` | the laws with numbers: palette gate on real frames and the cast sheet, ramps, determinism, planted feet, idle, big-move gather and settle, joints, reach, facing, loops; reports sun, palette, floors, scale, gaits |
| `references/` | **BRIEF** (frame + stills review) · **LAWS** (authorities, how to research a row, the five kinds of rule) · **API** (every table field) · **LESSONS** (what broke and the fix) |
| `examples/tundra-camp/` | 69° N, mid-March, 10:30: a herders' camp by a frozen river, five reindeer, a herder in gákti |
| `examples/terrace-village/` | 25° N, June, 09:30: flooded rice terraces, a stilted hamlet, a farmer, an elder, a water buffalo |

## Project layout
```
my-world/
  BRIEF.md     topic → causes, authorities, cast, beats (written first)
  world.js     the tables: FW.world({ … })
  index.html   the page (loads lib/ then world.js)
  lib/         copy of the skill's lib/ (never edited; extend in world.js)
  out/         stills, sheets, cast, the MP4, check.json (not committed)
```
Run every script from the project root: `node <skill>/scripts/check.mjs index.html`.

Requirements: Node + Playwright Chromium, ffmpeg for the MP4. No npm install, no GPU, no network. A world compiles in
2–4 s; a 24 s 1080p tour renders in about 15 s on a CPU (3 workers).

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from `references/BRIEF.md` before any code. Research every row: the real
   latitude and season, the reflectance of each surface, real heights of plants and forms, the real body
   (shoulder height, length, mass) and how it walks. Give each row its authority: SOURCE (mark informal), DERIVED, or
   TASTE named once. At most one invented law per world, with its boundary. With moving bodies, set per body the mass,
   Froude number, idle, and per beat the stance, gaze, anticipation, action and recovery.
2. **Start**: `node <skill>/scripts/new-world.mjs my-world` (or `--from tundra-camp`, then replace every row).
3. **Light and palette first.** Write `sun`, `materials`, `cover`; run `check.mjs`. Read the printed altitude, azimuth,
   shadow vector and ramps. Each ramp must run cool shade → warm beam with distinct rungs, ≤ 64 colours in all. Fix a
   colour by fixing its reflectance or its rung count, never by typing a hex.
4. **Land.** `terrain` + `ground` rules + `trails`. Look at `--stills` with `?pass=flat` (no light) and lit: the
   surfaces must sit where their fields say.
5. **Life and places.** Species (`flora`) with real sizes and the condition each answers; `places` with a siting score
   and real-sized forms. Register any new form in `world.js` (`FW.forms.register('kiln', (spec, rng, ctx) => …)`). It
   returns a channel sprite built with `FW.forms.H` and `ctx.m(material)`, metres through `FW.px`.
6. **Cast.** Rows with measured sizes; plans of `idle`, `walk`, `big`, `face`. Render the **cast sheet**
   (`render.mjs index.html --cast`): every body in 8 facings, walking both ways, idling, turning on the spot, its big
   move both ways. Score it with the stills review items 4–6 before any scene.
7. **Check.** `node <skill>/scripts/check.mjs index.html` must end in `ok`. It fails on a pixel outside the palette, a
   dead ramp rung, a non-deterministic frame, a planted foot moving > 1 px, a frozen idle, a big move with no gather
   or no settle, a joint bent the wrong way, a reach the leg cannot make, walking off-facing, and an open loop. Fix the
   cause (the path, the size, the plan), never the limit.
8. **Tour and stills.** Set `tour` (keys or `follow`), render `--sheet 8` and two or three `--stills`, and score them
   with the stills review in `references/BRIEF.md`. The first frame must show the topic.
9. **Render**: `render.mjs index.html` → `out/<name>.mp4` (1920×1080, 30 fps; `--scale 8` for 4K). Open the page
   too: the world must walk (arrows), and the camera follows the traveller.

## Rules
- **Tables, not pixels.** No hex, no RGB, no pixel counts in `world.js`: reflectance, metres, degrees, kilograms, m/s.
  Every row carries its authority. A table no code reads is a comment; delete it or wire it.
- **One sun, one wind, one scale.** All shadows come from `FW.sun`. Sway, smoke, drift, glints and reflection breaks
  come from one wind. Every size comes through `FW.px` from metres. Where the medium overrules a measurement, use
  `FW.floor` (or a `MEDIUM:` note in the row), so check prints it.
- **The palette is locked.** Every pixel comes out of the LUT. Transparency is ordered dither (smoke, thin cloud),
  never alpha. Never add a colour outside a ramp.
- **Design per topic; keep one style.** Every topic gets a new brief, new materials, new forms and new bodies. Don't
  pull an example's tables onto a topic they don't fit. New forms use the same grammar: channel sprites, cabinet
  boxes, even depths, slopes 1:0 / 1:1 / 1:2 / 2:1.
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames. Randomness is seeded at compile time.
  The live walk builds pure actors from input.
- **Bodies are physically possible.** Head, chest, hips and toes face one way; gaze ≤ 90° off the chest. Knees bend
  forward, elbows back. The near limb is drawn lighter and the far one a rung darker. Quadruped fore cannon folds
  back, hind cannon forward. Bones keep length, and a target out of reach is a plan error.
- **Weight sets timing** (the repo's `references/MOTION-QUALITY.md`). Mass sets the speed ramp and step time; Froude sets speed
  and stride. Every idle breathes (chest, blink, weight shift; grazing, ears, tail). Big moves gather before and
  settle after. **Planted feet never slide:** a turn is steps, walking starts and stops from the stand, relief lifts
  each foot by its own ground. Parts follow through (tail, arms against the opposite leg).
- **Code-only.** No generated or downloaded motion, sprites or textures. Motion is keyed in code from the laws above.
- **Look before you claim.** A check proves laws, not beauty: render the cast sheet, the contact sheet and stills,
  and score them. Record what broke in `references/LESSONS.md`.

## Contract
Each world page: `index.html` loads `lib/fw-*.js` then `world.js`, which calls `FW.world({...})`. It sets
`window.seek(t)`, `DURATION` (= `tour.duration`), `FPS` (30), `PIXEL = { W: 480, H: 270, scale: 4 }`, `__ready = true`
and `FW_CHECK()` (measurements for check.mjs). `?render=1` turns off the live loop; `?t=12` freezes one frame;
`?sheet=cast` shows the cast sheet; `?pass=flat` draws every surface at its middle rung (no light);
`?off=shadows,reflect,particles,sway,clouds` turns parts off. Live: arrow keys / WASD walk the traveller (`player`),
and Space or a click pauses.
