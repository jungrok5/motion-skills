# artifacts-desk — 실물을 공간에 늘어놓기 kit (three.js)

The real things an engineer looks at — an editor, a terminal, a log, a table, a dashboard, a file tree — painted as 2D
canvases and stood up as lit slabs in a dark space. Glowing lines and flying chips carry a field, a file or a packet from
one artifact to the next; a framed camera walks through them in step order. Approach: **실물을 공간에 늘어놓기**
(`references/STYLES.md`, craft notes in `references/STYLE-GLASS.md`).

This folder holds **materials and machinery only**: renderer, floor shader, slab/rim/reflection/shadow, line and chip
systems, painters for generic artifacts, camera maths. It holds no scene, no layout, no palette of its own (colour
defaults are plain greys, so an un-themed page looks unfinished on purpose).

| file | what |
|---|---|
| `artifacts-desk.js` | the kit (ES module; imports `three` and `three/addons/`) |
| `template/index.html` | a small worked page on a different topic (PostgreSQL column rename, 34 s) — read it, don't clone its look |

## Fits / does not fit
- **Fits** a pipeline or procedure whose steps produce or read real artifacts: codegen, CI, a migration, a deploy, an
  incident runbook, a diagnosis checklist with metrics. The viewer should be able to read the artifact (a field, a log
  line, a number) and see the thing move to the next one.
- **Does not fit** an abstract mechanism with nothing real to show (use 흐름 / 분해), a single-screen phenomenon (게임 화면 재현),
  or a topic with one artifact (a 2D page is clearer). Don't invent fake screens to fill the space.

## Load
```html
<script type="importmap">
{ "imports": { "three": "../assets/vendor/three/build/three.module.min.js", "three/addons/": "../assets/vendor/three/examples/jsm/" } }
</script>
<script type="module">
import * as THREE from 'three';
import { createDesk, createPaint, camPath, raw, lift, loadFonts } from '../assets/kits/artifacts-desk.js';
```
Copy `artifacts-desk.js` to `<project>/assets/kits/artifacts-desk.js` (next to `assets/vendor/three/`). The page keeps the
skill's contract (`renderAt`, `DURATION`, `ready`, player, notes) — see `template/index.html`.

## API
Units: **100 design px = 1 world unit**. Painters draw in design px; a `w × h` artifact is `w/100 × h/100` world units;
canvas resolution is design px × `ts` (1.5).

**Module exports (pure)**
- `createPaint(theme)` → painter set (below). `theme`: fonts, `ts`, `tb` (title-bar height 62), `radius`, chrome greys
  (`text hi dim faint bg bar border line accent`), dashboard (`panel panelBorder panelTitle grid`), `syntax`
  (`{ colors: {kw str num com fn prop txt punc}, kw: [], prop: [], comment: ['//'], quotes, ci }`).
- `createDesk(opts)` → desk (below).
- `camPath(keys)` — monotone cubic (Fritsch–Carlson) through `[[t, {pos, tgt}], …]` → `camAt(t)`. No overshoot; two equal keys = a still hold.
- `raw(pos, tgt)` — camera key from explicit world points.
- `bez(P, u)`, `link(a, b, lift, out)` (left→right hand-off arc), `lift(a, b, up, out, dz)` (any direction, pulled toward camera),
  `straight(a, b)`, `reverse(P)` — bezier paths as `[a, b, c, d]` Vector3s.
- `legs([[t0, t1, pathFn, hold?], …])` → `posFn(t)` for chips that travel several legs.
- `loadFonts(faces?, bases?)` — Pretendard + JetBrains Mono from `../assets/fonts/` then `assets/fonts/`.
- `rgba(hex, a)`, `rng(seed)`.

**Painters** (`paint.*`, all take a 2D context `g` in design px)
- primitives: `rr gt mw gdot gcheck gcross gchip tokens codeLine`.
- `frame(g, w, h, {bg, bar, stroke, lw, dash, r, role: [label, col, sub], tabs: [[name, active, accent]], ver: [label, col, flash], right})` —
  window chrome; clears the canvas and sets the `ts` transform, so call it first in every artifact painter.
- `editor(g, w, h, {frame, lines, syntax, size, lh, x, y, chars, caret, t, insert: {at, s, k, chars, col}, marks: [{line, from, to, col, a}], band, status})`
  → `{rowY(i), colX(c)}` for anchoring lines/chips/annotations to code.
