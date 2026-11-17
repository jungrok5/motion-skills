---
name: painted-cloak-hero
description: Build a stylized adult 3D hero in Blender with a hand-painted look — every garment a texture of visible brush strokes glued to the cloth, a long cloak with a frayed hem on its own bone chains that follows the body a few frames late — and animate it as seamless loop cycles (idle, walk, run) plus a step-turn, each clip baked and reviewed on its own. The review is the source's: flat grid floor, fixed warm light, the front/back concept pinned in the corner, the camera orbiting from the front round to the profile while the floor scrolls under the walk, a HUD with the clip name, time and frame counter; then an automatic "what's off" list (REVIEW.md) with numbers and the knob to turn. Everything comes from one character.json, built by code inside Blender's Python (headless `pip install bpy`, Blender itself, or step by step through a Blender MCP server); outputs a .blend, a skinned .glb with one animation per clip that plays in a bundled three.js review player, concept front/back, turnaround and cast sheet, checks (joint limits, feet on the scrolling floor, cloak lag in frames, hem trail, loop closure, idle breath, turn anticipation, paint), and one review MP4 per clip (Cycles). Give it a topic and it designs a new hero for it — garments, palette, paint tones, how heavy the cloak is and how late it follows, which cycles — then builds, checks and renders it. Use for "hand-painted 3D character", "painted cloak", "cloak that lags behind", "idle and walk cycle", "character animation review in Blender", "Blender MCP hero", "망토 휘날리는 캐릭터", "손으로 칠한 질감 3D 캐릭터", "걷기 사이클", "대기 동작 루프", "블렌더로 캐릭터 애니메이션", "이 방식으로 ○○ 캐릭터 만들어줘", "주제만 바꿔서 망토 캐릭터". Source — made from https://x.com/rewind02/status/2121933776884269192?a=RaDjcVLQVKppvgFvRB4&s=19.
---

# painted-cloak-hero

A stylized adult hero built in Blender garment by garment, **painted** with visible brush strokes, rigged with bone
chains in the cloak, and animated as loop cycles in which the cloak never moves with the body — it follows it, a few
frames late. The method is the one shared on X by rewind (@rewind02) — concept front/back → blockout → separate
garment meshes → painted strokes → body rig + cloak chains → idle and walk cycles with the cloak bones lagging →
review scene → every clip rendered with its name and a counter, then a list of what's off.

Made in this repo from the X post https://x.com/rewind02/status/2121933776884269192?a=RaDjcVLQVKppvgFvRB4&s=19 (4 s
clip: a hero in a ragged straw hat and a painted blue cloak, idle then walking on the spot while the view swings to his
profile, grid floor, back-view concept in the corner, "HERO / ANIMATION REVIEW" HUD). This skill takes the *method*,
the *paint* and the *review*, not that hero (references/SOURCE.md). Starter: `starter/` (a rain ferryman in a sedge hat
and a moss-green cloak). Worked example: `examples/snow-postman` (a crimson cloak, a custom satchel part, a run).
Live: https://jungrok5.github.io/motion-skills/painted-cloak-hero/

**Fixed by the style** (every hero): simple stylized adult proportions (≈ 6.5–7.2 heads; `heads` ≈ 4 still works for
a chibi); built as separate garment meshes in layering order; every material hand-painted — brush strokes in the
piece's UV space at a fixed size in metres, dark to light, glued to the cloth; a cloak (or cape, poncho, coat tails)
on bone chains whose every joint chases where the body put it `lag × i / n` frames ago, with soft limits so loops
repeat; clips made and reviewed one at a time, loops seamless and baked in place; the review scene — grey-violet
backdrop, grid floor that scrolls under locomotion, a fixed warm sun from the front left, the camera orbiting, the
concept top right, the white HUD (title, `<Clip> [kind] t s`, `frame / frames`); Cycles; the "what's off" list.
**Designed per topic** (never reused): who the hero is; every garment, colour and the paint tones; the hat; how long,
open, flared and frayed the cloak is, how heavy it feels and how late it follows; custom parts the library lacks; which
cycles (run? a limp?), their timing from the hero's weight; the orbit.

