---
name: lineage-glow
description: Make a 9:16 vertical explainer film of glowing gold lines on black. One lit node at the bottom is the subject. Lines branch from it (a family tree that doubles every generation, a single line of descent read top to bottom, countless lines bursting out to "everyone"). A big counter steps with a blur as numbers grow, far generations pack into bands under a glowing horizon, many lines converge into one point, nodes switch off to grey and light again, and two-line Korean captions fade in at the top. It ends on one light. HTML Canvas, a bundled Korean font (Pretendard) and a synthesised score; outputs a live page and a 1080×1920 MP4. Give it a topic and it designs new beats, shapes, captions, numbers and music for it. Use for genealogy / family tree / 족보 / 계보 videos, ancestors, lineages of kings or teachers, "how many people did it take", exponential growth (doubling, spread, compound), Bible genealogy, history of a lineage, or to remake this reference style on a new subject ("계보 영상", "족보 설명 영상", "조상 수 영상", "가계도 모션그래픽", "빛나는 선 영상", "이 릴스처럼 주제만 바꿔서", "이 스타일로 ○○ 계보 설명해줘", "lineage animation", "glowing family tree video", "exponential growth explainer"). Source — made from https://www.instagram.com/reel/DfhYbCMyOKJ/?dlrf=MTJlaTA4NTJuenc4bg==
---

# lineage-glow

A vertical film where an idea is told by light moving along lines. One warm node glows near the bottom of a black
frame: the subject (나, a king, Jesus, one message). From it, thin gold lines curve upward and branch. The light might be
a family tree doubling every generation, a single line of descent the light travels down name by name, or a burst of
countless lines spreading out to everyone. A big number above counts what the lines mean. Far generations pack into
bright bands under a glowing horizon line, a timeline of years ticks down the left edge, and many lines can be drawn into
one point (shared ancestors, one source). Nodes switch off to cold grey and light again. Two lines of Korean text fade in
at the top, one thought at a time. The film ends on the one light it began with. Everything is drawn in code on an HTML
Canvas, with a bundled Korean font and a synthesised score. Every frame is `seek(t)`, so the same page plays live with
sound and renders to MP4.

Made in this repo after an Instagram reel by kim__seo_han —
https://www.instagram.com/reel/DfhYbCMyOKJ/?dlrf=MTJlaTA4NTJuenc4bg== (122 s: "나 한 사람이 태어나기까지 몇 명이
필요했을까?" The ancestor tree doubles to 8,589,934,592, the ancestors collapse into one shared web, and "gene switches"
turn off and back on). This skill takes its *style*: the glowing lines, the counter, the compression, the horizon, the
switch, the convergence and the return to one light. It draws them with its own engine. That reel's script, its claims
and its numbers are not reused (references/SOURCE.md). Worked example: `examples/jesus-genealogy` 「예수님의 족보」
(102 s, Matthew 1 and Luke 3). Live: https://jungrok5.github.io/motion-skills/lineage-glow/

**Fixed by the style** (every film): 9:16 at 1080×1920; warm light added onto near-black (additive, bloom, grain,
vignette); thin gold S-curves that leave one node vertically and arrive at the next vertically; lit = white-hot gold,
off = cool grey; one subject node with a warm pool of light under it; the top fifth reserved for type (a two-line
caption or the counter, never both); captions fade and rise in, the counter blurs between values; lines always *grow*
from source to target, never pop in; slow eased camera; the ending returns to one light.
**Designed per topic** (never reused): the thread (what the film says) and its beats; which shapes tell it (tree,
chain, fan, convergence, switch) and in what order; the subject node and every name, label and number (each one
sourced); the counter's meaning and steps; the timeline axis; the colour accents if the topic needs them; the captions;
the score's chords, motifs and hits.

