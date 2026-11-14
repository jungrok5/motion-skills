# CREATURE — designing the body, and proving it is possible

A long-bodied creature is the easiest thing to make wrong in a way nobody can name: a coil that creases, a back that
flips, a body that slides sideways, a head that looks one way while the body goes another. One wrong rail shows in every
shot, so the body is audited by `check.mjs` and looked at from every side on the cast sheet before any shot is written.

## The model (`lib/60_creature.js`, `lib/62_dragon.js`)
- **Rail.** `rail: { points: [[x,y,z], …], keys: [[t, pointIndex], …] }`. A smooth curve through the points; keys say
  when the HEAD is at a point (not every point needs one — speed settles between keys). Time → distance is a monotone
  cubic, so the body never runs backwards between keys.
- **Follow-the-leader.** Ring `a` metres behind the head sits where the head was `a` metres ago. Start the rail far
  enough back (under water, behind a ridge) that the tail has somewhere to be at t = 0.
- **Frames.** The body's "up" is a field carried along the rail with a limited turn rate; through a vertical climb the
  body rolls over a few lengths instead of flipping. Forward = the way it travels: front and back cannot disagree.
- **Swimming wave.** `wave: { length, amp, speed }` — sideways and a little vertical, zero at the head, growing to the
  tail, smaller at speed. `state(t).wave` scales it (calm in water, full in flight).
- **Radius.** `profile: [[0..1 along, fraction of radius], …]`: neck thinner than the chest, a long taper to the tail.
- **Skin.** `palette: { a: { back, side, belly, rim }, b: { … }, edge, sheen }`; `state(t).morph` = metres from the head
  that are already `b` (−1e3 = none, 1e4 = all); `morphHead` 0..1 for the sculpted parts. `scale: { around, row }`.
- **Parts** (`DR.dragon(C, spec)`): `headScale`, `head: { snout, jawLen, brow, nose, cheek }`, `antlers: { len, tines,
  spread } | false`, `legs: true | false`, `hair: { mane, fins, beard, plume }` (0 removes one), colours, `iris`.
  `state(t).grow = [antlers, hair, legs]` (0..1 each) lets them appear. Riders (`C.ride(obj, a, fn)`) mount anything on a ring.
- **State per frame** (`state(t)` returns any of): `jaw` 0..1, `lid` 0 open..1 shut, `eyeGlow`, `pitch` / `yaw` / `rollH`
  of the head (radians, keep within ±0.5), `wet`, `glow`, `wave`, `girth`, `reach` (fore legs forward), `visible`.

## Ranges (the audit: `C.LIM`, run by `check.mjs`)
| what | limit | why |
|---|---|---|
| bend between neighbouring rings | ≤ 16° (`bend`) | a kink: the rail turns tighter than a body can |
| turn radius | ≥ 2.2 × body radius (warning) | the inside of a coil creases and scales overlap |
| roll between rings | ≤ 9° (`roll`) | a flip of the back |
| speed | never negative | it would slide tail-first: the way it moves must be the way it faces |
| change of speed | ≤ 95 m/s² (`accel`, warning) | two keys too close in time: a teleport |
| jaw 0..1 (0.62 rad), head pitch/yaw ±0.5 rad, legs swing −1.25..+0.9 rad | by construction | set in `62_dragon.js`; keep `state` inside them |
The audit prints where the worst bend is (time, metres behind the head, world position) so the control point can be found.
Fixes: move control points apart (≥ 4 × radius), widen the turn, add a point to round a corner, spread two keys in time.

## The cast sheet (`render.mjs <film> --cast`)
Twelve views at `castTime` (pick a moment of straight, level flight in good light): head from the front, 3/4 from its
left and right, both sides, from above; neck and shoulders from both sides; mid body from below; hind legs; tail; the
whole from behind and above. Score it:
1. **One animal from every side.** Left and right views are mirror images (horns, whiskers, legs on both sides; the
   mane on top, the belly plates underneath, in every view).
2. **Front is front.** Snout, eyes, nostrils, the open jaw and the whiskers lead; the mane and fins stream back; legs
   bend the same way on both sides; the tail plume is at the tail.
3. **Belly down.** In level flight the pale plates face the ground in the side views and fill the from-below view.
4. **Nothing floats or pokes through.** Teeth sit in gums, eyes in sockets, horns and legs are rooted, the jaw's hinge
   is covered, hair roots are hidden.
5. **It reads at film distance.** Squint: head, horns and mane silhouette clearly against the sky at 60 m.
A "which way is it facing?" or "is that its back or its belly?" on any tile is a failure: fix the rig or the parts, and
write what happened into `LESSONS.md`.

## Shots of a long body
- Keep ≥ 15 m from a 2–4 m thick body unless the shot is about an eye or a wall of scales.
- Follow a *smoothed* head (average of five times ±0.14 s) so the lens does not twitch with the swimming wave.
- A camera "beside" the body rides the rail too: position = a ring + sideways + up, target = a ring nearer the head.
- The head-on pass: the lens stands still where the rail goes by, low, and the head grows until it fills the frame.
- A coil reads only from outside its plane and from far enough to see the ring.
