# Kit — API, body rules, shot recipes

## Film (lib/film.js)
```js
import { Film } from 'inkwater/film.js';
Film({ W: 1920, H: 1080, fps: 24, seed: 3, score: SCORE, ground: true /* false = no floor shadow */,
  water: { floorAmt: 1, scale: 1.6, speed: .22, rise: .22, detail: 1, paper: [.915,.915,.92], horizon /* auto from camera */ },
  cast: { lion: { body, look, seed, at: [x, z], heading /* deg */, tolerance: { backward: false },
                  track: [{ t, e, s, y, pitch, roll, crouch, rear, look, nod, roar, jaw, tailSwish, beat, finFlap }] } },
  shots: [{ name, d, cam: [{ t, at | on: 'lion.head', off: [x,y,z], yaw, pitch, dist, fov, roll }],
            water: [{ t, fluid, len, warp, smoke, body, ink, rise, detail, fade }], track: { lion: [...] } }],
  checks: (t, frame) => [] }).start();
```
- Tracks are film time; keys hold any subset of props (monotone cubic between keys; `e: 'io'` on a key eases into it).
- `s` = metres travelled along `heading`; speed is its derivative. For a quadruped the gait phase comes from `s`, so a
  stopped animal keeps its paws planted.
- Cameras: `yaw` 0 = camera on the +z side (a creature heading 0 faces screen right), 90 = in front of it, 180 = the other
  side; `pitch` + looks down. `on` is read at the key's `t` within the shot (a steady aim).

## Bodies (lib/body.js)
`quadruped({ scale, len, hipH, withersH, chest, belly, hips, width, neck, neckR, neckPitch, head, muzzle, arm: [humerus,
forearm, metacarpus], legH: [femur, tibia, metatarsus], paw, legR, tail: { n, len, up, curl, r }, stride, duty, lift, mane })`
— metres. Guardian lion defaults: len 1.2, withers .9, chest .36, head .27, mane 1. A tiger: mane 0, longer `len`,
lower `withersH`, `tail.curl` 20. A deer: mane 0, thinner `legR`, longer `arm`/`legH`, `neckPitch` 60 (add antlers as a
project part).

`swimmer({ len, n, profile: [radius / (len·.12) head → tail], wave: 'vertical' | 'lateral', amp, freq, waveLen,
fins: { at, len, w, sweep }, flukes: { span, chord }, grooves, knobs, eye })` — a whale beats vertically, a fish laterally.

### Looks (lib/paint.js LOOK)
`body, under, chest, leg, paw, claw, mane, maneCurls, tail, tuft, face, muzzle, nose, brow, eyeRing, pupil, mouth, line,
lineW, blotch, blotches, shadow, back, belly, fin, groove, legTufts, emit: { body, mane, tail, leg, face, fin },
sweep: { from: 'head' | 'tail' | 'center' | 'all', spread }` — densities 0–1.

### Adding a part (in the project, not in the skill's lib)
Wrap the body: `const b = quadruped({...}); const pose0 = b.pose; b.pose = st => { const p = pose0(st); p.parts.push({ type:
'cap', a, b, ra, rb, tone: 'mane', order: 0, id: 'horn' }); return p; }` — `cap` and `ball` parts are painted by the
stock painter (`tone` names a LOOK key). For a new kind of shape, add a case to `paintCreature` in the PROJECT's
`lib/paint.js` (new-film.mjs already copied lib/ into the project) and keep the skill's copy untouched.

## Body rules (checked by `checkPose` on every frame, and on the cast sheet)
- Joint ranges `LIM_QUAD` (degrees, side view, CCW +): shoulder −165…−30, elbow −8…150 (forearm folds forward, never
  backward), carpus −140…38 (front lower leg folds BACK), hip −155…−15, stifle −150…−4 (shin folds back, never straight),
  hock −4…155 (hind lower leg folds FORWARD), neck −25…110, head −115…45, head yaw ±80, jaw 0…55, tail ±70 per segment.
  `LIM_SWIM`: bend ±26 per joint, fin ±80, flukes ±50.
- Planted paws: on the floor (±1 cm) and not sliding between frames (±4 mm). A paw IK target out of reach is reported.
- Travel: the root may not move tail-first unless the creature's `tolerance.backward` says so (write it in the brief).
- Facing: front, 3/4 and side, turned both ways, read as one animal: head, chest, hips and feet the same way; near legs and
  near eye drawn over the body (depth sort does this — never hand-order parts by screen side); the mane sits behind the face.

## Shot recipes
| beat | framing | camera | water |
|---|---|---|---|
| wisps | wide, the whole future body | slow push in | `fluid` 1 |
| the first part forms | medium on that part (`on: 'x.head'`, dist ≈ 1× body length) | slow orbit 5–10° | .8–.9 |
| pale body moves | wide side or 3/4 | drift with the walk | .6–.7 |
| detail | medium on paws / fin, low angle | small orbit | .5–.6 |
| ink darkens | medium 3/4 front, slightly low | push in | .5 |
| action | medium on the head | hold, slight push | dip to .5, spike to .9 on the hit |
| hold / dissolve | wide 3/4 | slow pull | .45 → .8 (or e back down with `fluid` 1) |