- `terminal(g, w, h, t, {frame, events: [[t, text, 'cmd'|'out'|'ok'|'err'|…, typeDur]], prompt: [text, col], sep, rows, size, lh, promptW, colors})`.
- `logTable(g, w, h, t, {frame, comment: [text, col], rows: [{at, color, cells}], cols: [{x, size, mono, weight, color|'row', align}], top, lh, fresh, maxRows})`
  — rows fade in with a "fresh" band; `maxRows` scrolls.
- dashboard pieces: `panel(g, x, y, w, h, title)`, `lineChart(g, {x0, x1, y0, y1, xMax, yMax, yTicks, xTicks, fmtY, fmtX, fn, upto, step, endV, threshold: {v, col, label}, col, dotColor})` → `{X, Y}`,
  `stat(g, x, y, w, h, label, value, col, spark(u))`, `meter(g, x, y, label, valueText, frac, col, {w})`.

**Desk** (`createDesk(opts)`; every option has a structural default; colours/feel are yours)
- opts: `bg`, `fov`, `bloom {strength radius threshold}`, `paint`, `floor {size center base grain grid pool poolColors poolGain poolShape fadeTo fade fadeGain pools uniforms glsl}`,
  `slab {color depth inset}`, `tint`, `rise`, `rim {margin radius width outerFall outer topLo topRange sweepK sweepX sweepY sweepW speed phase period offset max}`,
  `refl {tint opacity fadeTo}`, `shadow {…}`, `pool {dz w base rim}`, `maxSeg`, `lineSub`, `chip {size padX h radius bg fg dot lw lift glow …}`, `sway {x y fx fy py}`.
  `floor.glsl` is your own GLSL added to `vec3 c` after the light pools (it can read `vW`, `d` and `floor.uniforms`) — zones, seams, bands.
- `add(id, {w, h, pos, yaw, draw(g, t), live: [[t0, t1], …], fps, slab})` — register an artifact (slab + textured face + additive rim + floor reflection + contact shadow + light pool).
  The texture is redrawn only while the artifact is in the frustum **and** its live time (`t` clamped to the `live` intervals, quantised to `fps`) changed.
- `place(t, placeFn)` — per frame; `placeFn(id, t)` → `{k, pos, yaw, rimK, rimCol, bright, grounded, pool}` (all optional).
- `artPt(id, x, y)` — design px on an artifact → world point (after `place`), for paths and overlay leaders.
- `fr(c, s, sx, sy, yawDeg, pitchDeg)` — framed pose: world point `c` lands at screen `(sx, sy)` at `s` screen px per design px, so
  on-screen text size is a number you choose (`s × font size`). `onPose(pose, sx, sy, s)` — the world point at a screen spot (pop-up cards).
- `setCamera(cam, t)`, `proj(v)` → `[x, y, z]` screen.
- lines: `beginLines()`, `seg(a, b, col, intensity, widthPx)`, `curve(P, reveal, col, base, widthPx, hot, dash, sub)`.
- chips: `addChip(label, col, t0, dur, pathFn, size)` or `addChip(label, col, posFn, size)`; `addDot(…)`; `updateChips(t)`.
- `floorLabel([big, small], col, widthWorld, {size, subSize, subColor})` → Mesh; `addDust({n, x, y, z, color, …})` → `{at(t)}`.
- `fontsReady()` after fonts load (rebuilds chip textures, invalidates artifact textures, repaints floor labels); `render(ctx)`.

