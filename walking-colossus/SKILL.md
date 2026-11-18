---
name: walking-colossus
description: Make a photoreal, gritty cinematic film of a colossal everyday structure walking on giant hydraulic legs through real air — give it a topic (an apartment block, a ship, a church, a lighthouse, a factory, an office tower, a hanok) and it designs a new colossus for it - its body at true scale with the human-scale detail that proves the size, the belly and girders the legs bolt onto, how many legs and how heavy the walk is, the ground it crosses (field, mudflat, snow, city), the hour, fog and light, nine shots cut on real footfalls, and a soundtrack placed on every step. Everything is code in three.js - procedural geometry, procedural weathering in mesh-local space, no 3D models, no image textures - with a stateless walk cycle and two-bone IK (every frame a pure function of time), ambient occlusion, height fog with ground mist, depth of field, bloom, ACES, grain and motion blur; frames render offline in headless Chromium (GPU or SwiftShader) into a 1080p MP4, plus stills and a contact sheet. A check script proves the legs are possible (reach, knee range and direction, planted feet that never slide, support) and every shot is lit, moving and deterministic. Use when asked for a giant walking building / mech / colossus film, a "walking house" or "walking city" shot, a Strandbeest-like or Howl's-castle-like moving structure in a photoreal look, a procedural three.js film, or "make it like this repo" for Walking Block ("걸어 다니는 건물", "걷는 아파트", "다리 달린 건물 영상", "거대한 기계 다리", "걸어가는 배", "움직이는 성 같은 영상", "실사풍 three.js 영상", "코드로 만든 실사 영상", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "walking building", "walking colossus", "building with legs", "giant mech walker film", "procedural three.js film"). Source — made from https://github.com/Leonxlnx/walking-block
---

# walking-colossus

A short film (about 40–45 s, 1080p30) of something huge and ordinary walking: a building, a ship, a church — on
hydraulic legs, through fog, photographed. A project is one `colossus.js` (every number: the box, the stance, the
gait, the look, the ground, the anchors, the shots, the sound) plus the body module(s) that build the structure; the
skill's engine (three.js r170) does the rest: legs with IK, ground with footprints and puddle mirrors, debris and
spray, fog banks and smoke, the post chain, the timeline. Frames are rendered offline in headless Chromium,
resumably, and joined with a soundtrack placed from the same closed-form gait.

Made from **Walking Block** by Leonxlnx — <https://github.com/Leonxlnx/walking-block> (MIT): a Soviet panel block on
eight legs crossing a wet field at blue dusk, everything procedural, a 45 s film rendered from the scene. Its engine is
adapted here (`references/SOURCE.md` lists what came from where) and the film itself is the style example
`examples/walking-block`. Proven on a topic the source does not have: `examples/low-tide` 「Low Tide」 — a stranded
container ship walking out across the mudflats at an overcast dawn, on ten legs.

**Fixed by the skill (the style)**
- Code only: procedural geometry and weathering in three.js, no models, no image textures, no generated motion.
- Photoreal grit: mesh-local grime / streaks / rust / wetness on everything; amber tungsten windows; dark-brown rust;
  the air carries the colour (fog + ground mist), surfaces keep their own.
- The lens and the air: AO, height fog with mist, volumetric halos, depth of field, bloom, ACES, grade, grain,
  sub-frame motion blur.
- The walk: a stateless alternating-tetrapod gait, two-bone hydraulic legs with claw feet, prints, mud rims,
  splashes, debris; the body sinks into each step and shudders; loose parts follow through.
- The grammar: nine beats about scale (open in the haze · side · low hero · foot by the lens · belly overhead ·
  life on it · the machine · a mirror · away into the fog), cut on footfalls.
- Determinism: every frame is a function of `t`; the sound is placed from the same functions.

