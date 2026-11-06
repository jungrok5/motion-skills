---
name: hands-on-lab
description: Build a hands-on lesson app for any topic — a short course of 4–9 interactive lessons, each a toy-like 3D bench drawn in three.js code (cel-shaded parts with thick ink outlines on warm paper, name tags, moving stripes that show current / rope / flow) that the learner switches on and changes part by part, beside a panel with Overview · Parts · <Experiment> · Maths tabs, a 2D diagram (circuit schematic, free-body diagram, pulley diagram…) whose parts are clickable and always agree with the bench, a live chart, worked equations with the current numbers, "try it" goals with progress, a lesson strip with 3D thumbnails, and every text in several languages; a scripted cursor tour of the app renders to a 16:9 MP4. Give it a topic ("simple machines", "light and lenses", "how a fridge works") and it writes a brief, designs the course's own parts, models and diagrams, checks them and renders. Use for "interactive lessons app", "learn X by experimenting", "electronics 101 style app", "3D course with circuit diagrams and charts", "hands-on science lessons", "실습형 학습 앱", "인터랙티브 레슨", "회로 실험 앱", "이 영상처럼 ○○ 배우는 앱 만들어줘", "3D 실험 코스", "주제만 바꿔서 레슨 앱". Source — made from https://x.com/DilumSanjaya/status/2118386789169938562.
---

# hands-on-lab

A pipeline for **hands-on lesson apps**: a course of short lessons, each one a small 3D bench of chunky, outlined,
toy-coloured parts on warm paper that the learner switches on and changes. Every lesson runs one small model
(`solve(inputs, state) → values`), and everything on screen reads those same values: the bulb's glow and the meter's
screen, the stripes running along the wires, the diagram's numbers, the chart's marker, the worked equations. A click on
a part — in 3D or in the diagram — opens its card with its controls. Units of lessons, "try it" goals, a lesson strip
with thumbnails, and every word in every language the course lists. A scripted tour with a drawn cursor plays the app and
bakes to MP4 frame by frame, so the page is the product and the promo.

Made in this repo after Dilum Sanjaya's post on X — https://x.com/DilumSanjaya/status/2118386789169938562 — a 2.5-minute
screen recording of his Electronics 101 app (48 lessons with circuit diagrams, charts, the maths behind them, 13
languages). The style was studied from that recording's frames and re-built here from scratch: the look (paper, ink
outlines, toon shading, name tags, flow stripes), the app's shape (bench + tabbed panel + diagram + chart + lesson strip)
and its habits (power button, "click a highlighted part", alternative builds). No code, art, text, name or logo of that
app is used: every course here gets its own title, mark and wording. Worked examples: `examples/circuits/` (the style
reference — five circuit lessons) and `examples/simple-machines/` (a topic the source never covered, made from its
`BRIEF.md`: lever, ramp, pulleys, gears).

