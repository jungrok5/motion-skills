# Lessons

Problems met while building this skill and its two pieces, as *problem → cause → fix*.

- **The notes that were sounding were off the left of the frame while the check said "glowing"** → the camera aimed at
  the playhead + a lead of a beat, and at a close distance one beat is a third of the frame; and with the camera to the
  side, the top staves' playhead sits further left than the bottom staves' → the camera now *fits*: it backs off from
  `dist` until the playhead's stretch of the framed staves and the last half second of notes are inside ±0.86; `lead`
  defaults to 0. check.mjs projects every note in its first half second and fails a shot below 25 % (warns below 55 %).
- **Held notes counted as "off screen"** → a half note's head is two beats behind the playhead by the time it ends →
  judge a note while it lights up (its first 0.5 s), not for its whole length.
- **Staves vanished in far shots; square halos around the glows** → the blank sheet under the tiles z-fought with them at
  grazing angles (polygon offset was not enough with near = 0.02) → sheet 0.012 below the tiles, near plane 0.1.
- **A new paper tile took 20–28 s on SwiftShader** → the relief pass drew every mark with `ctx.filter = blur()`, one blur
  per mark → draw all marks once into a mask, tint it three times and blur twice per tile: ~0.3 s.
- **The blank sheet rendered black** → a code comment typed on the same line as `scene.add(sheet)` swallowed it (twice the
  same slip: `L.X = X` too) → never put a `//` comment in the middle of a line of statements.
- **The blank sheet looked darker and grainier than the tiles** → its bump map repeated 200 × over 800 units — twice the
  tiles' grain — and bump strength follows texture-space derivatives → repeat it so one period = one tile.
- **Chords did not parse** → the tokenizer split `<f4 a4 d5>:1` at the spaces → a chord is rewritten to one token
  (`<f4,a4,d5>:1`) before splitting.
- **Accidentals sat on the bar line** → the first note of a bar was 1.1 staff spaces after it → 2 spaces of padding.
- **Two voices on one staff collided at the bar start** (the tenor's rest on the bass's half note) → rests of a voice that
  shares a staff move 3 spaces up (stem up) or 2.5 down.
- **Raised title showed banding** → 18 stacked alpha-tested layers with mipmapped edges → 64 layers, a 360 px glyph canvas,
  no mipmaps on it, the same colour on every side layer.
- **Close shots were all flare** → flares sized in world units grew huge near the camera → flare size follows the
  distance (screen-constant) with a cap.
- **Two-staff pieces came out as macro shots** → fit backs off only as far as the framed staves need, and a grand staff
  is small → give keyboard pieces larger `dist` (3.4–7) than an orchestra (2.4–5).
- **Speed (SwiftShader, no GPU)**: ~0.23 s a frame at 960 × 540 with bloom, 4 workers; 1080p ≈ 0.6 s. Paper tiles are
  drawn on first sight, so the first frame of a shot that flies far is slower.
