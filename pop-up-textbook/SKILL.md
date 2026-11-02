---
name: pop-up-textbook
description: Build an interactive 3D textbook page in three.js — an open book on a wooden desk under a green banker's lamp, one lesson per spread, the left page typeset (title, formula, key words, a predict question with tick boxes, a lift-the-flap answer, handwritten margin working) and the right page carrying a pop-up diorama drawn in an ink-and-hatching engraving style that the reader pokes (switches, plugs, kettles, orbits) while it animates the science (electrons, meters, waves, day length); pages turn with a curling leaf, a magnifier loupe, key-word / predict / why cards, a lesson HUD and contents; a scripted cursor tour bakes to a 16:9 MP4. Use for "interactive 3D book", "3D textbook", "pop-up book lesson", "interactive lesson page", "GCSE physics lesson in 3D", "explain X as a pop-up book", "lift the flap", "3D 교과서", "인터랙티브 3D 책", "팝업북 수업 페이지", "이 영상처럼 3D 책으로 만들어줘", "과학 수업을 입체 책으로".
---

# pop-up-textbook

A pipeline for **interactive 3D textbooks**: each lesson is one spread of a book lying open on a desk. The left page is
typeset from data — kicker, title, lead, a formula box with handwritten working in the margin, key words, a **predict**
question with tick boxes, a challenge stamp and a **lift-the-flap** answer. The right page carries a **pop-up diorama**
built in three.js code and drawn as an engraving: flat paper colours, ink outlines, and diagonal hatching wherever light
falls off (cross-hatching in deep shade). The reader pokes the diorama (close a switch, push a plug in, start the year)
and it animates the physics from one small model (electrons drifting, a meter counting kWh, a mains wave, day length).
Pages turn with a curling leaf; the old diorama folds flat and the next one draws itself in and pops up. A loupe
magnifies whatever is under the cursor. A scripted tour — clicks with a drawn cursor, camera moves from the lamp to the
book and back — plays on load and bakes to a 1920×1080 MP4, so the same page is the live lesson and the film.

Built in this repo by recreating in code a screen recording posted on X (techartist_, Nov 2026: an interactive 3D book
on GCSE Physics Electricity, lesson "Mains and the plug"). Worked examples: `examples/electricity/` (three lessons; lesson 7
recreates the reference) and `examples/sky/` (seasons and the phases of the Moon — a different subject on the same kit).

## What's in this folder
| path | what |
|---|---|
| `kit/book.js` | the engine (ES module): `createBook` — desk, banker's lamp and lights, the book (cover, page blocks, gutter-curved pages, turning leaf, flap), ink material + outlines, the diorama builder `D`, state replayed from timed events, camera views, HUD / cards / contents, loupe, tour + cursor, `renderAt(t)` |
| `kit/page.js` | the typesetter: draws a lesson's left and right pages on 1400×1848 canvases, returns clickable regions, reports text that does not fit |
| `kit/book.css` | HUD pill, tools, cards, contents menu, callouts, cursor; portrait layout |
| `kit/fonts/` | Source Serif 4 (book), Caveat (margin hand), Inter (HUD) — SIL OFL, licences beside them |
| `kit/vendor/three/` | three.js r170 module build (MIT, `LICENSE`) |
| `examples/electricity/` | **reference**: 5 Current and charge (cell, knife switch, bulb, ammeter, drifting electrons) · 6 Power and the bill (meter, kettle, phone, lamp, clock, kWh and pence) · 7 Mains and the plug (wall socket, cut-away plug, fuse, live/neutral/earth, oscilloscope, AC electron shuffle, the desk lamp lights when plugged in); 33 s tour |
| `examples/sky/` | 3 Why we have seasons (orrery lit by its own Sun, tilted axis, UK day length) · 4 Phases of the Moon (sunlight from one side, inset of the phase seen from Earth); 24 s tour |
| `scripts/render.mjs` | stills (`--stills 3,9.5`) or MP4 of the tour; captures the whole page; prints layout overflow |
| `scripts/render-chunked.sh` | MP4 in parallel segments, resumable, joined |
| `references/KIT.md` | kit API: book config, lesson fields, `D` helpers, the update state `s`, commands, tour targets, contract |
| `references/WRITING.md` | how to write a lesson that fits and teaches: text budgets, predict-then-reveal, diorama design in the ink style |
| `references/LESSONS.md` | what went wrong building the examples, and the fixes |

## Project layout (what you create)
```
my-books/
  kit/                 ← copy of <skill>/kit/
  <slug>/index.html    one book: lessons (text + diorama functions) and a tour (start from <skill>/examples/electricity/index.html)
  out/<slug>.mp4       the baked tour (1920×1080)
```
Pages load `../kit/…` (the examples use `../../kit/…`; fix the importmap and the stylesheet link when you copy one).