**Fixed (the style)** — warm paper with faint circuit-trace ornaments and a floor grid; toon shading in three steps with
2 px ink outlines on every part; one teal accent (selected parts, active controls, the chart line); condensed caps for
titles and tabs, mono for numbers; white name tags with an ink border, dark pill value tags; yellow stripes moving along
anything that carries a flow; the app's layout (header with progress, left rail, bench, tabbed panel, lesson strip) and
its phone stack; the panel's four tabs and the experiment tab's order (head with power → builds and general controls →
diagram → selected part's card); diagram, chart and maths reading the bench's numbers; deterministic `renderAt(t)`.

**Designed per topic** — the course (units, lessons, the one idea of each), every part on every bench (shapes, colours,
proportions, what moves or glows), every model (equations, state, units, honest simplifications), the diagram
convention (schematic, free-body, pulley, ray, pipe…) and its symbols, what flows (current, rope, water, heat, light),
each chart's axes, the maths, the try-it goals, the name of the experiment tab, the course mark, the languages, the tour.
The examples are construction references, not menus: a lens course does not get batteries; a lever is not a resistor.

## What's in this folder
| path | what |
|---|---|
| `lib/lab.js` | the app: `mountLab(course)` — state, fixed-step world (`init/step/solve`), actions, panel / chart / strip / menus, thumbnails, tour + cursor, `renderAt(t)`, `window.lab` API |
| `lib/stage.js` | the bench: renderer, toon materials, ink outlines (screen-space hull), floor + grid, labels with overlap push, picking, camera fit/orbit, thumbnails, and the kit `k` (`box cyl sphere torus lathe extrude tube rod text screen glow label part at group toon`) |
| `lib/ui.js` | language (`CHROME` strings en/ko), `si()` / `fix()` number formatting, `schematic()` builder, `chartSVG()`, maths blocks, icons |
| `lib/lab.css` | the look: tokens, layout (desktop grid, phone stack), panel, controls, tags, schematic and chart styles |
| `lib/fonts/` · `lib/vendor/` | Barlow Condensed, Inter, JetBrains Mono, Noto Sans KR (OFL, licences beside them) · three.js r170 (MIT) |
| `examples/circuits/` | **style reference**: Circuits 101 — open/closed, series/parallel, voltage divider (loose / breadboard builds), LEDs, RC charging · `course.js`, `parts.js`, `symbols.js`, `BRIEF.md` |
| `examples/simple-machines/` | **new topic from a brief**: Machines 101 — lever (moments, tipping plank), ramp (winch + spring balance), pulleys (1/2/4 ropes), gears (meshing teeth) · `course.js`, `parts.js`, `BRIEF.md` |
| `scripts/new-course.mjs` | start a project from an example (copies `lib/`, fixes paths, writes the brief template) |
| `scripts/check.mjs` | data + languages complete, every control changes something, values finite, no NaN text, bench inside the frame, labels apart, every pickable part on the bench and in the diagram, diagrams inside their box, tour clicks land on real targets, frames reproducible, phone width, thumbnails |
| `scripts/render.mjs` | the tour to MP4 (1280×720 page at 1.5× → 1920×1080), `--stills`, or `--lessons [--on]` (one still per lesson and build) |
| `references/` | **BRIEF** (topic → course, still review) · **LESSON** (the course and lesson contract, kit API, recipes) · **STYLE** (the look in numbers) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-course/
  BRIEF.md        the topic written out (references/BRIEF.md) — written first
  index.html      mounts the course (from the example; DURATION comment kept in sync with the tour)
  course.js       title, units, lessons (inputs, controls, solve, build, schematic, chart, maths, try), tour
  parts.js        this topic's bench parts, built from the kit
  symbols.js      this topic's diagram symbols (if the diagram uses symbols)
  lib/            copied by new-course.mjs
  out/            lessons/*.png, stills, tour.mp4
```

## Requirements
Node 18+; Playwright with Chromium (WebGL on SwiftShader headless) for `check` and `render`; ffmpeg for MP4. The page
itself needs nothing — no network, no build step; serve the folder and open it (phone or desktop).

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from `references/BRIEF.md`: learner, title + tagline, experiment-tab name,
   languages, 4–9 lessons in units — for each the one idea, the bench, the controls (and the part each sits on), the
   model with units, what the bench shows, the diagram convention, the chart, the maths, three try-it goals — the parts
   kit, the tour beats and the still-review list. Check every model's numbers by hand once. If the user gave a reference
   video, extract frames first (`ffmpeg -i ref.mp4 -vf fps=1/5,scale=640:-1,tile=3x4 sheet%d.jpg`) and read every panel.
2. **Start the project.** `node hands-on-lab/scripts/new-course.mjs my-course --from circuits|simple-machines`
   (the closer example as a construction reference: `circuits` for flows and schematics, `simple-machines` for forces,
   motion and re-aimed ropes).
3. **Design the parts** in `parts.js` with the kit (`references/LESSON.md` → kit): each part a function returning its
   group and the world points other things attach to (terminals, hooks, axles). Toy-bright, one or two colours a part,
   chunky proportions, nothing thinner than ~0.03 units.
4. **Write each lesson** in `course.js` (`references/LESSON.md`): `inputs` + `controls` (each control on a part),
   `init/step` if it changes over time, `solve` (all numbers the screen shows, plus `flows` for stripe speeds),
   `build(k, ctx)` → `update(values, inputs)`, `schematic(s, values, inputs, ctx)`, `chart`, `maths`, `try`, `parts`,
   `rebuild` for inputs that change the bench's shape. Every text `{ en, ko, … }`.
5. **Tour.** 25–40 steps over 45–70 s in `course.tour` (`references/LESSON.md` → tour). Before a control on a part,
   a `select` of that part (its card must be open for the click to land). Keep `DURATION` in `index.html` equal.
6. **Check.** `node hands-on-lab/scripts/check.mjs my-course` (run from the folder that holds `my-course/`, or
   `cd my-course && node …/check.mjs .`). It must pass.
7. **Look.** `render.mjs my-course out/lessons --lessons --on` and `--stills` at each tour beat; read every still
   against the brief's still-review list; open the page live (`python3 -m http.server`) at desktop and phone width,
   click every part, drag every slider, switch every language.
8. **Render.** `node hands-on-lab/scripts/render.mjs my-course out/tour.mp4` (30 fps; `--jpeg` is faster);
   contact sheet: `ffmpeg -i out/tour.mp4 -vf fps=1/4,scale=480:-1,tile=4x4 -frames:v 1 out/sheet.jpg`.
9. Note anything that broke and its fix in `references/LESSONS.md` if it would bite the next course.

## Rules
- **Design per topic.** Each topic gets its own parts, models, diagram convention and wording. Never re-skin the
  circuits example for a non-electrical topic; never borrow a part because it is close enough.
- **One style.** New parts use the kit (toon + ink outline), toy colours on the paper, the same tags, stripes, panel,
  type and accent. A part made outside the kit has no outline and breaks the look.
- **One model, many views.** Everything shown is computed by `solve` from the inputs and state; nothing on the bench, in
  the diagram, the chart or the maths may have its own clock or its own copy of a number. If a meter reads 2.04 V, the
  diagram, the chart marker and the maths say 2.04 V in the same frame.
- **Honest physics.** Real units, numbers checked by hand, simplifications stated in the maths tab (a constant-resistance
  bulb, no friction, g = 10 N/kg). The bench never shows what the numbers don't (glow at 0 A, a lever tipping toward the
  lighter moment, gears turning the same way).
- **Every control lives on a part** (except power and topology choices), so "click a highlighted part" always works;
  every control changes something visible (`check` fails otherwise).
- **Deterministic.** State changes only in `step(m, dt, inputs)` on the fixed 1/60 s step; `solve` and `update` only read.
  No `Math.random`, `Date` or `performance.now` in lessons. A frame is a function of `t` (`renderAt`).
- **Every language, every text.** All course text is `{ en, ko, … }` for every language in `langs`; numbers and units
  come from `si()` / `fix()`. A new script (Japanese, Arabic…) needs its font in `lib/fonts/`.
- **Readable.** Labels never overlap (the stage pushes them apart; `check` verifies); diagrams stay inside their viewBox;
  the bench fits its frame at the default view (`view.follow` when the bench changes size with an input).
- **Not the reference app.** Never reuse the reference's name, logo, credit line, lesson text or exact layout of a
  screen; the look is shared, the content is ours.

## Contract
- `course.js` default-exports `{ id, title, tagline, experiment, langs, logo?, theme?, chrome?, units: [{ id, title,
  lessons }], tour: { start, duration, steps } }`; a lesson is `{ id, title, overview, try, parts, inputs, controls,
  builds?, rebuild?, view?, thumb?, init?, step?, solve, build, schematicSize?, schematic?, chart?, maths? }`
  (`references/LESSON.md`).
- `index.html` has `<div id="lab">`, links `lib/lab.css`, maps `three` to `lib/vendor/three.module.min.js` in an
  importmap, calls `mountLab(course)`, and keeps `<!-- DURATION = n -->` equal to `tour.duration`.
- The page exposes `window.ready`, `window.renderAt(t)`, `window.DURATION` and `window.lab` (`go`, `act`, `run`,
  `values`, `labels`, `parts`, `frame`, `tourTargets`, `state`, `world`). URL flags: `?render` (frames on demand, no
  transitions), `?tour` (play the tour live; any input takes over), `?lesson=id`, `?lang=ko`, `?tab=maths`,
  `?build=id`, `?nothumbs`.
