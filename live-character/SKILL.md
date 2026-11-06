---
name: live-character
description: Make a character that feels alive on a web page — a 2.5D vector character (a person waist-up, or an animal such as a dog sitting full-body) drawn entirely in code on an HTML Canvas, that breathes unevenly, blinks (sometimes twice), looks where the pointer goes with the eyes first and the head following with a little overshoot, turns its head with real parallax (bangs, eyes, muzzle and back hair at different depths), lets its hair, ears, tail and cords swing on springs, moves arms and legs inside joint limits (waves, cheers, thinks, gives a paw), talks with Hangul-aware lip sync, and slips in small idle moves every few seconds. Give it a topic ("a shy barista", "our cat 나비", "a fox mascot for a bakery") and it writes a brief, designs a new character in this style, checks the body and renders. Outputs a live page (pointer, touch, expressions, actions, talking), a single-file HTML, a cast sheet and an MP4 of a scripted demo. Use for "living character", "idle animation", "Live2D-like", "VTuber-style avatar", "a mascot that moves naturally", "make this character move", "캐릭터가 자연스럽게 움직이게", "살아있는 캐릭터", "라이브2D 느낌", "숨 쉬고 깜빡이는 캐릭터", "강아지 캐릭터 움직이게", "마스코트 애니메이션", "이 느낌으로 ○○ 캐릭터 만들어줘", "주제만 바꿔서 캐릭터". Source — made from https://github.com/livliv-dev/player, shared at https://x.com/yeko_L/status/2118290984924856713.
---

# live-character

A character drawn in code that reads as alive: it breathes, blinks, glances, follows the viewer's pointer, turns its
head with parallax instead of sliding, and everything that hangs — hair, ears, a tail, drawstrings, a name tag — swings
on its own spring. Arms and legs move through named poses inside joint limits; feet that stand stay planted. It is a
front-facing 2.5D rig (the look of Live2D / a VTuber model), not a 3D turnaround: the head turns about ±15°, the torso
±12°. Give it a topic and it designs a new character (a person or an animal), proves the body on a cast sheet, and
plays live in a page or renders a demo to MP4. Every frame is `renderAt(t)` on a fixed 120 Hz deterministic simulation.

Made in this repo after the post by yeko (@yeko_L) on X — https://x.com/yeko_L/status/2118290984924856713 — announcing
LivLiv Player, an open-source 2.5D web character player: https://github.com/livliv-dev/player (Apache-2.0). The
motion recipe here (head bulge with per-layer depth, noise-driven springs, uneven breath, double blinks, attention to the
pointer, idle moves, two-segment hair springs) was studied from its `runtime/idle.ts`, `actions.ts` and `puppet.ts`
and re-implemented for vector drawing; limbs with joint limits, planted-foot IK, angular chains, animals and per-character
temperament were added here. LivLiv's featured characters are licensed for non-commercial use only and may not be used
to make other characters: never copy, trace or imitate them. Draw new characters for every topic.

**Fixed (the style)** — the motion recipe and its numbers (`references/MOTION.md`); the 2.5D head (bulge + depth, depth
fading at the skull edge); eyes lead / head overshoots / torso trails; uneven breath, blinks, saccades, idle moves;
chains for everything that hangs; two-bone limbs inside numeric limits, planted feet by IK; a clean anime vector look
(flat fills with one soft gradient, a 2 px darker outline, glossy eyes, blush); a 4:5 stage; the player's controls
(expressions, actions, talk, pointer, compare with a sine idle); deterministic `renderAt(t)`.

**Designed per topic** — the species and build (person waist-up, a sitting or standing animal, a mascot), silhouette
and proportions, palette, hair or ears / tail / fur pattern, clothes and accessories, the face (anime eye or round animal
eye, brows, muzzle), which parts swing and how stiffly, the limbs and their poses, the temperament (calm, bouncy,
sleepy), its idle moves, its actions and expressions, its line to say, and the demo script. The two examples are
construction references, not menus: a cat is not a recoloured dog.

