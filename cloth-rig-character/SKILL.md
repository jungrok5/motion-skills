---
name: cloth-rig-character
description: Build a stylized 3D hero (big head, small body) in Blender part by part, layer the outfit, rig it with extra bone chains inside the skirt, ribbons, scarf, braid or cape, and animate it one clip at a time — idle with a blink, turn, walk (plus twirl, wave, hop) — so the cloth follows through: the skirt flares and the bow lags behind on turns, the hem swings on the walk. Reviewed the way the source did it: grey floor, fixed camera, the back-view concept in the corner, a HUD with the clip and frame, one fix at a time. Everything comes from one character.json, built by code inside Blender's Python (headless `pip install bpy`, Blender itself, or step by step through a Blender MCP server); outputs a .blend, a skinned and animated .glb that plays in a bundled three.js review player, a turnaround and cast sheet, checks (joint limits, feet, facing, cloth motion), and a 1280×720 review MP4 (Cycles). Give it a topic and it designs a new hero for it — outfit, palette, which cloth swings, which clips — then builds, checks and renders it. Use for "3D character that walks", "rig the clothes not just the body", "skirt and ribbon sway", "Blender MCP character", "stylized hero animation review", "캐릭터 만들고 걷게 해줘", "3D 캐릭터 애니메이션", "옷에 뼈 넣기", "치마랑 리본이 흔들리게", "블렌더로 캐릭터", "이 방식으로 ○○ 캐릭터 만들어줘", "주제만 바꿔서 캐릭터", "服に骨を入れる", "3Dキャラを歩かせる". Source — made from https://x.com/ClaudeCode_love/status/2121385622325903666?a=TAb3nXMsi15QbOVger8&s=19 (the creator's post: https://x.com/rewind02/status/2120846734901367105).
---

# cloth-rig-character

A stylized 3D hero built part by part, dressed layer by layer, rigged **including the clothes**, and animated one clip
at a time so the cloth follows through. The method comes from a Blender + Claude workflow shared on X: with bones only
in the body the skirt and the ribbon stay frozen while the character walks; add rows of bones to the skirt and the bow
ribbons and let them swing, and the walk comes alive ("the bow and the skirt swing are what sell the walk").

Made in this repo from the X post by Claude Code Studio (@ClaudeCode_love) —
https://x.com/ClaudeCode_love/status/2121385622325903666?a=TAb3nXMsi15QbOVger8&s=19 — which writes out the workflow of
the creator rewind (@rewind02), https://x.com/rewind02/status/2120846734901367105 (4 s clip: a girl in a black floral
dress and a wide white sun hat, idle → turn → walk, on a grey review floor with the back-view concept in the corner).
This skill takes the *method* and the *review scene*, not that girl (references/SOURCE.md). Worked example:
`examples/hanbok-girl` (a New Year hanbok girl who twirls; a custom norigae part). Starter: `starter/` (a kid in a
yellow raincoat and a striped scarf). Live: https://jungrok5.github.io/motion-skills/cloth-rig-character/

**Fixed by the style** (every hero): stylized proportions (3.6–4.6 heads, round head, big eyes, small body); built from
parts, dressed in a layering order; cloth that should move gets its own bone chains, and its motion comes from
follow-through physics baked to keys, never from hand keys; clips made one at a time (idle with a blink → turn → walk is
the backbone) and joined into one sequence; the review scene — grey-violet backdrop, grey grid floor, one fixed camera,
the back-view concept top right, white HUD top left (title, clip [kind] time, frame / total); soft studio light, Cycles.
**Designed per topic** (never reused): who the hero is; every garment, colour and print; the hair; which cloth swings
and how stiff it is; custom parts the library lacks; which extra clips the topic needs (a twirl for a skirt that should
bloom, a wave, a hop); timings, stride, the camera angle.

