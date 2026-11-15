# Lessons — what broke while building this skill, and the fix

Problem → cause → fix, one or two lines each. Add yours.

- **The raised near arm crossed the fox's face** on the first cast sheet (reaching the pole up to a lamp). → A profile puppet's
  near arm is drawn over the head. → Reach lower and forward (arm −72°) and let the long pole do the climbing; solve where she
  stops so the tip lands on the glass (`stopFor` in the example).
- **A far arm raised to wave vanished** behind the head (fox and child). → Short cut-out arms cannot clear a big head. → Raise
  the far arm forward-up (−115°…−120°, forearm −40°) so the hand shows in front of the brow, or signal with the prop.
- **The pole pointed backwards** when held. → A prop drawn in the forearm's px inherits the whole chain's rotation. → Convert
  the world angle you want to a local one: `local = world − (torso + arm + fore)` (the example's `holding()`), and the flame at
  its tip back to upright with `−world`.
- **`o.thigh is not a function`.** → One option name meant both a length and a painter. → Painters are `paintHead`,
  `paintTorso`, `paintThigh` …; lengths are plain names.
- **Sprites cut before the stage existed were the wrong size.** → `P.opts.res` is set by `new Stage()`. → Build casts in a
  function (`cast()`) and import it after `new Stage()` + `await F.ready()`.
- **The checker caught lamp 2 lighting exactly on the cut** (9.6 s), so the reach played in the next shot. → Walk timing
  derived from the rig's stride. → `F.check('… lights inside shot 1', …)`; she now hurries to the second lamp.
- **Grass in front read as fog** — thin blades blurred at 4 px plus the grade's lift. → Use fewer, bigger foreground shapes
  (posts, a draped rope, big leaves) and keep them low in frame.
- **Mooring props first read as dark blocks.** → They sat too high and had no recognisable shape once blurred. → Give
  out-of-focus things a silhouette that survives blur (a post with a cap, a rope swag) and push them down.
- **cut-parts named parts in a surprising order** — the tail sat lower than the head and became a row of its own. → Row
  grouping by centre distance. → A part joins a row when its vertical span overlaps the row's by ≥ 30 % of the smaller
  height. Always read `preview.jpg` before naming.
- **Image parts on file:// would taint the canvas** (no `toDataURL` in the render scripts). → Cross-origin rules for file URLs.
  → `cut-parts.mjs` also writes `parts.js` with every PNG inlined as a data URL; pages import that.
- **The same puppet's shadow would flip when it turned** if shadows were baked with an offset. → Mirroring flips everything in
  the sprite. → Sprites bake only a blurred silhouette; the offset is applied in screen space at draw time (`P.put`, `draw`).
- **`gen-parts.mjs` was only exercised against a local mock** of the Images API here (both `/images/generations` and the
  multipart `/images/edits` with `image[]`), not the live service — if the API answers with an error, it is printed verbatim;
  check the model name (`--model`, `OPENAI_IMAGE_MODEL`) and whether it supports `background: transparent` (else use
  `--background opaque` and a flat key colour in the prompt).
