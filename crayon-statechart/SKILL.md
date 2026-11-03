---
name: crayon-statechart
description: Turn a topic into a hand-drawn statechart explainer — cobalt ink and crayon hatching on cream paper, typewriter lettering, torn-ticket state boxes with a small red second-language tag, red [guards] on the arrows, branches, merges, self-loops, back edges and parallel "at the same time" regions — that draws itself one step at a time while the camera scrolls down a long sheet, with crayon illustrations beside the chart (people at work, pots, fire, steam, rain, jars, produce, trucks, houses) and a player bar with restart / prev / pause / next / speed and a numbered caption. Drawn entirely in code (Canvas 2D, no AI image model); outputs a live page and an MP4 (5:4 by default). Use for "how X is made", "the business of Y", "how a Z works" process diagrams in this style, remaking the X/Twitter "diagrams drawn in JavaScript" statechart clips on a new subject, or "이 스타일로 주제만 바꿔서" ("손그림 상태도", "색연필 다이어그램", "과정 설명 다이어그램 영상", "만드는 과정 다이어그램", "statechart 영상", "크레용 순서도", "hand-drawn flowchart video", "crayon diagram explainer").
---

# crayon-statechart

A process explained as a statechart that draws itself: chapter by chapter, a state box appears, an arrow grows to the
next one, a red `[guard]` names the condition of a branch, a loop says "not yet — again", and two regions change side by
side "at the same time". The current state turns pink with a red frame; states already passed keep a yellow dot. Beside
the chart, crayon illustrations show the work (a grandmother salting cabbage, a pot on a fire, jars in the snow). The
camera scrolls down the sheet as the chart grows; a player bar at the bottom carries the step number and a caption.
Everything is a pure function of `t`, so the same page plays live (with working buttons) and renders to MP4.

Built in this repo on the worked example `examples/kimchi` 「김장 · the making of kimchi」 (3 chapters, 20 steps, 46 s),
after the look of the clips posted on X: Ann Nguyen's "how vietnamese folks make incense sticks"
(https://x.com/ann_nnng/status/2116811409921372642) and the clip it quotes, Kevin Ngo's "the business of a boba shop"
(https://x.com/kevin_t_ngo/status/2116270190040416313, made with a /statechart skill). This skill rebuilds the *look and
grammar* as its own engine (sketch hand, router, layout checks, prop kit, player); the kimchi topic, layout, props and code
are this repo's own. The template (`templates/film.html`, 「택배 한 상자가 오기까지」, Korean main lines with English tags)
shows the topic swap.

## What's in this folder
| path | what |
|---|---|
| `lib/sketch.js` | palette `C`, `FONT`, seeded `rng`/`hash`/`n1`, `wobble`/`ink` (a pencil line with a second lighter pass), `hatch` (crayon fill), `shape`, `limbPts`, point lists (`ticketPts`, `roundRectPts`, `ellipsePts`, `cloudPts`), typewriter `text`, `paper`, `grain` |
| `lib/chart.js` | state / init / final / edge / group / region / divider / chapter / note: `layout`, orthogonal `route` with rounded corners, `labelOf` (guard + action placement), drawing with a reveal `k` |
| `lib/props.js` | the illustration kit (`person` with 6 poses × 8 actions × 6 hats, weather, fire, steam, vessels, produce, furniture, buildings, machines, `pile`, `blob`) and `defineProp` for your own |
| `lib/film.js` | `Film`: the authoring API (`step`, `chapter`, `state`, `edge`, …), reveal timing, camera, player bar, layout `problems()`, the render contract, the live player |
| `lib/fonts/` | Courier Prime (4 styles) + Nanum Gothic Coding (KS X 1001 Hangul subset), OFL — loaded by `film.js`, no network |
| `templates/film.html` | one chapter, 8 steps: a parcel from the order to the door (Korean main lines) — commented starting point |
| `examples/kimchi/` | the worked example: 3 chapters (split + merge + self-loop · split + merge + back edge · parallel regions), 20 steps |
| `examples/props/` | every prop in the kit on one sheet — look here before picking props and after changing `props.js` |
| `scripts/new-film.mjs` | start a project (template or `--from kimchi`) |
| `scripts/check.mjs` | loads clean, every step draws, deterministic, **layout holds** (no overlaps, no edge through a box, all on the sheet, active state in view) |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks, `--audio`) |
| `references/` | **LOOK** (what makes it read as the reference) · **STORY** (topic → chapters → states, the step grammar, layout recipes) · **KIT** (API) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-film/
  film.html    steps: caption + active state, then the chapter / states / edges / props that appear in that step
  lib/         copy of the skill's lib/ (new-film.mjs); imported through an import map ("sc/")
  out/         stills, sheets, the MP4 (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/check.mjs film.html`. The page is an ES module: view it
through a local server (`python3 -m http.server`).

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install. A frame takes ~10–30 ms to draw; the 46 s
example (1,367 frames at 1350×1080) renders in about 2 minutes with 4 workers.

## Workflow
1. **Topic → outline** (references/STORY.md). Find the real process: its stages (2–4 chapters), and in each the states
   (things that *are*: "halved heads", "a red paste"), the transitions (what *happens*: "split down the middle"), at least
   one **choice** (`[a few heads]` / `[a whole kimjang]`), one **"not yet" loop** (self-loop or back edge with a guard),
   and — for the last chapter, if the topic has it — two things that change **at the same time** (parallel regions).
   Pick the second language for tags (the topic's own language, or Korean/English), and 1–3 props per chapter that show
   hands doing the work. Facts must be true; check them.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from kimchi` for a 3-chapter skeleton).
3. **Write the steps** in `film.html`: `F.step(caption, activeState)`, then that step's elements in drawing order (edge
   before the state it points to). Layout on the 1350 px sheet with the recipes in STORY.md (column at x ≈ 700, branches
   ±170, rows 150–170 px apart, chapter heading top-left, props in the left/right margins). Captions are short and
   lower-case, like a storyboard line; the engine numbers them `II.3 — …`.
