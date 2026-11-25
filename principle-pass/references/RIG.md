# RIG — the creature, the keys, the pass

`piece.js` exports one object, `piece`. Everything below is a field of it.

## critter — the body (`lib/rig.js`)
```js
critter: {
  plan: 'quad' | 'biped', seed, daub: 17,                     // daub = stroke size in px
  body:  { len, girth, hip: 1, belly: 1, chest: 1, upright: false, bellyFrom: -.42 },
  neck:  { len, girth },
  head:  { len, girth, snout: .45, beak: false, mask: false, eye: [u, v], eyeR, ear: { len, w, shape: 'point' | 'round' } },
  tail:  { len, girth, segs: 6, bushy: 1, tip: .22 },          // len 0 = no tail
  limbs: { fore: { len: [a, b, c], girth, slant, knee: -1 },    // quad: fore + hind (elbow back, hock behind)
           hind: { len: [a, b, c], girth, slant, knee: 1 } },
  //     { leg: { len: [a, b, c], girth, foot: 'flat' }, arm: { len: [a, b], girth, free: true } }   // biped
  attach: { arm: [along, across], leg: [along, across] },      // optional, in body lengths / girths
  palette: { coat, shade, light, belly, dark, tip, inner, eye, nose, beak, feet },
}
```
Each limb kind makes a near and a far limb: `FN FF HN HF` (quad), `LN LF AN AF` (biped). Legs are three segments
solved by two-bone IK to the foot's contact point (paw, or the toe of a flat foot); the third segment keeps its slant.
Knees bend the way their `knee` says; `calibrate()` records the bend signs of the planted stance and `joints(S)` flags
any frame that bends the other way (> 8°, > 15° for a wrist / hock), folds past 165°, or leaves a planted foot out of
reach. `hipHeight()` is the standing hip height (legs at 92 % of reach); `footHome(pose, id)` is where a foot sits under
its root — lay plants out from these.

## Pose channels
| channel | meaning |
|---|---|
| `x`, `y` | the hips in panel px (y up from the ground) — the root path |
| `pitch` | body angle (rad, + nose up); an upright biped's 0 is vertical, −π/2 lies it forward |
| `bend` | spine curve (+ arches) |
| `neck`, `head` | neck angle from the chest, head angle from the neck |
| `jaw`, `lid`, `ear` | mouth open 0–1, eyelid 0–1, ears back (+) / forward (−) |
| `tail`, `curl` | tail base angle (+ up), curl per segment |
| `sq` | squash along the body axis (< 1 squash, > 1 stretch); girth is 1/sq so the area is kept |
| `fore`, `hind`, `leg`, `arm` | a free limb's swing (rad from straight down, + forward) — used when a limb is not planted |
| `…Tuck`, `…Split`, `legToe` | fold a free limb 0–1; the far limb's offset; a flat foot's toe angle |
| `face` | 1 right, −1 left (flips on one frame — see the turn) |

## keys — the story and the pass
```js
keys: [
  { t: 0, x, y, stop: true },                         // a story key: both panels play it
  { t: 1.45, head: -.3, ear: -.3, pass: true },       // a pass key: only the after panel has it
  { t: 3.48, x, y, pitch, impact: true },             // arrives fast, stops dead (the meter excuses that frame)
  { t: 3.4,  x, y, impact: 'skid' },                  // lands and keeps 90 % of its forward speed (a slide)
]
```
- A key may set any channels; each channel interpolates between the keys that set it.
- **before**: story keys only, every channel linear, the hips on straight lines, legs posed at the story keys and their
  angles tweened (so feet slide), tail / ears rigid, no squash, breath or blinks.
- **after**: every key; channels ease **inOut** by default (`e:` is the ease *into* that key — avoid `'in'`/`'out'`
  unless the neighbouring key is mid-motion, the meter will show the jump); the hips follow a Hermite path through
  the keys (`stop: true` = zero speed there, otherwise the speed carries through — that is the arc).

## plants — the feet
```js
plants: { HN: [{ t0: 0, t1: 3.04, x: X0 }, { t0: 3.56, t1: 99, x: XL - 4 }], … }
```
A foot is locked at `x` (and `y`, default 0) from `t0` to `t1`; between plants it swings on a lifted arc
(`h` = 0.14 leg + 0.22 stride unless given); a swing longer than ~0.25 s rides the body's free pose in the middle (a
leap). `release: 0.2` on the last plant lets the foot ease into the free pose (a belly flop, a jump that never lands).
Plants that only matter between story keys (a tread in the wiggle) appear only in the after panel automatically.

## follow, life — the springs and the idle
```js
follow: { tail: { f: 1.6, z: .42, droop: .5, delay: .03 },   // second-order spring per segment; droop with vertical speed
          ears: { f: 3.2, z: .3 }, sq: { f: 4.5, z: .3 }, stretch: .018, head: { f: 3, z: .5 } },  // head optional
life:   { breath: 2.4, blink: 3.4, blinkSeed: 3, sway: .05, flicks: [{ t: .6, part: 'ear', side: 0 }] },
```
`f` = how quick (Hz), `z` = damping (< 1 overshoots and settles). Bigger creature → lower `f`.

## beats, rest, study, labels
```js
beats: [{ name, t0, t1, big: true, point: 'pelvis' | 'head' | …, tags: ['anticipation', …], label }],
rest:  [{ t0, t1 }],                       // ≥ 0.8 s each; the after must breathe there
study: { t0, from, points: ['nose', 'pelvis', 'tailTip'], ghosts: 5, legend: [...] },
cam:   { x, ground: .8, zoom }, layout: 'stack' | 'side', labels: { before, after, study }, look, props, duration
```
Track points the meter and the study can use: `pelvis chest head nose tailMid tailTip earTip foot<ID>`.

## The turn
In a side view a turn on the spot is: gather the feet under the body (stepped), flip `face` on one frame while the
stance is compact, step out the other way. `turnMotion(C)` builds one for the cast sheet. In a piece, prefer beats
that do not turn; if one must, key it that way and keep the flip frame out of the planted windows.

## Contract
`index.html` imports `piece` and calls `mount(piece)`. The page sets `window.__ready`, `DURATION`, `FPS`, `seek(t)`,
`window.__film = { film, def, track(side), audit(), rig(), cast }` and the shared meter contract
`window.__principles = { fps: 60, sides: ['before', 'after'], track(side) }`. `?render=1` for rendering, `?cast` for the
cast sheet, `?scale=.5`, `?t=` to start at a time.
