---
name: shatter-page
description: Make a live web page printed on a breakable pane — window glass, ice, a porcelain plate, sugar glass or a material you design — hanging in a sunlit room. Click it and it cracks from the impact point (radial and stepped ring cracks, a crushed zone), the pieces fall as spinning 3D plates with real edges, refraction, coloured shadows and a floor reflection, and the page keeps working on every flying piece (tick a box, type in the headline); a time slider pulls the pieces back and Mend puts the pane together, optionally with gold or pale seams. Real DOM drawn by WebGL through HTML-in-Canvas, one self-contained folder, synthesised sound. Give it a topic and it designs the page, the material, the room, the impact and the wording. Use for "shatter the page", "break the glass website", "breakable web page", "glass shatter effect with live HTML", "smash a plate invitation", "HTML-in-Canvas demo", or ("유리처럼 깨지는 웹페이지", "깨지는 페이지 만들어줘", "접시 깨기 초대장", "깨진 조각에서도 동작하는 페이지", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Shatter" demo https://claude.ai/artifact/Berg7ureW47JTrMNVoH8TU on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# shatter-page

A working web page printed on a pane of something brittle, hanging in front of a plaster wall in window light. One click
breaks it: cracks run out from the blow, the pieces drop, spin, ring off the floor and come to rest in a pile, and every
piece still carries its part of the real page. Checkboxes tick on a falling shard, the headline takes typing as it
tumbles, text stays selectable. A time tape on the page pulls the pieces back up and lets them fall again, and Mend
rewinds the whole break and leaves its seams on the page. Give it a topic ("a museum label that says do not touch", "an
ice-hockey score sheet on the ice", "a save-the-date on a plate you smash for luck") and it writes a brief, designs the
page in HTML, picks and tunes a material, builds the room and the impact, words the readouts, then checks and reviews
stills. The output is one folder: `index.html`, `BRIEF.md` and `lib/`, working from file:// and as a Claude artifact.

Made from Felix Rieseberg's "Shatter" demo (https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk links it as
https://claude.ai/artifact/Berg7ureW47JTrMNVoH8TU), one of fifteen on the HTML-in-Canvas demo page he shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. `references/LOOK.md` records what was
observed. This skill keeps the idea, the interaction grammar and the rendering technique, and writes all of its own code:
fracture, physics, tape, renderer, sound and pages. Never copy the source's page, wording or code. The worked example,
`examples/plate-for-luck` (a Greek wedding save-the-date on a porcelain plate that you drop to smash, mended in gold), is a
topic and a material the source does not have.

**Code-only.** No generated or downloaded images, video, motion, fonts or audio. Sound is synthesised (modal synthesis +
noise), off until the visitor turns it on.

**Fixed (the style)**: one pane hanging in a room with a wall, a floor and sunlight through a window; the page is real DOM
printed on the pane; a click on bare material breaks it (a click on a control uses the control); the crack grammar
(rays from the blow, ring chords stepped per sector, a crushed zone, long daggers split again, slivers turned to dust);
pieces as thin rigid plates with weight, spin, bounce, friction and sleep, and slow motion right after a break; the
page placed under the pointer with the matrix of the piece it is drawn on; the time tape (every step recorded, scrub
back, let go to resume) and Mend (a rewind to whole, then seams); coloured shadows of the print on wall and floor; the
camera following the glass down to the floor; synthesised sound; `#still`, `#calm`, fallback.

**Designed per topic**: the page (content, controls, typography, colours, wording of the readouts and buttons), the
material (look, crack numbers, physics, sound; a new material is a preset of numbers), the shape and real size of the
pane, the impact (`throw` a projectile, `tap`, or `drop` so it breaks where it lands), the room (wall, floor, light), the
mend seams. The template's studio-door glass and the example's plate are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/shatter.js` | the engine: `Shatter.mount(config)`. Materials (`glass`, `frosted`, `ice`, `porcelain`, `sugar`), fracture, thin-plate physics with floor / wall contacts and sleep, the tape (`poseAt`, `truncate`), the renderer (room ray-cast, sun window, coloured shadow map, floor reflection, refraction, edges, dust, the ball), hit testing, input, readouts, seams, `#break` / `#rest` / `#mended` addresses, the test hook `__hic.shatter` |
| `lib/shatter-sound.js` | synthesised sound: break, clinks by size, ball thump, tick, scrub grain, rewind, mend; `ShatterSound.test()` |
| `lib/hic.js` | the shared HTML-in-Canvas runtime (copy of `tools/hic/hic.js`; never edit the copy) |
| `templates/index.html` | the house example: a studio door pane of window glass, every config field commented |
| `templates/BRIEF.md` | the brief to fill |
| `examples/plate-for-luck/` | the worked example: `BRIEF.md` + `index.html` (porcelain, disc, drop, tiles, gold seams) |
| `scripts/new-page.mjs` | start a project folder (template, or `--from plate-for-luck`) |
| `scripts/check.mjs` | the shared checks plus this style's: break, convex pieces that tile the pane, fall, live controls on a falling piece, settle, rewind, second blow, Mend, determinism, sound |
| `scripts/still.mjs` | stills: `idle`, `crack`, `fall` (per `--at`), `rest`, `mended` |
| `scripts/hic-test.mjs` | the shared check harness (copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (observed from the source) · **ENGINE** (config and API, adding a material) · **HIC** (HTML-in-Canvas notes, shared) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-pane/
  BRIEF.md     the topic as a page, a material, a room and an impact — written first
  index.html   the page (HTML + CSS in the canvas) + Shatter.mount({...})
  lib/         hic.js, shatter.js, shatter-sound.js (copied by new-page.mjs)
  out/         stills (not committed)
```
Run the scripts from anywhere with paths: `node <skill>/scripts/check.mjs my-pane/index.html`.

Requirements: Node 18+ and Playwright's Chromium (the checks pass `--enable-blink-features=CanvasDrawElement`). Viewers
need Chrome / Edge 157+ or the Claude desktop app; other browsers get the same HTML as a plain page.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it from the topic (references/BRIEF.md): who reads the page and
   what it must do; what is printed and which controls work; the material and why (what this thing is really made of,
   how it really breaks, how it sounds); shape and real size; the impact; the room; the mend. Save it before any code.
2. **Start**: `node <skill>/scripts/new-page.mjs my-pane` (or `--from plate-for-luck` when the topic is close to it).
3. **The page.** Write the HTML and CSS for the topic inside `#page` (its CSS size is the pane's size). Mark the
   headline `data-hic-edit`, one checkbox `data-hic-click`, and the engine's elements with `data-shatter` (`state`, `clock`,
   `time` on a range input, `count`, `mend`, optional `seams`; outside the canvas `hint`, `mend`, `sound`). Keep the page's
   background transparent on clear materials and glazed on opaque ones. Write the fallback CSS (`.hic-fallback #page`).
4. **The material, room and impact.** Start from the nearest preset (`base`) and set the numbers for the topic
   (references/ENGINE.md). A new material is a new set of numbers; a new crack look is a new `crack` block. Set the room
   and the impact. Word the readouts (`text`).
5. **Check**: `node <skill>/scripts/check.mjs my-pane/index.html` must print only `ok`. Fix the cause of each `FAIL`.
6. **Stills and review**: `node <skill>/scripts/still.mjs my-pane/index.html --out my-pane/out --at 0.15,0.5`, then open
   every still and score it against the still review in references/BRIEF.md (readable whole page, a break that reads as
   this material, pieces with weight, a pile that shows the print, seams). Fix and repeat. Also look at 390 px width.
7. **Hand over** the folder. It runs from file://, a static server or as a Claude artifact (all scripts inline-safe, no network).

## Rules
- **Design for the topic.** The page, its wording, the material numbers, the room, the impact and the seams are designed
  for this topic. Do not reuse the template's studio door or the example's wedding plate unless the topic is theirs, and
  never recreate the source's page or wording.
- **One style.** One pane in one sunlit room; a break from the blow outwards in this crack grammar; pieces that fall with
  weight and settle; the tape and Mend. A new material changes numbers, not the grammar.
- **The page stays real.** Everything printed is DOM: text is text, controls are `<input>` / `<button>` / `<label>`. Never
  paint text into the texture or fake a control. The engine draws only what the browser rendered.
- **What you see is what you click.** The page is placed with the matrix of the piece under the pointer (`S.place` with a
  projective `matrix3d`); see-through glass prefers a control seen through a bare piece. The check proves a real click on a
  falling piece.
- **A click on bare material breaks; a click on a control uses it.** Pressing bare material never takes focus from a field.
- **Weight sets timing.** The pane's real width (`pane.width`, metres) and the material's density set how it falls; keep
  real sizes (a plate is ~0.3 m, a window pane ~0.8 m). Slow motion is a short ramp right after a break, never the whole fall.
- **Upload only on paint** (hic.js does it); readouts change at most a few times a second.
- **Deterministic.** Each blow is seeded by (seed, piece, point): the same blow gives the same pieces. Stills use
  `#still` with `#break` / `#rest` / `#mended`.
- **Sound** is synthesised, off until the visitor switches it on, with a visible toggle.
- **No network**, system font stacks only; the page must work as a Claude artifact.
- **Phone width**: no sideways scroll at 390 px; the fallback page fits the screen.

## Contract (what a page and the engine expose)
- `Shatter.mount({ canvas, page, material, room, pane, impact, mend, text, camera, seed, quality })` → `{ sim, stage, api, material }`,
  or `{ fallback }` when HTML-in-Canvas is missing (the same HTML as an ordinary page).
- `window.__hic.ready` (after the first upload and the hit-test probe), `__hic.screenOf(el)` (where an element is on screen,
  on whichever piece shows it), `__hic.shatter` (`strikePage(u, v, s)`, `strikeScreen(x, y)`, `advance(s)`, `hold(t)`,
  `resume()`, `mend(instant)`, `bare()`, `state()`, `soundTest()`).
- Address: `#still=<s>` (frozen time, deterministic), `#calm` (no idle glint, no camera drift, no slow motion),
  `#fallback`, `#q=0.5` (render scale), `#break=u,v` (page fractions) with `&at=<s>` or `&rest`, `#mended`.
- `data-shatter` roles on the page: `state`, `clock`, `time`, `count`, `mend`, `seams`; outside: `hint`, `mend`, `sound`.
