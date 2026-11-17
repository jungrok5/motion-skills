---
name: swarm-page
description: Give it a topic and it makes a live web page whose own pixels lift off as a flock and settle back into the readable page — a bird-watching log as starlings, a beekeeper's ledger as bees, a festival line-up as fireflies, a leavers' notice as paper planes, a fishmonger's board as a shoal. Real HTML drawn by WebGL through HTML-in-Canvas: every grain of ink is one creature that gathers (quiver and crouch), lifts off in a wave from the trigger, flies in a flock where each bird follows its seven nearest neighbours so a turn ripples through, banks into turns with a wingbeat that flaps and glides, and on landing glides home row by row, dips past its place and settles; formed, the page is selectable, clickable and typeable, sorted rows fly to their new places, typed letters fly in, and in flight clicking where a line was calls its birds home. The page, the creature, the flock, the sky and scene and the trigger are designed per topic; code-only, sound synthesised. Use for "make the page fly away", "murmuration page", "text turns into birds", "swarm of letters", "page that flies apart and comes back", "HTML-in-Canvas swarm", or ("페이지가 새떼가 되어 날아가게", "글자가 새떼로 흩어졌다 돌아오는 페이지", "벌떼 페이지", "반딧불이처럼 흩어지는 웹페이지", "이 스타일로 ○○ 페이지 만들어줘", "주제만 바꿔서"). Source — made from the "Swarm" demo https://claude.ai/artifact/NfKoLhxvZ9AcX32i9CBvHU on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# swarm-page

A live page that is also a flock. The page is ordinary HTML laid out inside a `<canvas layoutsubtree content="drawable">`;
its pixels are uploaded to WebGL, and every cell of a grid over the page (2–4 CSS px) is a grain whose home is that cell.
At rest the page is drawn as itself, crisp, in front of a sky the engine paints, and every word can be selected, clicked and
typed into where it is drawn. On the trigger the ink becomes creatures: a gathering quiver runs out from the trigger, the
grains lift off in a wave, form a murmuration (or a swarm, a shoal, a squadron) and fly; on landing they glide home in
order, flare, dip past their place and settle, and the page reads again. Give it a topic ("a beekeeper's ledger",
"tonight's festival line-up", "the Year 6 leavers' notice") and it writes a brief, designs the page, the creature, the
flock, the sky and setting and the trigger, and proves the result with numbers.

