# AUDIT — 「바람의 들판」

The loop: render → five random moments at 100% → mark each against the five criteria → fix → render again, until one
round passes all 25 cells. Each round is appended by `audit.mjs`; the cells, findings and fixes are written by hand.
No people here: "proportion" is judged as scale (heads shrinking with distance along the rows, the path, the house).

## Round 1 · seed 635298 · scene 49756293623e · 2026-11-18 23:54
Moments (s): 1.03 · 3.33 · 5.47 · 6.90 · 9.70 — frames and 100% crops in `audit/round-01/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 1.03 | ✗ petals fray into straw (dry-brush breakup on every petal); discs are lumpy brown blobs with a green ring showing | ✗ evenly lit — the low sun behind the left cloud lights nothing on the flowers or leaves (lit place 1.6×) | ✓ heads shrink along the rows, path narrows, house at distance | ✗ near heads slide ~150 px sideways in the gust instead of bowing | ✓ warm yellows vs blue-violet sky and cloud shade, greens vary |
| 3.33 | ✗ petals fray into straw (dry-brush breakup on every petal); discs are lumpy brown blobs with a green ring showing | ✗ evenly lit — the low sun behind the left cloud lights nothing on the flowers or leaves (lit place 1.6×) | ✓ heads shrink along the rows, path narrows, house at distance | ✗ near heads slide ~150 px sideways in the gust instead of bowing | ✓ warm yellows vs blue-violet sky and cloud shade, greens vary |
| 5.47 | ✗ petals fray into straw (dry-brush breakup on every petal); discs are lumpy brown blobs with a green ring showing | ✗ evenly lit — the low sun behind the left cloud lights nothing on the flowers or leaves (lit place 1.6×) | ✓ heads shrink along the rows, path narrows, house at distance | ✗ near heads slide ~150 px sideways in the gust instead of bowing | ✓ warm yellows vs blue-violet sky and cloud shade, greens vary |
| 6.90 | ✗ petals fray into straw (dry-brush breakup on every petal); discs are lumpy brown blobs with a green ring showing | ✗ evenly lit — the low sun behind the left cloud lights nothing on the flowers or leaves (lit place 1.6×) | ✓ heads shrink along the rows, path narrows, house at distance | ✗ near heads slide ~150 px sideways in the gust instead of bowing | ✓ warm yellows vs blue-violet sky and cloud shade, greens vary |
| 9.70 | ✗ petals fray into straw (dry-brush breakup on every petal); discs are lumpy brown blobs with a green ring showing | ✗ evenly lit — the low sun behind the left cloud lights nothing on the flowers or leaves (lit place 1.6×) | ✓ heads shrink along the rows, path narrows, house at distance | ✗ near heads slide ~150 px sideways in the gust instead of bowing | ✓ warm yellows vs blue-violet sky and cloud shade, greens vary |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.03 | 0.1% | 0.17–0.84 | 1.7× | 0.62 | 0.70 | 0.0% | – | – | – | – |
| 3.33 | 0.1% | 0.16–0.85 | 1.8× | 0.62 | 0.69 | 0.0% | – | – | – | – |
| 5.47 | 0.1% | 0.16–0.85 | 1.6× | 0.62 | 0.66 | 0.0% | – | – | – | – |
| 6.90 | 0.2% | 0.16–0.85 | 1.7× | 0.62 | 0.65 | 0.0% | – | – | – | – |
| 9.70 | 0.2% | 0.16–0.85 | 1.7× | 0.61 | 0.64 | 0.0% | – | – | – | – |

Findings:
- At 100 % the strokes hold up (bristles, impasto ridges, contour strokes in the cloud). The flowers are the weak point: petals look shredded and the discs have no form.
- No light on the field: the brief's backlight (petal glow on the sun side, rim-lit leaves) is missing, so the field is one even yellow-green.
- Motion strip (one near flower, 2.5–7.5 s): heads lag the leaves and come back, but the swing is mostly translation — a 1.7 m stem bows its head (rotation + dip), it does not carry it sideways.

Fixes:
- Strokes: dry-brush breakup 0.35 → 0.15; petals pointed (taper .5).
- Discs: dome-shaded dabs (dark centre, warm floret ring), larger seeds in the spiral, sepals pushed out behind the petals.
- Light: petals on each head's sun side brighter and paler, the far side ochre; leaves lit/shade contrast up with a yellow rim towards the sun; a warm glow pass from the sun over the left field and a cool falloff to the lower right.
- Heads: sway amplitude 0.26 → 0.15 m; bow (rotation) ×1.5 and dip ×2 — the head turns down into the wind more than it travels.

## Round 2 · seed 831530 · scene 7d40d16e6eac · 2026-11-18 23:57
Moments (s): 1.33 · 3.43 · 5.07 · 6.13 · 9.37 — frames and 100% crops in `audit/round-02/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 1.33 | ✗ upper sky is one size and one direction of stroke repeated — reads as fish scales; the big near leaves at the bottom are flat pale slabs | ✓ petals glow on the sun side, warm haze at left, lower right cooler | ✓ | ✓ heads now bow (turn + dip) after the leaves and swing back past upright (strip 3.5–8 s) | ✓ |
| 3.43 | ✗ upper sky is one size and one direction of stroke repeated — reads as fish scales; the big near leaves at the bottom are flat pale slabs | ✓ petals glow on the sun side, warm haze at left, lower right cooler | ✓ | ✓ heads now bow (turn + dip) after the leaves and swing back past upright (strip 3.5–8 s) | ✓ |
| 5.07 | ✗ upper sky is one size and one direction of stroke repeated — reads as fish scales; the big near leaves at the bottom are flat pale slabs | ✓ petals glow on the sun side, warm haze at left, lower right cooler | ✓ | ✓ heads now bow (turn + dip) after the leaves and swing back past upright (strip 3.5–8 s) | ✓ |
| 6.13 | ✗ upper sky is one size and one direction of stroke repeated — reads as fish scales; the big near leaves at the bottom are flat pale slabs | ✓ petals glow on the sun side, warm haze at left, lower right cooler | ✓ | ✓ heads now bow (turn + dip) after the leaves and swing back past upright (strip 3.5–8 s) | ✓ |
| 9.37 | ✗ upper sky is one size and one direction of stroke repeated — reads as fish scales; the big near leaves at the bottom are flat pale slabs | ✓ petals glow on the sun side, warm haze at left, lower right cooler | ✓ | ✓ heads now bow (turn + dip) after the leaves and swing back past upright (strip 3.5–8 s) | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.33 | 0.1% | 0.18–0.89 | 1.7× | 0.64 | 0.47 | 0.0% | – | – | – | – |
| 3.43 | 0.1% | 0.18–0.89 | 1.7× | 0.64 | 0.46 | 0.0% | – | – | – | – |
| 5.07 | 0.0% | 0.22–0.89 | 1.7× | 0.57 | 0.43 | 0.0% | – | – | – | – |
| 6.13 | 0.1% | 0.19–0.89 | 1.7× | 0.62 | 0.44 | 0.0% | – | – | – | – |
| 9.37 | 0.2% | 0.18–0.89 | 1.7× | 0.63 | 0.42 | 0.0% | – | – | – | – |

