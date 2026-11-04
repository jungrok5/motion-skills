# LESSONS — what broke while building this skill, and the fix

Problem → cause → fix, one or two lines each.

## Picture
- **Ink mountains read as grey cones, all alike.** → Height-only shading and one peak per mesh. → Ink follows ridges
  and steep slopes and fades on lit flanks (`ridge + slope`, `1.35 − lit`), stroke noise is stretched along the slope,
  each mesh gets 1–4 sub-peaks, and `round` blends a pointy karst profile with a rounded one (Korean hills ~0.6–0.8,
  Guilin karst ~0).
- **Mountains vanished into the fog at night / looked flat at dawn.** → The preset's `fogFar` (300) is tuned for
  gardens. → Ink and night sets pass `{ fogNear: 40–60, fogFar: 650–1100 }`; distance must still read as layers.
- **The moon was cut in half by a peak, its halo showed a hard rim.** → Moon placed among the mountains; halo texture
  with a linear falloff. → Put the moon far behind everything (z ≈ −1000, r ≈ 40) and raise it through the ridge line;
  `dot()` now falls off as (1 − u)^2.2.
- **Pines looked like green mushroom caps.** → Two big flattened spheres per branch tip, a green that read as foliage
  colour. → 4 small, flat, scattered lobes per tip, flat-shaded near-black green by default (`#22261f`): ink pines.
- **The islet was a black pancake.** → Flat disc, dark material. → Rounded mound with fbm height and a moss texture.
- **Smoke read as a bent grey strip.** → Uniform alpha across the ribbon. → Gaussian core across the width, two noise
  octaves scrolling up, fade at the base and top, opacity 0.45.
- **The jar showed vertical streaks.** → The crackle texture is stretched by the lathe's UVs. → Moon jars use
  `crackle: 0` and a few specks; crackle is for bowls.
- **Lantern ribs read as black bands.** → Rib radius in metres regardless of lantern size. → Rib tube = 0.8 % of the
  lantern radius, warm brown.
- **Paper went off-white after tone mapping.** → ACES lifts and shifts light colours. → Khronos Neutral: colours under
  ~0.76 linear pass through unchanged, so the paper preset prints as paper.
- **Light through the paper doors.** → Paper planes casting shadows blocked the sun. → Paper is `noCast`; the lattice
  bars cast, so the low sun draws the door pattern across the maru floor — a set's `shadowR` must be small (6 m) for
  2.5 cm bars to resolve on a 2048 shadow map.

## Chrome and text
- **Hangul / Han fell back to a sans system font (or tofu) in headless Chromium.** → No serif CJK fonts on the render
  box. → `scripts/fonts.mjs` fetches subset WOFF2s (only the film's characters, ~150–300 KB) once; `F.start()` waits
  for them; check.mjs fails if a character is missing from `fonts/chars.txt`.
- **The card's brush stroke ran through the title — and never faded.** → Both on screen together, and `brush()` set
  its own `globalAlpha` per bristle, overriding the card's fade. → `brush(…, alpha)` multiplies every bristle; stroke
  0.3–1.8 s, fades 2.0–2.9 s; title from 2.7 s, seal 3.2 s, line 3.6 s, footer 4.2 s. Look at a full-size still of
  the card's last second, not only the sheet.
- **Callout on a moving orbit pointed at air.** → A fixed anchor on a round object while the camera circles. → `at` can
  be a function of `lt`: put the anchor on the surface facing the camera (example: the moon jar's seam).

## Sound
- **The score drifted from the chapters after a line changed.** → Section times typed by hand. → `score.js` exports
  `score(F)`; sections read `F.chapters` / `F.cards`, and `score.mjs film.html` reads the spec from the page itself.

## Render
- **Crossfades cost two full renders.** → Both shots are drawn every frame of the overlap. → Keep `xfade` ≤ 2 s; draw
  the more visible shot last so callouts project with its camera.
- **4 render workers were slower than 1.** → Without a GPU, SwiftShader already uses every core inside one browser;
  4 browsers on 4 cores fought (2.4 s a frame overall, ~10 s per worker). → Default `--workers 2`; one browser alone
  is ~1–1.8 s a 1080p frame. `check` runs at `scale .35, msaa=0`; sheets at `.5`.
