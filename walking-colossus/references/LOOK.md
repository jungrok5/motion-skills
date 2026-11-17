# LOOK — the picture

Photoreal, gritty, cinematic: a huge ordinary thing seen through real air. Every surface is procedural (no image
textures, no models); the camera is a physical lens; the air is thick.

## The frame (engine/post.js, owned by the engine)

scene (HDR, MSAA, depth) → **ambient obscurance** (SAO, `ao`, `aoRadius` 1.8 m) → **height fog + sky** (homogeneous
extinction `fogDensity` + a ground-mist band `mistDensity` / `mistHeight` with wisps, volumetric warm halos at
`ANCHORS.glows`) → **depth of field** (per shot `dof: {focus, aperture, maxBlur}`) → **bloom** (`bloom`,
`bloomThreshold`) → **ACES** → grade (`exposure`, `saturation`, `contrast`, `lift`, `vignette`, `chroma`) →
**film grain** (`grain`). Motion blur = several sub-frames averaged inside a 0.3-frame shutter (`render.mjs --mb 5`),
with sub-pixel jitter = free supersampling.

## LOOK keys (colossus.js overrides; engine default = the source film's blue dusk)

| key | dusk default | what it does |
|---|---|---|
| `zenith`, `horizon` | `[0.040,0.092,0.218]`, `[0.066,0.132,0.262]` | sky gradient (linear) |
| `skyGlowDir`, `skyGlow` | `[-0.6,0.12,-0.8]`, 0.35 | the brighter side of the sky (sunset / dawn) |
| `fogColor`, `mistColor` | blue, paler grey-blue | the air and the ground mist |
| `fogDensity`, `mistDensity`, `mistHeight`, `mistNoise` | 0.0027, 0.022, 2.8 m, 1.15 | how much air |
| `hemiSky`, `hemiGround`, `hemiIntensity` | neutral-cool, dark, 2.2 | the soft fill (surfaces keep their own colour; only the air is tinted) |
| `keyColor`, `keyIntensity`, `keyDir` | cool white, 1.25, high | the one shadow-casting light |
| `envIntensity` | 0.6 | wet reflections of the sky |
| `ao`, `exposure`, `bloom`, `bloomThreshold`, `saturation`, `contrast`, `lift`, `vignette`, `grain`, `chroma` | | the grade |

Look-dev without editing: `/?shot=hero&look=bloom:0.4,fogDensity:0.002` (numbers only).

## Colour targets (measure in sRGB, as rendered)

From the source film (measured against its references):

| surface | target |
|---|---|
| lit concrete | ≈ 94,97,104 neutral warm grey (not blue) |
| leg paint | 90–150 grimy grey-beige, dark brown rust (≈ 90,55,35) on edges, rivets, drip streaks — never orange, no hazard stripes |
| window cores | ≈ 242,193,130 amber — never lemon, never salmon, never white |
| grass | ≈ 43,52,28 dark olive with dry khaki tips |
| belly underside | ≈ 31,32,29 with a few large warm lamps |

A new topic writes its own table in BRIEF.md (the mudflat in 「Low Tide」: mud ≈ 70,64,58, water mirrors the sky,
hull black-brown over red oxide, containers faded). Keep three things whatever the hour: **the air carries the
colour, surfaces keep their own**; **warm lights are amber**; **rust is dark brown**.

## Hours that work

| hour | sky | fog | key |
|---|---|---|---|
| blue dusk (default) | deep blue, glow behind | blue, dense mist band | cool, high, soft |
| overcast dawn (「Low Tide」) | grey-rose, bright low ahead | pale grey-pink, `0.0026` | warm grey, low, ahead |
| white winter noon | pale grey, no glow | white, thick far | neutral, high |
| smoggy industrial night | sodium-orange glow low | brown-grey, heavy | almost none: lamps and windows carry it |

## Things that read as fake (fix before the film)

- Clean surfaces: everything needs grime, streaks below edges, wet patches; give clones a different `w.offset`.
- Uniform repetition: vary every repeated part (colour ±10 %, a missing one, a crooked one).
- No contact: where a foot plants there must be a print, mud rim, splash and debris (ground + fx do this).
- Bright clean sky behind a far object: the fog must eat distance — far parts lose contrast and take the fog colour.
- A single NaN pixel: a white blob with a black hole in the middle (see LESSONS.md).
