# 경주 첨성대 / CHEOMSEONGDAE, GYEONGJU

The proof example: a topic the original project never touched (it modelled Hangzhou landmarks),
carried through brief → evidence → new geometry → checks → still review.

## 1. Object and scope
- Cheomseongdae (National Treasure), Inwang-dong, Gyeongju. The present stone structure only;
  not a reconstruction of its 7th-century state, no site, no tilt.
- Single structure. Left out: lawn, fence, foundation below ground (unknown).
- Language pack: ko · units: metres.

## 2. Sources found (ids match evidence.json)
- `icomos-iau`: ICOMOS–IAU thematic study case 5.4 — text facts, a north-east photo, a south
  elevation and a top plan by the National Research Institute of Cultural Heritage, with a 3 m
  scale bar. The best form source.
- `khan-2022`: a column quoting the 2009 survey report (height 8,770 mm), the fill height, the 5:3
  ratio of body base to frame side.
- `kowiki`: platform side 5.35 m, 362 stones, Hong Sa-jun's 1963 stone counts, fill to course 12.
- `report-diameters`: the widely copied guide text (9.17 m, Ø 4.93 / 2.85 m, ~1 m window).
- Conflicts: height 8.77 / 9.17 / 9.4 m; stones 362 / 365; body base 4.93 / 5.17 m. Shown as
  "약 8.8 m (보도)"; all values kept in the ledger.

## 3. Form table
| feature | what is seen | source | status |
|---|---|---|---|
| overall outline | a bottle: nearly straight low courses, faster narrowing in the middle, a cylinder for the top ~5 courses | elevation, NE photo | photo-estimate |
| courses | 27 courses of cut granite, ~0.285 m each | ICOMOS, wiki | reported |
| opening | one square through-opening facing south (slightly east), courses 13–15, ~0.95–1 m wide, stone jambs | ICOMOS, guide text, elevation | reported |
| inside | earth / rubble fill up to the window sill; hollow above | ICOMOS, wiki, Khan | reported |
| cross stones | long stones at courses 19–20 and 25–26, ends projecting a little | ICOMOS, wiki | reported (size, direction unknown) |
| top | two tiers of long stones in a 井 frame, ends crossing at the corners, slightly rotated to the body axes in plan | elevation, plan, NE photo | photo-estimate |
| base | two square tiers, lower side 5.35 m | wiki, elevation | reported / photo-estimate |
| not visible | wall thickness, stone backs, foundation | — | unknown |

## 4. Parts and the separation story
- From the top: frame → courses 23–27 (cross stones 25–26) → courses 16–22 (cross stones 19–20)
  → window band 13–15 → earth-filled courses 1–12 → fixed platform.
- What it teaches: the tower is a filled base with a hollow upper shaft; you enter at the window
  and climb on the cross stones to the frame.
- Callouts (6): frame corner, a cross-stone end at 25–26, at 19–20, the window head, the fill
  band's right silhouette, the platform's upper step.

## 5. Shared parameters
`geometry.js` @params: platform sides / heights, body height, 27 courses, wall (unknown, 0.30),
the traced profile (9 points), fill top course, window courses and width, cross-stone levels and
size, frame span / beam / tiers / 4.5° rotation. `make-inset.mjs` draws the corner elevation from
the same block.

## 6. Corner diagram
A schematic south elevation: profile, courses, window band (13–15), frame, height (reported) and
base diameter (estimated).

## 7. Acceptance
- `--angles ne:45:3,s:-90:0`: NE matches the ICOMOS photo direction, S matches the elevation.
- The window must be see-through from the south with wall thickness; the fill disc shows when the
  window band lifts; cross-stone ends sit on the outer wall.

## Still review (last run)
| # | score | note |
|---|---|---|
| 1 | 2 | S view matches the elevation outline; NE view matches the photo's frame overhang and taper |
| 2 | 2 | height labelled 보도, base Ø 추정; no other numbers on the page |
| 3 | 2 | the fill, hollow shaft, cross stones and frame read in order |
| 4 | 2 | dots on the frame corner, stone ends, window head, wall, platform step |
| 5 | 2 | `check.mjs` clean at 1920×1080, 390×844, 320×740 including an orbit |
| 6 | 2 | window open with jambs and wall thickness |
| 7 | 2 | template paper, palette, type unchanged |
| 8 | 2 | wall thickness, cross-stone size / direction, window rotation listed as unknown |