Made in this repo from Felix Rieseberg's "Swarm" demo — https://claude.ai/artifact/NfKoLhxvZ9AcX32i9CBvHU — one of the
fifteen on his HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19 (a bird-count field-notes page at dusk
over a lake whose pixels fly as starlings). `references/LOOK.md` lists what was observed. This skill keeps the idea (the
page's pixels ARE the flock; formed, it is a live page again) and writes all of its own code: a topological-neighbour
flock (the source uses a scripted ribbon), creature sprites with wingbeats, a held/recall grammar, reflow flights. The
worked example `examples/bee-ledger` (a honey ledger as bees) is a new topic. Never recreate the source's lake, reeds,
moon, roost table or wording.

Different from `swarm-world` (cursors building a 3D world) and `cursor-swarm` (cursors building a document): here no
agent builds anything — the swarm IS the live page.

**Code-only.** No generated or downloaded images, video, motion, audio or fonts. Motion follows
`references/MOTION-QUALITY.md` (repo root), keyed by hand at flock scale.

**Fixed (the style)**: one full-viewport live page over an engine-painted sky; the page's own ink becomes the creatures
(each grain carries its pixel's colour); gather → lift-off wave from the trigger → topological flock (7 neighbours,
reaction delay, turning neighbours are salient) → staggered glide home with a settle dip; capped acceleration and turn
rate, banking, flap-and-glide wingbeat; held controls never fly; in flight, clicking where an element was recalls it;
typed letters fly in at rest, reordered rows fly from their old places; a breathing idle (hops on the roost, a sheen); a
scene in front that never flies; `#still`, `#calm`, fallback.

**Designed per topic**: the page (what it is, its words, its table / list / form and controls, ink and type); the
creature (shape — starling, bee, firefly, fish, plane, dot or your own GLSL — size, tint in the air, wingbeat, glide,
blend); the flock (sheet, ball or stream, speed and mass, turn rate, spread, where it roams, startles); the sky (gradient,
sun or moon, clouds, stars, rays) and an optional second light the flight turns to; water; the scene in front (SVG); the
trigger (button, intro, timer) and the land control; the sound. The template and the example are examples of the style,
not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/hic.js` | the shared HTML-in-Canvas runtime (copy of `tools/hic/hic.js`; never edit the copy) |
| `lib/swarm.js` | the engine: `Swarm.start(config)` → grains (GPU sim, bind, diff passes), lead birds (CPU topological flock), creature sprites, sky / water / scene compositing, holds, recall, reflow, idle hops, sound, `Swarm.draw` scenery helpers, the `__swarm` test hook |
| `templates/index.html` | the house example: a lane bulletin at dusk whose words fly as swifts over the rooftops and turn the sky to night |
| `templates/BRIEF.md` | the brief to fill |
| `examples/bee-ledger/` | the worked example: `BRIEF.md` + `index.html` (a honey ledger as bees, sortable table) |
| `scripts/check.mjs` | the shared checks (`hic-test.mjs`) + the swarm's own, with numbers |
| `scripts/still.mjs` | stills by simulated time: `--act rest|fly|land|type --at …` |
| `scripts/new-page.mjs` | start a project folder (`lib/` + template, or `--from bee-ledger`) |
| `scripts/hic-test.mjs` | the shared checks (copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (the source, observed) · **ENGINE** (API, config, adding a creature) · **HIC** (HTML-in-Canvas rules) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-swarm-page/
  BRIEF.md     the topic as a page + creature + flock + sky + trigger (written first)
  index.html   the page: HTML in the canvas, #scene SVG, Swarm.start({...})
  lib/         hic.js + swarm.js (copied by new-page.mjs; the page loads lib/…)
  out/         stills (not committed)
```
Run scripts from the skill folder or give paths: `node <skill>/scripts/check.mjs my-swarm-page/index.html`.

Requirements: Node + Playwright Chromium (global `playwright` is found). Checks and stills launch Chromium with
`--enable-blink-features=CanvasDrawElement` and software GL. To view live: Chrome / Edge 157+ or the Claude desktop app;
any other browser shows the plain-page fallback.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project as `BRIEF.md` and fill it from the topic
   (references/BRIEF.md): what the page is and what it holds; which creature the ink becomes and why; its mass (speed,
   turn rate, follow springs), wingbeat and glide, its idle; the formation; the hour and the second light; the scene in
   front; the trigger and the land control; the sound. Write it before code.
2. **Start**: `node <skill>/scripts/new-page.mjs my-swarm-page` (or `--from bee-ledger`).
3. **The page.** Write the real HTML for the topic inside `#page`: a headline marked `data-hic-edit` (editable), real
   tables / lists / buttons, the fly button, the land control and sound toggle marked `data-swarm-hold`. The page
   background stays transparent; choose ink that reads on the sky, and a second ink under `#page[data-swarm-light="b"]`
   if the light turns. Check phone width (390 px) in CSS.
4. **The scene and sky.** Draw the setting in `#scene` as SVG from `onResize(W, H)` with `Swarm.draw.ridge / blades /
   roofs` or your own paths (it never flies; keep it below the text). Set `sky` (and `skyB`, `water`) for the hour.
5. **The creature and flock.** Set `creature` and `flock` from the brief. A creature the library lacks is a GLSL function
   in the page (`creature.glsl`, references/ENGINE.md), not an edit to `lib/`.
6. **Stills and review.** `node <skill>/scripts/still.mjs index.html --out out --act rest --at 1`, then `--act fly --at
   0.3,3,7`, `--act land --at 1.5,5`, and a phone still (`--width 390 --height 844`). Score each against the still review
   in references/BRIEF.md (readable at rest; anticipation visible; one flock with depth; nothing floats dead or flips;
   lands in order; scene and text never collide). Fix and repeat.
7. **Check**: `node <skill>/scripts/check.mjs index.html` must end with `all checks passed` and the `#calm` line `ok`.
   Then open it in Chrome 157+ and play: fly, wave the pointer through the flock, click where a line was and type, land,
   sort, type at rest.

## Rules
- **Design for the topic.** The page, the creature, the flock, the sky, the scene and the trigger are new for each topic.
  Do not reuse the template's bulletin and swifts or the example's ledger and bees unless the topic is exactly theirs.
  Never recreate the source's lake, reeds, moon, roost table or text.
- **One style.** The page's own ink is the flock; nothing else flies, no extra particles are added. The page is drawn as
  itself at rest. Every flight gathers, lifts in a wave, flocks and lands in order.
- **The page stays real** (references/HIC.md). Text is DOM text, controls are real elements; at rest everything is
  selectable, clickable and typeable where it is drawn. Held controls (`data-swarm-hold`) never fly. In flight a click
  where an element was recalls that element first, so what you click re-forms and is typeable.
- **Weight sets timing.** Each topic sets the creature's speed, minimum speed, turn rate and follow springs from its
  mass in the brief. Acceleration is capped and turns are rate-limited: nothing reverses on the spot.
- **Anticipation and recovery.** Before lift-off the grains quiver and crouch (`lift.gather` ≥ 0.2 s); landing is a
  braking glide, a flare and an under-damped settle that dips past home and returns.
- **Follow-through.** Every grain follows its lead bird on its own spring (`flock.follow`), so a turn sweeps through the
  flock and edges trail. Lead birds bank into turns with inertia.
- **Alive at rest and in the air.** The formed page breathes (a few birds hop on the roost now and then, a faint sheen);
  in the air every creature has a beat (flap when climbing, glide when diving; fins sway; fireflies pulse).
- **Upload on paint only**, size for sharp text (the runtime does it), `#still` composed, `#calm` drops the idle and the
  intro, no network, phone width works, the fallback is the same HTML (references/HIC.md).
- **Deterministic.** Scatter with `HIC.rng(seed)` and GPU hashes; stills step simulated time.
- **Sound** only synthesised, off until the toggle.

## Contract (what a page exposes)
- `window.__hic.ready` (and `__hic.info`: grains, cell, leaders, neighbours, shape), `window.__hic.screenOf(el)`.
- `Swarm.start(config)` → `{ fly(fromEl, scopeEl), land(), recall(el, secs), reflow(mutate, els), sound(on), mode }`.
  `config` fields are in references/ENGINE.md; defaults in `Swarm.DEFAULTS`.
- `window.__swarm`: `manual()`, `advance(sec, dt)`, `fly()`, `land()`, `recall()`, `grains()`, `offsetIn(sel)`,
  `ripple()`, `maxTurnRate(sec)`, `wings(sec)`, `leaders()`, `info()` — used by `check.mjs` and `still.mjs`.
- Address flags: `#still=<s>` (frozen, composed rest), `#calm` (no idle, no intro), `#nointro`, `#q=0.5` (render scale),
  `#grains=<n>`, `#fallback` (force the plain page).
- Page attributes the engine sets: `#page[data-swarm-air]` while in flight, `[data-swarm-light="a"|"b"]` on `#page` and
  `#scene` when the light turns.