## What's in this folder
| path | what |
|---|---|
| `pch/body.py` | proportions → joints, torso surface, body bones, joint limits; blends chibi → adult by `heads` |
| `pch/paint.py` | the brush-stroke textures: tones, stroke shape (loaded head, ragged sides, dry-brush tail), frayed alpha edge, UV measured in metres |
| `pch/parts.py` | part builders + `@part` registry: body, head, `hair_bob`, `hair_tail`, `trousers`, `top`, `boots`, **`cloak`**, `hat` (wide / cone / cap / beanie / pointed, painted crown + frayed brim), plus skirt, dress, coat, sash, bow, scarf, cape; `ctx.add`, `ctx.chain`, `ctx.painted`, `ctx.shell` |
| `pch/geom.py`, `pch/materials.py` | bmesh builders with UVs; Principled materials with the painted texture (alpha clip for frayed edges → glTF MASK) |
| `pch/rig.py` | armature: body bones + chains; skin weights (nearest bone segments, rigid pieces, per-piece weight functions) |
| `pch/clips.py` | `idle`, `walk`, `run` (loops), `turn` (one-shot), `wave`, `hop`, `spin`; `@clip` registry, `LOOPS` |
| `pch/pose.py` | FK, aim, two-bone leg IK (planted feet), deterministic |
| `pch/spring.py` | the cloak: delayed goals (`lag`), arm push from the delayed arm pose, Verlet particles, soft cone / twist / fold, collisions |
| `pch/bake.py` | one action per clip; loops warmed up to the steady cycle, baked in place, closed (key N = key 0) |
| `pch/build.py`, `pch/scene.py` | spec → .blend + .glb + motion.json; the review scene (floor, fixed light, orbit camera) |
| `pch/render.py` | concept, turnaround, cast sheet, per-clip frames (orbit + scrolling floor), HUD + inset (ffmpeg), concat |
| `pch/check.py` | the checks and the "what's off" notes |
| `scripts/hero.py` | the command line: `new`, `build`, `check`, `concept`, `sheet`, `stills`, `clip`, `review`, `player` |
| `player/` | three.js review player: a button per clip, orbit (auto or drag), scrolling floor, HUD + counter; vendored three r170 + GLTFLoader |
| `fonts/` | Inter Medium for the HUD (OFL) |
| `starter/` | rain ferryman: `character.json`, `BRIEF.md` |
| `examples/snow-postman/` | the proof on a new topic: `character.json`, `BRIEF.md`, `parts.py` (custom satchel) |
| `references/` | **SOURCE** (the post, step by step) · **BRIEF** (template + rubric) · **PARTS** · **PAINT** · **RIG** (the delay) · **MOTION** (cycles) · **BODY** · **BLENDER-MCP** · **LESSONS** |

## Project layout (what you create)
```
my-hero/
  BRIEF.md          topic → hero: parts in layering order, paint tones, cloak feel + lag, clips, review log
  character.json    the brief in numbers (body, face, style.paint, parts, motion.clips, review)
  parts.py          optional: custom parts (@part) and clips (@clip) for this hero
  concept/          front.png + back.png — the user's concept, or rendered by `hero.py concept`; back.png is the inset
  out/              character.blend, character.glb, motion.json, check.json, REVIEW.md, stills-*.png, turnaround.png,
                    cast-motion.png, clips/<clip>.mp4, review.mp4, player/   (not committed)
```
Run every command from the project folder: `python3 <skill>/scripts/hero.py <command>`.

Requirements: Blender's Python — `pip install bpy` (bpy 5.x needs Python 3.13; use a venv; tested with bpy 5.3) or
Blender itself (`blender -b --python <skill>/scripts/hero.py -- <command>`); numpy (comes with bpy); ffmpeg. No GPU
(Cycles on the CPU, denoised). Build + bake + paint ≈ 5 s; a check ≈ 15 s; a 640×360 still ≈ 1 s; a 1280×720 review
frame ≈ 3–6 s on 4 cores.

## Workflow
1. **Topic → brief.** `hero.py new my-hero` (copies the starter; `--from snow-postman` for the example), then rewrite
   `BRIEF.md` from references/BRIEF.md before touching the spec: the one line, silhouette (hat over cloak), weight,
   palette and **paint tones**, the parts **in layering order**, what the cloak should feel like and how late it
   follows, the clips with stance / anticipation / recovery. A user's concept goes in `concept/` (front, back).
2. **Concept + blockout.** Set `body` (height, heads ≈ 6.8, build) and the silhouette; `hero.py build` then
   `hero.py concept` (front + back, only where none was given) and `hero.py sheet` — look: proportions, one clear shape.
3. **Garments, one at a time.** Add parts in the order they are worn (trousers → shirt → satchel → boots → cloak →
   hat). A part the library lacks goes in `parts.py` with `@part` (references/PARTS.md; the satchel is the example).
4. **Paint.** Tune `style.paint` and each material's `paint` (tones, stroke size, direction, `fringe`) per
   references/PAINT.md. Look at a still close up: strokes, not stains; a frayed hem, not holes.
5. **Rig the cloak.** `chains`, `segments`, `lag`, `stiff`, `damp`, `armKick` per references/RIG.md — decide the feel
   (heavy wool: lag 3–4; light cloth: 5) in the brief first.
