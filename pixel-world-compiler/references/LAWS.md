# LAWS — the derivation layer

The method comes from Frostwind (github.com/trinity-works/frostwind, MIT): an LLM answers each visual question
plausibly and in isolation, so the person is 32 px in one file and 48 in another, the palette claims sixteen colours
and holds two hundred, and shadows fall three ways. The fix is a layer between intent and pixels. Physics settles
what has a physical answer, the medium settles what it constrains, and anything left over is declared taste and
applied once. The checks hold all three true.

## Five kinds of rule (name one for every row)

| kind | what it is | how to write it | example |
|---|---|---|---|
| **measured law** | a value with a source | `src: '…'`, mark informal ranges | snow albedo .86/.90/.94 (Warren 1982, informal) |
| **derived consequence** | computed from measured ones | leave it to the compiler, or say from what | shadow length = height × cot(sun altitude) |
| **authored taste** | no law decides it | `TASTE:` once, applied everywhere | the wind blows toward 235° |
| **medium constraint** | the pixel grid decides | `FW.floor(...)` or `MEDIUM:` with measured → used | a head needs 6 rows (derived 3.4) |
| **fictional law** | an invented physics, at most one per world | its boundary: what changes, what stays ordinary | a lamp-snail that glows; everything else lit by the sun |

When reality and the medium conflict, the medium wins, and the deviation is recorded. Tuning by eye and calling it a
medium law fails this.

## The authorities (one per dimension)

| dimension | authority | in code |
|---|---|---|
| size | 26 px = 1.70 m; every size in metres | `FW.SCALE`, `FW.px`, `FW.pxEven` |
| projection | cabinet, k = ½: `row = (Ymax − Y)·P/2 − z·P`; a box is front w×h + top w×d/2 (+ a return d/2 wide at 45° for buildings); depths even | `FW.forms.H.box`, `FW.pxEven` |
| locomotion plane | actors move on screen-ground px; travel north advances rows 1:1 with columns (Frostwind's feel choice); relief lifts root and feet at draw | `FW.body.actor`, `actor.lift` |
| the sun | latitude, declination, hour → altitude, azimuth; Rayleigh τ = (.060 .098 .220) splits beam and sky; Kasten–Young air mass | `FW.sun` |
| colour | ramp ends = albedo × (sky·shade + bounce) and albedo × full light; equal Oklab-L rungs; hue from cool shade to warm beam; Naka–Rushton response with exposure set so white (0.9) reads L 0.95; adaptation from `cover` | `FW.buildPalette` |
| water | Pope & Fry absorption + optional cdom per band, path length at the 30° view, Fresnel at that angle, the sky it mirrors | `kind: 'water'` |
| emission | blackbody temperature through analytic CIE CMFs (Wyman 2013) | `kind: 'emit', kelvin` |
| the lock | ≤ 64 colours; every pixel a LUT entry | `pal.lut`, check `palette` |
| pixel light | `Y = sky·ao + bounce·ao + sun·(N·L)·lit` → L → rung; two-level posterise with a 50% checker band; checker anchored to world (ground) or sprite (bodies) | `FW.makeResolver` |
| terrain | analytic fields queried per sample, never painted | `FW.makeFields` |
| placement | jittered grid gated by a condition on the fields; places sited by a score over candidates, rejected if wet or not flat | `FW.compile` |
| shadows | every opaque pixel throws along one vector onto the ground; static ones baked, bodies and clouds per frame | `castInto` |
| bodies | Drillis & Contini ratios; head floor 6 rows; far limb one rung darker | `FW.body.human` |
| gait | Froude: v = √(Fr·g·leg), stride = leg·2.3·Fr^0.3 (Alexander); Hildebrand: duty factor + lag place every symmetrical gait | `FW.body.gait` |
| feet | land on a ground point, stay until lift; start / stop from the stand; turns are rounds of steps | `walkFeet`, `actor` |

## How to research a row (do it in the brief, cite it in the row)

- **A place's light:** latitude of the real place (or the real place an invented one borrows its sky from), the
  season's declination (−23.4° Dec … 0° equinox … +23.4° Jun), the hour from solar noon. Check prints the result.
  Below 3° altitude the compiler refuses, because night is not modelled.
- **A surface:** look for spectral reflectance (remote-sensing tables, field ranges). Give R G B band means. Dark
  stays dark (wet soil .1, conifer .05), bright stays bright (snow .9, limewash .6). Don't lift albedo to brighten a
  scene: the exposure adapts to the `cover` you declare.
- **A plant:** mature height and crown width for that site (tree-line birch is 3–6 m, not 15). Name the condition it
  answers (moisture, shore distance, slope, altitude) as its `where`.
- **A built form:** real dimensions (eave height, depth, pitch, floor height on stilts, pole count). Vernacular reasons
  go in the brief (steep thatch sheds monsoon rain; a lavvu's smoke flap faces downwind).
- **A body:** shoulder height, body length, mass for the species and sex. Pick the walk's Froude number for the mood
  (a grazing plod 0.07–0.12, a purposeful walk 0.18–0.25), and for quadrupeds the Hildebrand lag (0.25 =
  lateral-sequence walk) and duty factor (0.65–0.75 for a walk).

## A check names an authority and says what moved

`check.mjs` doesn't prove beauty. It proves the frame obeys the model: the palette, scale, sun, feet, joints and
determinism. If it fails, fix the owner of the dimension (the path, the size, the reflectance), never the limit. If a
picture looks wrong while the checks pass, find the law it broke, add it to the brief, and, if it recurs, add it to
`check.mjs` and `LESSONS.md`.