## What's in this folder
| path | what |
|---|---|
| `lib/film.js` | `Film`: the 1080×1920 canvas, camera (keys or a follow function), world layers, captions, counter, timeline axis, drifting words, bloom / grain / vignette / dust, live player with sound, `textCheck`, `glyphCheck`, the contract |
| `lib/glow.js` | the painter every world layer gets: `curve` · `link` · `line` · `fibers` (hundreds of lines in one stroke) · `node` (lit ↔ off) · `flare` · `horizon` · `label` · `spark` · `cached` / `stamp`; the palette |
| `lib/lineage.js` | the shapes: `stack` (generation spacing that packs into bands), `binaryTree` (doubling ancestors, explicit near, sampled fibres far), `chain` (one line of descent, grows up or `down`), `fan` (one → countless), `converge` (many ends into one point) |
| `lib/score.js` | the synth: pad, bell, sub, riser, hit, shimmer, tick, air, reverb. Pure, so it runs in the page and in Node |
| `lib/core.js` | keys, steps, easing, seeded random, hash, noise, bezier split, `sCurve`, colour |
| `lib/fonts/` | Pretendard SemiBold + Bold (KS X 1001 subset: all 2,350 common Hangul + Latin), OFL licence beside them |
| `templates/` | `film.html` (16 s 「한 통의 전화」: a doubling tree to 8.6 billion), `score.js`, `BRIEF.md`. This is what `new-film.mjs` copies |
| `examples/jesus-genealogy/` | the worked example: `BRIEF.md` (design + review log), `index.html`, `timing.js` (shared by film and score), `score.js` |
| `scripts/new-film.mjs` | start a project (template, or `--from jesus-genealogy`) |
| `scripts/render.mjs` | stills, contact sheets, the MP4 (workers × ffmpeg, `--audio`) |
| `scripts/check.mjs` | loads clean, every layer draws, nothing black or blown out, rules, type in the safe area / readable / not overlapping, every glyph in the font, deterministic, score renders |
| `scripts/score.mjs` | score.js → WAV |
| `references/` | **SOURCE** (the reel, beat by beat; what is / is not taken) · **BRIEF** (template + still rubric) · **LOOK** (palette, layout grid, type, the motion vocabulary → API) · **ENGINE** (API) · **LESSONS** |

## Project layout (what you create)
```
my-film/
  BRIEF.md     topic → thread, shapes, beats table, facts with sources, sound, quality standard (written first)
  film.html    Film → shapes (lineage.js) → camera → world layer(s) → captions / counter / axis → beats → rules → F.start()
  timing.js    (optional) the timeline both film.html and score.js import, so bells land on the frames they belong to
  score.js     export const SCORE = { pad, bell, sub, rise, hit, shimmer, tick, air }
  lib/         copy of the skill's lib/ (new-film.mjs); the page imports it through an import map ("lg/")
  out/         stills, sheets, film.wav, film.mp4 (not committed)
```
Run scripts from the project root: `node <skill>/scripts/render.mjs film.html --sheet 24 --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the file:// flag.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (~0.3 s a 1080×1920 frame on a CPU).

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from references/BRIEF.md before any code. Fill in:
   - the THREAD: one sentence the film says.
   - the SUBJECT: the one node.
   - the SHAPES: which of tree / chain / fan / convergence / switch carry the idea, and why. Use the shape the topic
     really has: ancestors double, a royal line is a chain, followers fan out.
   - the BEATS table: time, beat, picture, caption, counter / axis, sound.
   - the FACTS: every name, date and number with its source. Mark approximate dates "약".

   Captions are your own sentences: at most two lines of about 20 characters each, one thought per caption. If the user
   brings a reference video, extract stills (`ffmpeg -i ref.mp4 -vf fps=1/2,scale=270:-1,tile=8x2 sheet.jpg`), list what
   it does, then design your own beats. Never reuse its script.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from jesus-genealogy`).
3. **Shapes**: build the layouts once at the top of `film.html` with lineage.js (`stack`, `binaryTree`, `chain`, `fan`).
   Draw new shapes the topic needs (side nodes, brackets, a second line, a different spacing) in the project with the
   Glow painter (ENGINE.md). Extend; don't edit the skill's lib/.
