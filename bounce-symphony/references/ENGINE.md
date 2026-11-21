# The engine

## The idea: design backwards, prove forwards
A ball in flight is a parabola: `p(τ) = p + v τ + ½ g τ²`. A bounce off a pad with unit normal `n` and restitution `e`
(frictionless) keeps the velocity along the pad and reverses and scales the part along `n`:
`v_out = v_in − (1 + e)(v_in · n) n`. So the change `v_out − v_in` is parallel to `n`.

**Inverse design** (`solveMachine`). Lay a lane's notes along its layout (floor points at arclength `s`, a step of
`speed × gap` between notes, clamped to `minStep … maxStep`). The first note of a run gets a dropper `drop` metres above
its pad (the ball falls from rest: `v_in = (0, −√(2 g drop), 0)`, released `√(2 drop / g)` before the note). For each
following note, with the gap `T` known and the floor point of the next pad known, only the next pad's height `y` is free:
1. `v_out(y) = (q(y) − p) / T − ½ g T` — the launch that lands on `q(y)` exactly `T` later;
2. `n(y) = normalise(v_out − v_in)` — the only pad orientation that turns `v_in` into `v_out`;
3. `e(y) = −(v_out · n) / (v_in · n)` — the restitution that bounce needs.
`e(y)` falls as the landing point drops, so the solver scans down from above (inside the region of real bounces: the
normal points up, the ball comes in against it and leaves along it, and it is falling when it reaches the next pad) for
the first `y` where `e(y)` equals the instrument's `e`, and bisects. The pad's top face is placed one ball radius below
the contact point along `n`, its long axis across the path. If no height works (a long gap after short hops) or the pad
would sink below `floor`, the run ends: the last pad is aimed at a **cup** (`catchT` later, `catchStep` on), and the next
note starts a new run with a new ball and dropper. Every note is one pad.

**Forward proof** (`simulate`). Each ball starts at rest on its dropper and is moved exactly (parabola against plane:
a quadratic; against a vertical cylinder: a quadratic in the horizontal motion) to the earliest of: its planned pad's top
face (inside its outline, coming down), any other pad's slab (both faces, inflated by the ball radius + 4 mm), any pole,
dropper post or cup stem, or the floor. A bounce uses only the struck pad's normal and restitution — never the solver's
planned velocity. Errors: a strike more than 2 ms off its note, a missed pad, any other contact. `clearance` checks the
build itself: no pole, post or cup stem passes through a pad, no two pads overlap.

## Notes
`notes: 'c5:8 e5 g5 | a5:4. r:8 | [d5:16 e5]*2 f#5:4 bb4'`
- pitch + octave (`c4` = middle C, MIDI 60), sharps `#`, flats `b`;
- `:n` = 1/n note, **sticky** until changed; `.` dots that note only (it is not sticky — write `r:2.` again);
- `r` rest; `|` bar line (each bar is checked against `meter`; a short first bar is a pickup);
- `[ … ]*n` repeats (bar lines may sit inside).

## Piece options
```js
new Piece({
  title, bpm, meter: '4/4', intro: 3,  // seconds before beat 0 (droppers wait, the camera establishes)
  outro: 3,                            // seconds after the last cup
  ballR: 0.014,                        // ball radius (m)
  look: 'studio' | { …overrides },     // §Look
  instruments: { id: { kind, color, rough, metal, glow, body, L0, w, th, R0, e } },
  lanes: [ { id, inst, color, notes, layout, top, drop, speed, minStep, maxStep, e, maxGap, floor, runGap, catchT, catchStep, maxTilt } ],
  shots: [ … ],                        // §Shots
  mix: { gains: { kind: g }, lanes: { id: g }, reverb: { mix, size, damp }, sfx: true },
});
```
**Lane** — `top` (m, height of each run's first pad, default 1.2), `drop` (0.18), `speed` (horizontal m/s, sets the step,
0.45), `e` (restitution, default from the kind), `maxGap` (s, longer gaps start a new ball, 0.95), `floor` (lowest pad,
0.3), `runGap` (path left between runs, 0.28), `catchT` (0.34 s), `catchStep` (0.13 m), `maxTilt` (42°).

**Layouts** — `spiral { center:[x,z], r0, grow (m per turn), angle0 (deg), dir (1 ccw / −1 cw) }` (Archimedean,
outward); `arc { from:[x,z], heading (deg; 0 = +x, 90 = +z), bend (deg per m) }`; `zigzag { …arc, width }` (alternating
sides); `path { points: [[x,z], …] }`.

**Instrument kinds** (`KINDS` in machine.js) — shape, size at the reference note, restitution, rocking:
marimba (bar, e 0.8), xylophone (bar, 0.84), vibraphone (bar, 0.82), glockenspiel (bar, 0.86), kalimba (tine, 0.85),
woodblock (block, 0.78), steelpan (disc, 0.8), bowl (inverted singing bowl, 0.72), gong (disc with boss, 0.66),
cymbal (dome, 0.62), drum (shell + head, 0.74). A bar's length goes as 1/√f (a real tuned bar); a disc's radius as f^−¼.
Override per instrument: `L0`, `w`, `th`, `R0`, `e`, and the body: `color`, `rough`, `metal`, `body: 'pitch'` (bodies in
their pitch colour), `glow: '#hex'` (one glow colour instead of the pitch palette).

## Look
`LOOKS.studio` (override any field): `bg`, `floor`, `floorRough`, `fog [near, far]` (× the footprint's radius),
`exposure`, `env` (room reflections), `key { color, lux, height (× radius, above the tallest pad), angle, penumbra, offset }`,
`fill { sky, ground, intensity }`, `bloom { strength, radius, threshold }`, `dof { aperture, maxblur }`, `pole`,
`glowPeak`, `glowDecay` (s), `palette` (12 colours, C … B). The floor fades to the background past the machine (no
horizon) and does not mirror the room at grazing angles.

## Shots
Each `{ at, blend = 1.2, kind, … }`; a new shot glides from the last over `blend` s — the subject moves in a line and the
camera swings round it — unless the two subjects are more than `maxGlide` (1.4 m) apart, then it cuts.
- `orbit { center?, dist, angle, speed (deg/s), elev, lift, fov }` — round the machine (default centre: the machine's).
- `follow { lane | lanes, dist, angle, speed, elev, lag (smoothing, s), offset, fov }` — the newest ball in flight of the
  lane(s), smoothed over ±`lag`; focus on the ball.
- `fixed { pos, target, fov, focusOn? }`, `move { from: {pos, target, fov}, to: {…}, dur }`.
Depth of field focuses on the shot's subject; aperture scales with distance.

## Sound
`audioSpec()` → strikes `{ t, kind, midi, vel, pan }`: `vel` from the impact speed along the normal (a long fall rings
louder), `pan` from the strike's x across the machine; plus `latch` (a dropper opening) and `catch` (a ball into its cup)
unless `mix.sfx === false`. `lib/synth.js` renders modal partials per kind (marimba 1 : 3.99 : 10.65, glockenspiel
1 : 2.76 : 5.40 : 8.93, bowls with beating doublets …), a contact noise, freeverb, normalised to −1.4 dBFS.

## Contract
`window.seek(t)`, `DURATION`, `FPS`, `READY`, `runChecks()`, `audioSpec()`, `piece`; `?render=1&scale=.5`, `?t=12`.
Everything is a pure function of t: balls from `ballAt` (parabolas), glow and rocking from closed-form decays after each
pad's strike, trap doors from their release time.
