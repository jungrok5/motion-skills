---
name: droste-page
description: Make a live web page that contains a picture of itself, which contains a picture of itself, without end (the Droste effect), drawn by WebGL through HTML-in-Canvas. One real DOM page (a wall, a box, a shelf, a desk, a screen) has a framed window, and the window shows the whole page again through a conformal log-polar map, so you scroll to fall in through the copies forever and a "wind" control twists the recursion into Escher's spiral. Every copy is the same live page — type into it and every copy changes at once; click a button drawn at any depth and the click lands on it; each copy carries its own number and its own hour of light. Give it a topic and it designs the surface, the framed region, the page's content and controls, the materials, the light and the synthesised sounds. Use for "Droste effect page", "infinite zoom website", "picture within a picture", "recursive page", "Escher Print Gallery spiral", "mise en abyme", "page that contains itself", "HTML in canvas", or ("드로스테 효과", "무한 줌 페이지", "그림 속의 그림", "자기 자신이 들어 있는 페이지", "에셔 나선", "끝없이 빨려 들어가는 웹페이지", "이 스타일로 ○○ 페이지 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Droste" demo https://claude.ai/artifact/RjZStie469yP8BUZGKAiUY on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# droste-page

A live page that holds a picture of itself. One ordinary DOM page (the wall, the box, the shelf) has a window cut in it,
and the window shows the whole page again, smaller, with its own window showing it again, down to a point of light. The
page is drawn by one WebGL shader through HTML-in-Canvas: the screen is mapped to the page by a conformal log-polar
(Droste / Escher) map, so scrolling falls in through the copies endlessly, and a real range input winds the recursion into
a spiral (0 = plain nesting, 1 = Escher's one-turn "Print Gallery" spiral, 2 = a double spiral). Every copy is the same
live DOM: type into the editable line and every copy changes at once; click a button drawn at any depth and the click lands
on it, because the page is placed for hit testing with the map's local affine under the pointer. Each copy shows its own
number on its counter and hangs in its own hour of light. Give it a topic ("a Moroccan zellige wall", "a bookshelf with a
photo of the bookshelf", "a phone showing its own screen", "the back of a cereal box") and it designs the surface, the
framed region, the page's content and controls, the materials, the light and the sounds.

Made from Felix Rieseberg's "Droste" demo (https://claude.ai/artifact/RjZStie469yP8BUZGKAiUY), one of fifteen on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared in the post
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19 — a cobalt Delft tile wall with a framed
picture of itself, drawn through the Escher map. `references/LOOK.md` lists what was observed. This skill keeps the idea,
the interaction grammar and the technique and writes all of its own code; it never copies the demo's code, tiles, text or
sounds. The worked example, `examples/cereal-box` 「Spiral Crunch」, is the back of a cereal box printed with a picture of
the back of the box.

**Code-only.** No generated or downloaded images, video, audio or fonts. Pictures on the page are HTML/CSS; materials and
light are the shader's; sounds are synthesised (`lib/droste-sound.js`).

**Fixed (the style)**: one real page, exactly the screen, is everything you see; a rectangular window that is the page
scaled by 1/S about its own fixed point; the conformal Droste map (log-polar, rotated by the complex exponent
α = 1 − i·wind·ln S / 2π) with its inverse for hit testing; scroll / keys / finger to fall in, eased, endless both ways;
a real range input for the wind, sticky at whole turns, with a seam along the cut between them; every copy live; per-copy
numbering composed from real digits; per-copy hour of light cycling with depth (and continuously round the spiral); far
copies melting into a point of light; the opening fall-in; upload sharp when quiet, smaller while the page changes fast.

**Designed per topic**: the surface and what it is (wall, box, shelf, desk, screen, poster); where the window sits and S
(`--S`, `--cx`, `--cy`); the frame (a moulding preset, your own segments, or none with the DOM drawing it); the page's
content: the editable line, the clickable things and what a click changes, the counter's home (plaque, starburst, page
number, clock), the wind control's name and look; the materials per region (`data-surface`); the moods of light; the glow;
the seam style; the ripple colour; the sound preset; the wording. The template and the example are examples of the style,
not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/droste.js` | the engine: `Droste.create(config)` — the map and its inverse, the shader (surfaces, frame, light, counter, seam, glow), uploads, fall / wind / opening, input, hit placement, taps, test hooks; presets `Droste.FRAMES`, `Droste.MOODS`, `Droste.SURFACES` |
| `lib/droste-sound.js` | `DrosteSound.create(preset)`: tap (modal "tink" per material, a step higher per level), pass (a copy goes by), heal (a spiral closes); presets `ceramic`, `glass`, `wood`, `card` |
| `lib/hic.js` | the shared HTML-in-Canvas runtime (exact copy; never edit here) |
| `templates/index.html` | a working page in the style: a gallery wall with a painting of itself (generic topic), every part commented |
| `templates/BRIEF.md` | the brief to fill for a topic |
| `scripts/new-page.mjs` | start a project folder (`lib/` + template, or `--from cereal-box`) |
| `scripts/check.mjs` | the shared live-page checks + map, depth click, live copies, fall, wind, sharp uploads, look |
| `scripts/still.mjs` | stills of a page at chosen poses (`--poses "rest;fall=0.6,wind=2"`) |
| `scripts/hic-test.mjs` | the shared checks (exact copy) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (what the source demo looked and behaved like) · **ENGINE** (config, API, adding a surface / frame / mood) · **HIC** (the shared HTML-in-Canvas notes, exact copy) · **LESSONS** (what broke and the fix) |
| `examples/cereal-box/` | the worked example: `BRIEF.md`, `index.html` |

## Project layout (what you create)
```
my-page/
  BRIEF.md     the topic as a Droste page (references/BRIEF.md) — written first
  index.html   the page: CSS (window, content, phone layout, fallback) + Droste.create({...}) + the page's own handlers
  lib/         hic.js, droste.js, droste-sound.js (copied by new-page.mjs)
  out/         stills (not committed)
```
Run scripts from anywhere with the page's path: `node <skill>/scripts/check.mjs my-page/index.html`. The page opens from
file:// and works as a Claude artifact (no network, no modules).

Requirements: Node + Playwright Chromium (the scripts launch it with `--enable-blink-features=CanvasDrawElement`). Viewing
live needs Chrome / Edge 157+ or the Claude desktop app; other browsers get the same HTML as an ordinary page.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project and fill it from the topic (references/BRIEF.md): what the
   surface is and why it would contain itself; the window (where, S, frame or no frame, corner radius); the page's content
   — the one editable line, 2–8 clickable things and what a click changes, the counter's home and label, the wind
   control's name; the regions and their materials; 3–6 moods of light; the glow, seam and ripple; the sound preset; the
   phone layout. Save it before any code.
2. **Start**: `node <skill>/scripts/new-page.mjs my-page` (or `--from cereal-box` when the topic is close to it).
3. **Lay out the page as a page.** Write the HTML and CSS for the topic. Set `--S`, `--cx`, `--cy`; place everything with
   the window variables (`--wl --wr --wt --wb --fb --u`). Keep the window clear of content (it is never seen) and keep the
   content clear of the frame. Write the portrait layout (`@media (orientation: portrait)`) and the fallback CSS. Open it
   with `#fallback` to see the plain page: it must read and work on its own.
4. **Configure the engine** (references/ENGINE.md): frame, `surfaces` for each `data-surface`, `light` (moods, lamp,
   panes), `counter`, `wind`, `fall`, `glow`, `seam`, `ripple`, `sound`. A material, frame or mood the presets lack is
   written in the config (frame segments, mood list) — never by editing `lib/`.
5. **Stills and review**: `node <skill>/scripts/still.mjs index.html --out out --poses "rest;fall=-0.25,wind=0;fall=0.55,wind=2"`
   and a phone still (`--size 390x844`). Score each against the still review in references/BRIEF.md: the window reads as
   a picture of the page; at least three copies are recognisable; text is legible in the outer two; the counter shows
   different numbers per copy; the light differs per copy without going murky; no content sits under the frame; nothing
   is cut at phone width. Fix and repeat.
6. **Check**: `node <skill>/scripts/check.mjs index.html` must print only `ok` (it renders at `#q=0.5` by default; slow
   machines are fine). Fix every `FAIL`.
7. **Listen**: open the page, press the sound toggle, tap, scroll a few copies, wind past a half turn and back.

## Rules
- **Design for the topic.** The surface, window placement, frame, content, controls, materials, moods, sounds and words
  are designed for this topic. Do not reuse the template's gallery wall or the example's cereal box unless the topic is
  exactly theirs, and never recreate the source's Delft tile wall, its motifs or its wording.
- **One style.** Every page is one real page, one window that is the page itself at 1/S, the Droste map, endless fall and
  the wind. No crossfades, no second picture standing in for the copy, no fake "screenshot" inside the window.
- **The window is the page at 1/S.** Its aspect is the page's aspect at every size (the engine forces the height if not)
  and it is positioned from `--S --cx --cy`. Nothing important goes inside it: the next copy covers it.
- **Every copy is live.** The editable line is real text (`contenteditable` or an input); clickable things are real
  buttons whose real state changes; the counter is composed from real digits. Never paint per-copy content as images.
- **What you see is what you click.** The engine places the page with the map's local affine under the pointer; do not
  add your own transforms to `#page`. The check clicks a control one copy deeper than its biggest copy.
- **Light changes per copy, legibly.** Moods may go to dusk and night but the outer two copies stay readable (mean luma
  40–215 in the check). Use a lamp (`light.lamp`) when a mood is dark.
- **HTML-in-Canvas rules** (references/HIC.md): upload only on paint; sharp upload when quiet; one fallback with the same
  HTML; `#still` / `#calm` / `#nointro` composed; deterministic (no `Math.random` in what is drawn); sound synthesised, off
  until a gesture, with a visible toggle; no network; phone width works.
- **Calm.** The opening fall-in and any intro typing stop at the first input, and are skipped for `#still`, `#calm`,
  `#nointro` and reduced motion. Drift (`fall.drift`) only after 4 s without input and never while editing.

## Contract
- Markup: `<canvas id="stage" layoutsubtree content="drawable">` with one `<div id="page" drawable>` child; `#window` inside
  it; at least one `[data-hic-edit]` and one `[data-hic-click]`; regions marked `data-surface="<name>"`.
- `Droste.create(config)` returns `D`; on a browser without the feature it calls `HIC.fallback` and returns
  `{ fallback: true }`, so page handlers must guard `D.tap` with `!D.fallback`.
- Test hooks: `window.__hic.ready`, `window.__hic.screenOf(el)` (screen point where `el` is drawn biggest, through the
  inverse map), `window.__droste` = `D` with `state()`, `pose({fall, wind})`, `screenOf(el)`, `screenAt(el, level)`,
  `map(x, y)`, `tap(el, note)`, `level()`.
- Address: `#still=<s>` freezes time, `#fall=<f>&wind=<w>` sets the pose, `#calm` drops motion, `#nointro` skips the
  opening and intro, `#q=0.5` draws at half resolution, `#fallback` forces the plain page.
- `page.droste-live` is set while the shader draws; CSS uses it to hide the DOM digits of the counter.