### Frame recipe
```js
const paint = createPaint({ sans: SANS, mono: MONO, text: K.text, hi: K.hi, bg: K.body, bar: K.bar, accent: K.main, syntax: { colors: SY, kw: [...] } });
const desk = createDesk({ paint, bg: K.desk, floor: { base: [...], pool: [...], glsl: '…' }, chip: { bg: '#…', fg: '#…' } });
desk.add('MIG', { w: 820, h: 480, pos: [-8, 5, -12], yaw: .4, live: [[4, 8]],
  draw: (g, t) => paint.editor(g, 820, 480, { frame: { tabs: [['0042_x.sql', true, K.main]] }, lines: SQL, chars: N * p(t, 4, 2), t }) });
desk.addChip('ADD COLUMN', K.main, 6.9, .8, () => lift(desk.artPt('MIG', 820, 300), desk.artPt('TERM', 0, 120)));
const camAt = camPath([[0, raw([0, 30, 16], [0, 3, -13])], [4.7, desk.fr([-8, 5, -12], .86, 960, 600, 22, 3)], …]);
function renderAt(t) {
  desk.setCamera(camAt(t), t);
  desk.place(t, place);            // your placeFn: presence, rim, focus
  desk.beginLines(); /* curve(...) / seg(...) */
  desk.updateChips(t); dust.at(t);
  desk.render(ctx);                // 3D → #c
  overlay(t);                      // your 2D header, captions, footnotes on ctx
}
window.ready = (async () => { await loadFonts(); desk.fontsReady(); })();
```

## 새 주제마다 직접 설계할 것 / What every topic must design itself
The kit makes slabs glow; it does not decide what the video looks like. Before writing code, decide each of these from
the topic's own world (STYLES.md: "the look comes from the topic"):

1. **Which artifacts exist.** Only things the engineer of this topic really reads (a migration file, `kubectl` output, a
   flame graph, a PR diff, a Grafana panel, a runbook). Their content is real-looking and specific: file names, commands,
   identifiers, numbers (labelled `예시` when invented).
2. **The tool skins.** Chrome colours, title bars, tab names, status lines per tool (DataGrip vs VS Code vs a terminal vs
   a dashboard). Pass them through `createPaint` theme / per-call `frame` options. Write a custom painter when the stock
   ones would flatten the artifact into "generic window" — the stock painters cover common cases, not the look.
3. **Palette and roles.** One meaning per colour, from the subject (e.g. new column / old column / app / backfill). Red
   only for failure or a threshold. Desk background, floor base, pool colour, chip colours, rim colours, dust tint.
4. **The arrangement.** Where the slabs stand is the composition: a row along a desk (source page), an arc around the
   viewer (template), a wall, a stack, a corridor, two facing sides (dev vs ops), a slab that flies between zones,
   cards that pop in front of the camera (`onPose`). Heights, yaws and spacing are yours.
5. **The camera path.** Keys with `fr()` (screen position + scale per artifact) and `raw()` (overviews). Lateral track,
   turning from a centre, crane, orbit, top-down — pick what the arrangement suggests. Holds = two near-equal keys.