## Requirements
Node 18+, Playwright with Chromium (WebGL on SwiftShader headless, ~0.85 s per 1080p frame), ffmpeg. No network at runtime.

## Workflow
1. **Plan the book.** Subject, level, 2–5 lessons. For each: one idea, one formula (or a key number), three key words,
   one **predict** question whose answer surprises (a misconception: "the electrons come from the power station"),
   and one **diorama** that shows the idea and has one thing to poke. If the user gave a reference video, extract
   frames first (`ffmpeg -i ref.mp4 -vf fps=1,scale=640:-1,tile=2x7 sheet.jpg`) and read every panel, label and button.
2. **Write the text** to the budgets in `references/WRITING.md` (lead ≤ 3 lines, 3 key words, ≤ 3 options,
   why ≤ 60 words, legend items ≤ 26 characters). The typesetter reports overflow; never shrink the type to fit.
3. **Build each diorama** with `D` (`references/KIT.md`): a base board, 4–8 parts as `D.piece(group, delay)` so they pop
   up in turn, `D.ink(colour)` for everything solid, one or two accent colours, `D.callout(n, …)` numbered to match the
   legend, `D.click(obj, id)` on the part the action line names. Animate in `update(s)` from `s.k(id)`, `s.on(id)`,
   `s.simSince(id)`, `s.simT` only. Light that belongs to the scene (a Sun, sunlight) goes in `D.ink(c, { sun })`.
4. **Tour**: 20–35 s — lamp → book, poke the diorama, open predict, tick, lift the flap, next page, loupe over the
   formula, next page, poke, close-up view, back to the lamp. One action per 1.2–2 s; leave 2–3 s after a page turn.
5. **Verify** (mandatory): `node <skill>/scripts/render.mjs <slug>/index.html <scratch>/st --stills …` — one still just
   after each tour step, at 1920×1080 and `--size 390x844`. Read every still: parts intersecting or floating, callouts on
   the wrong part or on top of each other, hatching on lit faces (calibration) or none in shadow, cards covering what
   they explain, text overflow lines in the script output. Then open the page live (`?live`) and click every region,
   part, HUD button and key; the console must stay clean.
6. **Bake**: `<skill>/scripts/render-chunked.sh <slug>/index.html out/<slug>.mp4 6 4 22` (1920×1080, 30 fps).
7. **Publish** the page (it runs on a phone) and hand over the MP4.

## Rules
- **Determinism**: everything on screen is a function of `t` and the event list. No `Math.random`, `Date` or
  `performance.now` in a diorama; use `U.rng(seed)` at build time. Animate from `s`, never from a clock of your own.
- **One model per diorama**: a number shown on a meter or screen is computed from the same values that move the parts
  (the meter disc, the kWh digits and the pence all come from one energy integral).
- **Honest science**: real units and real values; say on the page what is exaggerated or slowed ("electron shuffle drawn
  far larger than real", "25× slower", "not to scale"). The speed choice changes `s.simT`, not the physics.
- **Ink look**: paper-white and pale materials through `D.ink`; colour only where it carries meaning (wire colours,
  electrons, the Sun). Emissive things (bulbs, screens, glows) use `D.basic` / `D.glow` / `D.screen`. Keep diorama
  parts ≥ 0.01 page units so outlines and hatching read at book view.
- **Layout**: the diorama stays inside `D.area` (0.84 × 0.71 page units, centred on the free part of the right page) and
  below ~0.35 high, or it hides the HUD in the book view. Callout labels sit off the model, never on another label.
- **Interaction**: page regions, parts and HUD buttons all go through commands (`next`, `opt:1`, `flap`, `act:plug`,
  `card:terms`, `speed:1`, `view:right`, `loupe`). User input stops the tour and keeps the state.
- **Credit**: name the reference in `SKILL.md` and the samples page only; never put another author's name or credit
  line in the page's `credit`.

## Contract
The page links `kit/book.css`, maps `three` in an importmap, calls `createBook({...})` and `book.start()`, and keeps a
literal `DURATION = <n>` in a comment for `render-chunked.sh`. The kit exposes `window.ready`, `window.renderAt(t)`,
`window.DURATION`, `window.book` (`book.where(target)`, `book.pick(x, y)`, `book.state`, `book.overflow`, `book.cmd(c)`).
URL flags: `?render` (no loop, for the scripts), `?live` (skip the tour, open on the book), `?t=12` (start the tour at 12 s).
