# 별빛 사막 (night desert under the stars)

Kit: `kit.js` → vendored as `scenes/kit-nightdunes.js`, global `window.DUNES`. Source: one-scroll-bible
`motion/films/messiah/magi-desert.js` (「메시아 예언과 성탄」, 2026-11-07, about 2:10–2:16): the magi's caravan crosses a dune
crest under the star, then the camera pulls back with a dolly-zoom and Jerusalem rises above the sand, its gate lit by two
fires. That shot now keeps only its subject (the city, its hill and the stony plain, the caravan, the camera's path and the
timing) and draws everything else with the kit. The film vendors this exact file. Before and after stills were identical
(max difference 0, 5 stills × portrait and landscape). Template: `template.html` is a different subject, a lone traveller who
walks along a crest to his tent, goes in, and a lamp is lit inside.

## What it looks like
A photographic, cinematic night, not an illustration. Real geometry, one cold light, small figures.
- **The land:** a heightfield of transverse dunes. Each dune has a long windward slope facing the camera, a sharp crest and a steep slip face behind. The crest line wobbles, the height and a long swell vary across the field, and anything else (a ridge, a hill, a plain, rock) is added by the shot.
- **Raycast per column:** every screen column marches a ray over the heightfield, near to far, and paints the land it meets. When a crest falls between two samples it searches for the true top, so ridgelines stay sharp with no stair steps.
- **Depth bins:** each painted pixel goes into a bin chosen by the shot (`bin(x, z)`). Your objects go between the bins, so a caravan walks on a crest with the near slope in front of its feet, and a city stands behind the far sand but in front of the plain beyond it.
- **Light:** a cool key from the left and beyond (moonless starlight, blue), a little sky ambient, wrap lighting. Every crest that turns away from the eye catches a pale blue-white **sheen** (the starlit rim). Wind ripples show near the camera only, in the normals. The sand nearest the camera lies in shadow, and the shadowed band widens as the camera pulls back (`C.k`).
- **Haze:** blue haze gathers in the troughs and near the ground (a trough-weighted fog), so ridges stand out in layers that fade with distance.
- **Sky:** a deep-blue gradient, an enormous starfield (9,000 stars, three tints, some twinkling, the brightest with a soft halo), a milky way of soft glow and dense grains, an air glow over the horizon, and **one star brighter than all** with a halo and long tapered cross glints that breathe.
- **Camera:** a pinhole in metres: position, yaw, focal length in px, horizon height. Low behind the crest of the near dune, the eye about 2 m above it, so the near dune is a dark edge across the bottom of the frame and the figures' heads stand in the sky. The move is a slow truck, then a pull-back and rise while the lens closes in (`DUNES.dolly`, a dolly-zoom): the far land rises in the frame while the subject stays its size.
- **Warm accents:** fires or a lamp light the sand around them (`lights`) and glow on top in screen mode. Warm against the cold night is the look's one colour contrast.
- **Finish:** a vignette, a darker band at the bottom for the words, and 24 fps overlay grain.