## What's in this folder
| path | what |
|---|---|
| `lib/rig.js` | the engine: params (`CORE_PARAMS` + the character's own), `LivelyIdle` (wander, springs, breath, blinks, saccades, attention, idle moves), `SineIdle` (the "before", for comparison), `ACTIONS`, `HUMAN_MOVES`, `ANIMAL_MOVES`, `TEMPER`, `syllables()` (Hangul / Latin lip sync), `Deformer` (head bulge, torso, neck, ground), `Chain` + `CHAIN` presets (bangs, side, back, ahoge, cord, ear, floppyEar, tail, tag), `Limb` (FK + IK, limits, gravity, inertia), `Sim` (fixed-step, seeded; `step`, `advance`, `act`, `express`, `say`, `point`, `poke`, `snap`) |
| `lib/draw.js` | paths through the deformer: `fill`, `stroke`, `clipped`, `trace`, `addPath`, `ell`, `mirror`, `local`, `linear`, `radial` |
| `lib/parts.js` | the kit: `animeEye`, `brow`, `mouth`, `blush`; `roundEye`, `nose`, `muzzleMouth`; `tube` (limbs, tails), `hand` (relaxed / open / fist / point), `paw`, `groundShadow` |
| `lib/stage.js` | the player: `mount(character)` builds the stage and controls from the character's data, follows pointer and touch, plays `demo`, exposes `window.live.renderAt(t)`; `?bare`, `?still`, `?demo` |
| `examples/haru/` | a person: 하루, waist-up in a raincoat — bangs and side locks, ahoge, drawstrings, arms with six poses (wave, cheer, think, clasp, hips, tuck) |
| `examples/bori/` | an animal, made from `BRIEF.md`: 보리, a Jindo puppy sitting — ears and a curled wagging tail as chains, planted front legs, "손!" paw, pant, bark |
| `scripts/new-character.mjs` | start a project (`--from haru` for people, `--from bori` for animals) |
| `scripts/check.mjs` | data complete, deterministic, finite, no joint past its limits (demo, actions, expressions, every idle move both ways), planted feet hold, frames draw inside the frame, page loads clean |
| `scripts/sheet.mjs` | the cast sheet: turns to the limits both ways, tilts, diagonals, every expression, pose and action |
| `scripts/render.mjs` | the demo to MP4 (or `--stills 2,5.5`) |
| `scripts/build-single.mjs` | one self-contained HTML (for an Artifact or a gist) |
| `references/` | **BRIEF** (topic → brief, still review) · **CHARACTER** (the character contract and kit API) · **MOTION** (the recipe and its numbers, temperaments) · **BODY-CHECK** (directions, joints, the sheet) · **LESSONS** |

## Project layout (what you create)
```
my-character/
  BRIEF.md       the topic written out (references/BRIEF.md) — written first
  character.js   the character: anchors, rig, temper, params, chains, limbs, poses, moves, actions, expressions, demo, draw()
  index.html     the player (mount(character))
  lib/           copied by new-character.mjs
  out/           sheet.png, demo.mp4, single.html
```

## Requirements
Node 18+; Playwright with Chromium for `check` (page part), `sheet`, `render`; ffmpeg for MP4. The page itself needs nothing.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from `references/BRIEF.md`: who it is, framing (person waist-up / animal full
   body / mascot), silhouette, palette, face, what swings, limbs and poses, temperament, idle moves, actions,
   expressions, the line it says, the demo beats, and what fails a still. Decide species-specific behaviour (a dog gives a
   paw, a cat kneads or flicks its tail tip, a bird bobs) — never a person's gestures on an animal by default.
2. **Start the project.** `node live-character/scripts/new-character.mjs my-character --from haru|bori` — the closest
   example as a construction reference.
3. **Design the character in `character.js`** (`references/CHARACTER.md`): set the anchors to the new head and body,
   draw every shape for this character (new silhouette, hair / ears / fur, clothes or markings, face), give each part
   its depth, turn every hanging thing into a chain with a preset, add limbs with numeric limits and the poses the brief
   needs, write its moves / actions / expressions and temperament, and a demo script that shows them. Keep the example's
   shapes only where the brief really asks for the same thing.
4. **Check.** `node live-character/scripts/check.mjs my-character` must pass. A limit failure means a pose asks the
   body for something impossible: fix the pose, not the limit (unless the limit was wrong for this anatomy).
5. **Cast sheet.** `node live-character/scripts/sheet.mjs my-character` → `out/sheet.png`. Score every tile against
   `references/BODY-CHECK.md` and the brief's still review; fix and re-run until nothing fails.
6. **Watch it live.** Serve the folder (`python3 -m http.server`) and open `index.html`: move the pointer, tap the face
   and the hair, play every action and expression, say a line, compare with "사인파 idle". Look for anything that moves in
   lockstep, pops, or stays still too long.
7. **Render.** `node live-character/scripts/render.mjs my-character` → `out/demo.mp4`; look at a contact sheet of it
   (`ffmpeg -i out/demo.mp4 -vf fps=1,scale=180:-1,tile=6x3 -frames:v 1 out/strip.jpg`). Optionally
   `build-single.mjs` for one HTML file.
8. Note anything that broke and its fix in `references/LESSONS.md` if it would bite the next character.

## Rules
- **Design per topic.** Every topic gets its own character: silhouette, palette, parts, temperament, moves, actions.
  Do not recolour an example and call it new; do not give a cat the dog's ears or a person's wave.
- **One style.** New characters use the same recipe, the same depth logic, the same line weight (2–2.4 px outlines in a
  darker shade of the fill), flat fills with one soft gradient, glossy eyes, and the same motion numbers unless the
  temperament scales them.
- **Never copy reference characters** (LivLiv's featured characters, or anyone's): no tracing, no look-alikes.
- **Depth makes the turn.** Back hair < 0 < face 0 < eyes ~0.04–0.1 < nose / muzzle 0.18–0.55 < bangs ~0.26. Without
  depth a turn is a slide.
- **Turns stay small.** Head ±15° in idle (the rig caps it), torso ±12°, lean ±5°. A 2.5D rig shows it is flat past that.
- **Everything that hangs is a chain**; nothing swings by a sine on its own. Neighbouring chains get slightly different
  springs (the rig does this) so they never move in lockstep.
- **Limbs stay inside numeric limits** (`lim` per joint); poses that ask past them fail `check`. Planted feet stay
  planted (IK) unless a pose lifts them (`lift: true`). Quadruped forelegs fold backward when lifted.
- **The eyes lead.** Gaze moves first, the head follows through springs, the torso trails. Big gaze shifts bring a blink.
- **Irregular, never looped.** Breath, blinks, saccades and idle moves are all randomised from the seed; no fixed period.
- **Deterministic.** All randomness from the seeded RNG in `Sim`; the fixed 120 Hz step; no `Math.random()` or wall clock
  in `draw()`.
- **Stage.** 4:5, the character inside the frame at the top and sides at every moment (hops and raised arms included);
  a bust or waist-up character may be cut by the bottom edge.

## Contract
- `character.js` exports default `{ id, name, blurb, anchors, rig, temper, params?, pairs?, mirror?, view, face, chains,
  limbs, poses, moves, actions, expressions, talk, demo: { dur, pointer, events }, draw(ctx, sim, opt) }`
  (`references/CHARACTER.md`).
- `draw()` reads only `sim.P`, `sim.D`, `sim.chainById`, `sim.limbById`, `sim.t`; it draws in model px (the stage has set
  the transform) and must not change the simulation.
- The page exposes `window.live = { sim, ch, renderAt(t), DURATION, paint, set, canvas }`; `renderAt(t)` replays the
  demo from 0 when t goes backwards, so any t is reproducible.
