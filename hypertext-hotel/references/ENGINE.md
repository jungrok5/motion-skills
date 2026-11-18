# ENGINE — dollhouse.js, props.js, sound.js

Load order in a page: `lib/hic.js`, `lib/dollhouse.js`, `lib/props.js`, `lib/sound.js`, then your script. Every interactive
object is a direct child of the canvas with `data-k="<key>"` (the engine adds `drawable` and positions it).

## `Dollhouse.start(cfg)` → `D`
```js
Dollhouse.start({
  canvas: 'stage', title: 'The Night Loaf',
  building: {
    cols: [4.3, 1.4, 4.3], floors: [2.8, 2.6, 2.5], depth: 3.2, wall: 0.22, slab: 0.26,
    frame: '#efe7d6' | mat, inlay: '#c07a42' | false,             // the cut face; the thin metal line in each slab edge
    wings: { w: .85, face, mortar, pat: 'brick', s, quoin, glass, glow, windows: true } | false,
    base: { h: .45, face, mortar, steps: <column index> },
    cornice: '#efe7d6',
    roof: { kind: 'flat' | 'gable' | 'none', h (gable), face, c2, parapet, chimneys: [x, …], oculus: true, build(B, info) },
    sign: { key, w, color, at: 'roof' | 'front', lift, emit, power, board }
  },
  ground: { kind: 'street' | 'none', pad, plinth, pave, road, lamps: true, lampColor, lampPower, trees: n, leaf },
  sky: { top, mid, low, glow, city, ground, stars: 0..1, clouds: 0..1, skyline: 0..1, moon: [x, y, r] (home-view units), moonLight, moonDir },
  look: { exposure, bloom, ao, grain, moon (colour), moonPower, sky (ambient), paper, ink, rim },
  lens: { mag: 1.8, off: false },
  rooms: [{ id, name, cell: [col, floor, colSpan?, floorSpan?], wall, left, right, floor, ceil, bounce, moonK, build(B, R, DH) }],
  outside(B, { G, left, right, wing, top, base, back }) { … },     // things on the facade or street (a doorbell, a bench)
  sound: { volume, voices: { name(t, arg, kit) } },
  ui: { plain, scene, lens, sound, home } | false,                 // the button labels
  intro: true, twinScale: 95, texPerMetre: 420,
  ready(D) { … bindings … }
});
```
Units are metres. In a room's `build(B, R)` the origin is the room's front-left floor corner: x right (0…`R.w`), y up
(0…`R.h`), z toward the viewer (back wall at `-R.d`, open front at 0). `R` also has `x0, x1, y0, y1` (world), `id`, `name`.

