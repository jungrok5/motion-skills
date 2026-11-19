---
name: ten-second-scene
description: Make one ten-second scene as ONE HTML file — picture and motion drawn entirely in code (no video model, no image model, no outside images) — and refuse to stop at the first render. The renderer is chosen per scene (Canvas 2D for an illustrated place, WebGL for a painting of tens of thousands of strokes, three.js for a real 3D space with thousands of individually moving people). Then the loop that makes it look made by hand instead of like a code demo: render → five random moments looked at at 100 % → each judged on five criteria (density, light, people/proportion, weight of motion, colour) → what fails is written down and fixed → render again, until one round passes all 25 cells. audit.mjs picks the moments and writes the 100 % crops and a round table into AUDIT.md; check.mjs refuses a scene that is more than one file, uses images or the network, is not deterministic, has flat / unlit / clipped frames, people out of proportion or joint range, sliding feet, frozen idles, big moves without anticipation, or whose last audit round did not pass on the current file. Ships a shared human rig (body.js: footsteps that stay planted, breathing idles, two-bone legs, a cast sheet turned both ways) used by Canvas and three.js alike, a painted-stroke brush for Canvas and an instanced impasto stroke renderer for WebGL. Outputs the HTML scene (plays live) and a 1080×1920 MP4. Give it a topic and it writes a brief, picks the tool and designs a new scene. Use for "10초 장면", "HTML 하나로 장면 만들어줘", "코드로만 그린 영상", "영상 AI 없이 클로드 코드로만", "붓질로 그린 그림 영상", "군중이 하나하나 움직이는 장면", "코드로 만든 데모처럼 보이면 실패", "한 번 렌더하고 끝내지 말고", "무작위 프레임 5장 100%로 확인", "이 방식으로 ○○ 장면", "주제만 바꿔서", "code-only ten second scene", "single HTML file animation", "no video AI", "painterly strokes in WebGL", "crowd animation three.js", "render, inspect five random frames at 100%, fix, repeat". Source — made from https://www.threads.com/share/BAbvjED_BX
---

# ten-second-scene

One ten-second scene, one HTML file, nothing but code: every shape, colour, light and movement is drawn by the page
itself, and every frame is `seek(t)`, so the same file plays live in a browser and renders to an MP4. The tool is chosen
per scene — Canvas 2D for an illustrated place with hundreds of small hand-made things, WebGL for a painting built
from tens of thousands of strokes, three.js for a real 3D space with thousands of things moving on their own. What makes
this a skill is not the renderer but the loop around it: **render, pick any five moments, look at them at 100 %, write
down what fails the five criteria, fix, render again — until all five pass.** A first render is never the result.

