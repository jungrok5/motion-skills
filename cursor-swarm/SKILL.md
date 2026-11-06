---
name: cursor-swarm
description: Turn a topic into a "website built live by a swarm of cursors" clip — a dark design editor with rulers and a dot grid, a prompt typed into a pill at the bottom, then dozens of coloured agent cursors burst out and build a whole web page in parallel. They drag out boxes with blue selection handles, live "767 × 178" size tags and red snap guides, type headings and paragraphs with an I-beam and a caret, fetch picture files from off-screen and drop them in (the image resolves from blocks), paint a pixel-art banner and fill a heat-map grid cell by cell, pop chips into place, while the camera scrolls down section by section and a HUD counts "28 agents · 41/58 layers" — then the swarm flies home, the page publishes and the camera zooms out to the finished site. Drawn entirely in code (Canvas 2D, no AI image model); outputs a live page and an MP4 (4:5 by default) with a synthesised click / typing / drop soundtrack. Give it a topic and it designs the site for it — brief, sections, copy, palette, fonts, the pictures (drawn with defineArt) and the build choreography — in the same style. Use for "AI agents building a website" reveals, launch teasers for a site, portfolio / shop / event / product page reveals, "computer use swarm" clips, or "이 스타일로 ○○ 홈페이지 만드는 영상 만들어줘" / "주제만 바꿔서" ("마우스 커서 여러 개가 웹사이트 만드는 영상", "커서 군단", "에이전트들이 웹페이지 만드는 모션", "웹사이트 제작 과정 영상", "cursor swarm website reveal", "multiplayer cursors building a site", "mouse swarm"). Source — made from https://x.com/blackanger/status/2118043007413104810, shared at https://x.com/hrstwt/status/2117947212936392958.
---

# cursor-swarm

A web page built in front of you by a swarm of cursors. A prompt is typed into the HUD pill at the bottom of a dark
design editor; agents burst out of it and spread over an empty artboard. Then everything happens at once: one cursor drags
out the nav bar (blue selection, white handles, a size tag counting up, red guides flashing at the snap), another types the
logo with an I-beam, three more fetch photo files from the edge of the screen and drop them into cards, and the whole swarm
paints a pixel-art banner cell by cell. The camera scrolls down section by section as the page grows; the HUD counts agents
and layers. At the end the swarm flies back into the pill, it turns green — `● live  your-site.kr` — and the camera zooms
out to the whole finished page. Everything is a pure function of `t`: the same page plays live and renders to MP4.

Built in this repo after the clip AlexZ (@blackanger) shared on X — "Computer use 需要进化到鼠标集群" (computer use has to
evolve into a mouse swarm), https://x.com/blackanger/status/2118043007413104810 — which quotes harshit's "Craziest Website
Reveal ever" (https://x.com/hrstwt/status/2117947212936392958): a developer portfolio built by a swarm of cursors.
This skill rebuilds the *look and grammar* as its own engine (scheduler, editor chrome, ops, camera, HUD, sound); the
worked example `examples/bakery` 「새벽빵 · Dawn Bakery」 (a dawn bakery in Mangwon-dong, 7 sections, 28 agents, 35 s) and
everything in it are this repo's own. The template (`templates/site.html`, a midnight music festival on a dark page) shows
the topic swap. What was observed in the reference is in `references/SOURCE.md`.

**Give it a topic and it designs a new site in this style.** The bakery and the festival are examples, not a menu:
- **Fixed (the style):** the dark editor (rulers, dot grid, artboard label, tool rail), the HUD pill (prompt → agents ·
  layers · building → publishing → live), the cursor swarm and how each op is performed (drag-select + size tag + red
  guides, I-beam typing with a caret and a name tag, file card → drop → mosaic resolve, swarm painting, chip pops, click
  marks), the camera that follows the newest work, the publish + zoom-out finale, the synthesised sound.
- **Designed per topic:** the site itself — sections, every block and its layout, all copy, the language(s), palette and
  font roles, the pictures (`defineArt`: at least one drawn for this topic), the swarm moments (what gets painted or
  filled), the agent count and names, the prompt, the URL, and the build order.

