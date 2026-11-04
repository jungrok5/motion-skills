---
name: machine-sim
description: Build an interactive 3D simulator page of any machine — a walking robot, an engine, a crane, a gearbox, a drone, a printer — modelled in three.js code (no AI images, no downloaded models), on a light engineering-sheet look with a HUD whose readouts (gait phase, loads, pressure, torque, stability) are computed from the same model that moves the parts; view buttons, display modes (leader-line labels, solver overlay, x-ray, exploded view, isolate one part, orbit), sliders and commands; plus a scripted tour with a drawn cursor that renders to a 16:9 MP4. Use for "3D simulator of X", "take a machine apart", "interactive machine page", "teardown", "exploded view", "x-ray view", "Three.js machine", "기계 시뮬레이터", "3D로 분해해서 보여주는 페이지", "보행 로봇 시뮬레이션", "엔진 구조 인터랙티브", "이 영상처럼 Three.js로 만들어줘" for a machine with live gauges and a button per part. Source — made from https://x.com/studio_oneroom/status/2116823414656618711.
---

# machine-sim

A pipeline for **interactive machine simulators**: one machine, built in code from boxes, prisms, cylinders and tubes,
driven by one small physical model (a gait, a crank-slider, a gear train, a linkage) that both **poses the parts** and
**feeds every readout**. The page is a study sheet: paper floor with a 1 m grid and soft shadows, white panels, one
orange accent, a grotesk title and mono caps. The user drives it (sliders, commands, keys, orbit with the mouse) and
switches views and display modes; a **tour** — timed clicks and drags with a drawn cursor — plays on load and bakes to
a 16:9 MP4 frame by frame, so the same page is the live demo and the film.

Built in this repo by recreating a screen recording posted on X (studio_oneroom, Nov 2026: an "MT-4 Quadruped Tank"
page written entirely in three.js by Claude) in code. Worked examples: `examples/walker/` (a four-legged walking tank on a
creep gait — the recreation) and `examples/engine/` (a single-cylinder four-stroke engine — a different machine on the same kit).

## What's in this folder
| path | what |
|---|---|
| `kit/machine-sim.js` | the engine (ES module): `createSim` — stage (renderer, light, shadow floor, infinite grid), `K` geometry/material helpers, `part()` registry, display modes, views + camera tweens, label leader lines, HUD builder (`hud.top/panel/stat/chart/bars/slider/buttons/svg/standard`), fixed-step state, tour + cursor, `renderAt(t)` |
| `kit/machine-sim.css` | the look: tokens, panels, bars, charts, sliders, buttons; landscape 1280×720 and portrait 720×N design canvases |
| `kit/fonts/` | Inter 500/600/700, JetBrains Mono (OFL, licences beside them) |
| `kit/vendor/three/` | three.js r170 module build + `OrbitControls` (MIT, `LICENSE`) |
| `examples/walker/` | **reference**: AW-6 Walking Tank — creep gait, leg IK, body sway, static foot loads, support polygon, turret + recoil, 27 s tour |
| `examples/engine/` | ST-1 engine — crank-slider, cam at half speed, valve timing, pressure model, p–V loop, torque/power, 26 s tour |
| `scripts/render.mjs` | stills (`--stills 3,9.5`) or MP4 of the tour; captures the whole page (canvas + HUD + labels + cursor) |
| `scripts/render-chunked.sh` | MP4 in parallel segments, resumable, joined |
| `references/KIT.md` | kit API: config, parts, roles, modes, views, HUD widgets, tour steps, contract |
| `references/MODELS.md` | recipes for the model behind the readouts: gaits + IK, loads and stability, crank-slider, cams, gears, linkages, hydraulics |
| `references/LESSONS.md` | what went wrong building the examples, and the fixes |

## Project layout (what you create)
```
my-sims/
  kit/                 ← copy of <skill>/kit/
  <slug>/index.html    one machine: geometry, model, HUD, tour (start from <skill>/examples/walker/index.html)
  out/<slug>.mp4       the baked tour (1920×1080)
```
Pages load `../kit/…` (the examples use `../../kit/…`; fix the importmap and the stylesheet link when you copy one).

## Requirements
Node 18+, Playwright with Chromium (WebGL on SwiftShader headless, ~0.4 s per 1080p frame), ffmpeg. No network at runtime.