6. **What travels.** Which chip/line carries which fact between which artifacts, and when (the "the field moves from the
   file to the generated code" moment is the point of the approach).
7. **The floor.** Plain, brushed (`grain`), tiled (`grid`), zoned (`glsl` + `uniforms`: a seam between teams, a band for
   "the internet", a ring), floor labels for areas.
8. **Overlay.** Header, kicker, captions, progress strip, footnote, title card and outro are page code, styled from the
   topic (a terminal prompt kicker, an incident header, a migration step strip …). The kit only gives `proj` / `artPt`.
9. **Chapters, timing, sims, numbers** — all page code.

**Variety knobs** (change several per topic): arrangement shape · slab sizes and heights · yaw spread · camera grammar
(track / turn / crane / orbit) and framing scale `s` · palette and floor (`base`, `grain` vs `grid`, `glsl` zones) · rim
character (`rim.radius`, `topLo/topRange`, sweep angle/speed) · bloom · chip style (`chip.radius`, `bg`) · focus dimming
(`bright`) · pop-up cards vs grounded slabs · overlay layout (header left vs right, caption position, step strip).

Look test (LESSONS.md): put a still of the new page next to a still of the source page and the template. If it reads as
the same video with words swapped, change the arrangement, camera grammar and skins — not only the colours.

## Performance (software GL in headless Chromium; the page is the deliverable, so real-time cost matters too)
- The floor shader runs on most pixels: every light pool is a loop iteration per pixel. Keep `floor.pools` ≈ the number
  of grounded artifacts. `floor.poolColors: true` (per-artifact pool tint) reads a uniform array per pool per pixel; it
  measured ~5–10 % slower per frame in software GL than a constant pool colour — use it only when the tint carries meaning.
- Texture uploads dominate otherwise: give every artifact tight `live` intervals; outside them the texture is not redrawn.
  Off-screen artifacts are never redrawn (frustum check). Use `fps: 30` on artifacts that animate continuously.
- Canvas size = `w × h × ts²` px; a 1720×880 dashboard at `ts` 1.5 is a 2580×1320 upload per changed frame.
- `maxSeg` bounds line instances (one quad per segment); `curve(…, sub)` sets segments per curve — 12–24 is enough for short hops.
- Measured on the source page (12 stills + 30-frame runs, interleaved A/B in one browser): the kit version is within −4…+1 % of
  the original per frame (≈ 0.55–0.7 s/frame at 1920×1080 in this container).

## Pitfalls
- **Fonts**: chip and floor-label textures are drawn at creation, before fonts load — call `desk.fontsReady()` in `window.ready`.
- **Call order per frame**: `setCamera` → `place` → lines/chips (they call `artPt`, which reads the placement) → `render` → overlay.
- `paint.ts` and `desk` `ts` must match (pass the same `paint` to `createDesk`), and every painter must start with `frame()` (or set the ts transform itself) — the desk resets the transform to identity before calling `draw`.
- Painters must be pure in `t`: textures are a cache keyed on quantised live time and redrawn in any seek order. No state carried between draws.
- `live` intervals: outside them the texture shows the state at the last edge; an artifact that animates at `t` but has no live interval covering `t` freezes.
- Additive rims/lines on a bright slab bloom into mush: keep slab bodies dark, `rimK` ≲ 1.2, bloom ≈ 0.5.
- Text on slabs: choose `fr` scale so code/rows are ≥ ~26 px on screen in a 1920 wide frame (`s × font size`); two slabs side by side at `s` 0.5 were unreadable in the template's first pass.
- Slabs below or behind the 2D header/captions show through soft vignettes; give header and captions a near-opaque gradient band and dim unfocused slabs (`bright`).
- An arc of slabs facing the centre reads edge-on from far behind; the overview needs to be high and close enough that the end slabs are ≲ 60° off-axis.
- The source page's `chrome()` (lag-diagnosis) and `frame()` (proto-bot) differed slightly; `frame` covers both via `role`, `tabs`, `ver`, `right`, `r`, `sep`.

## Where it came from
Extracted from github.com/jungrok5/mmo-server-explained (`proto-bot-pipeline-artifacts-wide/index.html`, the reference
for this approach); the same engine is copied in `proto-bot-pipeline-artifacts/`, `lag-diagnosis-artifacts-wide/` and
`lag-diagnosis-artifacts/` with small variations.

| kit part | source (proto-bot-pipeline-artifacts-wide/index.html unless noted) |
|---|---|
| renderer, composer, bloom, `mkCanvas`, `canvasTex` | 222–240 |
| floor shader (grain, light pools, distance fade, team seam → `floor.glsl`) | 242–275; grid + per-pool colours from lag-diagnosis-artifacts-wide 300–330 |
| shadow / reflection / glow textures | 277–279 |
| painters `rr gt mw gdot gcheck gcross gchip tokens codeLine frame` | 281–346; `right`/`r` from lag-diagnosis-artifacts-wide `chrome()` 358 |
| `editor` / `terminal` / `logTable` / `panel lineChart stat meter` | generalised from `drawE` 365–416, `drawT` 432–455, `drawLog` 586–604, `dpanel`/`drawD` 642–709 |
| artifact registry, rim shader, `artPt`, `liveT` | 729–799 (rim variant: lag-diagnosis-artifacts-wide 725) |
| `place` (per-frame slab/reflection/shadow/pool/redraw loop) | inside `renderAt` 1235–1268; focus `bright` from lag-diagnosis-artifacts-wide 834–840 |
| lines `seg bez curve link` | 840–903; `lift straight` from lag-diagnosis-artifacts-wide 927–931 |
| chips `chipTex addChip addDot` + update loop | 904–930 and 1320–1332; `legs` from lag-diagnosis-artifacts-wide 954 |
| floor labels, dust | 966–988 |
| `fr`, `raw`, monotone-cubic `camAt` → `camPath`, `proj` | 989–1054, 1065; `onPose` from lag-diagnosis-artifacts-wide 787 |

Verified by re-pointing a copy of the source page at the kit (engine code deleted; `drawT`, `drawLog` and the dashboard
pieces replaced by the stock painters): 12 stills across all chapters were pixel-identical (max channel diff 0).
