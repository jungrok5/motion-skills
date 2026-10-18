# profiler-lanes — a timeline as 3D objects (three.js)

A profiler / tracing view built from 3D objects:
- lane beds (with optional track-header tiles);
- instanced timer blocks lit from within, with nested scopes stacked on top;
- hatched "waiting" blocks;
- budget or frame-marker sheets that turn red;
- a ms ruler, a playhead, a stall band across all lanes;
- per-block brightness and fold, and a time zoom.

It lives in any `THREE.Group`: on a level of `kits/zoom-levels/`, on a die, or stood up as a wall.

The kit holds **machinery only**. The page decides which lanes exist and what they are called, what ran when, the colours,
the budget, and where the timeline sits. `createLanes` refuses to run without `colors`.

## When to use it
- **Use it for** "who is busy when, and what waits on what": threads in a frame or a tick, dies or channels in a drive, workers
  on a queue, GC pauses, a budget that gets exceeded. The viewer should read durations and overlaps.
- **Don't use it for** single totals (use a bar), a flow through stages with no timing (use a pipeline or particles), or more
  than ~8 lanes on one screen (split them, or zoom).
- The look is a real tool's look only if your topic is: Insights-style tracks for Unreal, a DevTools wall for a browser, die lanes
  coming out of the die for an SSD. Don't reuse one topic's dressing on another.

## Load
Copy `profiler-lanes.js` to `<project>/assets/kits/profiler-lanes.js`. It imports only `three` (importmap as usual).
```js
import { createLanes } from '../assets/kits/profiler-lanes.js';
```

## API
`createLanes(parent, opts)` builds everything once. `draw(state)` rewrites the instances each frame.

Profiler space: x = time (`(ms + xo) × xs`), y = up (block height), z = lanes. Rotate or scale `parent` to change that.

| option | meaning |
|---|---|
| `lanes` | `[{ z, color?, bed? }]`: lane centres. The index is the lane id blocks refer to. `color` is the header strip colour, `bed` overrides that lane's floor colour |
| `colors` | **required**: `{ bed, budget, over, tickMinor, tickMajor, playhead, stall?, header?, wait? }`. `over` is the one "over budget / stalled" colour |
| `reg` | material hook, e.g. `m => mats.reg(2, m)`, so zoom-levels' `dimLevel` dims the lanes with their level |
| `bed` | `{ y, h, depth, x0, roughness, metalness, growLen, growDepth }`: the lane floor. Lane k grows its length or depth |
| `block` | `{ h, depth, gap, minW, max, glow, growDepth }`. `gap` is a number, or `fn(widthUnits)`. `max` is the instance capacity |
| `nest` | `{ h, inset }`: nested scopes (`dep: 1, 2 …`) stack on the base block, `inset` thinner per level |
| `wait` | `{ max, opacity, period }`: hatched blocks (`wait: true`). `max: 0` means none |
| `sheet` | `{ max, w, h, y, opacity, additive }`: budget lines / frame markers standing across the lanes |
| `ruler` | `{ max, step, major, y, w, h, minorLen, majorLen, off }`: ms ticks along the near edge |
| `playhead`, `stall` | `{ w, h, y, pad }`, `{ h, y, opacity }` |
| `header` | `{ x, w, y, h, strip }` or `null`: track-header tiles left of x = 0 |

`draw(state)`:
| field | meaning |
|---|---|
| `blocks` | `[[lane, startMs, lenMs, colour, label?, o?]]`. `o` = `{ h, k (brightness), fold (height 0..1), dep, wait, y, depth }` |
| `laneK` / `laneLen` / `laneZ` | per lane: 0..1 grow (0 hides), bed length in ms, z this frame (lanes can move between chapters) |
| `xs`, `xo` | time zoom |
| `fade` | height multiplier for every block |
| `now`, `clip`, `lit`, `dim` | playhead ms. `clip` reveals blocks up to `now`. Blocks starting after `lit` are drawn at brightness `dim` |
| `sheets` | `[[ms, over, k?]]`: red when `over`. `k` scales the sheet; **0 hides it** |
| `span`, `playSpan` | z extent of the sheets, and of the playhead (the ruler sits at `playSpan[1] + ruler.off`) |
| `rulerTo`, `ruler: false` | last tick; hide the ruler |
| `stall`, `stallOpacity` | `[startMs, lenMs, zCentre, depth]` band that grows with `now` |

Returns `{ draw, top(block), X(ms), beds, headers, blocks, waits, sheets, ruler, playhead, stall }`. `top(b)` is the
top-centre of a block in profiler space, the anchor for a 2D label. Labels are not drawn by the kit. Project `top(b)`
yourself: zoom-levels' `createLabels().lab`, or `group.localToWorld` + `project(camera)` as in `template/index.html`.