Findings:
- Flowers, light and motion pass. Density fails in the two biggest areas: the sky above the cloud (a uniform pattern) and the bottom-left leaves (no structure).

Fixes:
- Sky: stroke size grows with height and varies (power distribution 10–52 px), direction follows a slow flow field rising to the right, colour drifts (violet / green-blue strokes), long thin cirrus strokes high on the right.
- Near leaves: a lighter midrib stroke along each big leaf, darker base colours, pale only where lit.

## Round 3 · seed 988590 · scene 65feff0040f0 · 2026-11-19 00:00
Moments (s): 3.63 · 6.33 · 7.33 · 8.60 · 9.40 — frames and 100% crops in `audit/round-03/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 3.63 | ✗ between the rows right of the path the bare brown ground shows as flat areas (no soil, no clods) | ✓ | ✓ | ✓ | ✗ the big bottom-left leaves go milky mint (underside tint + sun glow stacked) |
| 6.33 | ✗ between the rows right of the path the bare brown ground shows as flat areas (no soil, no clods) | ✓ | ✓ | ✓ | ✗ the big bottom-left leaves go milky mint (underside tint + sun glow stacked) |
| 7.33 | ✗ between the rows right of the path the bare brown ground shows as flat areas (no soil, no clods) | ✓ | ✓ | ✓ | ✗ the big bottom-left leaves go milky mint (underside tint + sun glow stacked) |
| 8.60 | ✗ between the rows right of the path the bare brown ground shows as flat areas (no soil, no clods) | ✓ | ✓ | ✓ | ✗ the big bottom-left leaves go milky mint (underside tint + sun glow stacked) |
| 9.40 | ✗ between the rows right of the path the bare brown ground shows as flat areas (no soil, no clods) | ✓ | ✓ | ✓ | ✗ the big bottom-left leaves go milky mint (underside tint + sun glow stacked) |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 3.63 | 0.1% | 0.16–0.89 | 1.7× | 0.64 | 0.40 | 0.0% | – | – | – | – |
| 6.33 | 0.1% | 0.17–0.89 | 1.7× | 0.63 | 0.39 | 0.0% | – | – | – | – |
| 7.33 | 0.1% | 0.16–0.89 | 1.7× | 0.64 | 0.39 | 0.0% | – | – | – | – |
| 8.60 | 0.1% | 0.16–0.89 | 1.7× | 0.64 | 0.38 | 0.0% | – | – | – | – |
| 9.40 | 0.1% | 0.16–0.89 | 1.7× | 0.64 | 0.38 | 0.0% | – | – | – | – |

Findings:
- The sky passes now (sizes, flow, cirrus). Two remaining faults at the field's floor: the imprimatura is showing as flat brown fields where there should be soil, and the near-left leaves wash out.

Fixes:
- A soil layer under the plants: short dark-brown strokes with lighter clods and shadowed furrows along the rows, d 3–40 m.
- Floor leaves (the mass between plants) darker and without the underside flip — the flip stays on the leaves on the stems, where it reads as the gust.

## Round 4 · seed 55518 · scene a0c451ade26b · 2026-11-19 00:01
Moments (s): 1.70 · 3.37 · 4.33 · 7.13 · 8.20 — frames and 100% crops in `audit/round-04/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 1.70 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3.37 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4.33 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7.13 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 8.20 | ✓ | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.70 | 0.0% | 0.15–0.89 | 1.7× | 0.64 | 0.39 | 0.0% | – | – | – | – |
| 3.37 | 0.0% | 0.15–0.89 | 1.7× | 0.64 | 0.39 | 0.0% | – | – | – | – |
| 4.33 | 0.0% | 0.15–0.89 | 1.7× | 0.63 | 0.38 | 0.0% | – | – | – | – |
| 7.13 | 0.0% | 0.15–0.89 | 1.7× | 0.63 | 0.37 | 0.0% | – | – | – | – |
| 8.20 | 0.0% | 0.15–0.89 | 1.7× | 0.63 | 0.37 | 0.0% | – | – | – | – |

