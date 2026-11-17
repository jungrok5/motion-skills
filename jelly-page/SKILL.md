---
name: jelly-page
description: Make a live web page set in a slab of jelly — real HTML (an editable headline, text fields, radios, a range, buttons) drawn by WebGL through HTML-in-Canvas as candy letters hanging inside a glossy, moulded, translucent jelly on a plate on a tablecloth, lit by an imagined room with coloured light through the jelly onto the plate. Press and pull the jelly and it wobbles (soft-body springs, refraction, reflections); temperature changes its stiffness down to melted flat; a drop button makes it bounce; synthesised squelches; the page under it stays clickable and typeable. Give it a topic and it designs the page and its controls, the flavours, the mould, the cloth, the plate, the room, the bits set in the jelly and the sound. Outputs one self-contained folder (index.html + lib/) and stills. Use for "jelly page", "wobbly web page", "jello website", "page set in jelly", "squishy interactive invite", "HTML in canvas jelly", ("젤리 페이지", "젤리 속에 든 웹페이지", "말랑말랑 흔들리는 페이지", "젤리처럼 출렁이는 초대장", "이 스타일로 ○○ 페이지 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Jelly" demo https://claude.ai/artifact/HGJRkas2J1QTVjctgi5A7V on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
---
hic: true

# jelly-page

A working web page set in jelly. The page is ordinary HTML inside `<canvas layoutsubtree content="drawable">`; lib/hic.js
hands its pixels to WebGL, and lib/jelly.js draws them as candy letters hanging under the top of a moulded, translucent
jelly standing on a plate. Press and pull: a dent follows the pointer, the slab leans and stretches, and on release it rings
and settles. Typing jiggles the jelly where the letters are. A temperature control turns it from firm and fast to loose
and slow, then melts it into a flat page seen from above. A drop button lifts it, lets it fall and squash. Through all of
it the page stays a page: the field under the pointer is the field you click, text is typeable, controls work. Give it a
topic ("a kids' party invite", "a bakery's dish of the day", "a product launch sign-up") and it writes a brief, designs the
page and its controls, the flavours, mould, cloth, plate, room, bits and sound voice, and builds one self-contained folder.

Made in this repo from Felix Rieseberg's "Jelly" demo — https://claude.ai/artifact/HGJRkas2J1QTVjctgi5A7V — one of fifteen
demos on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared in the post "All hail the
weird web" at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. `references/LOOK.md`
records what was observed. The skill keeps the idea, the interaction grammar and the rendering technique, and writes all
of its own code, text, colours and sounds. The worked example `examples/party-invite` ("Mia is 6!") is a topic the
demo did not have.

**Code-only.** No generated or downloaded images, video, audio, fonts or motion. Sound is synthesised (Web Audio).

**Fixed (the style)**: a live page set inside a translucent moulded jelly on a plate, seen from above at an angle; dark ink
as candy letters with thickness, hanging under the top; refraction and Beer–Lambert colour; walls glowing with light
that crossed the jelly; a paned window and a lamp seen only in reflections; a coloured shadow with a bright fringe; the
grammar — press and pull to wobble, a jiggle on typing, a gentle prod on controls, a tremble when brushed, temperature from
firm to melted flat (top-down), a drop with gather, lift, fall, squash and settle; flavour changes jelly, bits and cloth
together; sound off until asked; the HTML-in-Canvas rules (below).

**Designed per topic**: the page (its HTML, wording, job and controls, and its portrait layout); the ink and candy
colours; the flavours (2–5, named in the topic's words); the mould (rect or oval, flutes, depth, tiers, height); the
material (frequencies, damping); the cloth (pattern, colours, scale), the plate (glass or china, band), the room (window,
panes, lamp, wall); the bits (fruit, bubbles, sprinkles); the sound voice (pitch, wetness); the hint wording. The template
and the example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/jelly.js` | the engine: mould → height field, wobble field + body modes, camera, shaders (table pass, jelly pass), pointer ray → page mapping, interaction, acts for stills; `JELLY.create(config)` |
| `lib/squelch.js` | synthesised sounds (poke, grab, release, type, lift, land, melt, flavour) |
| `lib/hic.js` | the shared HTML-in-Canvas runtime (exact copy of `tools/hic/hic.js`; never edit the copy) |
| `templates/index.html` | the house example ("Jiggle": rect mould, striped cloth, glass plate, fruit), commented |
| `templates/BRIEF.md` | the brief to fill |
| `examples/party-invite/` | the worked example: `BRIEF.md` + `index.html` (oval tiered mould, china plate, dotted cloth, sprinkles, an RSVP form) |
| `scripts/new-page.mjs` | start a project: copies `lib/` and the template (or `--from party-invite`) into one folder |
| `scripts/check.mjs` | the shared checks plus pull, settle, live mid-wobble click, colour, drop, melt, sound, deterministic stills — with numbers |
| `scripts/still.mjs` | stills of any state: `--at 1`, `--act pull|release|drop|poke|type|melt|set|flavour:<name>`, `--phone` |
| `scripts/hic-test.mjs` | shared checks (exact copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (observed from the source) · **ENGINE** (config, API, how to add a shape, cloth, sound) · **HIC** (HTML-in-Canvas notes, copy) · **LESSONS** |

## Project layout (what you create)
```
my-jelly/
  BRIEF.md      the topic as a jelly page (written first)
  index.html    the page HTML + CSS, the CONFIG, the wiring of its controls
  lib/          hic.js, jelly.js, squelch.js (copied by new-page.mjs)
  out/          stills (not committed)
```
Run scripts from the project root with the skill's path: `node <skill>/scripts/check.mjs index.html`. The page works
opened from file://, from any static server and as a Claude artifact (inline the three lib files for an artifact).

Requirements: Node + Playwright Chromium (checks and stills pass `--enable-blink-features=CanvasDrawElement`). Viewing
live: Chrome / Edge 157+ or the Claude desktop app; other browsers get the plain page.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project and fill it from the topic (references/BRIEF.md explains
   every field): the page's job and its rows, the editable big line, the topic's controls (one with `data-hic-click`
   that answers), the jelly controls in the topic's words, ink and candy, flavours, mould, material, setting, bits, sound.
2. **Start**: `node <skill>/scripts/new-page.mjs my-jelly` (or `--from party-invite`).
3. **The page.** Rewrite the HTML inside `#page` and its CSS for the topic: transparent background, one dark ink, a
   fixed size (e.g. 960×600) and a portrait size in `@media (max-aspect-ratio: 4/5)`. Controls are real elements. Wire
   them in the script: flavour radios → `J.setFlavour`, range → `J.setTemperature`, the drop button (`id="drop"`) →
   `J.drop()`, the topic's own button → its own answer.
4. **The CONFIG.** Flavours, candy, paper, mould, material, table, plate, room, bits, sound, temperature (references/ENGINE.md).
   Something the engine lacks (a new cloth, a mould outline, a sound) is added as ENGINE.md describes; keep it in the
   project when it is topic-only.
5. **Check**: `node <skill>/scripts/check.mjs index.html` must end with `jelly checks passed`.
6. **Stills and review**: `node <skill>/scripts/still.mjs index.html --out out --at 1`, then `--act pull --at .5`,
   `--act drop --at .3,.85`, `--act melt --at 2.5`, `--act flavour:<other> --at 1.5`, `--phone`. Score each against the
   still review in references/BRIEF.md (reads, jelly, grounded, setting, state, phone, no mud) and record it in BRIEF.md.
   Fix and repeat until every row passes. Then try it live in a browser with the flag (pull, type, drop, melt, sound).

## Rules
- **Design for the topic.** The page, controls, flavours, mould, setting, bits and sound are designed for this topic.
  Do not reuse the template's "Jiggle" or the example's invitation unless the topic is theirs, and never recreate the
  source demo's page or wording.
- **One style.** Every page is a page set in a translucent moulded jelly on a plate, seen from above at an angle, with
  candy letters inside, room reflections and a coloured shadow, and the same grammar (pull, jiggle on type, prod on
  controls, temperature to melted, drop). A new cloth, mould or sound follows the same lighting and motion.
- **The page stays real.** Text is DOM text; controls are real `<input>`, `<button>`, `<label>`. It can be typed into,
  tabbed through and found with ⌘F. Never draw text in the shader.
- **What you see is what you click.** The page is placed with the warp's local affine under the pointer
  (`S.placeLocal`), on every pointer move and each frame while the jelly moves. `check.mjs` clicks through the warp,
  mid-wobble and melted.
- **Upload only on paint**, premultiplied, at on-screen size × dpr × `upload` (capped), with mips.
- **One fallback.** Without the feature the same HTML is an ordinary page (`HIC.fallback`); wire controls so they still
  answer.
- **Calm and still.** `#still=<s>` (and `&act=`) is deterministic; `#calm` drops the intro and the lean. At `#still=1`
  the page is composed with no pointer.
- **Legible inside the jelly.** Five rows at most, a big line of 12–14 letters at most, text ≥ 22 px at page size, the
  page entirely under the flat top (the engine enforces the margin), candy that contrasts with every flavour.
- **Weight and settle.** Bigger jelly rings slower; every wobble settles within 3 s when firm (the check); a drop gathers
  before the lift and squashes after the landing.
- **Sound** is synthesised, off until the visitor's toggle, never autoplaying.
- **No network.** System font stacks, no CDN, no images.
- **Phone width.** No sideways scroll at 390 px; the page switches to its portrait layout.

## Contract
- `JELLY.create(config)` → `J` (methods in references/ENGINE.md); `J.fallback` when the feature is missing.
- `window.__hic.ready` after the first upload and the hit-test probe; `__hic.info` = `{ mode, mesh, grid, page, upload }`.
- `window.__hic.screenOf(el)` inverts the warp (what checks click); `window.__jelly` is `J`.
- `#still=<s>` freezes time at rest; `#still=<s>&act=<pull|release|drop|poke|type|melt|set|flavour:name>` runs that act from
  rest and shows it `s` seconds later; `#calm` reduced motion; `#fallback` the plain page.
- Events on the canvas: `jelly:touch`, `jelly:land`.
