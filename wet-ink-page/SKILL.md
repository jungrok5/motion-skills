---
name: wet-ink-page
description: Make a live web page printed in wet ink — a poem broadside, a menu, a gallery opening, a manifesto, an invitation — that the reader stirs like a marbler's bath. Dragging combs the real page's letters and shapes into ribbons and crescents that coast and settle with the ink's viscosity, a press drops a blooming disc or bullseye of pigment, pigment ribbons stay crisp however far they are pulled, and the page stays a working page while it swims (type into it, click the drifted buttons, select text); Esc plays the whole stir backwards until every letter is home. Real DOM drawn by WebGL2 through HTML-in-Canvas, code-only, one self-contained folder (index.html + lib/). Give it a topic and it designs the page's content and controls, the paper, the named pigment palette, the viscosity, the comb (stylus, comb or whisk), the drops and the idle demo. Use for "wet ink page", "marbling page", "stir the page", "liquid text website", "ink you can drag", "HTML in canvas ink", "marbled menu", or ("젖은 잉크 페이지", "마블링 웹페이지", "글자를 휘저을 수 있는 페이지", "잉크처럼 번지는 웹페이지", "이 스타일로 ○○ 메뉴판 만들어줘", "주제만 바꿔서", "HTML-in-Canvas 잉크"). Source — made from the "Ink" demo https://claude.ai/artifact/WEmmb18oUbyCSkYyB1JMiB on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# wet-ink-page

A live web page printed in wet ink. The page is ordinary HTML laid out inside a `<canvas>` (HTML-in-Canvas); WebGL2 draws
it as if every mark were floating on a marbler's bath. Drag across it and a small fluid carries a displacement map, so the
real letters, rules and colour blocks are combed into ribbons, hooks and crescents that coast after the hand lifts and
come to rest according to the ink's viscosity. A press without a drag drops pigment that blooms open and pushes the print
aside; ribbons of pigment are laid on the sheet itself, so they are carried with it and stay sharp. Through all of it the
page still works: the text field takes typing, the drifted buttons and colour chips click where they are drawn, Shift-drag
selects text. Esc (or Settle) plays a recorded film of the stir backwards until everything is home. Give it a topic and it
writes a brief, designs the page (content, controls, paper, named pigments, viscosity, comb, drops, idle demo) and builds
it as one self-contained folder that works from file:// and as a Claude artifact.

Made from Felix Rieseberg's "Ink" demo — https://claude.ai/artifact/WEmmb18oUbyCSkYyB1JMiB — one of the fifteen on his
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared in the post "All hail the weird web"
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. `references/LOOK.md` lists what was
observed. This skill keeps the idea, the interaction grammar and the technique family and writes all of its own code; it
never copies the demo's code, text or art. The worked example, `examples/tea-room` (a tea room's menu stirred with a
five-tine whisk and dropped with milk bullseyes), is a topic the source does not have.

**Code-only.** No generated or downloaded images, video, motion, audio or fonts: system font stacks, synthesised sound.

**Fixed (the style)**: one printed sheet filling the window, made of real DOM; the material (print as absorbing ink on
paper, floated pigment ribbons that do not mix, pale halos, paper grain, wet sheen); the grammar — drag = stir with coast
and settle, press = drop that blooms, hover stirs faintly, type while it moves, click what you see, Shift-drag selects,
Esc / Settle plays the stir backwards, an idle demo with a ghost comb, a thin ↔ thick control; the engine (`lib/wet-ink.js`
over `lib/hic.js`); the live-page rules of `references/HIC.md`.

**Designed per topic**: the page's content and layout (headline + what typing means, the body, 2–3 solid colour masses,
the topic's own button); the paper and press ink; 3–6 pigments named for the topic (an opaque one if it fits); the
viscosity control's name and range; the comb (teeth, spacing, ribbon, threads), the drop (size, rings, spread), the look
numbers; the idle demo's strokes, words and picks; the acts for stills; the wording. The template (a poetry broadside)
and the example (a tea-room menu) are examples of the style, not menus to pick from.

