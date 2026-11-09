# Engine — `new Piece({...})`

```js
import { Piece } from 'ls/stage.js';
const P = new Piece({
  title: { text, sub, by, byBeat, size: 6, gap: 4.5, depth: 0.14 },   // size / gap in staff spaces; depth = relief
  meter: '4/4', key: 'd minor', tempo: 112 | [[beat, bpm], …], pickup: 0,
  intro: 3, outro: 3.5,                                               // seconds before the first and after the last note
  staves: [{ id, name, clef, gap }],                                  // optional: default = one staff per voice
  voices: [{ id, name, clef, staff, stem, color, synth, range, pan, gain, section, ring, transpose }],
  look: 'winter' | 'candle' | { base: 'winter', ...overrides },
  layout: { S: 0.11, U: 1.15, gap: 7, barNumbers: 4, names: true },
  shots: [{ at | bar | beat, x, z, yaw, pitch, dist, lead, fov, roll, drift, blend, cut, fit, focus }],
  audio: { reverb: { mix, size, damp }, peak },
  size: { W: 1920, H: 1080 }, fps: 30,
});
P.voice(id, text); P.add(id, beat, dur, pitches, opts); P.addMidi(json, { track, voice });
P.check('name', (p) => true | 'what is wrong');
await P.start();
```

## Time

Film time t = intro + music time. `P.beatAt(t)` extends the tempo before the first note (the camera arrives at bar 1
already moving) and eases out after the last. `P.xPlay(t)` = the playhead's x.

## Light

For each head (a notated note head; tied heads light without a flare): attack 35 ms, full while it sounds (sagging 20 %
over 1.5 s), then `afterglow` × e^(−dt / `trail`). The lit head is an HDR copy of the head (bloom catches it), a pool of
its colour lies on the paper under it (radius `pool`, `poolStrength`), a cross flare sits on it while it sounds (`flare`),
and up to `lights` coloured point lights sit at the brightest voices so raised heads and the title catch their colour.

## Look keys

`paper ink room fog fogDensity key keyIntensity ambient exposure mist mistColor motes{kind,count,color,size} relief
texel glow trail afterglow pool poolStrength flare lights lightStrength bloom{strength,radius,threshold} vignette grain
headGloss`. `texel` = pixels per world unit in the paper tiles (170; `?texel=.5` halves it for a fast preview).

## Shots

A shot holds from `at` (seconds) or `bar` (its first beat) until the next. Unset keys carry over from the previous shot,
except `x` (back to following the playhead). The camera blends every numeric value from the previous shot over `blend`
seconds (smoothstep), then:

- target = (playhead x + `lead` beats, the centre of `z`) — or `x: 'title'` / a number to hold still;
- position = target + `dist` along (yaw, pitch); yaw 0 = straight down the page from below, positive = from behind
  the playhead (looking ahead along the system); pitch = elevation; `drift` = slow handheld sway;
- **fit**: if `z` is a staff, a list of staves or `all`, the camera backs off from `dist` until the playhead's stretch of
  those staves (plus ledger room) and the last half second of notes sit within ±`fit` (0.86) of the frame. `fit: 0` turns
  it off; a smaller `fit` frames wider.
- `focus`: a voice (or list) the check requires on screen whenever it starts a note.

## Paper

The score is drawn into tiles 8 world units wide on demand (2D canvas: staff lines and marks once into a mask, then a
blurred shadow, a highlight and the ink composited — the relief), cached (14 tiles), on a blank sheet that runs on
under them. 3D heads (domes; rings for open heads) stand on the tiles.

## Contract

`window.seek(t)` draws frame t; `renderAt(t)` the same; `DURATION`, `FPS`, `SIZE`, `READY`; `runChecks()` →
`{ errors, warnings, info }`; `audioSpec()` → notes + voices + reverb for `lib/synth.js`; `piece` (the Piece). URL:
`?render=1` fixed size and no player, `?scale=.5`, `?t=12` one frozen frame, `?texel=.5`, `?paused`. The frame is `#frame`.

Live page: plays silently on load (looping); **♪ Sound on** synthesises the sound in the browser (a second or two) and
plays it with the picture following the audio clock; space = play / pause, ← → = 5 s, the bar scrubs.