**Designed for every topic (never reused from the examples)**
- The structure at true size and the human-scale things that prove it; its belly and how the legs bolt on.
- Leg count, spacing, scale and paint; the cycle, duty, lift, sink and roll that its mass implies.
- The ground, the hour, sky, fog and key light; colour targets; the dressing in front of each lens.
- What each of the nine beats shows; the life on it and its loose parts; every sound (what the feet land in, its own
  sounds, the music's key and swells).

## What's in this folder
| path | what |
|---|---|
| `engine/main.js` | bootstrap: renderer, sky env map, lights, walker, module loader (`MODS`), deterministic `renderAt(t)` / `renderBlur`, live preview (`/?shot=`, `/?free`, `/?t=`) |
| `engine/config.js` | reads `colossus.js`, fills defaults (`CFG`, `GAIT`, `ANCHORS` derived from the box) |
| `engine/gait.js` | stateless walk: `footState`, `bodyPose`, `impacts`, `shake`, `solveKnee` |
| `engine/look.js` · `post.js` | look defaults (the source's blue dusk) + overrides · the post chain |
| `engine/shots.js` | shot evaluation, the timeline, inspection views (`hero side far worm belly facade roof leg foot back`) |
| `engine/materials.js` · `textures.js` | weathered PBR presets (`Mats.concrete/paintedMetal/steel/rust/chrome/paint/…`), procedural textures |
| `engine/kit.js` | building kit for a body: batches (`box cyl quad grid catenary`), weathered vertex-colour materials, `windowColour`, `lagSwing` follow-through |
| `engine/mods/legs.js` | the legs: IK rig, yokes, hydraulic cylinders sized from the cycle, GPU hoses, claws; `LEG_SCALE`, `LEG_PAINT`, any count |
| `engine/mods/ground.js` | world-space ground: soil, grass, mud, ruts, puddles with a planar mirror, footprints, vegetation, far silhouettes, scatter, dressing hooks — all from `GROUND` |
| `engine/mods/fx.js` · `atmo.js` | footfall clods, spray, impact sheets, mist, drizzle, far birds · fog banks, light cones, smoke, steam, lit rain, drips, flushed birds (from `ANCHORS`) |
| `engine/vendor/three/` | three.js r170 + OrbitControls + BufferGeometryUtils (MIT) |
| `scripts/new-colossus.mjs` | start a project (engine copied in, `colossus.js`, skeleton `mods/body.js`, `BRIEF.md`, `index.html`) |
| `scripts/serve.mjs` | static server (the examples borrow the skill's engine) |
| `scripts/shot.mjs` | stills, storyboards, contact sheets (`--board`, `--sheet`, `--cam`, `--mods`, `--mb`) |
| `scripts/check.mjs` | structure, legs, gait, support, cameras, build, determinism, every shot, console; `--events` lists footfalls |
| `scripts/render.mjs` · `audio.mjs` · `encode.mjs` | PNG frames (resumable) · the soundtrack · MP4 |
| `templates/` | `colossus.js`, `body.js`, `BRIEF.md`, `index.html` used by `new-colossus.mjs` |
| `examples/walking-block/` | the source film on the engine (its building and chassis modules, its nine shots) |
| `examples/low-tide/` | the worked new topic: `BRIEF.md`, `colossus.js`, `mods/ship.js` |
| `references/` | **BRIEF** (topic → brief, rubric) · **MODULES** (the contract, every option) · **GAIT** (mass → numbers, motion checks) · **LOOK** (post, LOOK keys, colour targets) · **SHOTS** (nine beats, writing shots) · **SOUND** · **LESSONS** · **SOURCE** |

## Project layout (what you create)
```
my-colossus/
  BRIEF.md            the film on paper (first), the stills review (after)
  colossus.js         TITLE, CFG, GAIT, LOOK, MODS, ANCHORS, GROUND, SOUND, DURATION, TIMELINE, shots()
  mods/body.js        the structure (as many modules as it needs: mods/hull.js, mods/belly.js …)
  index.html          import map + engine/main.js
  engine/             copied from the skill
  shots/  out/        stills, frames, audio.wav, film.mp4 (git-ignored)
```
Run every script from the project folder: `node <skill>/scripts/shot.mjs --board`.

Requirements: Node 18+, Playwright with Chromium (a GPU is used when present; SwiftShader otherwise), ffmpeg.

## Workflow
1. **Topic → brief.** Read `references/BRIEF.md`, `GAIT.md`, `SHOTS.md`, `LOOK.md`. Look up the real thing's
   dimensions. Write `BRIEF.md`: the thing and why it walks, the box, what proves its size, belly and hips, life and
   loose parts, legs and the mass → gait numbers, ground / hour / weather with colour targets, the nine beats, sound.
   Show it to the user when they are there to answer.
2. **Scaffold.** `node <skill>/scripts/new-colossus.mjs my-colossus --title "Low Tide" --legs 5 --len 110 --depth 20 --height 26`.
3. **Stance first, numbers only.** Put the box, hips, feet, leg scale and gait in `colossus.js`, then
   `node <skill>/scripts/check.mjs --fast`: reach, knee angle and direction, planted feet, support, spacing,
   anticipation, slam must pass before anything is modelled.
4. **Build the body** in `mods/body.js` with `engine/kit.js` (see `examples/low-tide/mods/ship.js`): the mass as a
   loft or boxes at true size → the repeated human-scale parts with variation → the belly and the join to the hips →
   lights (amber windows, ≤ 6 warm PointLights) → loose parts on `lagSwing` pivots. Iterate with stills
   (`shot.mjs --shots hero,side,belly,foot --w 800 --h 450`) after every step and look at each one.
5. **Ground, look, anchors.** Set `GROUND` (mud, water, plants, scatter), `LOOK` (sky, fog, key), `ANCHORS`
   (halos, lamp cones, smoke, drips) for the topic; stills again.
6. **Shots on footfalls.** `check.mjs --fast --events`, then aim `f_foot`, `f_knee`, `f_puddle` at listed footfalls,
   put hero puddles and dressing in front of those lenses, `keepClear` the scatter. `shot.mjs --board --n 1`, then
   `--n 3`; score every frame with the rubric and write the table into `BRIEF.md`. Anything under 4 goes back.
7. **Check.** `node <skill>/scripts/check.mjs` must pass (adds build, triangles, determinism, every shot lit and
   moving, clean console).
8. **Preview the motion.** `render.mjs --w 480 --h 270 --mb 1 --every 3 --dir out/preview` → `audio.mjs` →
   `encode.mjs --frames out/preview --every 3 --out out/preview.mp4`. Watch it: feet locked, legs never pop, loose
   parts lag, cuts land on footfalls.
9. **Render the film** in the background: `render.mjs` (1920×1080, 30 fps, `--mb 5`; resumable — rerun to continue),
   `audio.mjs --table`, `encode.mjs`. Pull stills from the MP4 at each shot's middle and look at them.

## Rules
- **Design for the topic.** The examples show the style; they are not parts bins. A new topic gets its own body,
  belly, leg layout, gait numbers, ground, hour, shots and sounds. Reuse the engine and the kit, not the block's
  balconies or the ship's containers.
- **One style.** Whatever the topic: photoreal procedural three.js, the post chain, the air, the legs and their
  grammar, the nine beats. A cartoon colossus or a flat graphic is another skill.
- **Code only.** No model files, image textures, HDRIs, or generated / downloaded motion. Recordings are allowed
  only as optional sound the user supplies (never committed); generated audio needs the owner's yes each time.
- **True scale.** Metres, real dimensions, real lenses (27–60° fov). Human-scale detail on every face the camera sees.
- **Weight sets the timing.** Heavier and taller → longer cycle, longer stance, lower lift, deeper sink and
  shudder. The body never stops moving (bob, sway, roll are its idle breath).
- **Planted feet never slide; legs never pop.** The gait is analytic; `check.mjs` proves reach, knee range and
  direction, support. Loose parts follow through on `lagSwing`, never tweened separately.
- **Deterministic.** `update(t)` is a pure function of `t`; seeded randomness at build time only.
- **Amber lights, brown rust, coloured air.** Window radiance `(2.4,1.1,0.32)`…`(0.9,0.38,0.1)`; rust clamped dark;
  surfaces keep their colour, the fog carries the hour.
- **Budget.** ≤ ~7 M triangles a frame; merge and instance; ≤ 6 PointLights; detail in shaders before triangles.
- **Check by looking.** Every step → a still at full size; every shot → the storyboard; every render → frames from
  the MP4. A white blob with a black centre is a NaN — find it (LESSONS.md).

## Contract
- `colossus.js` exports `TITLE, CFG, GAIT, LOOK, MODS, ANCHORS, GROUND, SOUND, DURATION, TIMELINE, shots` and imports
  nothing (`references/MODULES.md` documents every key).
- A module exports `async create(ctx)` returning `{ update(t, frame) }`; modules load in `MODS` order, each in
  try/catch; the body parents to `ctx.walker` (walker-local origin = centre of the structure's base, +X forward).
- `TIMELINE` is contiguous from 0 to `DURATION`; a shot is `cam(tl, t) → { pos, tgt, fov, world?, dof?, shake?, post? }`.
- The page exposes `window.__app` with `ready`, `renderAt(t)`, `renderBlur(t, n, shutter)`, `setShot`, `setCam`,
  `info()`; `?w=&h=&still=1` fixes the size, `?mods=` loads a subset, `?look=k:v` overrides LOOK numbers.
- `render.mjs` writes `out/frames/f_NNNNNN.png` (index = round(t × fps)); `audio.mjs` writes `out/audio.wav`
  (48 kHz stereo, exactly `DURATION`); `encode.mjs` writes `out/film.mp4`.