6. **Clips one at a time.** `motion.clips`: idle, then walk, then run / turn as the topic needs. Review each alone:
   `hero.py stills --clip walk`. Weight sets timing. Add a project `@clip` (and `LOOPS.add`) for a cycle the library lacks.
7. **Check → what's off.** `hero.py check` must pass (14 checks: skinning, facing, bake = Blender, joint limits, feet on
   the scrolling floor, direction, cloak lag 1–8 frames, hem trail, clearance, loops close, idle breathes and blinks,
   turn anticipation, paint, determinism) and writes `out/REVIEW.md`: failures and soft findings, each with its number,
   where, and the knob. Fix one thing per pass; log it in BRIEF.md. Then `hero.py sheet`: score the turnaround and the
   cast sheet (both sides) with references/BRIEF.md and references/BODY.md.
8. **Review.** `hero.py review` → every clip rendered with its name and counter (`out/clips/<clip>.mp4`, orbiting
   camera, fixed light, scrolling floor, concept inset), `out/review.mp4`, and REVIEW.md with the rubric questions.
   Score each clip; `hero.py player` → `out/player/` plays the .glb live (a button per clip).
9. **Hand-off.** The .blend opens with the rig, one action per clip and the review camera; the .glb imports anywhere
   (three.js, Unity, Godot, Blender) — loops are in place, `motion.json` gives each locomotion clip's speed.

## Rules
- **Design per topic.** Never re-dress the starter or the example for a new topic; never reuse the source's straw-hat
  hero. Garments, palette, paint tones, the cloak's cut and feel, the cycles come from the brief.
- **One style.** New parts are painted by the same brush (`ctx.add` paints them), use the same proportions logic,
  the same delayed-chain cloak, the same review scene.
- **The cloak follows, it never moves with the body.** Its motion comes from the delayed goals and the particle step,
  never from hand keys. The `lag` check fails under 1 frame (glued) and over 8 (floating); aim for 2–6.
- **Paint into the surface, never over the frame.** Strokes live in UV space at a size in metres; no screen-space
  filter, no stroke that depends on the camera.
- **Loops close.** Every term of a loop repeats a whole number of times; locomotion is baked in place with the floor
  scrolling; the cloth is periodic (soft limits, no collisions with swinging limbs). A residual over 1 % of the height
  is a finding; over 3 % fails.
- **Clips one at a time; one fix per pass.** Review each clip alone; log each fix with its before / after number.
- **The light never moves.** The camera may orbit; the sun, fill and rim stay put; the hero stays clear of the inset.
- **Weight sets timing; every idle breathes; anticipation before and recovery after the turn; planted feet do not
  slide (on the scrolling floor); the cloak and hair follow through.** (references/MOTION-QUALITY.md at the repo root.)
- **Bodies are possible.** Knees fold back, elbows forward, neck ≤ 90° yaw, waist ≤ 45°, feet on the floor, travel =
  facing; front / back / left / right agree (references/BODY.md).
- **Generated motion is reference only.** If you take timing from a video model, keep the clip out of the repo and
  write the key poses into the clip numbers; ElevenLabs or other paid generators only with the owner's yes each time.
- **Deterministic.** Same spec → same motion and the same paint (seeded); the check rebuilds and compares.
- **Sizes.** Keep the .glb under ~3 MB (textures go out as WebP; they are sized by area — lower `PX_PER_M` in `pch/paint.py` if needed). No
  MP4 in `docs/`.

## Contract
- `character.json`: `body`, `face`, `bodyPart`, `style {paintAll, paint}`, `parts[]`, `motion {fps, clips[]}`,
  `review {title, bg, floor, grid, gridStep, orbit [from, to], clipSeconds, camera {elev, lens, fill, zoom, dx}}`.
- Blender scene: armature `rig` (bones `root, hips, spine, chest, neck, head, upper_arm/forearm/hand/thigh/shin/foot/eye .L/.R`
  + chain bones `<chain>.<i>`), one action per clip named by its label, keyed every frame from frame 1 (loops: key N+1
  = key 1), camera `review_cam`, objects `floor`, `sun`, `fill`, `rim`. Character faces -Y; +90 yaw faces +X.
- `.glb`: Y-up, one animation per clip. `motion.json`: `fps, H, grid, clips [{label, type, loop, n, dur, speed, fwd,
  seam, chain_stats, action}], chains, camera, cam_fn, frames {label: [...]}`.
- Player: `index.html?src=<dir>&clip=<label>` loads `<dir>/character.glb` + `meta.json`; `window.clip(label)`,
  `window.seek(t)` (seconds into the clip's review; loops keep running), `window.DURATION`, `window.__ready`;
  `?capture` hides the controls.