## Workflow
1. **Pick the machine and its one model.** Name it (code + title + one-line spec), list 6–12 parts worth a label, and
   decide the model that moves it: what is the state (phase, angle, positions), what are the inputs (speed, throttle,
   azimuth) and commands (walk/halt/fire, run/stop/step), and which **3–6 readouts** it can honestly compute
   (`references/MODELS.md`). If the user gave a reference video, extract frames first
   (`ffmpeg -i ref.mp4 -vf fps=1,scale=640:-1,tile=3x3 sheet%d.jpg`) and read every panel, label, button and mode.
2. **Build the geometry** under `sim.root` with `K` (chamfered boxes, extruded profiles, cylinders on an axis, tubes).
   Nest groups at the joints the model drives (yaw → pitch → knee → foot; crank; rod; piston). Register each part with
   `sim.part(obj, { label, sub, anchor, explode, group, role })` — `role: 'shell'` ghosts in x-ray, `'frame'` stays solid,
   `'internal'` only appears in x-ray. Light paper-white materials, dark joints, black slits; one accent colour.
3. **Write the model**: `init(S)`, `step(m, dt, inputs, S)` (state only, fixed `DT`), `pose(m, S)` (state → transforms;
   the kit resets every part to its rest position first), `follow(m)`, `solver(m, S, k)` (world-space debug lines),
   `hud(m, S)` (readouts). Readouts must come from the same numbers that pose the parts.
4. **HUD**: `hud.top` (code, kicker, title, sub, logo), left column = the model's story (phase chart, loads, drive
   sliders), right column = geometry/state (a plan-view SVG, a dial), `Command`, then `hud.standard()` for Views +
   Display. Keep to the design canvas: a column holds ~600 design px.
5. **Views**: 4–6 presets `{ az, el, dist, target, fov }` relative to `follow()` — hero 3/4, front, side, plan
   (`el: 89.5`, `az: 180` puts forward up), one close-up per interesting assembly. Number keys pick them.
6. **Tour**: 15–20 steps over 20–30 s — labels on/off, isolate a part, solver + plan, a slider drag, a command (fire,
   stop, step), x-ray, exploded, back to hero, slow down / halt. One action per ~1.2 s, leave 2–3 s on the big moments.
7. **Verify** (mandatory): `node <skill>/scripts/render.mjs <slug>/index.html <scratch>/st --stills …` — one still per
   tour step (just after it) plus 1280×720 and a phone size (`--size 390x844`). Read every still: parts intersecting,
   camera inside geometry, labels on top of the model or each other, panel text overflowing, readouts that disagree
   with the picture (a foot in the air must read 0 kN). Open the page live and press every button.
8. **Bake**: `<skill>/scripts/render-chunked.sh <slug>/index.html out/<slug>.mp4 7 3 20` (1920×1080, 30 fps).
9. **Publish** the page (it runs on a phone) and hand over the MP4.

## Rules
- **Determinism**: no `Math.random`, `Date` or `performance.now` in `init`, `step`, `pose`, `solver`, `hud`. All motion
  comes from `S` advanced by `step(DT)`; seeded randomness via `U.rng(seed)` at build time only.
- **One model**: never animate a part with its own clock or fake a readout. If a number is shown, it is computed from
  the state that posed the frame (`pose` may stash derived values on `m` for `hud`).
- **`step` changes state, `pose` only reads it** — the tour replays `step` from t = 0, so anything `pose` writes must be
  derived data.
- **Units**: say them. Real machines get real numbers (walker: t, kN, m, km/h; engine: mm, bar, N·m, kW). A fictional
  machine's specs are its own; never borrow a real product's name or a reference's credit line.
- **Readability**: HUD text ≥ 6.5 design px (mono caps), labels sit outside the model's screen box, one accent colour.
- **Interaction**: every button is a command id (`walk`, `view.plan`, `display.xray`); every slider is an input key.
  User input stops the tour and keeps the state (the machine keeps running live).

## Contract
The page has `<canvas id="c">`, `<svg id="labels">`, `<div id="hud">`, imports `kit/machine-sim.js` through an
importmap for `three`, calls `sim.model(...)`, `sim.tour(...)`, `sim.start()`, and keeps a literal `DURATION = <n>`
in a comment for `render-chunked.sh`. The kit exposes `window.ready`, `window.renderAt(t)`, `window.DURATION`.
URL flags: `?render` (no loop, for the scripts), `?live` (skip the tour), `?t=12` (start the tour at 12 s).
