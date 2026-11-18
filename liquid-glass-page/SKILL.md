---
name: liquid-glass-page
description: Make a live web page with liquid lying on it — a real HTML page (text you can select, a field you can type in, buttons and sliders that work) seen through ripples, beads and one big drop you can drag as a magnifier, drawn with WebGL2 through HTML-in-Canvas. Ripples come from a damped wave equation, beads from a metaball field that refracts the page with Snell's law and dispersion, absorbs, casts shadows and caustics and reflects a small room; the pointer is a wet fingertip, a click ripples, beads slide, merge, trail and dry. Give it a topic and it designs the page (a camera-lens spec sheet, a spa price list, a rainy-day poem, an aquarium ticket, a honey tasting card), the liquid (water, honey, oil, mercury, resin or a new one: index, colour, viscosity, bead size), the weather (rain, drips, wind) and the light. Outputs one self-contained folder (index.html + lib/) that works from file:// and as a Claude artifact, plus stills. Use for "liquid glass", "water on a web page", "raindrops on the page", "honey dripping on a menu", "refraction over HTML", "HTML-in-Canvas water", or ("물방울 맺힌 웹페이지", "유리 위 빗물 페이지", "꿀이 흐르는 메뉴판", "HTML-in-Canvas 물 효과", "페이지 위에 물", "이 스타일로 ○○ 페이지 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Liquid Glass" demo https://claude.ai/artifact/CxxmVRwFgSmV9xB7XFsjbf on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# liquid-glass-page

A working web page lies under a layer of liquid. The page is ordinary DOM inside `<canvas layoutsubtree content="drawable">`;
`lib/liquid.js` draws its pixels through ripples, beads and one big drop. Every bead is a small lens: it bends the page with
Snell's law (several wavelengths, so edges split into colour), tints it by its depth, shades a contact shadow, focuses a
caustic and mirrors a little room. The pointer is a wet fingertip, a click starts ripples, heavy beads slide and leave
trails, and the big drop can be dragged across fine print as a magnifier. Under all of it the text stays selectable, the
field typeable, the buttons clickable (also through the magnifier) and find-in-page still works. Give it a topic and it
designs the page, the liquid, the weather and the light, and hands back one folder that runs from file:// or as a Claude
artifact.

Made from Felix Rieseberg's "Liquid Glass" demo — https://claude.ai/artifact/CxxmVRwFgSmV9xB7XFsjbf — one of the fifteen
demos on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared in "All hail the weird web"
(https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19). The demo is an optical test card under
water. `references/LOOK.md` lists what was observed. This skill keeps the idea, the interaction grammar and the technique and
writes all of its own code; it never copies the demo's code, shaders, text or layout. The worked example,
`examples/honey-tasting`, is a different topic with a different liquid: an apiary's tasting card with honey on it.

**Code-only.** No generated or downloaded images, video, motion, audio or fonts. System font stacks only.

**Fixed (the style)**: a real page under liquid, drawn by WebGL2 from the live DOM (HTML-in-Canvas); the three passes
(ripples on a float texture → metaball bead field → one glass pass that refracts with dispersion, absorbs, shadows, focuses
and reflects); the grammar (pointer = wet fingertip, click = ripple, drag the big drop as an exact magnifier that clicks
through, a splash verb, a wipe verb, a bench of real controls on the page itself); beads that sit, slide in stick-slip, trail,
merge, pool and dry; the page stays real; `#still`, `#calm`, `#fallback`.

**Designed per topic**: the page (what document it is, its content, layout, palette, type, the fine pattern under the
liquid); the liquid (`ior`, dispersion, tint, density, body, scatter, metal, sheen, bead shape and size, viscosity, trails,
ripples); the weather (rain, wind, drips, intro); the light (lamp direction, the window it reflects, sky); the bench's controls
and what physical cause each maps to; the verbs and all wording. The template (water on a rain card) and the example (honey
on a tasting card) are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/liquid.js` | the engine: ripples, bead field, glass pass, bead simulation, lens mapping + hit testing, `LIQUIDS` (water, honey, oil, mercury, resin), `Liquid.start(config)` and its API |
| `lib/hic.js` | the shared HTML-in-Canvas runtime (exact copy of `tools/hic/hic.js`; never edit the copy) |
| `templates/index.html` | the house example: a reading card in the rain (water), commented: what is fixed, what is designed |
| `templates/BRIEF.md` | the brief to fill |
| `examples/honey-tasting/` | the worked example: `BRIEF.md` + `index.html` (honey, drips, warmth → viscosity, a Drizzle verb) |
| `scripts/new-page.mjs` | start a project: copies `lib/` + the template (or `--from honey-tasting`) and rewrites paths to `./lib/` |
| `scripts/check.mjs` | proves a page: the shared checks + opens wet, refracts (and the index matters), ripples settle, fingertip trail, lens drag / rest / magnify / click-through, selection, splash, wipe, deterministic stills |
| `scripts/still.mjs` | stills: `--at`, `--act idle|splash|drag|trail|type`, `--to`, `--size`, `--hash dark`, `--liquid` |
| `scripts/hic-test.mjs` | the shared checks (exact copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (observed from the source) · **ENGINE** (config, liquids, API, adding things) · **LESSONS** · **HIC** (HTML-in-Canvas notes, exact copy) |

## Project layout (what you create)
```
my-page/
  BRIEF.md     the topic as a page + liquid + weather + light (references/BRIEF.md) — written first
  index.html   the page (real HTML inside the canvas), its CSS, and Liquid.start({...}) + the bench wiring
  lib/         hic.js + liquid.js (copied by new-page.mjs; the folder is self-contained)
  out/         stills (not committed)