## What's in this folder
| path | what |
|---|---|
| `lib/build.js` | `Build`: the authoring API (`section`, `rect`, `text`, `image`, `paint`, `cells`, `chips`, `line`, `button`, `wait`, `sync`, `check`), measuring, the agent scheduler (each job → the nearest free agent), cursor paths, the camera, drawing (editor, page, overlays, rulers, rail, cursors, HUD), layout `problems()`, sound events, the render contract, the live player |
| `lib/core.js` | editor palette `ED`, `AGENT_COLORS`, font families, seeded `rng` / `hash` / `n1`, easing, colour `mix`, text `wrap` / `measure`, the 5×7 **pixel font** (`pixelText`), `rrect`, cursor / I-beam / name-tag drawing |
| `lib/art.js` | the picture kit: `pixel` (strings → pixel art), `gradient`, `blobs` (a soft "photo"), `site` (a tiny screenshot), `monogram`, `pattern`, `map`, `bars`, `pixel-text` — and `defineArt` for your own |
| `lib/fonts/` | Inter, Source Serif 4, JetBrains Mono, Noto Sans KR (KS X 1001 subset), Caveat — OFL, loaded by `build.js`, no network |
| `templates/site.html` + `BRIEF.md` | a 3-section dark page (a midnight festival, 13 ops) — commented starting point, and an empty brief |
| `examples/bakery/` | the worked example, made brief-first: `BRIEF.md`, then `index.html` — 7 sections, 58 ops, 5 pictures designed for the topic, a swarm-painted pixel banner and a swarm-filled heat grid |
| `scripts/new-site.mjs` | start a project (template or `--from bakery`) |
| `scripts/check.mjs` | loads clean, every moment draws, deterministic, **layout holds** (no overlaps, in the page, readable, Korean in the bundled font, every op on screen while built, no op waiting for an agent) |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks); `--sfx` synthesises the soundtrack from the build's events, `--audio` muxes your own |
| `references/` | **BRIEF** (fixed vs per-topic, the brief template, the review rubric) · **LOOK** (what makes it read as the reference) · **CHOREO** (topic → sections → ops, timing and layout recipes) · **KIT** (API) · **SOURCE** (the reference, beat by beat) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-site/
  BRIEF.md     the topic designed into a site: sections, blocks, copy, palette, pictures, swarm moments — written first
  site.html    defineArt(...) for the topic's pictures, then new Build({...}), sections of ops, B.start()
  lib/         copy of the skill's lib/ (new-site.mjs); imported through an import map ("cs/")
  out/         stills, sheets, the WAV and the MP4 (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/check.mjs site.html`. The page is an ES module: view it
through a local server (`python3 -m http.server`).

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install. A frame takes ~20–60 ms to draw; the 35 s
example (1,060 frames at 1080×1350) renders in about 30 s with 4 workers.

## Workflow
1. **Topic → brief.** Fill the template in references/BRIEF.md from the user's topic and save it as `BRIEF.md` before any
   code. Design the *site* first, as if it were real: who it is for, 4–8 sections, the copy (true facts only; invented
   names and addresses must be plainly fictional), palette (5–8 colours), font roles, 1–2 **swarm moments** (a pixel banner
   to `paint`, a grid / chart / calendar to fill with `cells`) and the pictures — at least one designed for the topic with
   `defineArt`. Pick the agent count (16–36) and names from the topic, the prompt line and the URL.
2. **Start**: `node <skill>/scripts/new-site.mjs my-site` (copies `lib/`, the template and an empty `BRIEF.md`;
   `--from bakery` copies the example and its brief). Replace the content with the brief's; keep only the structure.
3. **Write the build** in `site.html` from the brief (CHOREO.md): one `B.section()` per section, ops top-down in page
   coordinates (page 860 wide; 36 px margins; columns at 36 / 312 / 588 for three cards), `B.sync()` between sections so the
   camera arrives before work starts. Overlap ops inside a section (the default `next` gaps do it) so many cursors work at
   once; use `with:` / `delay:` to drop pictures while headings are typed. Draw the topic's pictures with `defineArt` in the
   page — the skill's lib stays as it is.
4. **Check**: `node <skill>/scripts/check.mjs site.html` — fix every `layout ·` line (move a block, shorten a line, add
   agents, `sync()` before a far-away section, reword a syllable outside the Korean subset) until it prints only `ok`.
5. **Look**: `render.mjs site.html --sheet 16 --scale .5`, then full-size stills of each section's busiest moment and the
   last frame (`--stills 7,12.5,21,34`). Score them with the rubric in references/BRIEF.md and against LOOK.md: several
   cursors visibly working at every moment; selection, size tag, guides and caret readable; the finished page is a site
   you would publish. Compare with the reference frames side by side.
6. **Render**: `render.mjs site.html --sfx --workers 4` → `out/site.mp4` with the build's own sound (or `--audio music.wav`).
   Look at a frame from the MP4 itself and listen to it.

## Rules
- **Design per topic.** Every topic gets its own brief, sections, copy, palette, pictures and swarm moments. Never reuse the
  example's or the template's content, and never force a topic into their shape (a law firm is not a bakery).
- **One style.** What you design is built with the same editor, cursors, op grammar, HUD and finale; new pictures are
  `defineArt` functions drawn in code, seeded, in the page's palette.
- **The site must be good.** It is the payoff of the zoom-out. Align to a grid, keep one spacing rhythm, body ≥ 14 px
  (≥ 12 px on screen is checked), contrast that reads, nothing overlapping (checked).
- **The swarm must be busy.** Overlap ops; give every section at least one moment with three or more cursors working;
  have at least one swarm op (`paint` / `cells`). Fewer agents beat idle agents (check warns if 40 % never work).
- **Top-down.** Build in reading order; `sync()` between sections. Going back up the page is not followed by the camera
  (check: "off screen while it is built").
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames; art seeds come from the op id. `check.mjs`
  proves it.
- **Bundled fonts only.** `sans` / `serif` / `mono` / `hand` / `kr`; Hangul only from the 2,350 KS X 1001 syllables
  (checked); `pixel` has capitals, digits and a little punctuation.
- **Original content.** New sites and pictures; no real brands, logos, people's names or copied pages. A real place may be
  named; addresses and prices are fictional and look it.

## Contract every build page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.runChecks(t)` (layout problems + your
`B.check` rules), `window.shotAt(t)` (the section), `window.film` (with `ops`, `agents`, `events` for the sound),
`window.__ready = true` — all set by `B.start()`. `?render=1` = fixed canvas, no live loop; `?t=12` = one frozen frame;
`?scale=2` = twice the design size; `?loop=1` = the live page loops. Live: click or space = pause / play, ← / → = 5 s,
r = restart.
