---
name: cursor-swarm
description: Turn a topic — or an existing file — into a "built live by a swarm of cursors" clip of any document: a website, a slide deck, a book (a cover and spreads), a poster. A dark design editor with rulers and a dot grid, a prompt typed into a pill at the bottom, then dozens of coloured agent cursors burst out and build it in parallel — they drag out boxes with blue selection handles, live "767 × 178" size tags and red snap guides, type headings and paragraphs with an I-beam and a caret, fetch picture files from off-screen and drop them in (the image resolves from blocks), paint a pixel-art banner or cover and fill a chart / heat-map grid cell by cell, pop chips into place, while the camera scrolls down the page or pans from slide to slide and spread to spread and a HUD counts "28 agents · 41/58 layers" — then the swarm flies home, it publishes and the camera zooms out to the whole thing. Drawn entirely in code (Canvas 2D, no AI image model); outputs a live page and an MP4 (4:5 for a site, 16:9 for slides and books) with a synthesised click / typing / drop soundtrack. Give it a topic and it designs the document — brief, boards, copy, palette, fonts, pictures (defineArt) and the build choreography — in the same style; give it a .pptx or .pdf (import-doc.py) and it rebuilds that deck or book with its own words, layout and pictures. Use for "AI agents building a website / a deck / a book" reveals, launch teasers, portfolio / shop / event pages, pitch-deck or report reveals, book or zine reveals, "computer use swarm" clips, or "이 스타일로 ○○ 만들어줘" / "주제만 바꿔서" / "이 발표 장표를 이렇게 만들어줘" ("마우스 커서 여러 개가 웹사이트 만드는 영상", "커서 군단", "에이전트들이 장표 만드는 영상", "발표자료가 만들어지는 영상", "책 만드는 과정 영상", "웹사이트 제작 과정 영상", "cursor swarm reveal", "multiplayer cursors building a deck", "mouse swarm"). Source — made from https://x.com/blackanger/status/2118043007413104810, shared at https://x.com/hrstwt/status/2117947212936392958.
---

# cursor-swarm

A document built in front of you by a swarm of cursors. A prompt is typed into the HUD pill at the bottom of a dark design
editor; agents burst out of it and spread over empty artboards — one tall web page, a grid of 16:9 slides, a book's cover
and spreads, a poster. Then everything happens at once: one cursor drags out a box (blue selection, white handles, a size
tag counting up, red guides flashing at the snap), another types a title with an I-beam, three more fetch picture files from
the edge of the screen and drop them in, and the whole swarm paints a pixel-art cover or fills a chart cell by cell. The
camera scrolls down a page as it grows and pans from slide to slide; each new slide or page is dragged out like a frame.
The HUD counts agents and layers. At the end the swarm flies back into the pill, it turns green — `● live  your-thing` —
and the camera zooms out to everything that was built. Everything is a pure function of `t`: the same page plays live and
renders to MP4.

Built in this repo after the clip AlexZ (@blackanger) shared on X — "Computer use 需要进化到鼠标集群" (computer use has to
evolve into a mouse swarm), https://x.com/blackanger/status/2118043007413104810 — which quotes harshit's "Craziest Website
Reveal ever" (https://x.com/hrstwt/status/2117947212936392958): a developer portfolio built by a swarm of cursors.
This skill rebuilds the *look and grammar* as its own engine (boards, scheduler, editor chrome, ops, camera, HUD, sound,
importer) and widens it from websites to any document. The three worked examples are this repo's own, on topics the
reference does not have: `examples/bakery` 「새벽빵」 (a website, 7 sections, 35 s), `examples/deck` 「밤의 도서관」 (a 6-slide
proposal rebuilt from `source/night-library.pptx` through `import-doc.py`, 32 s) and `examples/book` 「겨울 국물 한 그릇」
(a recipe booklet, a cover and two spreads, 22 s). The template (`templates/site.html`, a festival page) shows the topic
swap. What was observed in the reference is in `references/SOURCE.md`.

**Give it a topic (or a file) and it designs a new build in this style.** The examples are examples, not a menu:
- **Fixed (the style):** the dark editor (rulers, dot grid, board labels, tool rail), the HUD pill (prompt → agents ·
  layers · building → publishing → live), the cursor swarm and how each op is performed (drag-select + size tag + red
  guides, I-beam typing with a caret and a name tag, file card → drop → mosaic resolve, swarm painting, chip pops, click
  marks, boards dragged out as frames), the camera (follows the work, pans board to board), the zoom-out finale, the sound.
