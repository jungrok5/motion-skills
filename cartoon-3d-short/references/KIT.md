# Kit: the API

```js
import { Film, THREE, glide, smooth, easeOut, easeIn, lin, lerp, lerp3, clamp01, rng } from "toon/film.js";
import { person, INK } from "toon/toon.js";
import WORDS from "./voice/words.json" with { type: "json" };
const F = new Film({ words: WORDS, audio: "out/mix.wav" });   // or words: "script text" (estimated timing)
```

## Film
| call | what |
|---|---|
| `new Film({ words, audio, captions, W, H, fps, shadowSize, duration })` | words: `[{ w, s, e }]` or a script string; audio: the mix the live player plays |
| `F.at("word", n = 1)` / `F.end("word", n)` | start / end time (s) of the n-th occurrence of a word or `"two words"` (case and punctuation ignored); throws if absent |
| `F.set(name, (S) => { …; return objects })` | build a place once; `F.sets[name].objects` is what the builder returned |
| `F.shot({...})` | add a shot (below); shots must tile the timeline (`to` defaults to the next shot's `from`, the last to the last word + .4 s) |
| `F.start()` | finish, warm up every shot, publish the contract, show the live player unless `?render=1` |
| `Film.estimate(text, wps = 3.7)` | word times from text |

### Shot
```js
F.shot({
  from: F.at("Then"), to,                 // seconds (to: optional)
  set: "piazza", light: "day",            // day | golden | night | interior (lib/look.js)
  sun: { az: 20, el: 7 },                 // optional: move the camera-relative sun for this shot
  cam: [                                  // keys, t = seconds into the shot; the first key is the opening framing
    { t: 0, pos: [x, y, z], look: [x, y, z], fov: 40, roll: 0 },          // roll in degrees
    { t: 1.2, dur: 30, pos, look, fov, roll },                              // smootherstep glide over dur frames
    { t: 2.5, cut: true, pos, look },                                       // hard cut inside the shot
  ],
  push: 0.2,                              // creeping push-in, % per frame since the shot / last cut started (dolly toward
                                          // a near look point, fov zoom when the look point is > 14 m away; zoomPush forces)
  punch: [F.at("snaps")],                 // ~35 frames of 0.6 %/frame push on punch words
  kicks: [F.at("bang")],                  // impact shake: flips sign every frame, decays over 7 frames
  dof: 12,                                // lens blur radius at infinity (px at 1080x1920) or (lt) => px; 0 = sharp
  focus: [x, y, z],                       // focus point (default: the look point) or (lt) => [x, y, z]
  xfade: 8, flash: true,                  // crossfade frames into this shot / 4-frame white flash at its start
  exposure: 1, bloom: 0.5,
  update: (lt, set, t) => { … },          // pose the set's objects for this frame (SET values, never accumulate)
  cast: (lt, t) => [placement, …],         // who is on screen this frame
  fx: (lt, t) => [effect, …],             // effect cards this frame
});
```
`lt` = seconds into the shot, `t` = film time. React to words with `t > F.at("word") - 0.07` (0–3 frames early).

### Placement (a character this frame)
```js
{ who: person({...}), at: [x, 0, z],
  face: [dx, dz],          // direction the body faces / walks (default: toward the camera → front view)
  mode: "stand",           // stand | walk | march | stroll | sit | fall | push (side view: pose 0..1, hand)
  phase,                   // walk cycle (default t × 1 Hz = 2 steps/s); move `at` by ~1.4 m/s when walking
  expr: "neutral",         // neutral stern grin laugh whistle nervous shock relief relief_open dazed pained smile smile_closed lick
  gesture: "up",           // up | point | shrug | hips (front view)
  prop: (pen, x, y, u) => {…}, propKey: "spear",   // anything in the hand (u = 1 % of the head width); propKey caches it
  look: 0, tilt: 0, headTilt: 0, wave, facing,     // eyes −1..1, body / head tilt (deg), 3/4 facing −1 | 0 | 1
  scale: 1, seed: 1,                               // seed = head shape + blink timing (keep it per person)
  view: "auto" | "front" | "side", blink: false | true | 0..1, shadow: true }
```
Views: front when the body faces within ~55° of the camera, otherwise side (mirrored when heading screen-left).

### Effect
`{ fx: "burst", at: [x, y, z], size: metres, t: 0..1 progress, arg, rot: deg, flat: false, alpha }` —
kinds: `burst bang splash puff stars creak ring question exclaim sweat speed zzz heart bulb sparkle glow arrow note cloud plank`
(`toon.FX`). Cards face the camera (or lie flat with `flat: true`).

## Outfits (`toon.person`)
```js
person({ coat: "#3f6fb5", pants: "#3b3f52", shoes: "#4a3426", skin: "#ffe2c2",
         hat: null | "hair" | "cap" | "tophat" | "bonnet" | "shako" | "shako_tall" | "crown" | "helmet" | "hardhat" | "wizard" | "beret" | "hood",
         hatCol, hair: "#5a3b2a", build: "adult" | "stout" | "kid",
         moustache, beard, glasses: true | "#hex", dress: "#hex", belt, buttons, sash, sword, rifle })
```
One constant per person (`const MASON = person({...})`), reused in every shot, so a person always looks the same.
Lower-level: `bodyFront(pen, outfit, opts)`, `bodySide(pen, outfit, opts)`, `Pen` (poly, ell, line, stroke, arc, dot,
shadedFill, gradFill, inkRing, band, clip) — draw props and new effect cards with the same pen and ink.

## Set builder `S`
Every kit builder is bound: `S.house({...})` builds the object, adds it to the set and returns it.
| builder | options |
|---|---|
| `ground` | `kind` grass · cobble · dirt · sand · planks · stone · marble · wall (or a material), `size` (half-extent) or `w, d`, `x, z, y, tile` |
| `path` | `from: [x, z], to: [x, z], w, kind` |
| `hill` · `mountains` | `{ x, z, r, h }` · `{ dist, n, h, seed, rock, snow }` (a ring of far peaks) |
| `house` | `x, z, yaw, w, d, h (7 / 8.4 / 9.8), style 0–7, glowWin` (front = local +z) |
| `street` | a row of varied houses: `x, z, yaw, n, seed, glowWin` |
| `tree` · `grove` | `kind` round · fat · tall · cone · bush, `h, seed, q` (detail) · scatter `n` in a box with `avoid(x, z)` |
| `fence` · `wall` | `from, to` (+ `h`, `crenel`) |
| `lamp` (`lit`), `barrel`, `crate`, `table`, `bench`, `well`, `cart`, `rock`, `flag`, `banner`, `sign` (`draw` paints the unlit face) | positions + a few sizes / colours |
| `tower` | `r, h, shape` round · square, `roof` cone · flat · crenel, `mat`, `lean` (deg), `arcades` |
| `room` | interior: floor + 3 walls (open toward +z), window in the back wall; walls cast no shadow |
| `water` | `x0 x1 z0 z1 y` or `shape: "disc", r, x, z` — coloured per light |
| `mesh(geometry, "#hex" \| material, [x, y, z])` | anything else, two-tone lit |
| `clouds(n)` | sky cloud cards (default 9; `0` indoors) |
Materials: `S.col("#hex")`, `S.MAT.grass()` … `S.MAT.marble()`, `S.paintMat(key, w, h, (g, r) => draw, { repeat })`,
`S.glow("#hex", k)` (self-lit, blooms), `S.unlit(key, w, h, draw)`. Custom pieces: `const b = new S.Batch(); b.add(geo, mat, matrix); b.box(mat, x, y, z, w, h, d); S.add(b.build(new THREE.Group()))`.

## Look and light
`lib/look.js`: `LIGHTS[name]` (az, el, lit / shade / lift, character tint, fog, sun colours), `LOOK[name]` (sky stops,
water, clouds, saturation), `GRADES[name]`, `DOF` ladder. `lib/post.js` `Post.ink` holds the ink widths.

## Score (`lib/score.js` via score.js)
```js
export const SCORE = { bpm: 112, key: "C", music: 1, sfxGain: 1,
  sections: [{ at: 0, mood: "bouncy" }, { at: 21.9, mood: "wonder", gain: .85 }, …],   // march bouncy sneaky tense wonder explain payoff silence
  stops: [t],                                     // dead air on a big moment
  sfx: [{ at, kind, gain, dur, pitch, pan }] }     // whoosh pop boing thud crash snap splash creak ding whistle drumroll footsteps bell zip rumble cheer laugh gasp-sting riser glint clack squeak
```
`riser` and `drumroll` END on `at`. The last `payoff` section ends on a button 1.2 s before the end.