### Usage
```js
const LANES = createLanes(group, {
  lanes: [{ z: -12, color: C.main }, { z: -4, color: C.comp }, { z: 4, color: C.raster }, { z: 12, color: C.gpu }],
  colors: { bed: '#211b29', header: '#2b2434', budget: '#d9d0e6', over: C.over, tickMinor: '#4a4156', tickMajor: '#8e84a0', playhead: '#fff' },
  block: { h: 1.4, depth: 6.4, gap: .25 }, nest: { h: 1, inset: 1.6 }, wait: { max: 6 },
  sheet: { max: 10, h: 4.5, w: .3 }, ruler: { step: 5, major: 10 }, header: { x: -16, w: 15 } });
function renderAt(t) {
  const now = (t - 4) * 18;
  LANES.draw({ blocks: work(t), now, clip: true, laneLen: [104, 104, 104, 104],
    sheets: [1, 2, 3, 4, 5, 6].map(f => [f * 16.7, missed(f) && now > f * 16.7]) });
}
```
Two examples:
- `template/index.html`, "Long Task Frames": the kit on its own with a plain three.js renderer. Browser threads stand up as a
  wall; vsync sheets every 16.7 ms turn red while a 55 ms long task runs.
- `kits/zoom-levels/template/index.html`, "SSD Read Stall": lanes that start at each NAND die, inside a zoom level.

## 새 주제마다 직접 설계할 것 / What every topic must design itself
- **The lanes**: what they are (threads, dies, queues, workers), their order and names, and which ones each chapter shows. Move
  them with `laneZ` and hide them with `laneK`.
- **The work**: the block list for every t. Derive it from the topic's real sequence and numbers, seeded randomness only for
  filler. This is the page's `state(t)`. The kit never invents blocks.
- **The budget**: what a sheet means (a 50 ms tick, a 16.7 ms vsync, a 1 ms latency target), where it stands, and when it
  turns red. Red is only for over budget or stalled.
- **The colours** per role, the bed and header tones, the ruler step and labels in the topic's units.
- **Where the timeline lives** and how it relates to the thing it measures:
  - flat on a floor (source);
  - stood up as a wall (`group.rotation.x = π/2`, long-task template);
  - coming out of the physical part (die → lane, SSD template);
  - nested inside one block of another timeline.
- **The dressing**: track headers or not, nested-scope depth, hatching for waits, playhead or static.

Variety knobs: orientation of the group (floor / wall / tilted), block proportions (`h`, `depth`, `gap`), glow amount,
headers vs physical parts as lane starts, sheet height and blending, time zoom over a chapter (`xs`, `xo`), focus by
`k` / `fold` / pre-mixed colours, how labels are drawn.

## Performance
- One InstancedMesh each for blocks, waits, sheets and ruler ticks. A few hundred blocks cost nothing. Set `block.max` to
  the most you draw in any frame; extra rows are dropped.
- `draw` allocates small arrays per frame. That is fine at 60 fps. Don't build thousands of blocks per frame.
- The long-task template renders at ~40–100 ms per frame in software GL (no post-processing).

## Pitfalls
- **`sheets` rows are `[ms, over, k]` and k = 0 hides the sheet.** The server-tick page kept `[ms, over, 0]` rows; passing them
  straight in made every budget sheet vanish in the refactor. Map to `[ms, over]`.
- **`lit` / `dim` and `o.k` multiply colours toward black.** That is right on dark beds, muddy on light ones. On a light look,
  pass colours already mixed toward the bed instead (the SSD template does).
- **Additive sheets are invisible on a light background.** Use `sheet: { additive: false }`.
- **`o.h` uses `||`**, so a computed height of exactly 0 falls back to the default. Skip the block instead (the ue page skips
  `a ≤ .01`).
- **Ruler, sheets and playhead don't look at `laneK`.** While lanes are hidden, pass `ruler: false`, `sheets: []`, `now: -1`
  (or k = 0 sheets).
- **The ruler's `major` test is `ms % major === 0`.** Use steps exact in binary (0.5, 1, 5, 10). With 0.1 steps the majors drift.
- `minW` keeps very short work (a 0.08 ms read on an 8 ms lane) visible. Say in the copy that widths are not to scale below it.
- Track-header strips take their colour at creation, so dimming is correct. The ue source set the colour per frame, and
  `dimLevel` overwrote it with white × k for one frame whenever k changed.

## Where it came from
github.com/jungrok5/mmo-server-explained:
- `server-tick-inside-wide/index.html`: thread lanes on level L2: beds / BLK / BUDG / RULER / PLAYH / STW (lines 491–508),
  the per-frame lane drawing (742–777), the block-list state `traceState` (603–667, stays in the page).
- `ue-client-threads-inside-wide/index.html`: track headers, nested scopes, hatched waits (444–468, the hatch shader at 460–465),
  per-frame drawing with time zoom (803–823).

Refactor check: server-tick-inside-wide drawn through this kit was pixel-identical (max diff 0, 12 times). The
ue-client-threads-inside-wide lanes (beds, headers, nested blocks, waits, time zoom) differed only by 2 edge pixels at one time.
