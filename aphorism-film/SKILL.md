---
name: aphorism-film
description: Make a 35–60 s "aphorism film" entirely in code — famous lines on one topic set as white editorial type (a huge Didone word, small italics, tracked caps, condensed poster caps, a tiny attribution) over flat, ink-lined, maximal retro-pop anime illustrations (patterned walls, giant murals, one-point corridors, gardens, flying papers, a lead with blunt bangs and colour streaks), joined by paper storms, cracking walls, paper vortices and ink floods, ending on the image it began with so it loops. HTML Canvas with bundled OFL fonts and a synthesised score (felt piano, pads, paper / stone / ink sounds); outputs a live page, a 1920×1080 MP4 and a one-file HTML. Give it a topic and it chooses public-domain quotes with checked sources, then designs new scenes, cast, transitions and music for them. Use for a quote video, philosophy / motivational / brand-values montage, a "words of …" tribute, or to remake this reference style on a new subject ("명언 영상", "철학 명언 애니메이션", "인용구 모션그래픽", "이 영상처럼 주제만 바꿔서", "이 스타일로 ○○ 명언 영상 만들어줘", "quote animation", "aphorism montage", "editorial typography anime video"). Source — made from https://x.com/8co28/status/2120410557295829430?a=xbg7-g3K3N-CB7eVhPE&s=19.
---

# aphorism-film

A short film of famous lines: each shot sets one quote as a stack of white editorial type over a dense, flat, ink-lined
illustration made for that line — a giant mural on a garden wall, a corridor of paintings, a close-up face before a wall
of pinned papers — and the shots are joined by the style's transitions (a storm of printed sheets, a wall that cracks and
falls, a paper vortex, an ink flood). The last image returns to the first, so the film loops. Everything is drawn in code
on an HTML Canvas with bundled OFL fonts and a synthesised score; every frame is `seek(t)`, so the same page plays live
with sound and renders to MP4.

Made in this repo after the video 852話 (hakoniwa) posted on X — https://x.com/8co28/status/2120410557295829430?a=xbg7-g3K3N-CB7eVhPE&s=19
(61 s, "I think, therefore I am": Western philosophy quotes in editorial type over AI-assisted anime illustrations).
This skill takes its *style* — the type stack, the flat pattern-heavy pictures, the scale contrasts, the transitions as
events, the loop — and draws it with its own engine. The quotes, scenes, characters and music of that video are not used
(references/SOURCE.md). Worked example: `examples/time` 「Time」 (43.5 s, 6 shots — Virgil, Franklin, Hippocrates, Ovid,
Horace). Live: https://jungrok5.github.io/motion-skills/aphorism-film/

**Fixed by the style** (every film): 16:9; the quote stack (roles, sizes, builds — TYPE.md) in the left third over a dark
corner; flat colour + one cel shadow + ink outlines + pattern on every wall; the pop palette; a figure tiny in a big space
or a close-up face; the transition vocabulary; the printed-paper grade; the loop.
**Designed per topic** (never reused): the lines and their order; one scene per line (place, props, palette accent,
framing, camera); the cast (hair, streaks, eyes, clothes, props); which transition joins which shots; the loop image;
the score's key, motif and sounds.

## What's in this folder
| path | what |
|---|---|
| `lib/film.js` | `Film`: plates painted after fonts load, shots + multiplane camera, the quote timeline, transitions (`papers` · `crack` · `vortex` · `ink` · `slide` · `dissolve` · `white` · `black`), the grade, live player with sound, `textCheck`, the contract |
| `lib/type.js` | the quote stack: line markup with 9 roles, stacked side segments, per-role builds (rise · fade · type · smear · slam) and exits, attribution, `addFont` for other scripts |
| `lib/kit.js` | the illustration kit: ink/fill helpers, 10 patterns, stone walls, cracks, marble, collage, foliage, flowers, vines, sun, frames, papers, microtext, clocks, hourglass, books, lamp, door, window, chair, one-point `room()` |
| `lib/figure.js` | the cast: `bust` (front / 3/4 close-up, blinks, looks), `body` (side ↔, front, back), `walk` / `run` / `stand`, joint limits `LIM` audited every frame |
| `lib/score.js` | the synth: pad, strings, bass, bell, felt piano, clock tick, air, sfx (paper, crack, swirl, ink, slam, whoosh, rumble, chime …), reverb |
| `lib/core.js` | seeded random, hash, noise, monotone keyframes, easing, colour |
| `lib/fonts/` | Playfair Display (400/700/900, italics), Anton, Inter (400/800) — latin subsets, OFL licences beside them |
| `templates/` | `film.html` (12 s, 2 quotes), `cast.js`, `cast.html` (the cast sheet), `score.js`, `BRIEF.md` — what `new-film.mjs` copies |
| `examples/time/` | the worked example: `BRIEF.md` (with the review log), `index.html`, `cast.js`, `score.js` |
| `scripts/new-film.mjs` | start a project (template or `--from time`) |
| `scripts/render.mjs` | stills, contact sheets, the MP4 (workers × ffmpeg, `--audio`) |
| `scripts/check.mjs` | loads clean, every shot draws, no blank frames, rules + joint limits, quotes inside the safe area and readable, deterministic, score renders |
| `scripts/score.mjs` | the score → WAV |
| `scripts/bundle.mjs` | one self-contained HTML (engine, fonts, film, score inlined, ~400 KB) |
| `references/` | **SOURCE** (the reference video, shot by shot, and what is / is not taken) · **BRIEF** (template + still review rubric) · **QUOTES** (choosing, checking, setting lines) · **STYLE** (palette, picture, layers, transitions, grade) · **TYPE** (the stack) · **CAST** (designing characters, directions, joints, cast sheet) · **KIT** (API) · **LESSONS** |