- **Designed per topic:** the kind of document and its boards (site / slides / book / poster, sizes), every block and its
  layout, all copy and its language(s), palette and font roles, the pictures (`defineArt`, or the file's own pictures), the
  swarm moments (what gets painted or filled), agent count and names, the prompt, the URL, and the build order.
- **From a file:** a .pptx or .pdf keeps its words, numbers, layout and pictures (`import-doc.py`); what you design is the
  build — order, overlaps, swarm moments, pace.

## What's in this folder
| path | what |
|---|---|
| `lib/build.js` | `Build`: the document (`doc`: web / slides / book / poster) and its boards (`board`), the authoring API (`section`, `rect`, `text`, `image`, `paint`, `cells`, `chips`, `line`, `button`, `wait`, `sync`, `check`), measuring, board layout (grid, book spreads), the agent scheduler (each job → the nearest free agent), cursor paths, the 2D camera, drawing (editor, boards, overlays, rulers, rail, cursors, HUD), layout `problems()`, sound events, image files (`src`), the render contract, the live player |
| `lib/core.js` | editor palette `ED`, `AGENT_COLORS`, font families, seeded `rng` / `hash` / `n1`, easing, colour `mix`, text `wrap` / `measure`, the 5×7 **pixel font** (`pixelText`), `rrect`, cursor / I-beam / name-tag drawing |
| `lib/art.js` | the picture kit: `pixel`, `gradient`, `blobs`, `site`, `monogram`, `pattern`, `map`, `bars`, `pixel-text` — and `defineArt` for your own |
| `lib/fonts/` | Inter, Source Serif 4, JetBrains Mono, Noto Sans KR (KS X 1001 subset), Caveat — OFL, loaded by `build.js`, no network |
| `templates/site.html` + `BRIEF.md` | a 3-section dark web page (a midnight festival) — commented starting point, and an empty brief |
| `examples/bakery/` | a **website** made brief-first: 7 sections, 58 ops, 5 pictures drawn for the topic, a swarm-painted pixel banner, a swarm-filled heat grid |
| `examples/deck/` | a **slide deck** rebuilt from a file: `source/night-library.pptx` → import-doc.py → `index.html` with the build designed (6 slides, the bar chart refilled as cells by the swarm), `assets/` = the file's pictures |
| `examples/book/` | a **book**: a cover painted in pixels by the swarm, two spreads (recipe, ingredients as chips, steps in parallel, a heat bar), spine shade, page numbers |
| `scripts/new-build.mjs` | start a project (template, or `--from bakery / deck / book`) |
| `scripts/import-doc.py` | read a **.pptx or .pdf** (text boxes, boxes, pictures, positions, sizes, colours) → a project with `assets/`, `doc.json`, a pre-filled `BRIEF.md` and a draft `build.html` that passes check.mjs |
| `scripts/check.mjs` | loads clean, every moment draws, deterministic, **layout holds** (no overlaps, inside its board, readable, Korean in the bundled font, every op on screen while built, no op waiting for an agent) |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks); `--sfx` synthesises the soundtrack from the build's events, `--audio` muxes your own |
| `references/` | **BRIEF** (fixed vs per-topic, the brief template, the review rubric) · **LOOK** (what makes it read as the reference) · **CHOREO** (topic → boards → ops, timing and layout recipes for sites, decks, books, posters) · **IMPORT** (rebuilding a .pptx / .pdf) · **KIT** (API) · **SOURCE** (the reference, beat by beat) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-build/
  BRIEF.md     the topic (or file) designed into a document and a build — written first
  build.html   defineArt(...) for the topic's pictures, then new Build({ doc, … }), boards and sections of ops, B.start()
  assets/      picture files (a .pptx / .pdf's own pictures, or your photos) — image ops with src
  lib/         copy of the skill's lib/ (new-build.mjs / import-doc.py); imported through an import map ("cs/")
  out/         stills, sheets, the WAV and the MP4 (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/check.mjs build.html`. The page is an ES module: view it
through a local server (`python3 -m http.server`).

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install. For import-doc.py: Python 3 with
`python-pptx` (.pptx) or `pymupdf` (.pdf). A frame takes ~20–60 ms to draw; the 35 s website (1,060 frames at 1080×1350)
renders in about 30 s with 4 workers.

## Workflow
1. **Topic → brief.** Fill the template in references/BRIEF.md and save it as `BRIEF.md` before any code. First decide the
   **document**: a site (`doc: 'web'`), a deck (`'slides'`), a book (`'book'`), a poster (`'poster'`) — whatever the user
   asked for; a topic alone usually means a site. Design it as if it were real: who it is for, its boards (sections of a
   page, slides, pages of spreads), copy (true facts; invented names and addresses plainly fictional), palette (5–8
   colours), font roles, 1–3 **swarm moments** (a pixel banner or cover to `paint`, a chart / grid / calendar to fill with
   `cells`) and the pictures — at least one designed for the topic with `defineArt` unless the file brings its own.
   Pick the agent count (16–36) and names from the topic, the prompt line and the URL.
   **Given a file** (.pptx, .pdf — export Keynote / Google Slides / Word to one of them): run
   `python3 <skill>/scripts/import-doc.py deck.pptx my-build` first (references/IMPORT.md). It writes the project, a
   faithful draft `build.html` and a `BRIEF.md` with the file's outline; finish the brief's build columns.
2. **Start** (topic): `node <skill>/scripts/new-build.mjs my-build` (template) or `--from bakery | deck | book` for the
   closest kind. Replace the content with the brief's; keep only the structure.
3. **Write the build** in `build.html` from the brief (CHOREO.md): `B.board()` per slide / page (a site is one board),
   `B.section()` inside a long page, ops in reading order in board coordinates, `B.sync()` between boards and sections so the
   camera arrives before work starts. Overlap ops inside a board so many cursors work at once (`with:` / `delay:`, small
   `next`); turn a chart or a title into a swarm op. Draw the topic's pictures with `defineArt` in the page; put picture
   files in `assets/` and use `src`. The skill's lib stays as it is.
4. **Check**: `node <skill>/scripts/check.mjs build.html` — fix every `layout ·` line (move a block, shorten a line, add
   agents, `sync()` before a new board, `overlap: true` for labels inside a chart, reword a syllable outside the Korean
   subset) until it prints only `ok`.
5. **Look**: `render.mjs build.html --sheet 16 --scale .5`, then full-size stills of each board's busiest moment and the
   last frame. Score them with the rubric in references/BRIEF.md and against LOOK.md: several cursors visibly working at
   every moment; selection, size tag, guides and caret readable; each slide / spread framed whole while it is built; the
   finished document is one you would publish (or matches the file). Compare with the reference frames side by side.
6. **Render**: `render.mjs build.html --sfx --workers 4` → `out/build.mp4` with the build's own sound (or `--audio music.wav`).
   Look at a frame from the MP4 itself and listen to it.

## Rules
- **Design per topic.** Every topic gets its own brief, document, boards, copy, palette, pictures and swarm moments. Never
  reuse an example's or the template's content, and never force a topic into their shape (a law firm is not a bakery; a
  pitch deck is not a recipe book).
- **A file is the content.** When rebuilding a .pptx / .pdf, keep its words, numbers, order, layout and pictures; design
  only the build. Do not invent or drop content; say so in the brief if something cannot be rebuilt (a video, an embedded
  chart object — rebuild the chart from its numbers as `cells`).
- **One style.** Whatever the document, it is built with the same editor, cursors, op grammar, HUD and finale; new pictures
  are `defineArt` functions drawn in code, seeded, in the document's palette.
- **The result must be good.** It is the payoff of the zoom-out. Align to a grid, keep one spacing rhythm, text ≥ 14 px on
  the board (≥ 12 px on screen is checked), contrast that reads, nothing overlapping or off its board (checked).
- **The swarm must be busy.** Overlap ops; give every board at least one moment with three or more cursors working; have
  at least one swarm op (`paint` / `cells`). Fewer agents beat idle agents (check warns if 40 % never work).
- **Reading order.** Build each board top-down, boards in order, `sync()` between them. The camera follows; going back is
  not followed (check: "off screen while it is built").
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames; art seeds come from the op id. `check.mjs`
  proves it.
- **Bundled fonts only.** `sans` / `serif` / `mono` / `hand` / `kr`; Hangul only from the 2,350 KS X 1001 syllables
  (checked); `pixel` has capitals, digits and a little punctuation. A file's fonts are mapped to these by kind.
- **Original content.** New documents and pictures; no real brands, logos, people's names or copied pages. A user's own
  file is theirs to rebuild.

## Contract every build page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.runChecks(t)` (layout problems + your
`B.check` rules), `window.shotAt(t)` (the section), `window.film` (with `ops`, `agents`, `boards`, `events` for the sound),
`window.__ready = true` — all set by `B.start()`. `?render=1` = fixed canvas, no live loop; `?t=12` = one frozen frame;
`?scale=2` = twice the design size; `?loop=1` = the live page loops. Live: click or space = pause / play, ← / → = 5 s,
r = restart.
