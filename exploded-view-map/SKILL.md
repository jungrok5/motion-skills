---
name: exploded-view-map
description: Make a live web page — a planner with a contour map, a route, readouts, a sun slider, a toggle and a list of stops — that comes apart in 3D through HTML-in-Canvas. The map's contour bands become stacked paper plates at their own heights, forming a terraced relief; the UI cards float up beside it like lecterns; the pins stand up on stems; drag turns it, scroll pulls the layers apart, a click lifts a layer, and Escape puts it back. The sun the slider sets lights it, with shadows marched through the plates above and ambient occlusion from the plate field; after dusk lamps glow at the pins. Every card stays a working page while apart (type the title, drag the slider, press a stop) and paper-on-desk sounds are synthesised. Give it a topic (a coral-reef dive plan, a cycling route over a city's hills, a ski area, a vineyard's terraces, a building's floors) and it designs the ground (a height function or a layer list), the levels, the palettes and what the toggle means, the cards, readouts and wording, the route, pins, desk and sound. One self-contained folder, no network, works from file:// and as a Claude artifact; Chrome/Edge 157+ or the Claude desktop app, a plain working page elsewhere. Use for "exploded view", "take the page apart in 3D", "layered terrain map", "contour layers you can pull apart", "3D topographic planner", "HTML-in-Canvas page", or ("분해도 페이지", "지도를 층층이 분리하는 3D 페이지", "등고선 레이어가 떠오르는 지도", "웹페이지를 3D로 분해", "HTML-in-Canvas 페이지", "이 스타일로 ○○ 지도 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Exploded View" demo https://claude.ai/artifact/CBxLSFEFnojedyQW5L458v on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# exploded-view-map

An ordinary planner page — a topographic map with a route and pins, and a column of cards (an editable title, readouts
with a profile, a sun slider and a two-way toggle, a list of stops) — laid out inside a `<canvas>` and drawn by WebGL2
through HTML-in-Canvas. It comes apart: the map's contour bands become paper plates stacked at their own heights, a
terraced relief with cut-card walls; the cards lift and lean up like lecterns, turning to face you; the pins stand on stems
above the plate they belong to; the route becomes a ribbon that climbs the steps. Drag turns it, scroll pulls the layers
further apart, a click lifts one layer with everything above it, Escape or the button puts it back flat. The page's sun
lights it: rays are marched through the plates above every point, the plate field gives ambient occlusion at each step, the
desk darkens and lamps glow at the pins after dusk. It stays a real page throughout: the title takes typing, the slider
drags, the toggle switches, stops light up with their pins and wind the clock, text can be selected, and a small tag names
the DOM element under the pointer. Give it a topic and it designs a new page in this style.

Made in this repo from Felix Rieseberg's "Exploded View" demo — https://claude.ai/artifact/CBxLSFEFnojedyQW5L458v — one of
the fifteen on his HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. `references/LOOK.md` lists what was
observed from it. This skill keeps the idea, the interaction grammar and the technique, and writes all of its own code,
terrain, text and sound. The template (an island ride planner) and the worked example `examples/reef-dive` (a coral-reef
dive plan: depth as negative height, water-tinted deep plates, moving caustics, a living / bleached coral toggle) are
topics the source does not have. Never recreate the source's mountain, route, names or wording.

