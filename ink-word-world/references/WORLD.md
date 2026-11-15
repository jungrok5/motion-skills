# World API

Everything a `world.js` uses. Import from `inkworld/index.js` (the import map in `index.html` points `inkworld/` at `lib/`).
Units: the sheet is `w.W × w.H` world units — about 1778 × 1000 at 16:9, 906 × 1961 on a tall phone (the area is constant,
so things keep their size). Angles are radians, y is down, time is seconds.

## InkWorld
```js
export const world = new InkWorld({
  seed: 23, title: '물때', subtitle: '글자 하나가 바다 하나', lang: 'ko',
  ink: { blue: '#27566e', red: '#b8301f' },            // overrides INK: black, grey, pale, red, blue, gold
  pigments: [{ name: 'ink', label: '먹', color: '#16130f' }, …],   // the three the brush and the words use (keys 1 2 3)
  paper: { paperDay: [r, g, b], paperNight: […], pale: […], grain: .35, edge: .5 },
  font: { family: 'InkBrush', url },                    // default: the bundled YeonSung
  fluid: { simH: 144, dyeH: 540, pressure: 18, curl: 9, velKeep: .5, dry: .5, fade: .07 },
  sound: { music: { root: 50, day: [0, 2, 5, 7, 9], night: [0, 3, 5, 7, 10], bpm: 54, density: .5, bright: 8 } },
  labels: { auto, sound, keep, hint },  glyph: 150 /* written word height */,  autoAfter: 14 /* idle seconds before self-play */,
  env: () => ({ tide: 0 }),             // w.env: what the world's things share; rebuilt on every restart
  tick(w, dt) { … }                     // the world's own clockwork, once per step before things update
});
```
- `world.word(id, { keys, home: [fx, fy], spawn(w, x, y), pigment, unique, max, note, size, chip, about })` — `spawn`
  returns a thing, a list of things, or nothing (it may call `w.add` itself). `unique`: the old one leaves; `max`: the
  oldest leaves.
- `world.rule({ id, when: [words] | w => bool, needs: [words] (for a function `when`, so check can stage it), line, then(w), again: seconds })`
- `world.perform([[word, fx, fy, { wait }], ['stir', [[fx, fy], …], seconds, { ink: false, water: true, pigment: 2, wait }], ['wait', s]])`
- `world.sound.voice(name, (kit, t, p) => …)` · `world.start(el = document.body)`

## A thing
```js
w.add({ z: 20, grow: 1.5, fade: 1.2, tags: ['fish'], x, y,
  update(w, dt) { … },           // this.age, this.leaving (seconds since dismissed, or undefined)
  draw(w, ink, light) { … },     // two Canvas 2D contexts in world units; globalAlpha already carries its fade
  leave(w) { … }, gone(w) { … }, resized(w, kx, ky) { … } })
```
What it may ask of the world:
| | |
|---|---|
| `w.t` `w.dt` `w.frame` `w.rand()` `w.rand.range(a, b)` `.pick(list)` `.sign()` `.fork(n)` | the clock and the dice |
| `w.W` `w.H` `w.dark` (0…1) `w.night` `w.wind` `{x, y}` `w.env` `w.ptr` `{x, y, down, water, seen}` | the state of the sheet and the hand |
| `w.all(word)` `w.first(word)` `w.has(word)` (word or tag) · `w.dismiss(thing)` | who else is here |
| `w.ink(x, y, { r, amount, pigment })` `w.mark(…)` `w.water(x, y, r, amount)` | put ink in the flow / in the paper / wash |
| `w.push(x, y, vx, vy, r)` `w.swirl(x, y, spin, r)` `w.flow(x, y, out)` → units/s | move the fluid / be moved by it |
| `w.cue(name, { x, … }, every)` `w.say(line)` `w.flash(k)` `w.setNight(on, x, y)` | sound, verse, lightning, time |
| `w.write(text, x, y, { size, pigment, hold, then })` `w.summon(id, x, y)` `w.clear()` | write on the sheet |

