# BRIEF — from a topic to a brief, and the reviews

Write `BRIEF.md` in the project before any code (copy `templates/BRIEF.md`). Every line is designed for THIS topic; the
template's girl, umbrella and apple and the example's boy, slide and kite are examples only — and never the reference
clip's girl, door, stairs, flower, butterfly or heart.

## Filling it in
1. **One line** — "A drawn ___ on a sketchbook in ___ is given ___ by a real pencil, goes down into the real world by ___,
   and finds a drawn ___ that turns real."
2. **The place** — a real place the topic belongs in, as a Poly Haven HDRI (list them: `https://api.polyhaven.com/assets?t=hdris`;
   look at thumbnails, pick one whose ground is walkable and whose light suits the mood). The ground scan that matches the
   HDRI's ground (cobbles, pavers, planks, gravel), the table (round café / rectangular wooden; its scan), where the
   sketchbook lies (near the edge the hero will leave by). Note the turn (deg) that puts the best part of the place behind
   the action.
3. **The hero** — who in three words; height on the page (6–8 cm: a pencil is 17.5 cm); silhouette, hair, face, clothes
   (`lib/hero.js` spec); graphite only (tone fills for hair or a cap). **Mass and idle**: light and quick (a doodle weighs
   nothing — but moves with weight); what breathes (chest, a weight shift on its own rhythm), how often it blinks.
4. **The real touch** — the first contact between the worlds (the pencil arriving, a crumb falling, a fingertip's shadow,
   a coin rolling into frame) and the hero's reaction as anticipation → action → recovery.
5. **The way out** — what the real pencil draws standing up from the page (a slide, a ladder, a door-less arch, an
   umbrella, a bridge to the table edge, a rope …) — designed for this topic, in 3-D (which plane it stands in).
6. **The way down** — how the hero gets from the table to the ground (the drawing continues itself down, a float, a jump
   into something drawn, a climb). How long (2–4 s), how the camera follows.
7. **The world at the hero's scale** — the low camera: what is sharp at the feet, what the hero looks up at.
8. **What turns real** — a drawn thing the topic is about, drawn on the ground or in the air, then touched: a Poly Haven
   scan (`https://api.polyhaven.com/assets?t=models`) or a mesh built in code (`examples/kite/props.js` builds a tissue kite).
   Draw its outline from the real thing's own shape and size so the reveal lines up. Where the touch is.
9. **What happens after** — the real thing acts (rises on the wind, rolls, opens, lights up) and the hero acts with it.
10. **The close** — the frame the pencil (or the line itself, in a wide frame) draws: circle, heart, star, window, the
    topic's own shape; what it holds.
11. **Beats** — a table with times (references/GRAMMAR.md), 15–35 s. Per beat: the hero's stance and gaze, the
    anticipation, the action, the recovery.
12. **Motion reference** — if you generate a video of the cast to take key poses from: model, prompt, take (it lives in
    `ref/`, never committed). Otherwise "hand-keyed".
13. **Sound** — the hero's tune (music box), the place's air, the pencil (from the strokes), the steps, the reveal
    (sparkle + a chord), the close (paper).

## Cast review (cast.html, before any beat is written)
- The hero reads at 10 % of the frame height as a graphite drawing; no colour anywhere.
- Turned both ways (8 views): the narrower eye, nose, chin and toes on the facing side; the ear toward the back; back views
  show no face; items turn with the head.
- Motion row, facing right and facing left: the idle breathes (the head moves across a breath); the turn on the spot is
  steps (feet re-planted, never skating); the hop gathers (crouch), flies, lands deep and settles.
- Expressions differ at a glance. `check.mjs cast.html` prints `ok`.
- If a view makes you ask "did the neck turn or the body?", it fails — fix the spec or the rig and re-render.

## Still review (stills and the contact sheet)
- Does the real world look photographed (the scans, the lens) and the drawing look drawn (double lines, boil, paper-white)?
- Does the drawing sit IN the world: a contact shadow under the feet, a real shadow where the sun is, the same blur as
  what is around it at that depth?
- Does anything float, skate, or stand dead still? Does each big move gather and land?
- The real pencil: its tip on the line being drawn, its far end out of frame, its shadow on the page.
- The thing that turns real lines up with its drawing; the reveal spreads from where the hero touched it.
- Nothing important cut by the frame (the hero's head while acting); the hero never lost during the way down.
- The drawing has no colour; the only colour on a drawn thing is a thing that has become real.