## Meanings it carries
**Well:**
- Journeys by night and following a light: the magi and the star, Abraham counting the stars, a pilgrim, the wilderness wanderings.
- A light in a vast dark: one lamp in a tent, a watch fire, a city's gate. The pull-back makes it small and precious.
- Waiting and longing under the sky, the size of creation against small people.
- Unease when a warm light belongs to the wrong place (the film: Herod's gate fire against the cold night).

**Badly:**
- Daylight and colour stories. The palette is one cold blue plus one warm accent.
- Close-ups, faces and acting. Figures are silhouettes with a starlit rim, 60–150 px tall; drawing them bigger shows how simple they are.
- Green land, water, forests, towns in the foreground. The heightfield is sand (a plain and rock at most).
- Fast cuts and fast camera moves. The raycast costs about 0.5 s a frame (see Checks), and the look wants slow time.

## Palette
| role | value |
|---|---|
| sky | zenith `rgb(3,6,18)` → `rgb(7,13,36)` → `rgb(17,29,62)` → `rgb(32,46,82)` → horizon `rgb(42,57,94)`, air glow `rgba(80,104,150,.28)` |
| stars | `#f4f6ff` white, `#cfdcff` blue, `#ffe6c8` warm; milky way `#dfe6ff` grains, `rgba(150,165,215)` glow |
| the great star | core `#fffaf0`, halo `rgba(236,236,255)` → `rgba(190,205,255,0)`, glints `rgba(250,250,255)` |
| sand | albedo `[.95,.88,.76]`, key `[.42,.5,.76]` (cool), ambient `[.04,.055,.12]`, haze `[.14,.19,.32]`, sheen `≈ rgb(128,148,209) × rim` |
| figures | silhouettes `rgb(9,11,22)` (far side `rgb(22,26,44)`), rim `rgba(190,206,246,1)` toward the star |
| warm accent | `WARM [1.0,.56,.26]` on the sand; flames `rgba(255,120,40)` → `rgba(255,240,200)`; window/door glow `rgba(255,206,130)` |

## API (`const D = DUNES.world(o)`)
Build once, after `Pilot.W/H/ori` are set (the film builds in `init`; the template builds lazily in `draw`).
- `DUNES.world(o)` → `D`. Options (all optional; the defaults are the film's world):
  - `lam` 34 dune spacing (m), `crest` .55 crest position in the profile, `off` .524 phase, `skew` .45 (crests run diagonal), `wobble(x, z)` the crest line's wander (m), `amp(x, z)` dune height, `swell(x, z)` a long swell, `base` −3.
  - `plain(x, z)` → 0 … 1: the dunes flatten to a plain where it is 1 (and the ground there is a little darker).
  - `extra(h, x, z, flat, D)` → h: add your own terrain terms to `h` and return it (a ridge, a hill, rock); set `D.dim` (0 … 1) to darken the ground there.
  - `bins` (1) and `bin(x, z)` → bin index, 0 = farthest. `peaks: [{ x, z, r, h }]` hills taller than `maxH` (26 m): a ray that passes within `r` keeps marching until `h` (without it a tall hill is cut off at the top). `far` 2600 haze distance.
  - `star: [az, el]` the great star (radians; `null` = none, settable later as `D.star`). `stars: { seed, n, az0, azW, mw0, mwW, mwN }` the star field's span in azimuth: keep it around the camera's yaws.
- `D.hgt(x, z)` ground height; `D.crestZ(x, k = 1)` the z of crest k (crest 1 is the stage; `D.crestZ(x) - D.lam` the near dune).
- `D.camera({ x, y, z, yaw, F, hz, k })` → `C`. `DUNES.dolly(F0, F1, k)` the focal ramp of a dolly-zoom. `D.P(C, x, y, z)` → `[sx, sy, depth]` or null; `D.Pdir(C, az, el)` → a sky direction on screen.
- `D.sky(ctx, C, ts)` sky, stars, milky way, air glow, the great star (sets `D.starXY` for rims). `D.greatStar(ctx, x, y, ts, s)` the star alone.
- `D.land(C, { lights: [{ x, z, k }] })` raycasts the land into the bins; `D.layer(ctx, i)` draws bin i; `D.covered(ix, iy, from)` is that pixel land in bin `from` or nearer (hide a fire behind a dune).
- `D.faceCol(n, d, h, warm, albedo)` the colour of a flat face in the same night (stone, cloth); `D.rimFill(ctx, path, s, tow, base, rimPx)` a silhouette with a starlit rim toward `tow` (draw with `ctx` already at the figure, scaled by `s`).
- `D.drift(ctx, C, ts, farX, nearX)` sand blown off crest 1 and off the near dune. `D.finish(ctx, ts, { band })` vignette, words band (`null` = none), grain.

Order per frame: `C = camera(ts)` → `D.sky` → `D.land` → `D.layer(0)` → far objects → `D.layer(1)` → figures → … → `D.drift` → glows → `D.finish` → words.

## Checks (what went wrong on the way)
- **Stair-stepped ridges.** Marching samples skip over a sharp crest. The renderer brackets the crest between samples and searches its true top (7 ternary steps); keep that when changing the march step.
- **A tall hill cut off flat.** The per-column early out stops at `maxH`. A city hill (64 m) needs a `peaks` entry.
- **The city seen too early.** While the camera is low, a tall draa ridge across the middle distance (the shot's `extra`) hides what the pull-back is meant to reveal.
- **Glows drawn over the land.** Glows go on top of every bin, so a fire behind a crest would shine through the sand: the film tests `D.covered()` at its flame before drawing it.
- **Dry grass tufts on the near crest floated** below the visible edge; they were turned off. Things on the near dune need their base under the dark edge.
- **The lamp's ground light** with the film's gate strength (k ≈ 1) lit the whole near slope pink when the light was 40 m from the camera (template). Keep `k` near .15 for a lamp close to the camera.
- **The great star left the frame** in the pull-back (the yaw turns and the focal length grows). For it to stay, set its azimuth between the first and last yaw and its elevation low (portrait .24, landscape .17).
- **A tent read as a black box.** Flat dark planes need a starlit edge, a sagging ridge, seams and pole tips to read as cloth.
- **Cost.** About 0.5 s a frame in portrait and 0.8 s in landscape (Chromium, desktop CPU), most of it the raycast. Render with several workers; check with stills.
- **Rims face the great star** (`D.starXY`), not the key light, so the figures read as lit by the star.