4. **Camera**: keys for the composed moments, plus a follow function where light travels (keep the growing tip at about
   2/3 of the height). The subject sits at 60–68 % of the height; nothing bright goes above y ≈ 470 (use `fadeTop`).
5. **World layer**: one `F.world((g, t) => …)` that derives every state from `t`: growth, `on` (switch), flares,
   horizon, labels. Show the road ahead as a switched-off ghost when light travels down a known line.
6. **Type**: `F.caption` for the thoughts, `F.counter` for the number (steps exactly when the light reaches each row:
   solve growth(t) = k), `F.axis` for years, `F.words` for things that drift and fade. The counter and a caption never
   share the screen.
7. **Rules**: `F.check(...)` for what must stay true (the tip is in frame, named nodes are on screen while named, the top
   of the shape stays below the caption).
8. **Review stills**: `render.mjs film.html --sheet 24 --scale .5`, ~10 full stills at the busiest moments, then score
   each with the rubric in references/BRIEF.md. Log what failed in BRIEF.md, fix it and render again.
9. **Check**: `node <skill>/scripts/check.mjs film.html` must print only `ok`.
10. **Score**: `score.js` against the beats: a pad chord per beat, a bell when a node lights (`reach(k)` times), a sub
    under reveals, a riser into the burst, a `hit` on it, `shimmer` while countless lights come on, `air` for a held
    silence. Listen live (♪), then `node <skill>/scripts/score.mjs score.js --dur <DURATION> --out out/film.wav`.
11. **Render**: `render.mjs film.html --workers 4 --audio out/film.wav` → `out/film.mp4`. Look at stills pulled from
    the MP4.

## Rules
- **Design per topic.** The beats, shapes, names, numbers and captions are made for this topic. The template's
  "phone call" tree and the example's genealogy are examples of the style, not menus. Do not carry a doubling tree
  into a topic that is a single line, or a counter into a topic with no number worth counting.
- **One style.** New shapes use the Glow painter (additive light, S-curves, lit/off nodes) and the palette. Don't add
  flat fills, outlines, photos or a second type family. Accents (a cooler colour for a second line, say) stay warm-on-black.
- **Facts are facts.** Every name, date and number on screen is in the brief's FACTS with a source; approximate dates
  say "약". Scripture and other texts are quoted only from public-domain translations (e.g. 개역한글) and short;
  otherwise paraphrase and cite (마 1:17). A count must match what is drawn. If the source counts in an unusual way
  (Matthew counts David twice), show that way honestly.
- **The type rules the top.** One caption or the counter, centred at the top, white over black. check.mjs fails type
  over light (mean luminance > .38), outside the safe area (top 9 %, bottom 18 %, sides 6 %) or overlapping.
- **Light grows.** Lines grow from their source to their target, with a bright tip; nodes fade in as the light reaches
  them; numbers step when the row is reached. Nothing pops.
- **Pure function of t.** No `Math.random`, `Date` or state between frames: seeded `rng` for layouts, `hash` / `noise1`
  / `keys` per frame. check.mjs proves determinism.
- **End on one light.** Whatever spreads out comes back to the single node (`converge`, a held flare), and the last
  caption names it.
- No characters with bodies: this style draws nodes and lines only, so there is no cast sheet or joint check. If a
  topic needs figures, use a skill that draws them.

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS`, `window.SIZE = {W: 1080, H: 1920}`, `window.runChecks(t)` (names of
broken rules), `window.shotAt(t)` (the beat), `window.textCheck(t)` (each visible caption / counter: box + mean luminance
of the picture under it), `window.glyphCheck()` (characters missing from the font), `window.film`,
`window.__ready = true`, all set by `F.start()` after the fonts load.
`?render=1` = fixed canvas, no live loop; `?t=20` = one frozen frame; `?scale=.5` = preview size;
`?off=bloom,grain,dust,vignette,text`. The live page fits the window and loops; click/space pauses, ← → jump 3 s, the
bar scrubs, ♪ plays the score in sync.
