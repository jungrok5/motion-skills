---
name: sketchnote-explainer
description: Turn a topic into an iPad-sketch knowledge explainer — a white stylus draws one picture at a time on warm cream paper (faint construction lines first, then a dark pencil line with pressure, then flat watercolour colour laid a little off the line), handwritten labels with a smaller second-language line, red arrows and numbers, a two-line subtitle card (main line + handwritten second line) for each beat, a camera that glides and zooms from drawing to drawing — and at the end pulls back to show the whole sheet as one finished infographic with a highlighted title and a note card. Drawn entirely in code (Canvas 2D, no AI image model), with a soft felt-piano bed and pencil-scratch sound synced to every stroke; outputs a live page and an MP4 (16:9, 3:4 or 9:16). Give it a topic and it designs a new board for it — a brief, beats, drawings (with objects drawn for that topic), labels and the final layout — in the same style. Use for "how X is made", "where Y comes from", "why Z happens" explainers in this look, Xiaohongshu / Instagram-style knowledge videos, or "이 스타일로 ○○ 만들어줘" / "주제만 바꿔서" ("아이패드 스케치 설명 영상", "손그림 지식 영상", "스케치노트 영상", "그리면서 설명하는 영상", "드로잉 인포그래픽 영상", "샤오홍슈 스타일 설명 영상", "iPad sketch explainer", "sketchnote video", "whiteboard-style drawing explainer", "draw-and-explain video"). Source — made from https://x.com/EianLu/status/2117672988678209948 (sharing Lemomo's clip https://x.com/lemomo_ai/status/2117670248275186162).
---

# sketchnote-explainer

A knowledge explainer drawn live, the way someone sketches on an iPad: for each beat the camera glides to an empty spot on
one big sheet of cream paper, a white stylus lays down faint construction lines, draws the object in a dark pencil line,
fills it with flat watercolour set a little off the line, writes a handwritten label (with a smaller line in a second
language) and maybe a red arrow or number — while a two-line subtitle card at the bottom says the beat. At the end the
camera pulls back: every drawing sits on one sheet, the title is written and highlighted, a note card is pinned, and the
film ends on a finished infographic. Everything is a pure function of `t`, so the same page plays live (with sound) and
renders to MP4.

Made from the clip Eian (@EianLu) shared on X — https://x.com/EianLu/status/2117672988678209948 — which reposts Lemomo
(@lemomo_ai)'s "iPad Sketch Explainer" clip https://x.com/lemomo_ai/status/2117670248275186162 (「From Cherry to Cup · 一杯咖啡，
从一颗果子开始」, 51 s, 1920×1080). This skill rebuilds the *look and grammar* as its own engine (the hand, the wash, the
stylus, the camera, the subtitle card, the soundtrack, the layout checks); the topics, drawings and code are this repo's
own. Worked example: `examples/honey` 「From Flower to Honey · 꽃에서 꿀까지」 (10 beats + finale, 69 s, 16:9). The template
(`templates/film.html`, 「The Water Cycle」, 3:4) shows the topic swap and a second frame shape.

**Give it a topic and it designs a new board in this style.** The honey example and the water-cycle template are examples
of the style, not a menu:
- **Fixed (the style):** cream paper and grain; the dark brown pencil with pressure and a second pass; faint guides left
  on the sheet; flat watercolour set off the line; Caveat / Gaegu handwriting, red for arrows, numbers and the title's
  underline, a yellow highlighter behind title words; the white stylus and its shadow; one drawing per beat; the gliding
  camera; the subtitle card (Noto Sans KR main line + handwritten second line); the pull-back finale onto the whole sheet;
  the felt-piano + pencil soundtrack.
- **Designed per topic:** the beats and their two subtitle lines, every drawing and where it sits on the sheet, the labels
  (and their second-language lines), arrows and numbers, the colours of the washes, the title and its highlighted words,
  the note card — including at least one object drawn for this topic with `defineSketch` (the example's `bee`, `sugar`,
  `caps`).

