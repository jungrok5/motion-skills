---
name: time-machine-page
description: Make a live web page that travels through time — one real HTML page (an editable headline, body text, a picture, a form and a notes log) restyled for each era on a dial and drawn by WebGL through HTML-in-Canvas through that era's shader passes (letterpress, halftone and paper on a desk under a lamp; film grain, gate weave, dust and flicker on a cinema screen between curtains; CRT bulge, phosphor, scanlines and glow in a monitor; woodcut hatching, a violet school ditto, a dithered 1996 home page, a hologram over an emitter, or a medium you add). Turning the dial dives the camera into the page's material until the dots, grain or scanlines fill the view, changes the material into the next era's and rises out into the new year; the page stays clickable, typeable and selectable in every era and the reader's notes travel with it. Give it a topic (a recipe, a town's news, a band's gig poster, a school timetable, a product sheet) and it designs the document, the 3–5 eras that fit the topic, how each era tells the story, each era's CSS and passes, the picture, the controls and the sounds. One self-contained folder, no network, works from file:// and as a Claude artifact; Chrome/Edge 157+ or the Claude desktop app, a plain page with a working dial elsewhere. Use for "time machine page", "the same web page through the decades", "newspaper to terminal to hologram", "era dial", "retro shader page", "HTML-in-Canvas page", or ("시대를 넘나드는 웹페이지", "타임머신 페이지", "같은 페이지를 시대별로", "신문에서 터미널까지", "다이얼로 시대 바꾸기", "HTML-in-Canvas 페이지", "이 스타일로 ○○ 페이지 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Time Machine" demo https://claude.ai/artifact/VtYey85VQXYqqfURRYqpiq on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# time-machine-page

One document, many years. A real web page — masthead, an editable headline, a picture, body text, facts, a notes log with
a text field and a button, and one control of the topic's own — is laid out inside a `<canvas>`. Each era on the dial is a
stylesheet for the same elements plus a list of shader passes, and WebGL draws the live page through them: the 1904 front
page is letterpress ink with a halftone picture on aged newsprint on a desk under a lamp; the 1937 newsreel is grainy,
weaving, flickering film on a cinema screen with curtains and a row of heads; the 1979 terminal is green phosphor with
scanlines and glow, bulging in a beige monitor. Turn the dial and the camera dives into the page until its material fills
the view, the material turns into the next era's, and the camera rises out into the new year. In every era the page can be
clicked, typed into and selected, and what the reader writes goes with it, stamped with the year it was written. Give it a
topic and it designs the document, the eras, the wording, the looks, the picture and the sounds.

Made in this repo from Felix Rieseberg's "Time Machine" demo — https://claude.ai/artifact/VtYey85VQXYqqfURRYqpiq — one of
fifteen on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. `references/LOOK.md` lists what was
observed. All code here is new; the demo's comet story, text, fonts, art and sounds are not used. The worked example,
`examples/daily-loaf` 「The Daily Loaf」, is a bread recipe through 1450 woodcut, a 1962 ditto handout (a pass written in the
page), a 1996 home page and a 2040 hologram.

**Code-only.** No generated or downloaded images, video, audio or fonts: pictures are inline SVG drawn for the topic, type
is system font stacks, every sound is Web Audio.

**Fixed (the style)**: one live DOM restyled per era (`data-era`), never re-typeset in a shader; an era = CSS layout + page
size + shader passes + a surround that puts the page in its world; the dial along the bottom (sound, ‹ ›, a weighted drum
of years that clicks, X-ray to see the raw page); the journey (dive into the material at a focus point, change material at
depth with a soft flash, hop through eras between, rise out with a small landing dip); wheel to magnify; the notes log that
travels; editable in every era with hit testing that follows the drawing (warps inverted); the plain-page fallback with a
working dial; synthesised sound off until asked.

**Designed per topic**: the document and its slots; 3–5 eras and their years, labels and order; how each era tells the
story (wording, units, facts); each era's CSS layout, type, page size and phone layout; each era's passes and parameters
(paper tint, ink, phosphor, curtains, plastic), and new passes for media the library lacks; the surround choice; the focus
points and dive depth; the picture (one SVG coloured per era); a topic control; room tones, arrival tones and accents. The
template and the example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/time-machine.js` | the runtime: eras → shaders, uploads per era, layout and camera, the journey, magnify, hit testing (`place` / `placeLocal`, `screenOf`), slots and per-era edits, the log, the dial, the hint, sound (dial, dive, arrival, room tones), the fallback, `window.__tm` |
| `lib/passes.js` | the treatments as passes: warps `barrel` `weave`; page `paper` `letterpress` `halftone` `woodcut` `mono` `grain` `dust` `scanlines` `mask` `bloom` `dither` `chroma` `holo`; surrounds `desk` `cinema` `monitor` `lab`; post `vignette` `flicker` `grade`; `TimeMachine.pass()` to add one |
| `lib/hic.js` | the shared HTML-in-Canvas runtime (copy of `tools/hic/hic.js`) |
| `templates/index.html` | the house example: a town library's news in 1904 newsprint, 1937 newsreel, 1979 terminal |
| `templates/BRIEF.md` | the brief to fill |
| `examples/daily-loaf/` | the worked example: `BRIEF.md` + `index.html` (four eras, a `ditto` pass written in the page, a loaves field) |
| `scripts/new-page.mjs` | start a project folder (`lib/` + the template, or `--from daily-loaf`) |
| `scripts/check.mjs` | the shared checks plus this style's (below) |
| `scripts/still.mjs` | stills: per era, a frozen journey, magnified, X-ray, phone |
| `scripts/hic-test.mjs` | the shared checks (copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (observed from the source) · **ENGINE** (config, passes, adding one) · **HIC** (HTML-in-Canvas notes) · **LESSONS** |

## Project layout
```
my-time-machine/
  BRIEF.md      the topic as a document through 3–5 eras (written first)
  index.html    the page: slots + each era's CSS, any new pass, TimeMachine.start({eras…}), the topic control's script
  lib/          hic.js, passes.js, time-machine.js (copied by new-page.mjs)
  out/          stills (not committed)