## brush
`stroke(ctx, pts, { w, color, alpha, taper: [a, b], dry, seed, press: u => 0…1 })` · `wash(ctx, x, y, rx, ry, { color, alpha, seed, pools })` ·
`ridge(ctx, top, { depth, color, alpha, rim, seed })` · `leaf(ctx, x, y, angle, len, w, { color, alpha, bend })` ·
`dot(ctx, x, y, r, { color, alpha, seed })` · `glow(lightCtx, x, y, r, { color, alpha, core })` · `curve(pts, per)` ·
`INK` · `rgba(hex, a)` · `rng(seed)` `hash(x, y)` `noise(x, y)` · `clamp lerp smooth ease angDiff TAU`

## life
- `new Flock(w, x, y, { n, speed, turn, sep, view, flow, spread, range, wander, kind, home: [x, y] | w => [x, y], zone(x, y, w, agent), zoneGrad(x, y, w, agent) })`
  — `flock.a` agents `{ x, y, h, vx, vy, ph, k, scare, goal: [x, y, pull], rest }`; per step set `flock.flee.push([x, y, radius, force])`,
  `flock.seek = [x, y, pull]`, then `flock.update(w, dt)`; `flock.startle(x, y, radius, power)`; `flock.centre()`.
- `new Chain(x, y, h, { n, len, limit, kind })` — `chain.swim(w, dt, tx, ty, { speed, turn, flow, wiggle, zone })`,
  `chain.pts`, `chain.ang`, `chain.h`, `chain.roll`, `chain.frame(s)` → `{ x, y, a, bx, by }` (bx, by points to the back),
  `chain.at(s)`, `chain.pose(x, y, h, bend)`; set `chain.sideView = true` for a side view, `chain.zoneGrad = () => [0, 1]`.
- `new Tendril(x, y, { n, len, rest, stiff, flow, seed })` → `update(w, dt, rootX, rootY, rest)`, `pts`
- `new Drift(max)` → `spawn(x, y, vx, vy, life, size, data)`, `update(w, dt, { gravity, drag, flow, wind, floor(p, w), onLand(p, w) })`, `each((p, k) => …)`
- `side(ctx, x, y, h, ctx => draw facing +x, back toward −y)` · `above(ctx, x, y, h, fn)` · `turnTo(h, to, rate, dt)` ·
  `report(w, kind, { h, vx, vy, bends, limit, lens, len, up, inZone, minSpeed, slip })` for a hand-built body

## things
`things.night(w, x, y)` · `things.day(w, x, y)` · `things.clear(w)` ·
`things.rain(w, x, y, { seconds, rate, wash, flat, ring, floor: (x, w) => y })` (tag `rain`) ·
`things.wind(w, x, y, { seconds, speed, band: [f0, f1], dir })` (tag `wind`; sets `w.wind`)

## sound (inside a voice)
`kit.tone(t, { f | m, type, a, d, v, to, glide, vib, vibRate, hold, wet, pan })` · `kit.pluck(t, { f | m, v, d, bright, bend, pan })` ·
`kit.noise(t, { type: 'band' | 'low' | 'high', f, to, q, a, d, v, hold, wet, pan })` · `kit.loop(t, id, { on, type, f, q, v, lfo, wet })`.
Built-in cues: `note pad brush stir drop water word melt verse gong thunder flap rain wind clear`.

## cast
```js
export const cast = [
  { word: '고래', view: 'side', chain: WHALE, scale: .6, about: '…', draw: (ink, body, t) => drawWhale(ink, body, t) },   // a spine
  { word: '갈매기', view: 'side', scale: 2.4, draw: (ink, agent, t) => drawGull(ink, agent, t), poses: [{ label, draw: ink => … }] },
  { word: '배', standard: false, poses: [ … ] }                                                                            // only its own poses
];
```
