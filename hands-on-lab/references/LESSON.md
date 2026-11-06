# LESSON — the course, the lesson, the kit, the tour

## Course
```js
export default {
  id: 'machines-101',                                   // storage key for progress
  title: { en: 'Machines 101', ko: '기계 101' },
  tagline: { en: 'Push · Lift · Turn', ko: '밀고 · 들고 · 돌리기' },
  experiment: { en: 'Machine', ko: '장치' },            // the third tab's name: what the bench is
  langs: ['en', 'ko'],                                  // first = default; every text in all of them
  logo: '<svg viewBox="0 0 40 40">…</svg>',             // optional course mark (currentColor); a hexagon by default
  theme: { accent: '#1f8f72' },                         // optional CSS token overrides (see STYLE.md)
  chrome: { ja: { overview: '概要', … } },              // UI strings for a language lib/ui.js CHROME lacks
  units: [{ id: 'levers', title: { en, ko }, lessons: [lever, ramp] }, …],
  tour: { start: { lesson, lang, tab }, duration: 56, steps: [ … ] },
};
```

## Lesson
```js
{
  id: 'divider',
  title: { en, ko },
  overview: [{ en, ko }, …],                            // 2 short paragraphs: the idea, then why it matters
  try: [{ text: { en, ko }, when: (inputs, values) => bool }, …],    // 3 goals; the lesson completes when all are met
  parts: [{ id, name: { en, ko }, desc: { en, ko }, title?: (inputs, values) => ({ en, ko }) }],
  inputs: { power: false, r1: 4700, r2: 10000 },        // defaults; every control's key must be here
  controls: [
    { key: 'power', type: 'power' },                                            // the pill in the panel head
    { key: 'circuit', type: 'choice', label, options: [{ value, label }] },     // no part → general card
    { key: 'r1', type: 'choice', part: 'r1', label: 'R1', options: [1000, 2200], fmt: (v) => si(v, 'Ω', 2) },
    { key: 'r2', type: 'slider', part: 'r2', label, min, max, step, fmt, ends: ['100 Ω', '10 kΩ'] },
    { key: 'flipped', type: 'toggle', part: 'led', label },
    { key: 'pull', type: 'hold', part: 'winch', label },                       // true while pressed
    // reset: true on a control restarts the lesson's state when it changes (a new ramp angle drops the crate back)
  ],
  builds: [{ id: 'loose', label, desc }, { id: 'board', label, desc }],         // optional: two ways to lay out the bench
  rebuild: ['circuit', 'b2out'],                        // inputs that change the bench's shape → build() runs again
  view: { az: 20, el: 34, zoom: 1, margin: 1.1, shift: [0.08, 0.05], follow: false },  // camera; follow = re-fit every frame
  thumb: { az, el, inputs: { … } },                     // lesson-strip thumbnail (powered on by default)
  init: (inputs) => ({ vc: 0 }),                        // state, if the lesson changes over time
  step: (m, dt, inputs) => { …; return m; },            // the only place state changes (fixed dt = 1/60 s)
  solve: (inputs, m) => ({ I, V1, V2, flows: { main: 1.6 } }),   // every number the screen shows
  build: (k, ctx) => { …; return (values, inputs, ctx) => { … } }, // make the bench once; return update()
  schematicSize: [300, 170],
  schematic: (s, values, inputs, ctx) => { … },          // draw with the schematic builder
  chart: { … },                                          // see below
  maths: (values, inputs, ctx) => [{ h }, { eq }, { calc }, { res }, { p }, { note }],
}
```
- `ctx` = `{ inp, build, lang, T, si, fix, C }`: `T({ en, ko })` picks the language, `si(0.0042, 'A')` → `4.2 mA`,
  `fix(2.345, 2)` → `2.35`, `C('powerOn')` the UI string.
- `solve` must be pure and cheap: the chart calls it ~40 times a frame for a sweep, `check` hundreds of times.
- `values.flows` maps a flow name to a stripe speed in dashes per second (sign = direction along the path as drawn).
  Pick a scale per lesson so the slowest visible flow is ~0.5/s and the fastest ≤ 3/s. 0 hides the stripes.

### Chart
```js
chart: {                                       // a sweep: one input across its range, the current point marked
  title: { en, ko }, sub: (values, inputs) => '10 kΩ → 2.04 V',
  x: { key: 'r2', label: 'R2 (kΩ)', min: 0, max: 10000, fmt: (x) => (x / 1000).toFixed(0) },
  y: { label: 'V', min: 0, max: 3, of: (values, inputs) => values.V2, fmt },
  power: true,                                 // draw the curve as if powered on (the marker stays honest)
  lines: [{ set: { circuit: 'series' }, cls: 'alt' }, { set: { circuit: 'parallel' } }],   // optional variants
}
chart: { kind: 'time', title, sub, x: { label: 's', window: 10 }, y: { label, min, max, of } }   // the last 10 s
```