```
Run scripts from the project root: `node <skill>/scripts/check.mjs index.html`.

Requirements: Node + Playwright Chromium (the scripts pass `--enable-blink-features=CanvasDrawElement`). Viewing: Chrome /
Edge 157+ or the Claude desktop app; elsewhere the plain page with its dial.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project and fill it from the topic (references/BRIEF.md): the
   document and its slots, the reader's control, the picture, then 3–5 eras that tell this topic's history — per era the
   year, the medium, how the story is told then, layout, passes (and any new pass), surround, focus, sound, accent.
   Write it before any code.
2. **Start**: `node <skill>/scripts/new-page.mjs my-time-machine` (or `--from daily-loaf` when the topic is close to a recipe).
3. **The page.** Write the DOM once with `data-slot`s, the log and the control; draw the picture as one SVG with role
   classes. Replace the template's content entirely.
4. **Eras, one at a time.** For each: its CSS (`#page[data-era=id] …`, and the one-column phone version under
   `@media (max-width: 520px)`), its `page` / `phone` size and `frame`, its passes with tuned parameters, its content and
   sound. A medium the library lacks becomes a pass in the page (`TimeMachine.pass`, references/ENGINE.md). After each era:
   `node <skill>/scripts/still.mjs index.html --out out --era <id>` and look at it.
5. **Stills and review.** `still.mjs index.html --out out --all`, then `--phone --all`, the journeys
   (`--era <to> --travel <from>,0.3` / `0.5` / `0.8`) and a magnified still per era (`--zoom 6,<u>,<v>`). Score each against
   the still review in references/BRIEF.md (readable, one medium, neighbours differ, material holds up close, the journey
   reads, the surround belongs, live everywhere). Fix and repeat.
6. **Check**: `node <skill>/scripts/check.mjs index.html` must print only `ok` (and `all checks passed`).
7. Hand over the folder: it opens from file://, a static host or as a Claude artifact.

## Rules
- **Design for the topic.** The document, eras, wording, looks, picture, control and sounds are designed for this topic.
  Do not reuse the template's library or the example's bread unless the topic is theirs, and never recreate the source's
  comet newspaper or its seven eras.
- **One style.** Every page is one live DOM on a dial of eras with the dive-and-rise journey, the material at depth, a
  surround per era, X-ray, magnify and the travelling log. New eras and passes keep that grammar.
- **The page stays real** (references/HIC.md): text is DOM text, controls are real elements, each era is CSS on the same
  elements. Never a picture of text, never text drawn in a shader.
- **What you see is what you click.** Each era's warps have a JS `toPage` with the same maths as the GLSL; a new warp
  without one is not allowed. `check.mjs` clicks the note field through every era.
- **3–5 eras, all different.** Neighbours never share a material; each era is nameable at a glance. `check.mjs` fails
  eras that look alike.
- **Pictures in warm muted tones** where an era screens them (halftone, woodcut); type neutral; strong colours stay type.
- **Upload only on paint; draw only when something moves.** Static eras draw on change; eras with animated passes draw
  every frame. `#still` and `#calm` hold still.
- **Weight in the machinery.** The drum is a heavy spring that overshoots and settles; the dive gathers speed; the rise
  lands with a small dip. Keep those when you change timings.
- **Sound is synthesised, off until the button**; one room tone per era, quiet.
- **Phone width**: every era has a `phone` size and a one-column layout; no sideways scroll at 390 px.
- **No network**: system fonts, inline SVG, no CDN.

## Contract
The page exposes: `window.__hic.ready` (after the first upload and the hit-test probe), `window.__hic.screenOf(el)`
(screen point of an element through the current era's warps), `window.__tm` (`era`, `index`, `busy`, `zoom`, `zoomPeak`,
`travels`, `audio`, `xray`, `ids`, `animated`, `go(i, {instant})`, `advance(s)`, `state()`), and `TimeMachine.start(cfg)`
returns `tm` (`era`, `index`, `eras`, `on('era' | 'leave' | 'arrive' | 'note')`, `go`). The config object is described in
references/ENGINE.md. Hash: `#era=<id>`, `#still=<s>`, `#calm`, `#fallback`, `#q=0.5`, `#travel=<fromId>,<p>`,
`#zoom=<z>,<u>,<v>`, `#xray`, `#nohint`.
