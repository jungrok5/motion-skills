# STORY — topic → shots

The reference's grammar, kept for every topic: **the page draws the world → something is taken → the chase → the stunt
→ the dark thing → the turn → the release → back on the blank page.** Not every film needs all eight; keep the first and
the last (the page), one stunt, one turn.

| beat | what it does | typical shot | length | transition in |
|---|---|---|---|---|
| drawn | the blank page draws the hero, the companion, the prop (`g.drawOn`), a pencil travels over it | medium, centred, slow push | 3–4 s | fade in from paper |
| inciting | the thing is taken / lost / called (wind, a creature, a letter, a sound) — the shock face, then the set jaw | medium-close, a shake on the hit | 3–4 s | cut |
| chase | side tracking along a street of facades, the prop ahead, the companion behind; parallax skyline | wide, camera trucks with the hero | 4–6 s | cut |
| stunt | the one big move: run → anticipation → arc → landing squash + puff | wide, follows the arc | 4–5 s | cut |
| dark thing | a scribble mass grows, swallows, roars; thunder flash | low angle, push in | 3–4 s | cut / scribble wipe |
| turn | the hero acts (leaps, catches, opens, frees); the glow ring; the scribble bursts into sheets | medium, tilt up | 4–5 s | cut |
| release | flying / floating / walking home, sheets drifting, light warms | very wide | 4–5 s | dissolve 1 s |
| page | back on the blank sheet; the companion arrives; a last gag (a drop, a wink); the pencil adds one line | medium, slight pull out | 3–4 s | paper 1 s |

Timing rules: one action per shot; 3–6 s a shot; 25–45 s a film. Hold key poses 6–12 frames. Give every big move an
anticipation of ~.25 s and a settle of ~.4 s. The music drops out under the dark thing and comes back at the turn.

## Writing a shot
```js
F.shot(5, g => {
  const lt = g.lt, tw = g.twos();                     // tw: time on twos for the cast and effects
  g.paper(); g.put(sky, -200, 0, .35); g.put(town, -100, 0, 1);   // plates back to front, z = depth
  g.at(1, c => {                                      // the focal plane
    K.shadow(c, x + 20, 1002, 110);                   // contact shadow first
    const G = R.person(c, HERO, { x, y: 1000, s: .95, face: 1, turn: .85, ...R.run(tw * 1.45), expr: 'determined', wind: [-110, 0], flow: tw });
    prop(c, G.hands.near.x, G.hands.near.y, { … });   // a held prop at the hand
  });
  last.boy = G; last.ground = 1000;                   // for F.check
}, { name: 'chase', cam: [{ t: 0, x: 0 }, { t: 5, x: 2400, e: 'io' }] });
```
- A run cycle at `ph = tw * 1.45` is ~3 steps a second; move the figure ~470 px/s at s ≈ .95 so the feet don't slide.
- A jump: `R.leap(k)` (k 0–.25 crouch, –.42 push, then airborne with `plant: false`); move y on a sine arc yourself.
- A catch: compute where the hand will be with `R.where(spec, pose)` at the catch time and aim the falling prop there.
- Hanging from something: draw the figure at `grip − handOffset` where `handOffset = R.where(spec, {x: 0, y: 0, …pose}).hands.near`.

## A shot table (fill it under the brief's SCENE)
| # | name | s | framing / camera | cast and action | effects | sound |
|---|---|---|---|---|---|---|
| 1 | drawn | 4 | medium, push 1 → 1.05 | hero + companion + prop drawn on | pencil | pencil, a 3-note chime |
| … | | | | | | |