Findings:
- All 25 pass: soil reads as soil, the flattest 100 % crop is now open sky (painted), the near leaves keep their greens except where the gust flips them.

Fixes:
- none — passed. (Round 5 re-samples five new moments of the same file.)

## Round 5 · seed 234275 · scene a0c451ade26b · 2026-11-19 00:04
Moments (s): 0.17 · 2.60 · 4.37 · 6.60 · 8.30 — frames and 100% crops in `audit/round-05/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 0.17 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2.60 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4.37 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6.60 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 8.30 | ✓ | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.17 | 0.0% | 0.15–0.89 | 1.7× | 0.64 | 0.39 | 0.0% | – | – | – | – |
| 2.60 | 0.0% | 0.15–0.89 | 1.7× | 0.64 | 0.39 | 0.0% | – | – | – | – |
| 4.37 | 0.0% | 0.15–0.89 | 1.7× | 0.63 | 0.38 | 0.0% | – | – | – | – |
| 6.60 | 0.0% | 0.15–0.89 | 1.7× | 0.64 | 0.37 | 0.0% | – | – | – | – |
| 8.30 | 0.0% | 0.15–0.89 | 1.7× | 0.63 | 0.37 | 0.0% | – | – | – | – |

Findings:
- Five new moments of the same file, all 25 pass.

Fixes:
- none — passed.