## What's in this folder
| path | what |
|---|---|
| `crc/body.py` | proportions → joints, the torso surface garments wrap, the body bones, joint limits |
| `crc/parts.py` | part builders + `@part` registry: body, head/face, `hair_bob`, `hair_tail` (tail / braid + ribbon), `top`, `skirt`, `dress`, `coat`, `sash`, `bow`, `boots`, `hat`, `scarf`, `cape`; `ctx.add` (bind a piece to bones), `ctx.chain` (a cloth chain), `ctx.shell` (layer offset), `ctx.outer_r` (stay outside skirts) |
| `crc/geom.py` | bmesh builders: `lathe`, `ellipsoid`, `tube`, `ribbon`, `loop_ribbon`, `join`, `solidify` (all with UVs) |
| `crc/materials.py` | Principled materials + numpy-drawn prints (floral, dots, stripes, check, band) that export to glTF |
| `crc/rig.py` | armature: body bones + every chain; skin weights (nearest bone segments, rigid pieces) |
| `crc/clips.py` | clips `idle`, `turn`, `walk`, `spin`, `wave`, `hop` + `@clip` registry; `Sequence` joins them with cross-fades |
| `crc/pose.py` | the pose solver: FK, aim, two-bone leg IK (planted feet), all in mathutils, deterministic |
| `crc/spring.py` | follow-through for every chain: Verlet particles, stiffness to the animated rest shape, gravity compensation, drag, cone / skirt-row limits, leg kick, collisions (legs, torso, skirts, floor) |
| `crc/bake.py` | runs the sequence, keys every bone every frame, records what the checks need |
| `crc/build.py` | spec → .blend + .glb + motion.json; the fixed review camera |
| `crc/scene.py`, `crc/render.py` | review scene (floor, light, camera), Cycles frames, turnaround, cast sheet, HUD + inset compositing (ffmpeg) |
| `crc/check.py` | the checks (below) |
| `scripts/hero.py` | the command line: `new`, `build`, `check`, `stills`, `sheet`, `render`, `player` |
| `player/` | three.js review player for the .glb (same review layout, live; `seek(t)` contract), vendored three r170 + GLTFLoader |
| `fonts/` | Inter Medium for the HUD (OFL) |
| `starter/` | rainy-day kid: `character.json`, `BRIEF.md` |
| `examples/hanbok-girl/` | the proof on a new topic: `character.json`, `BRIEF.md`, `parts.py` (custom norigae part) |
| `references/` | **SOURCE** (the posts, step by step) · **BRIEF** (template + still rubric) · **PARTS** (spec reference) · **RIG** (cloth chains, spring parameters) · **MOTION** (clips, sequence, camera) · **BODY** (front/back/left/right and joint checks) · **BLENDER-MCP** (running the steps live through a Blender MCP server) · **LESSONS** |

## Project layout (what you create)
```
my-hero/
  BRIEF.md          topic → hero: parts in layering order, cloth chains, clips, review log (one fix per line)
  character.json    the brief in numbers (body, face, parts, motion.clips, review)
  parts.py          optional: custom parts (@part) and clips (@clip) for this hero
  concept/          optional: front.png, side.png, back.png concept art; back.png becomes the review inset
  out/              character.blend, character.glb, motion.json, check.json, stills*.png, turnaround.png,
                    cast-motion.png, frames/, review.mp4, player/ (not committed)
```
Run every command from the project folder: `python3 <skill>/scripts/hero.py <command>`.

Requirements: Blender's Python — `pip install bpy` (bpy 5.x needs Python 3.13; use a venv; tested with bpy 5.3) or
Blender itself (`blender -b --python <skill>/scripts/hero.py -- <command>`; written for 4.4+ slotted actions, with a
fallback for older); ffmpeg. No GPU (Cycles on the CPU, denoised). A build +
bake takes ~2–3 s; stills ~1 s each at 640×360; the 1280×720 review MP4 ~5 s a frame on 4 cores.

## Workflow
1. **Topic → brief.** `hero.py new my-hero` (copies the starter; `--from hanbok-girl` for the example), then rewrite
   `BRIEF.md` from references/BRIEF.md before touching the spec: the one line, silhouette, palette, the parts **in
   layering order**, which cloth must move (chains, stiffness), the clips. If the user gave concept art, put the front /
   side / back images in `concept/`.