### Schematic builder (`s`)
`s.wire([[x,y], …], { flow: 'main', reverse, dim })` · `s.part(id, x, y, symbol, { rot, label, labelAt: [dx,dy], anchor,
hw, hh, on })` — `symbol` is an SVG string or `(s, opts) => svg` drawn round (0,0) along +x; `id` links it to the 3D
part and its controls (clickable, dashed teal box when it has controls, filled when selected) · `s.dot(x,y)` ·
`s.text(x, y, str, { anchor, cls: 'acc'|'warm'|'cap' })` · `s.arrow(x1, y1, x2, y2, { cls: 'warm'|'ink' })` · `s.raw(svg)`.
Classes inside symbols: `fill` (solid ink), `soft` (white), `lit` (yellow). Counter-rotate letters with
`transform="rotate(${-(o.rot || 0)})"` so they stay upright. Stay inside the viewBox (`check` measures it).

## Kit (`k`, inside `build`)
Every mesh gets the toon material and an ink outline; `part: 'id'` registers it for clicks, highlight and labels.
Common options: `{ color, at: [x,y,z], rot: [deg,deg,deg], parent, part, outline: false, material, fresh: true }`.

| call | makes |
|---|---|
| `k.group(o)` | an empty group (nest moving assemblies: hinge → blade, tilt → plank, spin → gear) |
| `k.box(w, h, d, { r })` | rounded block, centred (`r` = corner radius; 0 for sharp) |
| `k.cyl(rTop, rBot, h, { axis: 'x'|'y'|'z', seg, open })` | cylinder |
| `k.sphere(r)` · `k.torus(r, tube, { axis: 'y', arc })` | ball · ring |
| `k.lathe([[r, y], …])` | a profile spun round y (bulbs, knobs, resistor bodies); either point order |
| `k.extrude([[x, y], …] | THREE.Shape, depth, { bevel, curve })` | a 2D outline pushed along z (wedges, fulcrums, gears) |
| `k.tube(points, r, { flow, reverse, tension, caps })` | curved tube (cable, pipe, rope) with optional moving stripes |
| `k.rod(r, { flow })` → `{ set(a, b) }` | straight rod re-aimed each frame (taut rope, spring, piston rod) |
| `k.text(str, { w, h, color, bg, size, font: 'mono' })` | printed text on a surface (battery voltage, crate weight) |
| `k.screen(w, h, { bg, ink })` → `{ set(text, sub) }` | an LCD (meters, supplies, balances) |
| `k.glow(at, { color, size, max })` → `{ set(level) }` | soft halo (bulb, LED, lamp, heater) |
| `k.label(part, anchor, text, { kind: 'name'|'value', offset })` → `{ set, show }` | a name tag or a dark value tag; anchor = point or object (follows it) |
| `k.at(obj, [x,y,z])` | world point of a local point (terminals to wire between) |
| `k.toon(color, { emissive, fresh, flat })` | the material (use `fresh: true` when `update` changes its colour) |
| `k.part(id, ...objects)` | register meshes made elsewhere as a part |

Recipes from the examples: floor-routed cable through waypoints (`circuits/parts.js` `cable`), breadboard with a
canvas-drawn hole grid (`board`), resistor colour bands from a value (`bands`), a wedge whose angle is a scale
(`simple-machines/parts.js` `wedge`), gears that mesh (`gear` + the angle formula in `gears.solve`: driven angle =
π − (driver angle + half a tooth) × zA ÷ zB), pulley strands re-aimed every frame (`pulleys.build`).

## Tour
`steps` are actions at times (s). The cursor flies to each target ~0.6 s before and clicks at `at`.
| step | does |
|---|---|
| `{ do: 'lesson', id }` · `{ do: 'next' }` | open a lesson (strip card) |
| `{ do: 'tab', id: 'overview'|'parts'|'experiment'|'maths' }` | switch tab |
| `{ do: 'select', part }` | click a part on the bench (its name tag) — opens its card |
| `{ do: 'set', key, value }` | click a choice chip |
| `{ do: 'set', key, from, value, dur }` | drag a slider from → to |
| `{ do: 'toggle', key }` · `{ do: 'power' }` · `{ do: 'hold', key, dur }` | switches, the power pill, a held button |
| `{ do: 'build', id }` · `{ do: 'diagram', open }` · `{ do: 'chart' }` | build chips, the big diagram, the chart card |
| `{ do: 'orbit', az, el, zoom, dur, drag: ±1 }` | turn the camera (the cursor drags across the bench) |
| `{ do: 'menu', id: 'lang' }` then `{ do: 'lang', code }` | switch language |
| `{ do: 'cam', op: 'l'|'r'|'in'|'out'|'home' }` | the bench toolbar |
A control's card is only on screen when its part is selected: put a `select` before `set`/`toggle`/`hold` on another
part. `check` fails any click with nothing on screen to land on.
