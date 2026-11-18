---
name: paper-desk
description: Make a live web page that is a sheet of paper on a lamp-lit desk — real, editable HTML (type on it, select and bold a line, tick its boxes, find it with ⌘F) drawn in WebGL2 through HTML-in-Canvas, which the reader can curl, fold, crumple into a ball, spill coffee on and set alight, and which keeps working the whole time; a desk lamp with soft shadows, paper stocks and weights, props on the desk, burn fronts with glowing edges, char, embers and holes, synthesised sound. Give it a topic and it designs the document (a love letter, a treasure map, an exam paper, a resignation letter, a recipe card …), the paper stock and ink, the desk and its props, the light, and which physical acts fit the topic. Outputs one self-contained folder (index.html + lib/) that runs offline and as a Claude artifact, plus stills. Use for "HTML in canvas paper", "a page you can crumple / burn / fold", "interactive letter on a desk", "live document as physical paper", "WebGL paper sheet", or ("종이처럼 구기고 태울 수 있는 웹페이지", "책상 위 편지 페이지", "HTML 인 캔버스 종이", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Paper Desk" demo https://claude.ai/artifact/BKGBk584YpYtxBebEQsYSm on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# paper-desk

A document lying on a desk under a lamp. The document is a real web page: its text can be typed into, selected, made bold
and found with ⌘F; its fields, selects, checkboxes and buttons work. It is drawn as a sheet of paper in WebGL2 through
HTML-in-Canvas: the page's white becomes the paper stock, its ink stays ink, and the sheet bows a little, lifts a corner
and breathes. The reader can curl it, fold it, crumple it into a ball, spill on it and set it alight, and everything on
it keeps working while it is bent or burning, because the element is placed for hit testing exactly where it is drawn.
Give it a topic ("a love letter found in a drawer", "a pirate's treasure map", "a maths exam", "my resignation letter",
"grandma's recipe card") and it designs the document, the stock and ink, the desk, the props and the light, and turns on
only the acts that fit. The output is one self-contained folder (`index.html` + `lib/`) that runs offline, from `file://`
and as a Claude artifact.

Made from Felix Rieseberg's "The Paper Desk" demo (https://claude.ai/artifact/BKGBk584YpYtxBebEQsYSm), one of fifteen on
the HTML-in-Canvas demo page (https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk) shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. `references/LOOK.md` records what
was observed. This skill keeps the idea, the interaction grammar and the rendering approach and writes all of its own code;
it never copies the demo's code, text, layout or art. The worked example, `examples/resignation-letter` 「I Quit」, is a
topic the demo does not have.

**Code-only.** No generated or downloaded images, video, audio or fonts: system font stacks, procedural paper, desk and
props, Web Audio synthesis.

**Fixed (the style):** one sheet, top-down at 15°, filling the space between a top bar and a tool dock; the live DOM printed
onto a physical paper (white = stock, ink = ink, back side shows the ink through); a desk under one lamp with soft shadow,
contact shadow, a dark vignetted room; the acts and their physics (curl over a cylinder that springs back with the paper's
weight, folds that crease and spring open a little, hold-to-crumple onto a faceted ball that opens wrinkled, burn fronts
along noise with a glowing rim, char, embers and a hole, stains with a dried rim); the tool dock grammar (Type with corner
curl, act tools, Smooth out, New sheet); what you see is what you click; synthesised sound.

**Designed per topic:** the document (its HTML, size, type, live parts and one live behaviour), the stock (preset or new)
and inks, the stocks offered, the desk surface and colours, the lamp's colour and power, the props (from the kit or new),
which acts exist and their limits and colours (the stain's liquid), the wording of the dock and the hints. The template
and the example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/paper-desk.js` | the engine: `PaperDesk.create(config)`; stocks, desks, prop kit, deformation, picking and placement, lighting, particles, sound, staging (references/ENGINE.md) |
| `lib/hic.js` | the shared HTML-in-Canvas runtime (exact copy of the repo master; never edit the copy) |
| `templates/index.html` | the house example: a letter on a walnut writing desk with an inkwell, a pen, a seal and a lit candle |
| `templates/BRIEF.md` | the brief to fill |
| `examples/resignation-letter/` | the worked example 「I Quit」: `BRIEF.md` + `index.html` (memo on copy paper, laminate desk, coffee, a stapler prop made in the page, Tone slider, coffee stains) |
| `scripts/new-page.mjs` | start a project: copies `lib/` and the template (or `--from resignation-letter`), rewrites paths to `lib/` |
| `scripts/check.mjs` | the shared checks plus the acts with real mouse input and numbers |
| `scripts/still.mjs` | stills: `--act "idle;curl;fold;crumple;burn;stain;night,burn"`, waits until the desk is at rest |
| `scripts/hic-test.mjs` | the shared checks (exact copy of the repo master) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (the source, observed) · **ENGINE** (API, config, adding stocks / desks / props) · **HIC** (HTML-in-Canvas notes, shared copy) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-desk/
  BRIEF.md     the topic as a document on a desk (references/BRIEF.md) — written first
  index.html   the sheet's HTML + CSS, the room's UI, PaperDesk.create({...}) and the document's own DOM code
  lib/         hic.js + paper-desk.js (copied by new-page.mjs; never edited)
  out/         stills (not committed)
```
Run scripts from anywhere, giving the page's path: `node <skill>/scripts/check.mjs my-desk/index.html`.

Requirements: Node + Playwright Chromium (the scripts pass `--enable-blink-features=CanvasDrawElement`). Viewing live needs
Chrome / Edge 157+ or the Claude desktop app; other browsers get the plain-page fallback. No network, no npm install.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project as `BRIEF.md` and fill it from the topic
   (references/BRIEF.md): what the document is and who wrote it for whom, its size, live parts and one live behaviour; the
   stock and inks; the desk, lamp and 2–5 props; which acts the topic earns and their wording. Write it before code.
2. **Start:** `node <skill>/scripts/new-page.mjs my-desk` (or `--from resignation-letter` when the topic is close to it).
3. **The document.** Rewrite `#sheet` for this topic: its HTML, its CSS (keep `background: #fff`, `--ink`), its size. Mark
   one `data-hic-edit`, one `data-hic-click`, `data-pd-probe` on a central element. Write its DOM behaviour as ordinary JS.
   Keep the fallback CSS block.
4. **The desk.** Set `stock`, `desk`, `lamp`, `room`, `props` and `acts` in `PaperDesk.create`. A stock, desk or prop the
   kit lacks is added in the page (`PaperDesk.STOCKS.x`, `PaperDesk.PROPS.x = function (B, o) {…}`, references/ENGINE.md).
   Rename the dock buttons and hints in the topic's words; delete buttons of acts that are off (`wire()` hides them anyway).
5. **Stills and review.** `node <skill>/scripts/still.mjs my-desk/index.html --out my-desk/out --act "idle;curl;fold;crumple;burn;stain;night,burn"`
   and also `--act select` and `--size 390x844`. Open every still and score it against the still review in
   references/BRIEF.md (readable, paper of this stock, the writer's desk, props framing, physical acts, night light, live).
   Fix and repeat until every still passes.
6. **Check:** `node <skill>/scripts/check.mjs my-desk/index.html` must end with every line `ok`. It proves the shared
   HTML-in-Canvas contract and the acts with numbers: flat hit testing exact, a curl lifts and settles within 3 s, typing
   through a curl, a fold that creases and smooths out, a crumple to < 45 % area that opens wrinkled, a half-crumpled sheet
   that still types, a burn that grows with embers and a hole that is not hittable while the rest stays typeable, a stain,
   the lamp, a fresh sheet, sound only after a gesture, deterministic `#still`.
7. **Hand over** the folder (and stills). It runs offline and as a Claude artifact.

## Rules
- **Design for the topic.** The document, stock, desk, props, light, acts and wording are designed for this topic. Do not
  reuse the template's letter or the example's memo unless the topic is exactly theirs, and never recreate the source
  demo's sheet (its controls page, video figure, stamp or field-test list).
- **One style.** One sheet on one desk under one lamp, top-down at 15°, with the dock below and a top bar above. New
  stocks, desks and props are made with the same engine and look; no flat 2D page, no second sheet, no camera moves.
- **The page stays real.** Text is DOM text; controls are real elements; nothing is a picture of text. Every DOM change
  re-uploads by itself.
- **What you see is what you click.** Never move or hide the sheet yourself; the engine places it. Holes and the back side
  are not clickable by design.
- **White is paper.** The sheet's background is `#fff`; colour comes from the stock. Ink colours go through `--ink`.
- **Only the acts the topic earns,** each named in the topic's words. Curl stays on unless the topic forbids touching.
- **Props frame, never cover.** |x| ≥ 1.25 half-sheets; tall props near the vertical middle.
- **Weight sets motion.** The stock's gsm sets the curl radius, spring and crumple speed; do not fake a heavy card with a
  light paper's numbers.
- **Code-only, no network:** system font stacks, no images, no CDN, sound synthesised and started by a gesture with a toggle.
- **HTML-in-Canvas rules** (references/HIC.md): upload only on paint, `#still` / `#calm` / `#fallback` work, deterministic
  look (seeded), phone width without sideways scroll, one fallback with the same HTML.

## Contract (what a page exposes)
- `window.__hic.ready` (after the first upload and the hit-test probe), `window.__hic.screenOf(el)` (screen point of an
  element through the bend), `window.__desk` (the desk API: `state`, `stage`, `surface`, `toScreen`, `pick`, `burns`,
  `particles`, `uploads`, `renders`, `audio`, `config`).
- The config object passed to `PaperDesk.create` (references/ENGINE.md) is the whole design of the desk.
- Address: `#still=<s>` frozen time · `#calm` no idle motion · `#fallback` the plain page · `#act=<names>` staged states ·
  `#q=low` cheap quality for checks.
- With the feature off, the same HTML is an ordinary page with one note line, and the dock is hidden.
