# KIT — the API

Paths: `lib/` in the skill; pages import it through the import map `"tpj/": "…/lib/"`.

## journey.js — `new Journey(o)`
`o = { rider, score, speed (px/s at z 1, 230), tear (s, 1.4), seed, riderX (rear hub on screen, .34·W), gear (crank turns per wheel turn, 1.3), post: { grain, vignette } }`

`J.chapter(def)` — `def = { name, mood, medium, dur, speed?, ground: x => y, layers: [{ z, paint(ctx, M, x0, x1, H, chapter), front?, h? }], back(g), front(g), gestures: [{ at, kind }], coast: [[a, b]], pose: {lean, head, stand…}, sound: { bed: { rain: .8 }, sfx: [{ at, type, v }], music: { bpm, mode, root, lead … } } }`
- `ground(x)` is the road line in the chapter's world x at z 1. The wheels touch it, the bike tilts with it.
- A layer at depth `z` is a plate painted once over the world range it will show (`x0…x1`); z 0 is fixed to the screen.
- `back(g)` / `front(g)` run every frame (behind / in front of the rider). `g = { ctx, M, t, lt, u, ld, X, W, H, ground, J (front only), at(z, fn), screen(fn) }`
  - `g.t` the clock (wraps into the loop through the last tear), `g.lt` time in the chapter, `g.ld` distance travelled in it,
    `g.X` the rider's rear hub in world x, `g.at(z, fn)` draws in layer z's world coordinates.
- `coast` intervals: cranks hold, the freewheel ticks; `feetup` needs one (added automatically around it).

`J.check(name, fn)` adds a film rule; `J.start()` builds the tables and sets the contract.

Contract: `window.seek(t)`, `DURATION`, `FPS` (24), `SIZE`, `runChecks(t)`, `shotAt(t)`, `riderAt(t)`, `film`, `__ready`.
Query: `?render=1` fixed canvas · `?t=12` one frame · `?scale=.5` preview size · `?off=grain,vignette,texture`.

## rider.js
- `draw(ctx, M, SPEC, st)` → joints `J` (`J.world`: hubs, contacts, hip, shoulder, head, pedals, balls of the feet); appends broken rules to `audit`.
- `where(SPEC, st)` the same joints without drawing.
- `MOODS` posture + face per feeling: `lean`, `head` (pitch, + down), `eyes` (`happy open sad wide soft determined closed`), `mouth`, `stand` (on the pedals), `hunch`, `tilt`.
- `GESTURES` `wave flap look catch bell shiver feetup` — keyed channels over u with `antic`, `act`, `main`, optional `feetOff`.
  Channels: `far` / `near` (hand offset from its grip, ×R), `head`, `lean`, `stand`, `mouth`, `wings`, `legs`.
  Add your own in `SPEC.gestures = { name: {…} }`; `gestureProblem()` must return null (anticipation ≥ .12 s, moving against the action, settles back).
- `LIM` knee 38–178°, elbow 28–178°, neck ±45°.
- SPEC fields: `name, kind ('snout' | 'bird' | 'human'), R, seed, body, headCol, belly (front), coat, pack (back), head, neck, torso, girth,`
  `snout, snoutCol, muzzle, nose, ears ('pointed' | 'round' | 'long' | 'none'), earIn, eye, eyeWhite, beak, beakCol, pouch, crest, hair,`
  `arm { col, sleeve, hand }, legs { col, trousers, shoe, thin }, tail { kind: 'brush' | 'feathers' | 'none', col, tip, len },`
  `scarf { col, len }, hat { kind: 'beanie' | 'cap', col, pom }, bike { col, frame: 'step', tyre, saddle, metal, basket },`
  `cargo(ctx, M, W, [x, y], st, J)` (the story object in the basket), `extra(ctx, M, W, J, st)` (anything else, drawn last), `moods`, `gestures`.

## kit.js (every function draws through M)
Sky and light: `sky`, `sun` (rays, face), `moon`, `stars` (twinkle with `t`), `constellation`, `cloud`, `glow`, `rainbow`.
Land: `hills`, `mountains` (snow), `road` (`dirt cobble path grass boards`, dashes), `grass`, `rock`, `water` (glints), `puddle`.
Things: `tree` (`round pine poplar willow bare umbrella`, fruit), `house` (`cottage town hut`), `fence` (`picket post`), `lamp`,
`flower` (`daisy sunflower tulip dot`), `boat`, `stall`, `bunting`, `pole` (with wires), `balloon`, `kite`.
Live: `bird` (wing beat), `butterfly`, `rain` (screen), `critter` (`cat dog rabbit owl hen` — sitting, breathing, blinking,
tail and ears moving), `person` (standing, breathing, shifting weight).
Helpers: `each(x0, x1, step, seed, fn, jit)` scatter on a fixed world grid; `groundLine(base, amp, len, slope, seed)`.

## score.js
`arrange(info, { theme, moods, sfx, gain, reverb })` → a spec; `renderScore(spec, sr, dur)` → `[L, R]`. `MOODS` per feeling:
`bpm, mode, root, lead, comp, bass, beat, bed, swing, sparse`. Instruments, hits, effects and beds are listed at the top of the file.

## sheet.js
`castSheet(SPEC, { media, gestures })` — every medium facing right and left, the pedal stroke, the idle, every gesture's key poses.