## What's in this folder
| path | what |
|---|---|
| `lib/hic.js` | the shared HTML-in-Canvas runtime (exact copy of `tools/hic/hic.js`; never edit the copy) |
| `lib/wet-ink.js` | the engine: velocity field, displacement map, pigment store, blooming drops, film + rewind, show shader, CPU read-back hit testing, idle demo, sound, API / test hook, `WetInk.path`, `WetInk.fitText` |
| `templates/index.html` | a working, commented starting page: a poetry broadside (4 pigments + water, stylus comb) |
| `templates/BRIEF.md` | the brief to fill |
| `examples/tea-room/` | the worked example: `BRIEF.md` + `index.html` (whisk comb, milk bullseye, Pour buttons, tray) |
| `scripts/new-page.mjs` | start a project: `index.html` + `BRIEF.md` + `lib/` in one folder (`--from tea-room`) |
| `scripts/check.mjs` | the shared checks + stir, coast, drop, pigment, warp-hit, viscosity, settle, still determinism — with numbers |
| `scripts/still.mjs` | stills: `--at` (idle demo time, deterministic), `--act` (scripted states), any size |
| `scripts/hic-test.mjs` | the shared checks (exact copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (observed from the source) · **ENGINE** (API, config, pipeline, extending) · **HIC** (the HTML-in-Canvas notes, exact copy) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-page/
  BRIEF.md      the topic as a page: content, palette, material, demo (references/BRIEF.md) — written first
  index.html    the page (HTML + CSS) and window.INK (the material) → WetInk.start(INK)
  lib/          hic.js + wet-ink.js (copied by new-page.mjs; the folder is self-contained)
  out/          stills (not committed)
```
Run scripts from the project root: `node <skill>/scripts/check.mjs index.html`.

Requirements: Node + Playwright Chromium (the scripts launch it with `--enable-blink-features=CanvasDrawElement`). To view
a page: Chrome / Edge 157+ or the Claude desktop app; any other browser shows the plain-page fallback. No network, no npm
install. Headless checks use software GL, so they are slow (a few minutes per page) and frame rates there mean nothing.

## Workflow
1. **Topic → brief.** Fill `templates/BRIEF.md` from the topic (references/BRIEF.md explains every field): what the sheet
   says and what typing means; the body; 2–3 solid colour masses; the paper and 3–6 pigments named for the topic; the
   viscosity, comb and drop; the idle demo; 2–3 acts for stills. Save it as `BRIEF.md` before any code.
2. **Start**: `node <skill>/scripts/new-page.mjs my-page` (the broadside) or `--from tea-room`.
3. **Design the page** in `index.html`: replace the content, the CSS palette and layout, the chips, the gauge's words, the
   topic's button. It must fit one window at 1280×800 and 390×844 with no scroll; keep `data-hic-edit` on the field and
   `data-hic-click` on a button. Write `window.INK`: pigments, viscosity, comb, drop, look, demo steps, acts.
4. **Stills and review**: `node <skill>/scripts/still.mjs index.html --out out --at 1,<mid-demo>` and
   `--act <each act>`, then `--width 390 --height 844 --at 1`. Score every still against the still review in
   references/BRIEF.md (composed at rest, wet ink when stirred, pigments read as their names, no moiré, phone in one column).
   Fix the layout or the material numbers and repeat.
5. **Check**: `node <skill>/scripts/check.mjs index.html` must end with `all checks passed` and the two `still` lines `ok`.
6. **Hand over** the folder (open `index.html` in Chrome 157+ / the Claude app, or publish it as an artifact).

## Rules
- **Design for the topic.** Content, controls, paper, pigments (and their names), viscosity, comb, drops, demo and acts are
  new for each topic. Do not reuse the broadside's poem or the tea room's menu unless the topic is exactly theirs, and never
  recreate the source demo's specimen sheet, its headline or its copy.
- **One style.** Every page is one printed sheet of real DOM in wet ink with the same grammar (drag stirs and coasts, press
  drops, type while it moves, click what you see, Esc plays it back, idle demo). New behaviour goes through the config, a
  path, an act or a hook, in the same material — not a different effect bolted on.
- **The page stays real** (references/HIC.md): text is DOM text, controls are real inputs and buttons, Shift-drag selects,
  find-in-page works. Never paint text into the shader or fake a control.
- **What you see is what you click.** The engine places the page with the map's local affine at the pointer; keep every
  control inside `#page` and let `check.mjs` prove it (warp-hit, pigment).
- **Upload only on paint**; never animate the page's own HTML (no CSS animation inside `#page`) unless you pass `animates`.
- **One window.** `#page` is `100vw × 100vh` and never scrolls; at 390 px it reflows to one column; the fallback scrolls.
- **Print darker than the paper.** A pigment lighter than the print (milk, chalk) needs `data-cover` ≥ .9.
- **Solid masses carry the look.** At least two large solid shapes; small text alone only streaks.
- **Weight and settle.** Viscosity sets how far a stroke carries and how long it coasts; the rewind eases in and out. Do
  not set damping so low that a page never rests (thin ≥ .3 / s).
- **Deterministic stills.** No `Math.random` or clocks in the page; `#still=<t>` and acts must give the same picture
  every load (the check proves it).
- **Sound** only from the engine's synthesis (or Web Audio in the page), off until the reader turns it on.
- **No network**, system fonts only, one folder.

## Contract
- `window.INK` — the config object passed to `WetInk.start(INK)` (live: the engine reads it as it runs).
- `window.__hic.ready` — set when the page has been uploaded, the hit-test mode probed and (with `#still`) the demo pre-run.
- `window.__hic.screenOf(el)` — where an element's centre is drawn now (canvas CSS px), inverting the map.
- `window.__hic.ink` — the API: `state`, `stroke`, `drop`, `run`, `settle`, `finish`, `reset`, `pick`, `viscosity`, `demo`,
  `act`, `toPage`, `screenAt` (references/ENGINE.md).
- `#still=<t>` (deterministic idle-demo state, live stepping off) · `#calm` (no demo / hover, quick settle; also
  `prefers-reduced-motion`) · `#fallback` (the plain page) · `#q=<0.3–1>` (canvas resolution).