## What's in this folder
| path | what |
|---|---|
| `lib/hand.js` | palette `C`, fonts, seeded `rng`/`hash`/`n1`, point lists (`circle`, `ellipse`, `arc`, `rect`, `roundRect`, `polygon`, `curve`, `lens`, `squiggle`), `pencil` (pressure, taper, second pass, dashes), `guide`, `wash` (offset watercolour with a wipe reveal), `marker` (highlighter), `write` (handwriting revealed left to right), `paper`, `grain` |
| `lib/kit.js` | drawings any topic can use: cup, jar, spoon, leaf, flower, sun, cloud (rain), drop, mountain, waves, heat, callout (magnified cross-section), swatches, gauge (a level that moves), burst, bracket, hexgrid, steam, rain |
| `lib/board.js` | `Board`: the authoring API (`beat`, `sketch`, `draw`, `label`, `arrow`, `line`, `wash`, `mark`, `title`, `note`, `finale`), `defineSketch`, stroke timing, the camera, the stylus, the subtitle card, layout `problems()`, the render contract, the live player (with sound) |
| `lib/sound.js` | `renderScore`: felt-piano bed (I–V–vi–IV), a chime per beat, a finale chord, pencil scratch / wash swish / highlighter squeak on every stroke — the same code for the page and the MP4 |
| `lib/fonts/` | Caveat 500/700 (Latin hand), Gaegu 700 (Korean hand, KS X 1001 Hangul subset), Noto Sans KR 500 (subtitle, KS X 1001 subset) — OFL, loaded by `board.js`, no network |
| `templates/film.html` + `BRIEF.md` | the water cycle, 5 beats + finale on a 3:4 sheet, with a drawing defined in the page (`river`) — commented starting point, and an empty brief |
| `examples/honey/` | the worked example, made brief-first: `BRIEF.md`, then `index.html` — 10 beats + finale, three drawings designed for the topic |
| `examples/kit/` | every kit drawing on one sheet — look here before picking drawings and after changing `kit.js` |
| `scripts/new-film.mjs` | start a project (template or `--from honey`) |
| `scripts/check.mjs` | loads clean, every beat draws, deterministic, **layout holds** (no drawings on top of each other, no arrow through a label, all on the sheet, every beat's drawing in frame and clear of its subtitle card, labels readable on the whole sheet), the soundtrack renders |
| `scripts/render.mjs` | stills, a contact sheet, the soundtrack (`--wav`), or the MP4 with sound (workers × ffmpeg chunks; `--audio your.wav` / `--mute`) |
| `references/` | **BRIEF** (fixed vs per-topic, the brief template, the review rubric) · **LOOK** (what makes it read as the reference) · **BEATS** (topic → beats → a sheet that ends as an infographic, layout recipes) · **KIT** (API) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-film/
  BRIEF.md     the topic designed into beats, drawings, labels and the final sheet — written first
  film.html    defineSketch for the topic's own drawings, then the beats: F.beat(main, second) + what the pencil draws
  lib/         copy of the skill's lib/ (new-film.mjs); imported through an import map ("sk/")
  out/         stills, sheets, the WAV and the MP4 (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/check.mjs film.html`. The page is an ES module: view it
through a local server (`python3 -m http.server`).

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install. A 1920×1080 frame takes ~0.1–0.2 s to draw
and encode; the 69 s example (2,079 frames) renders in about 3½ minutes with 4 workers.

## Workflow
1. **Topic → brief.** Fill the template in references/BRIEF.md from the user's topic and save it as `BRIEF.md` before any
   code. Find the real story (BEATS.md): one sentence the viewer should leave with, 6–12 beats that each add **one
   drawing** and one idea, the numbers that make it concrete (checked against sources), and the subtitle's two lines per
   beat (main ≤ 26 characters). Then **draw the whole sheet first** — the finished infographic — as a rough map of where
   each drawing sits (reading order left → right, top → bottom; title top-left, note card top-right), and only then cut it
   into beats. Plan the drawings: kit ones, and the object(s) the kit lacks that say the topic.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (copies `lib/`, the template `film.html` and an empty
   `BRIEF.md`; `--from honey` copies the example and its filled brief). Replace the content with the brief's; keep only the
   structure. Pick the frame: `W: 1920, H: 1080` (16:9), `1080 × 1440` (3:4), `1080 × 1920` (9:16).
3. **Design the topic's drawings** with `defineSketch('name', (o, K) => [...])` in `film.html` (KIT.md): construction
   guides first (`K.guide`), then the line (`K.line` / `K.curve`), then colour (`K.wash`), then notes; things that move
   with `K.anim`. Draw them with the hand's own functions so they share the pencil; the skill's lib stays as is.
4. **Write the beats** from the brief: `F.beat(main, second)`, then that beat's drawings, labels and arrows in the order
   the pencil should draw them; `F.finale(…)` then the title (`F.title(…, { marks: [words] })`) and a note card.
5. **Check**: `node <skill>/scripts/check.mjs film.html` — fix every `layout ·` line (move a drawing, shrink it with `s`,
   put a label on the other side, `{ card: 'right' }` on a beat, a lower `zoom`) until it prints only `ok`.
6. **Look**: `render.mjs film.html --sheet 16 --scale .5`, then full-size stills mid-beat (the pencil drawing) and the last
   frame (`--stills 3,23,40,66`). Score them with the rubric in references/BRIEF.md and against references/LOOK.md: one
   drawing per beat and centred above the card; colour set off the line, never outlined by it exactly; labels readable at
   phone size; the last frame reads on its own as an infographic. Compare with the reference frames side by side.
7. **Render**: `render.mjs film.html --workers 4` → `out/film.mp4` with its soundtrack (`out/film.wav`; `--audio your.wav`
   for your own music or narration — `check.mjs --beats` lists beat starts to cut it to; `--mute` for none). Look at a frame
   from the MP4 itself and listen to it.

## Rules
- **Design per topic.** Every new topic gets its own brief, beats, drawings, labels and sheet. Never reuse the example's or
  the template's content, and never force a topic into their layout (a honeycomb is not a water cycle).
- **One style.** What you design keeps the same paper, pencil, wash, handwriting, red and highlighter as the kit; new
  drawings are made of `K.guide` / `K.line` / `K.wash` / `K.text` so the stylus draws them like everything else.
- **One drawing per beat.** A beat adds one picture (plus its label, an arrow, a number) and says one thing in its
  subtitle. Three objects at once is three beats.
- **The sheet is the ending.** Plan the final infographic first; every drawing has a place on it, nothing is erased, and
  the last frame must read on its own (title, reading order, labels ≥ 22 px — `check.mjs` enforces the size).
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames; seeds come from ids. `check.mjs` proves it.
- **True numbers only.** Every number on the sheet or in a subtitle is checked against a source written in the brief;
  "about" when the source says it varies.
- **Palette only.** Dark brown pencil, flat muted washes from `C`, red for arrows / numbers / the underline, yellow
  highlighter behind title words. No gradients, no outlines in colour, no dark backgrounds, no photos.
- **Original content.** New topics, layouts and drawings; no logos, brands, real people or named characters; the note card
  credits the film, not a company.

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.runChecks(t)` (layout problems + your
`F.check` rules), `window.shotAt(t)` (the beat), `window.film` (with `shots`, `cues`, `score(sampleRate)`),
`window.__ready = true` — all set by `F.start()`. `?render=1` = fixed canvas, no live loop; `?t=9` = one frozen frame;
`?scale=.5` = half the design size; `?loop=1` = the live page loops; `?mute=1` = no sound. Live: click once for sound,
click to pause / play, click the bottom edge to jump, keys space / ← / → / r / m (mute).
