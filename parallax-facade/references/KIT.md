# Kit: the API

Units are metres (toy scale: a two-storey shop is ~8 m tall, a car 1.7–3.2 m). x runs right, y up, z toward the camera:
the front row's front faces sit on `z = 0`, the road is in front (`z > 0`), the town is behind (`z < 0`). Colours are CSS
strings. Everything that moves is set from `t` in `F.update` — never accumulated.

## Film (`lib/facade.js`)

```js
const F = new Film({
  facade: { x, y, h, w? },   // the flat frame on z = 0: centre and height (width follows the aspect)
  focus: { x, y?, z? },      // the gap every reveal pivots on
  eye: 5.2,                  // flat camera height (the lowest front roofline)
  finish: "soft" | "ink", look: { sky, shade, sun, haze: { color, near, far, max }, ink: { color, px }, road, ground },
  sun: { az, el },           // degrees; az 0 = from the camera side, − = from the left
  aspect: "16:9" | "9:16", fps: 30, blur: { samples: 24, shutter: 1, px: 3 }, shadowReach,
  audio: "audio/loop.mp3",   // the live player loops it
  sound: { mood, bpm, key, chords, ambience, whoosh, tick, gain },  // read by score.mjs via out/cues.json
});
F.part((B) => { … }, { name, ink, cast, receive, haze })  // build a Batch and add it; returns the Group
F.batch(o) → Batch; B.build() → Group; F.add(obj)
F.landmark(group, "name")    // check.mjs proves it shows in the flat frame and shrinks in the reveal
F.hide(z, roofline) → y      // tallest a building at depth z may be and stay hidden behind the roofline when flat
F.update((t, F) => { … })    // set moving things for time t
F.lap(t, laps) → [0, 1)      // a phase that completes `laps` whole cycles per loop
F.beats([...views], { beat, move, ease })   // references/MOVES.md
F.start()                    // lights, renderer, contract, live player
```

Query: `?render=1` (no player), `?scale=.5`, `?t=2.3`, `?blur=1` (no motion blur), `?fps=60`, `?ar=9:16`,
`?finish=ink`, `?ink=0`, `?autoplay=1`, `?liveblur=3`.

## Batch (parts merged into one mesh + one ink hull)

```js
B.box(x, y, z, w, h, d, color, o)      // standing on y, centred on x / z
B.cbox(x, y, z, w, h, d, color, o)     // centred; o.rx / ry / rz in degrees
B.cyl(x, y, z, r0, r1, h, color, o)    // r1 = top radius (0.02 = cone); o.seg sides
B.ball(x, y, z, r, color, { s: [sx, sy, sz] })
B.panel(x, y, z, w, h, color)          // a thin board facing +z
B.stick([x,y,z], [x,y,z], t, color)    // a beam between two points
B.solid([[p, p, p], …], color)         // a convex solid from its faces (auto-wound)
B.add(geometry, color, { x, y, z, rx, ry, rz, sx, sy, sz, matrix })
B.at(x, z, ry, y) → a Batch in a local frame (ry 90: local +z faces +x; local +x runs toward −z)
part options: { ink: false, glow: true (unlit), haze: false }
```

## Builders (`lib/kit.js`)

| builder | what |
|---|---|
| `building(B, o)` | in its local frame (front on z = 0, centred, back to z = −d). `w h d wall trim`, `base {h color}`, `roof {kind: flat · gable · gableZ · hip · stepped · none, color, h, over, curl, under, rail, parapet, box, steps, stepH, cap}`, `win {rows cols w h y0 floor color frame sill mullion faces lit skip}`, `door {x w h color}`, `shop {h w glass frame}`, `awning {color w x y depth}`, `balcony {row color rail}`, `lod` |
| `row(B, { x0, x1, z, ry, gaps, width(r), make(r, i, x, w), gap, seed })` | a row of buildings along local x; `make` returns building options or null |
| `field(B, { x0, x1, z0, z1, cell, street, avoid, make(r, {x, z, w, d, depth}), seed })` | rows to the horizon behind; far ones get `lod` |
| `tower(B, { tiers: [{ shape: box · cyl · cone · ball · hip, w, d, h, top, color, seg, band, win, clock, eave }], spire, y })` | pagodas, clock towers, lighthouses, minarets, TV towers, gate roofs |
| `tree(B, x, z, { kind: round · palm · cone · column · willow, h, r, color, dark, trunk, lean, fronds, blobs, seed })` | trees |
| `lamp`, `pole`, `wire(a, b, { sag, lanterns: { every, color, size, lit } })`, `lantern`, `bush`, `bench`, `postbox` | street furniture |
| `ground(F, { color })`, `road(B, { z0, z1, x0, x1, color, walk, curb, dash })` | the ground plane (huge) and the front road |
| `canal(B, { x, w, z0, z1, qw, qh, water, quay, edge, glint })`, `bridge(B, { x, z, span, w, h, r, base, color, deck, rail })` | water streets and arches (a bridge across the gap is a good plug) |
| `boat(F, o)`, `traffic(F, { lanes: [{ z, dir, n, laps }], x0, x1, colors, size })`, `birds(F, { n, y, dy, z, dz, x0, x1, laps })` | moving things (each registers its own loop-periodic update) |
| `cloud(B, x, y, z, { w, n, color })` | a flat cartoon cloud far behind |

New pieces go in the project (a function in `film.html` that takes `B`), built from boxes, cylinders, balls and
`solid()` faces with the film's palette — never by editing `lib/`.