## Project layout (what you create)
```
my-film/
  BRIEF.md     topic → thread, lines (with sources), one scene per line, cast, sound, quality standard — written first
  cast.js      export const CAST = { lead: {…} } — the characters, designed for this topic
  cast.html    the cast sheet (both directions, joint check) — reviewed before any shot
  film.html    palette → plates (F.plate) → shots (F.shot) → quotes (F.quote) → rules (F.check) → F.start()
  score.js     export const SCORE = { pad, piano, bass, strings, tick, sfx, reverb }
  lib/         copy of the skill's lib/ (new-film.mjs); the page imports it through an import map ("af/")
  out/         stills, sheets, film.wav, film.mp4 (not committed)
```
Run scripts from the project root: `node <skill>/scripts/render.mjs film.html --sheet 16 --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the file:// flag.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (~0.11 s a 1080p frame).

## Workflow
1. **Topic → brief.** From the user's topic write `BRIEF.md` with references/BRIEF.md: a THREAD (what the film says),
   5–8 lines chosen and checked with references/QUOTES.md (public domain, source found, misattributions avoided, the
   original language as a kicker where famous), the LOOP IMAGE, and one SCENE per line designed for that line (place,
   the lead's action and framing, the props that carry the idea, accent colour, the transition in — chosen by meaning,
   STYLE.md — and the type layout). If the user brings a reference video, extract stills (`ffmpeg -i ref.mp4 -vf
   fps=1/2,tile=4x2 sheet.jpg`), list what it does, then design your own; never copy a frame, character or line.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from time`).
3. **Cast**: design each character in `cast.js` for the topic (CAST.md). Render the cast sheet (`render.mjs cast.html
   --stills 1,6`), score it (same person in all views? head/chest/hips/toes agree? knees back, elbows forward, feet down?),
   and run `check.mjs cast.html` until it prints only `ok`.
4. **Plates, one shot at a time**, back to front with the kit (KIT.md): the wall pattern or architecture, the mural or
   emblem, foliage/flowers framing top and bottom, props; and **the dark corner for the quote** designed into the
   picture (a curtain, a dark doorway, a shadowed wall, a gradient). Make plates wider than the frame by camera travel ×
   depth. Draw the scene's own things in the project (like the example's mural and calendar pages) — extend, don't edit, lib/.
5. **Shots**: camera keys (push, truck with a walker, dolly down a corridor), characters with `g.at(z, …)` on twos,
   per-frame props (clock hands, drifting pages, an hourglass running), transitions in. 6–8 s a shot.
6. **Quotes**: one `F.quote` per shot (TYPE.md): a big word per line, scale contrast ≥ 3×, left third, on screen from
   just after the transition in to just before the one out.
7. **Review stills**: `render.mjs film.html --sheet 24 --scale .5`, ~12 random full stills and one mid-transition still
   per cut; score each with the rubric in references/BRIEF.md; log what failed in BRIEF.md; fix and re-render.
8. **Check**: `node <skill>/scripts/check.mjs film.html` must print only `ok` (it also measures every quote's corner).
9. **Score**: `score.js` against the shot starts (check.mjs prints them): a chord per ~3.7 s, a piano motif, sfx on the
   cuts (paper · crack · whoosh · swirl · ink), slams under poster caps. Listen live (♪), then
   `node <skill>/scripts/score.mjs score.js --dur <DURATION> --out out/film.wav`.
10. **Render**: `render.mjs film.html --workers 4 --audio out/film.wav` → `out/film.mp4`; look at stills from the MP4.
    One HTML file if wanted: `bundle.mjs film.html` → `out/film.single.html` (draws live; it is not a video wrapper).

## Rules
- **Design per topic.** Every line, scene, character and transition is chosen for this topic. The template and the
  example are examples of the style, not menus; do not carry the clock mural, the red-blazer lead or the gallery into a
  film about something else.
- **One style.** New scenes use the same palette, flat fills, one cel shadow, ink outlines and pattern density; new
  characters use figure.js so their proportions and line match.
- **Quotes are facts.** Public domain only, source named in `src`, the author's own wording (QUOTES.md). Never invent or
  "improve" a quote.
- **The type rules the frame.** Left third, white over a dark quiet corner, one quote at a time, nothing crossing it.
  `check.mjs` fails a quote over a bright area or outside the 5 % safe margin.
- **Bodies are possible.** Every pose stays inside `LIM`; directions follow CAST.md; the cast sheet is reviewed both ways.
- **Pure function of t.** No `Math.random`, `Date` or state between frames — seeded `rng` in plates, `hash`/`noise2`/`keys`
  in shots. `check.mjs` proves determinism.
- **Paint once, move many.** Pattern, foliage and architecture go into plates; per frame only plates, characters and a
  few light props are drawn.
- **Original designs only.** No characters, logos or frames from existing films, games or the reference video.

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}` (1920×1080), `window.runChecks(t)` (broken
rules + joint-limit issues), `window.shotAt(t)`, `window.textCheck(t)` (each visible quote's box and the mean luminance
under it), `window.film`, `window.__ready = true` — all set by `F.start()` after the fonts load and the plates are painted.
`?render=1` = fixed canvas, no live loop; `?t=20` = one frozen frame; `?scale=.5` = preview size;
`?off=grain,paper,vignette,grade,type,dof`. The live page fits the window and loops; click/space pauses, ← → jump, the bar
scrubs, ♪ plays the score in sync.