4. **Check**: `node <skill>/scripts/check.mjs film.html` — fix every `layout ·` line (move a prop, widen a gap, put a label
   on the other side with `side: 'l'`, route a back edge with `via`) until it prints only `ok`.
5. **Look**: `render.mjs film.html --sheet 16 --scale .5`, then full-size stills of every chapter's busiest moment
   (`--stills 9,24,41`). Judge against references/LOOK.md: the chart is the hero and reads top-down; guards are red and sit
   on the outside of their branch; no text touches a line; each chapter has illustrations doing the work; the active state
   is always on screen. Compare with the reference frames side by side.
6. **Render**: `render.mjs film.html --workers 4` → `out/film.mp4` (add `--audio music.wav` for a soundtrack; `check.mjs
   --steps` lists step starts to cut it to). Look at a frame from the MP4 itself.

## Rules
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames; seeds come from element ids. `check.mjs`
  proves it.
- **The chart leads.** Boxes, arrows and labels are the subject; props sit in the margins and never cover chart text
  (`check.mjs` enforces it; `overlap: true` only for props layered inside a region on purpose).
- **One idea per step.** Each step adds one transition and its target (or one loop, or one chapter heading); the caption
  says it in a few words. A step that adds three boxes is three steps.
- **Statechart grammar, honestly used.** States are nouns or conditions, transitions are actions, guards are the
  conditions of a choice, in `[brackets]`, red. Every choice has two (or more) guarded branches; a loop carries a guard
  that says why it repeats. Parallel regions are for things that truly change at the same time.
- **Two languages, one role each.** The main line in one language, the small red tag in the other (or omit tags).
  Lower-case main lines; Title case only for chapter titles.
- **Palette only.** Cobalt ink, navy text, red for guards / tags / the active state, crayon fills from `C`. No gradients,
  no shadows except the hatched drop shadow on boxes, no photos.
- **Original content.** New topics, layouts and drawings; no named characters, brands or copied diagrams.

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.runChecks(t)` (layout problems + your
`F.check` rules), `window.shotAt(t)` (the step), `window.film`, `window.__ready = true` — all set by `F.start()`.
`?render=1` = fixed canvas, no live loop; `?t=9` = one frozen frame; `?scale=2` = twice the design size; `?loop=1` = the live
page loops. Live: the bar's buttons work (restart · prev · pause/play · next · 1×/2×/3×), click elsewhere pauses, keys
space / ← / → / r / s.