Made after a Threads post by @yunseul_ai — https://www.threads.com/share/BAbvjED_BX — three ten-second videos made with
Claude Code alone, no video or image model: a rain-swept alley (Canvas 2D), a starry night of over 60,000 brush strokes
(WebGL), a crosswalk with more than 2,000 people each moving separately (three.js); 30–60 minutes each, the night sky
corrected 34 times and the others more than 20. The post gives the prompt ("make a 10-second scene in one HTML file …
if it looks like a code demo it has failed; don't stop after one render, take time"), the loop and the five criteria;
this skill turns them into tools (`audit.mjs`, `check.mjs`, references/BRIEF.md) and takes none of the three pictures
(references/SOURCE.md). Worked examples, all on topics the post does not have:
`examples/first-bus` 「첫차」 (Canvas 2D: the first bus of the day pulling into a snowy stop, four waiting people, 9 audit
rounds), `examples/sunflower-wind` 「바람의 들판」 (WebGL: one gust crossing a sunflower field in 160,490 oil strokes,
5 rounds), `examples/stadium-wave` 「파도 응원」 (three.js: a Mexican wave through 2,622 people and a steward, 6 rounds).
Live: https://jungrok5.github.io/motion-skills/ten-second-scene/

**Fixed by the style** (every scene): ten seconds; one HTML file (three.js may sit beside it); everything drawn in code,
no image files, no network, no generated media; a pure function of `t`; the first and last frames are finished pictures;
the brief written before code; the audit loop with its five criteria at 100 %; the done-condition (one round, 25 ✓, on
the current file, after at least five rounds); check.mjs green.
**Designed per topic** (never reused): what the one image is and its beat; the place, hour, weather; the tool; the camera
and its single move; every object, figure, colour and light; what "pass" means for each criterion in *this* scene (in
the brief); what the likely code-demo tell is for this topic.

## What's in this folder
| path | what |
|---|---|
| `lib/kit.js` | the page contract `TSS.scene({ … })` (live player, `?render=1`, `?t=`, `?scale=`, `?sheet=cast`), seeded `rng`, `noise2/3`, `fbm`, easing, `spring`, `act` (anticipation → action → overshoot → return with a bounce), OKLab colour mixing, a pinhole `camera` (project / unproject), deterministic film `grain` |
| `lib/body.js` | the human rig: `make` (proportions from height; kids 6.2 heads), `pose` (numbers → joints; two-bone legs, knee towards the foot, joint ranges reported), `walker` (footsteps planned from the root's motion — planted feet do not move), `actor` (root path + footsteps + breathing idle + your overlay + `probe`), `draw2d` (depth-sorted Canvas figure: hull torso with depth, clothing details, rim light), `castSheet` |
| `lib/brush.js` | Canvas 2D painted stroke: own size and colour, rounded head, thinning tail, bristle streaks, a lit impasto ridge; `field` to paint an area |
| `lib/strokes-gl.js` | WebGL2 instanced strokes (one draw call for 100k+), your GLSL `motion()` / `m_color()` / `m_alpha()`, impasto lit by `u_light`, a slow push (`view`), `dataTexture` for per-object values (e.g. each flower's spring), `fullscreen` passes |
| `templates/` | `canvas2d.html`, `webgl.html`, `three.html` — skeletons that show the contract, not a look |
| `vendor/` | three.js r170 module + MIT licence (copied beside a three scene) |
| `examples/first-bus/` | 「첫차」 Canvas 2D: `scene.html`, `BRIEF.md`, `AUDIT.md` (9 rounds) |
| `examples/sunflower-wind/` | 「바람의 들판」 WebGL: same files (5 rounds) |
| `examples/stadium-wave/` | 「파도 응원」 three.js: same files + three.js (6 rounds) |
| `scripts/new-scene.mjs` | start a scene (kit inlined → one file), BRIEF.md, AUDIT.md; `--from <example>`; `--refresh` re-inlines the kit |
| `scripts/audit.mjs` | one round: five random moments → full frames + three 100 % crops each (flattest place, brightest place, largest person) + measured hints → a round table in AUDIT.md; refuses a new round while the last is unjudged or failed without fixes |
| `scripts/check.mjs` | the gates (one file, code-only, pure, contract, determinism, alive, measured floors, people, cast sheet, audit) |
| `scripts/render.mjs` | MP4 (workers × ffmpeg), `--stills`, `--sheet`, `--cast` |
| `references/` | **SOURCE** (the post; what is / is not taken) · **BRIEF** (template + the rubric for a round) · **CRAFT** (beating the code-demo look, per renderer) · **BODY** (the rig, actors, probes, cast sheet) · **LESSONS** |

## Project layout (what you create)
```
my-scene/
  scene.html           the scene: kit inlined, your code in <script id="scene-code">
  three.module.min.js  (three scenes only) + three.LICENSE
  BRIEF.md             topic → the image, the beat, the tool, the five criteria for this scene, cast, palette
  AUDIT.md             the rounds: moments, 25 cells, findings, fixes
  audit/round-NN/      frames and 100 % crops (not committed)
  out/                 stills, sheets, cast sheet, MP4 (not committed)
```
Run the scripts from the project root: `node <skill>/scripts/audit.mjs my-scene/scene.html`. Canvas and WebGL scenes open
straight from the file; a three.js scene is an ES module — view it through `python3 -m http.server`.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (SwiftShader renders WebGL).
A Canvas scene renders in ~1 min, a 160k-stroke WebGL painting in ~10 min, a 2,600-person three.js stand in ~15 min on 4 cores.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from references/BRIEF.md before any code: the scene in one line; the moment, the
   beat and what a person who knows the place checks first; frame and the camera's one move; the tool and why; a
   timeline; **the five criteria spelled out for this scene** with the likely failure for each; cast (mass, idle, stance,
   big move); a palette with what is not in it; what would make it look like a code demo.
2. **Start**: `node <skill>/scripts/new-scene.mjs my-scene --renderer canvas2d|webgl|three --title "제목"` (or
   `--from first-bus|sunflower-wind|stadium-wave` to study one — then replace everything; examples are not templates).
3. **Build the picture first, then the motion.** Lay the scene out in world units through the camera (Canvas: `TSS.camera`
   + `poly`/`draw2d`; WebGL: strokes generated from colour and flow functions; three: meshes + instanced bodies). Get a
   still you would hang on a wall at `t = 0`, then add movement — each thing at its own rate, heavy things late (CRAFT.md).
   People come from `body.js` actors (BODY.md): set the root path with easing, let the footsteps plan themselves, add the
   beat's poses with `act()` (anticipation → action → recovery).
4. **The loop.** `node <skill>/scripts/audit.mjs my-scene/scene.html`, then open every `audit/round-NN/t*.png` and
   `*-crops.png` **at 100 %** and fill the 25 cells in AUDIT.md: `✓` or `✗ <what is wrong, concretely>`. Write Findings.
   Fix the scene. Write Fixes. Run the next round. The moments are new every round (that is the point: you cannot
   polish five known frames). For motion, render a strip of one area over time (`render.mjs --stills a,b,c` and crop) —
   a still cannot show weight. Repeat until one round is all ✓ on the current file; at least five rounds.
5. **Check**: `node <skill>/scripts/check.mjs my-scene/scene.html` must end with `all checks passed`. A failure that
   changes the file means another audit round (the pass must be on the current file).
6. **Cast sheet** (if anyone moves): `render.mjs my-scene/scene.html --cast` — every figure turned through eight views,
   walking, a stepped turn and a big move, both ways; joints in range.
7. **Render**: `node <skill>/scripts/render.mjs my-scene/scene.html` → `out/my-scene.mp4` (`--audio track.wav` to lay a
   track under it). Look at a contact sheet of the MP4 (`--sheet 12 --scale .5`).

## Rules
- **Design per topic.** The three examples show the method on three tools, not menus. A new topic gets its own place,
  beat, camera, tool, people, palette and its own meaning for each criterion. Never re-skin an example's layout.
- **One style: made, not generated.** Code only — no video model, no image model, no images, fonts or data fetched; no
  generated media in the scene or the repo. Every surface carries detail at more than one scale; every light lights
  something; colour comes from the light; motion comes from weight. If a frame looks like a tech demo, it has failed.
- **Never stop at one render.** The audit loop is the work. Each round: five random moments, 100 % crops, 25 written
  verdicts, written fixes. A cell is decided by eye — the measured numbers only say where to look. Do not edit old rounds.
- **One file, pure function of t.** No `Math.random`, `Date`, timers or state between frames; seeded randomness; caches
  built in `setup` only. check.mjs proves determinism by drawing the same t after other frames.
- **Pictures at both ends.** Frame 0 and the last frame are finished pictures (no fade from black longer than 0.4 s).
- **Bodies are possible.** People come from `body.js`: 7–7.5 heads for adults (kids 6.2), knees and elbows fold one
  way within their ranges, bones never stretch, near limbs are near because the figure is 3D. Check the cast sheet both ways.
- **Motion has weight** (references/MOTION-QUALITY.md, applied in code — this skill is code-only): weight sets timing;
  big moves have anticipation and recovery (`act()`); parts follow through; every idle breathes; planted feet do not
  slide (footsteps are planned, not tweened); turns are stepped; nothing moves on one global sine.
- **Light is placed.** Name the key, the practicals and the fill in the brief; draw pools with falloff in world space,
  reflections where surfaces are wet, haze where the air is; no glow that lights nothing; no pure black shadows.
- **Colour has a reason.** A palette tied to the lights; one saturated accent at most; no pure #f00/#0f0/#00f; check.mjs
  fails more than 3 % clipped saturated pixels.
- **No one else's work or identity.** No copy of a known artwork's composition, a real brand's livery, logo or text; the
  three source pictures are not remade.

## Contract every scene fulfils
`window.seek(t)`, `window.DURATION` (10), `window.FPS` (30), `window.SIZE` ({W, H}), `window.sceneInfo()` (renderer +
counts), `window.probe(t)` → `{ figures: [...] }` when anyone moves (each from `actor.probe(t, camera)`: feet with
`planted`, joints, channels, declared actions with their anticipation, joint violations), `cast()` in the scene definition
(→ `?sheet=cast`), `window.__ready = true` — all set by `TSS.scene({ title, W, H, duration, fps, renderer, setup, frame,
probe, info, cast })`. The canvas is `#scene`; your code is the `<script id="scene-code">` block. `?render=1` = no live
loop; `?t=4.2` = one frozen frame; `?scale=.5` = preview. The live page loops: click / space pauses, ← → jump 1 s, the bar scrubs.
