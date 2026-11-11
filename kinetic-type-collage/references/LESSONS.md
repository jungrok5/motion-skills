# LESSONS — problems met while building this skill, and what fixed them

Problem → cause → fix. Each of these happened on the engine or on `examples/ramyeon`.

## Type
- **Letters went soft when one glyph filled the frame** → a word drawn to a canvas and shown as a texture is only as
  sharp as its pixels → every string becomes a signed distance field and the shader cuts the edge from it; tried with
  a glyph three frames tall from the default 192 px raster: edges stay sharp, corners round a little — raise `px` to
  320 for those shots.
- **A word behind a prop was unreadable** (물 behind the pot showed only its top stroke) → the prop covered the
  glyph's middle → put scenery words beside or above the thing they share a shot with; overlap an edge, not the centre.
- **White type across a busy object failed** (국물까지 in paper white over noodles and broth) → no ground to read
  against → ink reads on almost anything coloured; paper type needs a flat dark ground.
- **Bitmap type at full bleed was just blocks** → at 13 rows per em a cropped Hangul syllable loses its shape → fit
  bitmap words inside the frame (`w:` a little under the visible width).
- **Fonts used only inside a painted prop face were missing on the first paint** → the face was drawn before the font
  loaded → `F.start()` makes a dry pass that collects every font (shots, props, painters), loads them, then builds.

## Props and light
- **Every top surface was blown out and colours looked pastel** (broth read salmon, noodles pale) → the studio
  reflection map's top light added three times the surface colour to anything facing up → measured with a grey card
  (`#808080`, top-down and face-on, key / fill / env one at a time) and set the defaults so a top face returns about
  1.15 × its colour and a camera-facing one 0.8 ×. If a prop looks washed, check `light.env` before changing its colour.
- **A liquid seen straight down turned pale** → a glossy horizontal surface mirrors the top light into the lens →
  `rough ≥ 0.35` for liquids in a top-down shot.
- **Squashed spheres came out round** → `K.at` reset the scale that `K.sphere(…, { s })` had set → `K.at` now leaves
  scale alone unless one is passed.
- **A bright ring between an egg and its shadow** → shadow bias pushed the shadow off the contact point → smaller
  `normalBias`; check where a round prop meets the floor on the prop sheet.
- **A prop vanished without an error** → `rot: [0, 0, tw(0, 8)]`, an array holding a function, became NaN → a value
  is a constant **or** one function returning the whole array: `rot: tw([0, 0, 0], [0, 0, 8])`. `check.mjs` reports
  the empty shot.
- **A flat prop was edge-on at the moment of reading** (the soup packet under `spin`) → free spin ignores where the
  shot is looked at → key the turn (`rot: tw([0, -70, 0], [0, 30, 0], 'lin')`) so the face passes the camera mid-shot.
- **A white object on paper disappeared in close-up** → no contrast → the "too close" shot of a pale object goes on
  an ink or accent ground.
- **A dial's hub covered its number** → the number was centred where the hand pivots → lay out a printed face around
  the hardware that sits on it.

## Motion and cutting
- **Shots froze after their first third** → an ease that arrives and stops leaves 10 frames of nothing → the default
  `slam` arrives in the first third and keeps creeping (22 % of the move) to the cut.
- **A turning egg did not move** → rotation about an axis of symmetry is invisible → move the camera, or tilt the prop first.
- **The motion check failed a correct shot** (a tiny object pushed in from far away) → mean pixel difference is
  small when the subject is small → the check also counts the share of pixels that changed.

## Process
- Look at the shot sheet after every pass: most of the fixes above were visible there and nowhere else.
- Half-beat shots (7 frames at 128 bpm) can carry one object or one word, never both.
- The example uses three accent or ink grounds in 14 s (blue, yellow, ink twice); the colour share the check prints
  (17 %) is already most of the way to its 30 % warning — plan accent grounds in the brief, not while writing shots.