2. **Blockout.** In `character.json` set `body` (height, heads, build) and the main silhouette first (skirt flare /
   bell, coat length). `hero.py build` then `hero.py sheet` — look at the turnaround: big head, small body, one clear shape.
3. **Parts, then layers.** Add parts one at a time in the order they are worn (dress → sash and bow → boots → hat; or
   jeogori → chima → goreum → norigae → shoes). A part the library lacks goes in `parts.py` with `@part` and the
   helpers (references/PARTS.md; the hanbok norigae is the example). Rebuild and look after each part.
4. **Bones in the cloth.** Every swinging part declares chains (skirt rows, bow loops and tails, scarf tails, braid,
   daenggi, cape, tassels). Tune `stiff`, `damp`, `gravity`, `cone`, `twist` / `fold` per references/RIG.md.
5. **Clips one at a time.** Write `motion.clips`; review each alone with `hero.py stills --clip idle`, then `turn`,
   then `walk` — fix one thing per pass and log it in BRIEF.md. Add `spin` / `wave` / `hop` or a project `@clip` when the
   topic wants it.
6. **Check.** `hero.py check` must pass (11 checks: skinning, facing, bake = Blender, joint limits, feet, direction,
   cloth follows through, settled, lags more on the turn than at idle, blink, determinism). Then `hero.py sheet`: score the
   turnaround and the cast sheet (both sides, motion poses) with the rubric in references/BRIEF.md and references/BODY.md.
7. **Review.** `hero.py stills` (whole sequence) → score with the rubric. `hero.py render` → `out/review.mp4` (grey
   floor, fixed camera, back view top right, HUD). `hero.py player` → `out/player/` plays the .glb live in a browser.
8. **Hand-off.** The .blend opens in Blender with the rig, the baked action and the review camera; the .glb imports
   anywhere (three.js, Unity, Godot, Blender).

## Rules
- **Design per topic.** Never re-dress the starter or the example for a new topic; never reuse the source's girl.
  New garments, palette, prints, cloth chains and clips come from the brief.
- **One style.** New parts use the same proportions, materials (soft Principled, sheen on cloth), the same chain physics
  and the same review scene.
- **Layering order = spec order.** Later garments sit outside earlier ones (`ctx.shell()`); anything hanging over a
  skirt is placed with `ctx.outer_r()` and collides with `skirt`.
- **Cloth moves only by follow-through.** Never key a skirt or a ribbon by hand; give it a chain and tune the spring.
  Cloth that must swing and does not is a failed check.
- **Clips one at a time; one fix per pass.** Review a clip alone before joining it; log each fix.
- **The review camera never moves.** It frames the whole sequence; the hero stays clear of the inset (top right).
- **Bodies are possible.** Knees fold back, elbows forward, neck ≤ 90° yaw, waist ≤ 45°, feet on the floor, planted
  feet do not slide, the hero moves the way it faces; front / back / left / right agree (references/BODY.md).
- **Deterministic.** Same spec → same motion (the check rebuilds and compares). No randomness without a seed.
- **Sizes.** Keep the .glb under ~3 MB (prints at 512 px, 24 fps). No MP4 in `docs/`.

## Contract
- `character.json`: `body`, `face`, `bodyPart`, `parts[]` (each `{type, …}`), `motion {fps, start {x, y, yaw}, clips[]}`,
  `review {title, bg, floor, camera {yaw, elev, lens, fill, zoom, dx}}` (references/PARTS.md, references/MOTION.md).
- Blender scene: armature `rig` (bones `root, hips, spine, chest, neck, head, upper_arm/forearm/hand/thigh/shin/foot/eye .L/.R`
  + chain bones `<chain>.<i>`), one action `review` keyed every frame from frame 1, timeline markers per clip, camera
  `review_cam`. Character faces -Y at yaw 0; +90 faces +X.
- `.glb`: Y-up, one animation; `motion.json` has `fps, n, duration, clips [{t0, type, label, dur}], camera, chains`.
- Player: `index.html?src=<dir>` loads `<dir>/character.glb` + `meta.json`; `window.seek(t)`, `window.DURATION`,
  `window.__ready`; `?capture` hides the controls.