```
Run scripts from anywhere with paths: `node <skill>/scripts/check.mjs my-page/index.html`.

Requirements: Node + Playwright Chromium (the scripts launch it with `--enable-blink-features=CanvasDrawElement` and
software GL). To view: Chrome / Edge 157+ or the Claude desktop app; other browsers show the same HTML as a plain page.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project as `BRIEF.md` and fill it from the topic
   (`references/BRIEF.md` explains every field): which real document the page is, its live parts and bench, what stays dry;
   the liquid and why (start from the nearest of `LIQUIDS`, then set its optics and motion); the weather; the light; palette,
   type and verbs. No code before the brief.
2. **Start**: `node <skill>/scripts/new-page.mjs my-page` (or `--from honey-tasting` when the topic is close to it).
3. **The page.** Rewrite the HTML inside `#page` for the topic: content, layout, palette, a fine pattern on the paper, one
   `data-hic-edit` field, `data-liquid="splash"` (+ `data-hic-click`) and `data-liquid="wipe"` controls, the bench. Keep
   `#page { position: relative }` and the canvas markup. Check 390 px: one column, no sideways scroll.
4. **The liquid, weather and light.** Write `Liquid.start({...})` from the brief. Wire each bench control with
   `Liquid.range` / `L.set` to a physical cause. A topic verb that the engine lacks (drizzle, steam, spray) is written in the
   page with `L.addDrop` / `L.impulse` (references/ENGINE.md).
5. **Stills and review**: `node <skill>/scripts/still.mjs my-page/index.html --out my-page/out --at 2` plus `--act drag --to
   <fine text>`, `--act splash`, `--hash dark`, `--size 390x844`. Open every still and score it against the still review in
   references/BRIEF.md (readable, this liquid, the lens, composed, both papers, no noise). Fix and repeat.
6. **Check**: `node <skill>/scripts/check.mjs my-page/index.html` must end with `all checks passed` and the deterministic
   still line `ok`.
7. **Hand over** the folder (and stills). It runs from file:// and as a Claude artifact (no network).

## Rules
- **Design for the topic.** The page, the liquid, the weather, the light, the controls and the wording are new for each
  topic. Do not reuse the rain card or the honey card unless the topic is exactly theirs; never recreate the source's optical
  test card, its text or its layout.
- **One style.** Whatever the liquid, it is a layer lying on a real page: three passes, beads that are lenses, the wet
  fingertip, click ripples, the draggable magnifier, splash and wipe verbs, a bench of real controls on the page.
- **The page stays real.** Text is DOM text; controls are real `<input>`, `<button>`, `<label>`. Nothing is a picture of text.
  Selection, Tab, typing and find-in-page work under the liquid.
- **What you see is what you click.** Under the big drop the page is placed through the lens mapping (`L.toPage` +
  `S.placeLocal`), and `__hic.screenOf` inverts it; outside it the page sits at its layout place (beads bend the picture by a
  few px only). Never move the lens shader without moving `toPage` with it.
- **Upload only on paint.** The page texture is uploaded in `onPaint`; the liquid animates every frame from the last upload.
- **One fallback, the same HTML.** Without the feature the children become an ordinary page with one line of explanation.
- **Calm and still.** `#calm` drops rain, drips, intro and idle wobble; `#still=s` simulates s seconds in fixed steps and
  holds. A page must look composed at `#still=2` with no pointer.
- **Deterministic.** All scatter from `HIC.rng(seed)`; no clocks or dates on the page.
- **Readable.** Keep the headline and prices dry (`keepDry`); never seed beads on controls; move the lens anchor if it hides
  the headline at load.
- **No network.** System fonts, no CDN; sound (optional) is synthesised, off until a gesture, with a visible toggle.
- **Phone width.** At 390 px nothing scrolls sideways; the page may scroll inside `#page`.

## Contract (what a page exposes)
- `window.__hic.ready` (set once the page was uploaded, the hit-test mode probed and the beads seeded), `__hic.fallback`,
  `__hic.screenOf(el)` (where an element is drawn, through the lens), `__hic.uploads / frames / errors`.
- `window.__liquid` = `L`: `state()`, `params`, `mat`, `set()`, `liquid()`, `splash()`, `wipe()`, `run(n)`, `freeze()`,
  `redraw()`, `rippleAt()`, `boxOf()`, `toPage()`, `inLens()`.
- The config object passed to `Liquid.start` (references/ENGINE.md).
- Markup: `[data-hic-edit]` (a field the check types into), `[data-hic-click]` (a button the check clicks, also through the
  lens), `[data-liquid=splash]`, `[data-liquid=wipe]`, optional `[data-liquid-select]` (text the check double-clicks).
- Hash: `#still=<s>`, `#calm`, `#fallback`, `#liquid=<name>`, `#dark` (template and example).
