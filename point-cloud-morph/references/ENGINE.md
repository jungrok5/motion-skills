# Engine — shots, transitions, camera, HUD, contract

```js
import { Cloud } from 'pcm/cloud.js';
const F = new Cloud({
  count: 150000,            // points for the whole film (≤ 262 144). ?n= overrides
  seed: 1, ink: '#ece9e2', accent: '#7aa9ff', bg: '#040506',
  size: 2.0,                // point size in px at 1080p at the camera's distance
  alpha: 0.62,              // per-point opacity (additive: lower it if dense forms blow out)
  shimmer: 0.0015, twinkle: 0.1, fps: 30, loop: false,
  score: { root: 55, bed: 1, whoosh: 1, chime: 1, blips: 1, reverb: 0.28 },   // read by score.mjs
  hud: { brand, nav: [4], contact: 'CONTACT', tabs: [one per form], hint, chrome: true, ruler: true, vignette: 0.6, readout: true },
});
F.form(name, (b) => …, { use, spare, match: 'space' | 'random', motion: [...] });
F.shot({ name, form, dur, in: {...}, cam: {...}, hud: {...} });
F.check('rule', (film) => true | false | 'message');
await F.start();
```

## Shots and transitions
A shot holds one form for `dur` seconds; its first `in.dur` seconds are the morph from the previous shot's form (the first
shot comes from `'dust'`, or from the last form when `loop: true`).

`in = { style, dur, sweep, spread, turb, expand, win, flash, freq, from }` — `style` picks defaults (`STYLES` in cloud.js),
any field overrides them:

| style | turb | expand | win | flash | |
|---|---|---|---|---|---|
| `nebula` | 0.55 | 0.25 | 0.5 | 0.35 | dissolve into a cloud, condense |
| `flow` | 0.12 | 0 | 0.6 | 0.15 | stream across |
| `burst` | 0.2 | 1.3 | 0.35 | 0.5 | explode out, fall into place |
| `fold` | 0.05 | −0.6 | 0.5 | 0.3 | implode, re-form |
| `scan` | 0 | 0 | 0.07 | 1.6 | a sharp sweep plane with a flash |
| `cut` | — | — | — | — | instant (dur 0) |

- `turb` — noise displacement at the middle of each point's move, × the larger form's radius.
- `expand` — push from the target's centre at the middle (negative pulls in).
- `win` — the share of the transition one point spends moving (small = a sharp front, 1 = all together).
- `sweep` — the order points start in, by their **target** position: `up down left right front back radial in random` or
  `[x, y, z]`. `spread` (0.25) mixes in randomness so the front is not a hard line.
- `flash` — brightness, size and accent at the middle of a point's move.

## Camera
`cam = { yaw, pitch, dist, target: [x, y, z], fov: 32, frame, frameY, drift, to: {...}, ease: 'inOut', bleed }`.
The camera eases from the previous shot's end to `cam` over the transition, then (if `to` is given) from `cam` to `to` over
the rest of the shot; `drift` (°/s, default 1.2) adds yaw all shot long. Fields left out carry over from the previous shot,
except `frame` / `frameY` (screen shift of the subject, share of width / height; +frame pushes it right) which default to 0.
Yaw 0 looks from +z (x to the right); yaw 90 from +x. `bleed: true` lets a form overflow the frame without a warning.
The live page adds drag-to-orbit offsets on top (they ease back when released); renders ignore them.

## HUD
Per shot `hud = { chrome, fig: [line1, line2], scan, kicker, title: [l1, l2], body, button, link, stats: [[label1, label2,
value], …≤3], tab, callouts: [{ at, text, dx, dy, t, accent }], rings: [{ c, r, axis, ticks, alpha }], paths: [{ pts, dotted,
gap, alpha }], copyX, copyY, copyW, titleSize, copyAt }`.
- **chrome** (default `hud.chrome`) cross-fades over 0.9 s when it changes between shots.
- **fig** types in at the start; the readout shows live yaw / pitch and `scan / pct%` (the morph's progress).
- **copy** fades in at 60% of the morph (`copyAt` to change), out in the last 0.45 s (the last shot keeps it).
- **callouts**: `at` is a world point; appear at `t` (default: the morph's end + 0.4 s, then 0.45 s apart); the tag's first
  word is drawn in the accent (`accent: false` for ink). `dx` < 0 puts the tag on the left.
- **rings / paths** draw on from 70% of the morph.
All HUD sizes are 1080p px; fonts are `PCM Sans` (Inter), `PCM Mono` (JetBrains Mono), `PCM KR` (Noto Sans KR) for Hangul.

## Checks
`film.runChecks()` (check.mjs prints it): hold ≥ 1.5 s, transition ≥ 1 s, the form inside the frame and ≥ 30% of it when
it settles and at the shot end, ≤ 8% of it under the copy, callouts on screen / inside the frame / apart / clear of the
copy / after the morph, and every `F.check`. check.mjs adds: fonts loaded, settled frames lit and not blown out, the morph
moves, no jump at a cut (HUD off, ±1/60 s), deterministic.

## Contract
`window.seek(t)` · `renderAt(t)` · `DURATION` · `FPS` · `SIZE` · `shotAt(t)` · `runChecks()` · `cues()` · `showForm(name,
yaw, pitch)` · `film` · `READY`. Query: `?render=1`, `?t=`, `?scale=`, `?n=`, `?scroll=1`, `?off=hud,flash,shimmer`.
The composited frame is `#frame` (2D canvas: the WebGL cloud drawn in, then the HUD).

## Live page
Fits the window at 16:9, renders at up to 1920 px wide (devicePixelRatio aware), loops; drag orbits, a click / space
pauses, ← → jump between forms, Home restarts. `?scroll=1` makes the page `DURATION × 60vh` tall and maps scroll to t —
for a landing-page section, wrap it in an iframe or lift `film.html` into the site with its `lib/`.