## The builder `B`
| call | what |
|---|---|
| `B.box(x0,y0,z0, x1,y1,z1, mat, faces?)` | axis box; `faces` a subset of `'xXyYzZ'` |
| `B.block(x, y, z, sx, sy, sz, mat)` | a box standing on y, centred on x, z |
| `B.cyl(x, y, z, r, h, mat, {r2, seg, axis: 'y'|'x'|'z', caps})` | cylinder or cone |
| `B.lathe(x, y, z, [[r, y], …], mat, {seg})` | a turned profile |
| `B.ball(x, y, z, r, mat, {sx, sy, sz, seg, rings})` | sphere / ellipsoid |
| `B.bar(A, B, t, mat)`, `B.quad(a, b, c, d, mat)`, `B.tri(…)` | rods and faces |
| `B.group({at, rx, ry, rz, s}, fn)` | nested transform |
| `B.shell(R, {wall, left, right, floor, ceil})` | a room's inside (start() does this from the room's fields) |
| `B.light(id, {at, color, power, range, shadow, on, flicker})` | ≤ 3 a zone; the first two may cast cube shadows |
| `B.flame({at, w, h, light})` | an additive fire quad (follows its light's level) |
| `B.panel(key, {at, w, rx, ry, rz, emit, unlit, rough, fit})` | mount the control `data-k=key` on a rectangle w metres wide (height from its CSS aspect) |
| `B.aspect(key)` | the control's height / width, to size a frame behind it |
| `B.mover(fn, {at, name, shadow})` | a movable mesh; `mv.set({at, rx, ry, rz, s})` relative to its origin |
| `B.world([x,y,z])` | a local point in world coordinates |

`Dollhouse.mat(colour, {c2, pat, s, rough, metal, emit, glow: lightId, unlit, dyn: 1|2, noShadow})`.
Patterns (`pat`): `plaster wood planks stripes hstripes check tile brick dots diamond carpet quilt night books shingle metal`;
`s` is the pattern size in metres. `glow` ties a material's emission to a light (a lamp shade, a radio dial): **create the
light before the prop that glows with it.** `dyn: 1` takes its colour from the zone's tint slot 1 (`D.tint`).

## Props (`Dollhouse.props`, `P.name(B, x, y, z, o)`)
`doll {coat, skin, hair, hat, cap, apron, h, ry, sit, still, mass}` · `table {w, d, h, round, cloth}` · `chair {ry, seat}` ·
`stool` · `bed {w, d, quilt, quilt2}` · `sofa {w, c, c2}` · `shelf {w, h, d, rows, fill: books|jars|bottles|loaves|plates|none}` ·
`counter {w, h, d, front, top}` · `rug {w, d, c, c2}` · `frame {w, h, c, c2}` · `window {w, h, curtain}` · `plant` · `door` ·
`trim(B, R, {rail, c})` · `board {w, h, c}` · `lamp(B, id, x, y, z, {kind: table|floor|pendant|sconce|bulb, shade, color, power})` ·
`hearth(B, id, x, y, z, {kind: fireplace|oven|stove, power, flue})` · `loaf {r, round}` · `sack {label}` · `crate` · `barrel` ·
`clock` · `radio {glow}` · `fan {name, r}` (a mover) · `rack {w, d, h, trays}` → tray heights.
A prop the kit lacks: write a function in the page with the same signature and the builder calls.

## `D` (in `ready(D)`)
`D.on(key, 'input'|'change'|'click', fn(value, event))` (value: checked for checkboxes, a number for ranges, text otherwise) ·
`D.field(key)` · `D.el(key)` · `D.setLight(id, on)` · `D.light(id).set(v).power(p).color(c)` · `D.tint(zone, slot, colour)` ·
`D.flame(lightId, k)` · `D.spring(v0, freq, zeta)` → `{v, to(x)}` (stepped by the engine) · `D.animate(fn(t, dt) → true |
'idle' | false)` (true: redraw now; 'idle': redraw when the machine has time) · `D.mover(name)` · `D.touch(key)` (after
changing a control in code, so its twin follows) · `D.sfx(name, arg)` · `D.time()`.
For checks and stills: `D.advance(s)`, `D.setPlain(b)`, `D.lensTo(key)`, `D.view(room)`, `D.roomRect(id)`, `D.project(p)`,
`D.screenAt(el, x, y)`, `D.state()`. On the plain fallback page `ready(D)` still runs with the same calls (the scene ones do nothing).

## `Dollhouse.lift(B, R, o)`
In a shaft room's build: `{key, indicator, names, id, car(C, cw, cd, ch, metal), carH, mass, metal, light, power, leverY, operator}`.
The control is `<input type="range" class="…" data-thumb="<thumb px>">` made vertical in CSS (`writing-mode: vertical-lr;
direction: rtl`), its thumb styled as the lever. The engine sizes its rectangle so the thumb's travel equals the distance
between the stops, mounts it on the car's front and sets `min 0, max stops-1, step .01`. Drag: the car follows on a stiff spring;
release: it glides to the nearest stop (spring 1.5 Hz / √mass, ζ .55 → a small carry past and back) and chimes; the
indicator `<output>` shows `names[stop]`; a hum plays while it moves.

## How a frame is drawn
Shadows (cube maps 256², only for lights that moved or zones whose movers moved; the moon map once) → sky → each zone's
geometry with its lights → the controls (blended, lit by their room, `unlit` ones glow) → flames (additive) → SSAO at half size
→ bloom (5 halvings) → tone map → final pass: anti-aliasing, the plain sheet (edges of the normal buffer on squared paper +
the twins layer), the lens (magnified twins layer, a brass rim, a wooden handle, a drop shadow). The scene is redrawn only when
something changed; idle motion (flames, breathing) is redrawn as often as a quarter of the machine's time allows. `#q=` scales
the internal resolution.

## Adding things in a project (never edit lib/)
- **A prop**: a function `(B, x, y, z, o)` in the page built from the builder calls and `Dollhouse.mat`.
- **A control type**: any form element works; style it in CSS; bind it in `ready`. Sounds come by type (checkbox → click,
  range → tick, select → clunk, text → key, button → bell); `data-sound="name|none"` overrides.
- **A behaviour**: a `D.spring` and a `D.animate` that sets a mover, a light, a flame or a tint from the spring.
- **A roof or a facade feature**: `building.roof.build(B, info)` or `outside(B, info)`.
- **A sound**: `sound: { voices: { roar(t, arg, k) { … k.noise(t, .8, .4, 300, .7, k.bus(.3), 'lowpass') } } }`.
