# KIT — API

Pages import through the import map `"srm/": "./lib/"` (and `"three"`). Everything below is in `lib/`.

## film.js — `Run`
```js
const F = new Run({ title, bpm: 120, fps: 30, light: 'afternoon', season: 'autumn', town: { paving, block, brick, asphalt, water, railColor }, seed });
F.route(segments)            // [{ len, turn (deg, + = right), rise (m, + = up) }]
F.cast({ rider, buddy })     // specs (below)
F.ride({ speed, lane, moves, s0 })      // story time; keys are [{ t, v, e }] (e: 'sine' | 'in' | 'out' | 'lin' | 'back' …)
F.buddy({ lead, side, y, moves })       // lead = metres ahead of the rider, side = metres right of the route, y = surface height
F.town((K, F) => { … })                 // build the town (K = Town); runs after the ride, so K.sAt(tau) works
F.shots([{ beats, cam, … }])            // CAMERA.md
F.score(info => arrange(info, { … }))   // or a spec
F.check('name', (t, last) => true)      // your own rule (last = { t, c, tau, rp, bp })
F.start()
```
`F.info()` → `{ dur, bpm, beat, shots, events, speed }`; `F.report()` → `{ problems, numbers }`; `F.frame(t)`;
`F.rider`, `F.bud`, `F.K`, `F.R`, `F.cuts`.

## rider.js — spec and moves
Spec (defaults in `DEFAULT`): `name, height (m), build, mass, stance ('regular' | 'goofy'), skin, skinShade, blush, hair,
hairShade, hairStyle ('long' | 'bob' | 'short'), hairLen, eyes, brows, cap { color, logo, logoColor, brim } | null,
beanie (colour) , top { color, hood, cuff, print, oversize }, bottom { color, kind: 'shorts' | 'pants' }, socks,
shoes { color, accent, sole }, board { deck, grip, wheels, truck, graphic: [3 colours] }, ink, inkW`.

Moves (`at` = story time; for air moves `at` is the pop):
| do | params | what |
|---|---|---|
| `push` | `n`, `every` (s) | push-offs: the back foot plants on the toe side, runs .62 m, swings back |
| `ollie` · `hop` | `h` (m) | gather, pop (tail down, nose up), tuck, land, absorb |
| `kickflip` · `heelflip` · `shuvit` | `h` | the same with the board rolling 360° / turning 180° under lifted feet |
| `grind` | `h`, `x` (lane), `off` (s), `rail: true \| 'ledge' \| false`, `color`, `name` | ollie onto a rail / ledge at lane `x` (built for you unless `rail: false`), slide with sparks until `off`, pop off |
| `manual` | `dur` | nose up on the back wheels, arms out |
| `carve` | `dur`, `dir` (±1) | lean the board and the body |
| `tuck` | `dur` | crouch low for speed |
| `look` | `dur`, `target` ('buddy' \| 'back' \| 'cam' \| 'up'), `side`, `yaw` | head and chest turn |
| `wave` · `point` · `fist` | `dur`, `hand` ('L' \| 'R') | arm gestures (fist dips first) |
| `armsOut` | `dur` | balance arms |
| `cheer` | `dur` | dip, both arms up with overshoot, mouth open |
| `dismount` | `face` (rad) | needs speed 0: the back foot steps off, then the front; then standing with a breathing idle |
`rider.sAt(t)`, `tAtS(s)`, `laneAt(t)`, `pose(t)` → `{ s, lane, crouch, contact, feet, bad, board, hips, head, bodyF }`, `LIM`.

## critter.js — the companion
Spec: `kind ('cat' | 'dog' | 'corgi' | 'fox')`, `name, coat, belly, muzzle, socksF, socksH, tailTip, eyes, nose, earInner,
collar, ink, shade` — and any `KINDS` field to override (`len, height, snout, ears ('pointy' | 'big' | 'floppy'), tail
('long' | 'curl' | 'fluffy' | 'stub'), head, girth, neck, mass, tailUp`). Add a new kind: `KINDS.otter = { … }`.
Moves: `leap { at, h }` (with `y` keys if it lands higher), `sit { at, dur, face }`, `call { at, dur }` (meow / bark / yip
by kind), `look { at, dur, yaw, pitch }`.

## town.js — Route and Town (K)
`Route`: `at(s, x, y)`, `tan(s)`, `right(s)`, `heading(s)`, `yaw(s)`, `y(s)`, `grade(s)`, `frame(s, x, y, yawOff)`, `len`.
`Town` (`K`), positions in route coordinates — `s` metres along (or `{ tau }` = under the rider at that story time),
`x` metres to the right:
- zones: `K.zone(kind, s0, s1, opts)` — `lane { w, poleSide, mirror }`, `shops { w, side, shops: [{ text, signStyle, awningColor, wall, stripe }] }`,
  `river { side, w, bars, bridge, bridgeAt }`, `park { w }`, `plaza { side, w, text, far }`, `harbor { side, w }`
- ground: `road(s0, s1, { w, x, lines, centre, mat })`, `walk(s0, s1, x0, x1, { h })`, `verge(s0, s1, x0, x1, { y0, y1 })`, `ground(s0, s1, w)`
- long pieces: `wall(s0, s1, x, { h, t })`, `hedge(s0, s1, x, { h, w })`, `fence`, `guard`, `railing(s0, s1, x, { h, bars })`,
  `rail({ tau: [a, b] | s0, s1, x, h })`, `ledge({ tau, x, h, w })`, `river(s0, s1, x0, x1, { y })`
- pieces: `house(s, x, { w, d, h, wall, roof })`, `apartments(s, x, { w, d, floors })`, `pole(s, x, { h, transformer })` (+ `wires()`),
  `tree(s, x, { h, r, leaf })`, `bench`, `vending(s, x, { color })`, `mirror`, `lamp`, `bollard`, `planter(s, x, { w, d, h, flowers })`,
  `sign(s, x, { color })`, `shop(s, x, { text, signStyle, w, d, h })`, `station(s, x, { text, w })`, `bridge(s, x0, x1, { y })`, `boat(s, x, { color, cabin, funnel, len })`
- custom: `K.box(mat, s, x, y, w (across), h, d (along), { yaw, tile, solid })`, `K.put(geometry, mat, s, x, y, { yaw, scale })`,
  `K.sweep(mat, s0, s1, profile [[x, y] …], { closed, step, tileU, tileV, flip })`, `K.mat(colour)` (= `cel`), `K.solid(s, x, y, w, h, d)`,
  `K.mark(name, v)`, `K.rand` (seeded)

## look.js
`cel(colour, { map, side, transparent, alphaTest, emissive, shade })`, `shadeTint(material, shade)`, `flat(colour)`,
`ink(colour, w)`, `inked(mesh)`, textures `asphalt, tiles, blocks, bricks, facade, roof, water, signTex(text, style), shelves, chainLink`,
`LIGHTS`, `SEASONS`, `skyDome`, `cloudTex`, `clouds`, `lights`.

## score.js
`arrange(info, { key, mode, theme: { tune: [[degree | null, beats] …], chords: [root degree per bar] }, sections: [{ at, kind }],
beds: { air, birds, city, river, wind } (number or keys), sfx: [{ t, type, v, d }], gain, whoosh, reverb })`; per shot
`music: 'drop'` or `sfx: [{ at, type }]` in the shot. `renderScore(spec, sr, dur)` → `[L, R]`.