**Code-only.** No generated or downloaded images, video, audio or fonts: system font stacks, terrain from code, sounds
synthesised with Web Audio (off until the page's toggle).

**Fixed (the style)**: a real web page in a `<canvas layoutsubtree content="drawable">`; a map cut into stacked paper
plates (contour bands of a height function, or a layer list) beside floating UI cards on a sheet on a desk; the flat page
first, then the explode (thickness first, gaps from the top down) with weight and settle; lectern cards that face the
camera; pins on stems; the route as one ribbon over the steps; drag / scroll / click-to-lift / Escape; light from the page's
slider with marched plate shadows, plate-field AO, a lit desk, night lamps; every drawn piece placed for hit testing where it
is drawn; uploads only on paint; one fallback with the same HTML; paper sounds on a desk.

**Designed per topic**: what is taken apart (a height function and its levels, or the layer list and its outlines); what is
printed on the plates (labels, decorations); the palette ramps and what the toggle means; the cards' HTML, readouts, units
and wording; what the slider means and the light model; the route, pins and marker; plate thickness, gap, core colour and
weight; the desk; water or haze (`atmos`); the sound's voice. The template and the example are examples of the style, not
menus.

## What's in this folder
| path | what |
|---|---|
| `lib/exploded.js` | the engine: plates from a height function or layers, the plate field, pieces, springs, camera fit, shaders (plates, walls, sheet, desk, cards, pins, route ribbon), hit-test placement, input, `daylight()` |
| `lib/terrain.js` | `EVTerrain`: noise, `ridges`, `bumps`, `warp`, `rough`, `floor`, `sample`, `contours` (marching squares), `spline` |
| `lib/exploded.css` | default look of the engine's pieces (plates, pins, marker, route, tag) and the live-page rules |
| `lib/paper-sound.js` | `PaperSound`: riffle, land, flick, lift, tick, touch — synthesised, silent until enabled |
| `lib/hic.js` | the shared HTML-in-Canvas runtime (copy of `tools/hic/hic.js`) |
| `templates/` | `index.html` (an island ride planner, every topic part marked `TOPIC`), `BRIEF.md` |
| `examples/reef-dive/` | the worked example: `BRIEF.md`, `index.html` |
| `scripts/new-page.mjs` | start a project (`lib/` + the template, or `--from reef-dive`) |
| `scripts/check.mjs` | the shared checks + apart / cards and pins hit / type while turned / slider drag / lift / variant / night / together, with numbers |
| `scripts/still.mjs` | stills: `--act flat,apart,turn,low,dusk,night,lift,variant,phone` |
| `scripts/hic-test.mjs` | the shared check runner (copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, the still review) · **LOOK** (observed from the source) · **ENGINE** (API, how to extend) · **HIC** (the shared HTML-in-Canvas notes) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-exploded-map/
  BRIEF.md     the topic as a planner: ground, levels, palettes, cards, route, sound (references/BRIEF.md) — written first
  index.html   the page: CSS (palette, layout + phone layout), the cards' HTML, the height function, ExplodedView.create(…)
  lib/         copy of the skill's lib/ (new-page.mjs)
  out/         stills (not committed)
```
Run the scripts from the project root: `node <skill>/scripts/check.mjs index.html`.

Requirements: Node + Playwright Chromium (the scripts pass `--enable-blink-features=CanvasDrawElement`). No network, no
npm install. Viewing: Chrome/Edge 157+ or the Claude desktop app; anything else gets the plain page.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project as `BRIEF.md` and fill it from the topic (references/BRIEF.md):
   what is taken apart (a height function or a layer list, its unit, 6–15 levels), what the plates print, two palettes and
   what the toggle means, the four cards and their readouts, the slider's meaning, the route, pins and marker, material,
   desk, air and sound, and what each still must show.
2. **Start**: `node <skill>/scripts/new-page.mjs my-exploded-map` (or `--from reef-dive` when the topic is close to it).
3. **The ground.** Write the height function from `EVTerrain` parts (or the layer SVGs). Render `still.mjs index.html --act flat`
   and look: every feature in the brief must show in the contours. Tune levels and labels.
4. **The page.** Redesign the cards' HTML, wording and CSS for the topic (and the phone layout under 760 px), the readouts
   from `view.route`, the slider's light function, the toggle's variants, the pins and route. Keep `data-ev`, `data-pin`,
   `data-hic-edit` and `data-hic-click` on the right elements.
5. **Stills and review**: `node <skill>/scripts/still.mjs index.html --out out --act flat,apart,turn,night,variant,phone`.
   Score each against the still review in references/BRIEF.md (a believable flat page; a relief that reads as the topic;
   nothing black, clipped or overlapping; readable cards from every side; lamps at night; a meaningful variant; a phone
   layout that fits). Fix and repeat.
6. **Check**: `node <skill>/scripts/check.mjs index.html` must end in `all checks passed`. It proves the shared rules
   (draws, click-through, typing re-uploads, a click reaches a stop, phone width, fallback) and this style's own: the stack
   rises and settles, every card and pin is hit where drawn, the title takes typing while apart and turned, a real drag on
   the drawn slider sets the right value and changes the light, a click lifts a plate and a second puts it down, the
   variant re-uploads, night darkens, Escape puts it back.
7. **Listen**: open it, press Sound, pull apart and put back together; the riffle, flicks and landing should be soft.

## Rules
- **Design for the topic.** The ground, levels, palettes, toggle, cards, readouts, wording, route, pins, desk and sound are
  designed for this topic. Do not keep the template's island or the example's reef unless the topic is exactly theirs.
  Never recreate the source demo's mountain, route, names or text.
- **One style.** Paper plates with cut-card walls, lectern cards, pins on stems, the ribbon route, the flat-first explode,
  the drag / scroll / click-to-lift / Escape grammar, the slider-driven sun with marched shadows. A new topic changes what is
  printed and how it is coloured, not the grammar.
- **The plates are the subject.** They are the thing the topic stacks (ground, depth, floors, terraces), 6–15 of them,
  bottom first. Not decoration, not a chart.
- **The page stays real.** Text is DOM text; controls are real inputs and buttons; plates are SVG in the DOM (labels are
  text). Nothing is a picture of text. Any new control goes in a card as HTML.
- **What you see is what you click.** Every drawable piece is placed with the camera's matrix; layout changes after
  `create()` are re-measured at the next paint. Range inputs are driven from the camera. The check proves it with real clicks.
- **Upload only on paint.** Cards and pins re-upload on paint; plates and the sheet only when their pixels changed
  (`setVariant`, `refresh()`, a size change).
- **Weight and settle.** Every motion is a spring: the explode, each plate (top plates lag and overshoot a little), the cards,
  the pins popping past upright. `material.weight` sets it per topic. Nothing teleports except in `#still` / `#calm`.
- **Readable apart.** Cards fully on screen and upright; text never smaller than about 9 px in the apart view at 1280 × 800;
  no pure black in the creases; pins never stacked on top of each other.
- **Honest numbers.** Readouts come from the route and the height function with the topic's scale; a rule of thumb is
  labelled as one (the reef: "Illustration only, not dive advice").
- **HTML-in-Canvas rules** (references/HIC.md): one fallback with the same HTML (`HIC.fallback`), `#still` / `#calm`
  composed, seeded scatter, sound synthesised and off until the toggle, no network, no sideways scroll at 390 px.

## Contract (what the page exposes)
- `window.__hic.ready` once the first uploads are in, hit testing is probed and the intro has settled;
  `__hic.screenOf(el)` → where `el` is drawn (canvas px).
- `window.__ev` (the view): `state` (`e`, `eT`, `yaw`, `tilt`, `peel`, `plates`, `topZ`, `settled`, `mode`, `uploads`),
  `pose({ apart, yaw, tilt, zoom, lift, snap })`, `settle()`, `apart(v)`, `together()`, `setVariant(name)`,
  `setLight(L)`, `setMarker(f)`, `animateInput(input, value, rate)`, `screenOf(el, fx, fy)`, `route`, `heightAt(u, v)`,
  `plates`, `on('pin' | 'apart' | 'ready', fn)`.
- The config object passed to `ExplodedView.create(canvas, cfg)`: see the header of `lib/exploded.js` and references/ENGINE.md.
- Hash: `#still=<s>` (frozen, springs snapped; the intro has happened by 0.7 s), `#calm`, `#fallback`, `#nointro`,
  `#q=<scale>`, `#apart=`, `#yaw=`, `#tilt=`, `#zoom=`, `#lift=`, `#variant=`, and the template's `#sun=<0..1>`.
