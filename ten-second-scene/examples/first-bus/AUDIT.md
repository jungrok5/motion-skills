# AUDIT — 「첫차」

The loop: render → five random moments at 100% → mark each against the five criteria → fix → render again, until one
round passes all 25 cells. Each round is appended by `audit.mjs`; the cells, findings and fixes are written by hand.

## Round 1 · seed 36749 · scene cc7cb23bef4a · 2026-11-18 23:27
Moments (s): 0.30 · 2.87 · 5.30 · 7.37 · 8.80 — frames and 100% crops in `audit/round-01/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 0.30 | ✗ foreground pavement is one flat lavender with blurry ellipse blobs — no snow grain, no small things | ✗ brightest crop is empty pavement: the sodium lamps light nothing on the ground | ✗ legs sticks, hands pale floating discs, heads blobs (dolls) | ✓ bus far, people idling, snow at three speeds | ✗ pavement one flat hue, no warm/cool inside it |
| 2.87 | ✗ same flat foreground (bottom 35 % of frame) | ✗ headlight reflections are hard-edged white rectangles | ✗ same doll limbs | ✓ bus approaching at speed, breath puffs | ✗ pavement flat |
| 5.30 | ✗ flat foreground | ✗ beam pool ahead of the bus has a straight cut edge; reflections rectangles | ✗ doll limbs; grandmother's face reads as a mask | ✓ braking, nose dip visible | ✓ |
| 7.37 | ✗ flat foreground; road snow between tracks = big polka dots | ✗ reflection rectangles saturate to white; the door spill is invisible | ✗ doll limbs, white shoes read as blocks | ✓ student's first step, bus settled | ✗ snow lit by headlights goes white-grey, not cool blue |
| 8.80 | ✗ flat foreground | ✗ door light does not reach the snow or the student | ✗ doll limbs | ✓ steps planted (slide 0.00 px) | ✗ flat pavement |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.30 | 0.2% | 0.05–0.75 | 2.8× | 0.33 | 0.03 | 0.0% | 4 | 7.3 | 0.00 | 0.7 |
| 2.87 | 0.6% | 0.06–0.77 | 3.0× | 0.33 | 0.03 | 0.0% | 4 | 7.3 | 0.00 | 1.2 |
| 5.30 | 0.4% | 0.05–0.85 | 3.0× | 0.35 | 0.03 | 0.0% | 4 | 7.3 | 0.00 | 1.2 |
| 7.37 | 0.3% | 0.05–0.88 | 3.1× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.4 |
| 8.80 | 0.4% | 0.05–0.90 | 3.1× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 0.8 |

Findings:
- The bottom third of every frame is the weakest part: the ground is one flat fill with blurry ellipses (audit `flat` hint 0 %, but by eye it is empty — grain alone hides it from the metric).
- Lights do not light things: the lamp pools are too faint to read, the reflections are hard rectangles, the door spill is lost.
- The people read as paper dolls at 100 %: stick legs, disc hands, no light on their edges although they stand in front of a bright panel.

Fixes:
- (done, plus two composition fixes found while fixing: the camera stood ON the kerb line, and ground polygons with a vertex behind the camera were silently skipped — poly() now clips at the near plane.)
- Ground: a perspective-mapped snow surface texture (grain, soft drifts, sparkle that glints only near lights) under everything on the ground, replacing the ellipse dabs; road snow between tracks as fine slush strokes.
- Reflections: soft broken streaks (several thin, noisy, blurred) clipped to the tracks; headlight pool with a feathered edge; brighter sodium pools on the pavement; door spill as a real warm patch on the snow and on the student.
- body.js: gloves (darker, smaller hands), thicker sleeves/legs, a rim light on torso and limbs from the backlight side (style.rimScreen), not just the head.
- Foreground things a person at this stop would see: the plough's snowbank along the kerb (a leading line to the bus), the yellow tactile paving half under snow (a leading line to the shelter), a drain grate, boot prints shaped as sole + heel.

## Round 2 · seed 387709 · scene fe0c69969515 · 2026-11-18 23:33
Moments (s): 0.33 · 3.83 · 6.50 · 7.80 · 9.80 — frames and 100% crops in `audit/round-02/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 0.33 | ✗ snowbank ends in a sharp paper-cut wedge where it meets the shelter's kerb | ✓ sodium pools, lit panel behind the people, glints near the lamps | ✗ rim light drawn as a cream outline on both sides of each leg — reads as cartoon outline | ✓ | ✓ navy / sodium / warm panel, the yellow tactile strip the one saturated accent |
| 3.83 | ✗ same wedge | ✗ headlight beams still read as two pale straight-edged triangles on the road | ✗ outlined limbs | ✗ one figure moves only 0.4 px in a second — idle too small at this distance | ✓ |
| 6.50 | ✓ ground grain, drifts, prints, tactile strip; sky strokes + snow | ✗ beam triangles | ✗ outlined limbs; student's white shoes read as two blocks | ✓ bus settled with a rock-back | ✓ |
| 7.80 | ✗ wedge | ✗ beam triangles | ✗ outlines, white shoe blocks | ✓ student stepping, planted feet 0.00 px | ✓ |
| 9.80 | ✓ | ✓ door spill on snow and on the student's front | ✗ shin + shoe read as a stick with a white block; outlines | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.33 | 0.5% | 0.05–0.77 | 2.9× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 0.7 |
| 3.83 | 0.4% | 0.06–0.78 | 3.1× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 0.4 |
| 6.50 | 0.5% | 0.05–0.89 | 3.1× | 0.38 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 1.4 |
| 7.80 | 0.4% | 0.05–0.91 | 3.0× | 0.38 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 1.5 |
| 9.80 | 0.4% | 0.05–0.91 | 3.1× | 0.38 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 0.7 |

Findings:
- The ground now holds up at 100 % (texture, prints, tactile strip, snowbank). Two drawing faults remain: the snowbank's last point makes a wedge, and the headlight 'air' triangles have hard edges.
- The rim light is too graphic: equal-width cream strokes on both edges of thin limbs make outlines, not light.
- Idle motion is under a pixel per second for the people at 17 m — they look frozen in a still sequence.

Fixes:
- Snowbank tapers to nothing over its last 1.6 m instead of closing to a point.
- Headlight air triangles removed; the beam shows only through the flakes it lights and a soft forward halo.
- Rim thinner (rimWidth .09) and weaker, only where the edge faces the light; student's shoes grey and slimmer.
- body.js idle: breath lifts the shoulders and chest more, sway a little quicker — every figure moves ≥ 1 px a second.

## Round 3 · seed 476816 · scene 367298cd2fcc · 2026-11-18 23:34
Moments (s): 3.20 · 5.27 · 6.23 · 7.30 · 9.40 — frames and 100% crops in `audit/round-03/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 3.20 | ✗ the snowbank still ends in a grey triangle beside the post — it is the road-side face poking out | ✓ beams only in the flakes now; pools and panel read | ✓ rim reads as light, people stand with weight | ✓ | ✓ |
| 5.27 | ✗ same grey triangle | ✓ | ✓ | ✓ braking, nose down | ✓ |
| 6.23 | ✗ triangle; bus front panels flat | ✗ headlight halo + pool wash the whole lower right milky — no darks left near the bus | ✓ | ✓ rock-back after the stop | ✗ washed lavender-white, values not grouped |
| 7.30 | ✗ triangle | ✗ milky wash | ✓ | ✓ student's first step from a weight shift | ✗ washed |
| 9.40 | ✗ triangle | ✗ milky wash over the door and the student | ✓ | ✓ | ✗ washed |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 3.20 | 0.5% | 0.06–0.79 | 3.2× | 0.34 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.4 |
| 5.27 | 0.4% | 0.06–0.99 | 3.1× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.9 |
| 6.23 | 0.4% | 0.06–1.00 | 3.0× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 3.4 |
| 7.30 | 0.5% | 0.06–1.00 | 3.0× | 0.36 | 0.04 | 0.0% | 4 | 7.4 | 0.00 | 1.0 |
| 9.40 | 0.5% | 0.06–1.00 | 2.9× | 0.36 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 0.2 |

Findings:
- People and weight hold up now. The light is the problem once the bus is close: the forward halo (3.2 m) and the beam pool add up with 'lighter' and flatten everything near the bus to a milky lavender — the opposite of the brief's "deep blue ambient, lights that light things".
- The grey triangle beside the post is the snowbank's road-side face, which the camera cannot see and which should never be drawn.

Fixes:
- Snowbank: the road-side face is not drawn; the lit face closes on the last ridge point.
- Headlights: halo 1.1 m and weaker, pool .05–.12, source glow 1.0 m; the near-bus road keeps its blue darks.
- Bus front: a vertical value gradient on the lower panels (darker towards the bumper).

## Round 4 · seed 568986 · scene 3fd0c9cb1380 · 2026-11-18 23:36
Moments (s): 1.60 · 3.13 · 4.50 · 7.10 · 8.47 — frames and 100% crops in `audit/round-04/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 1.60 | ✗ a dark sliver where the kerb face starts beside the post (a face the camera cannot see); boot prints read as hard round coins | ✓ | ✓ | ✓ | ✓ |
| 3.13 | ✗ a dark sliver where the kerb face starts beside the post (a face the camera cannot see); boot prints read as hard round coins | ✓ | ✓ | ✓ | ✓ |
| 4.50 | ✗ a dark sliver where the kerb face starts beside the post (a face the camera cannot see); boot prints read as hard round coins | ✓ | ✓ | ✓ | ✓ |
| 7.10 | ✗ a dark sliver where the kerb face starts beside the post (a face the camera cannot see); boot prints read as hard round coins | ✓ | ✓ | ✓ | ✓ |
| 8.47 | ✗ a dark sliver where the kerb face starts beside the post (a face the camera cannot see); boot prints read as hard round coins | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.60 | 0.4% | 0.05–0.77 | 3.0× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.5 |
| 3.13 | 0.5% | 0.06–0.77 | 2.9× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.6 |
| 4.50 | 0.5% | 0.06–0.79 | 3.2× | 0.36 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.1 |
| 7.10 | 0.4% | 0.05–0.82 | 3.3× | 0.38 | 0.05 | 0.0% | 4 | 7.4 | 0.00 | 0.9 |
| 8.47 | 0.4% | 0.05–0.84 | 3.2× | 0.39 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 3.5 |

Findings:
- The wash is gone; light, people, weight and colour pass in all five. Density fails on two small, repeated things: the kerb's road-facing side is drawn although we stand on the pavement side of it, and the boot prints are flat dark discs with hard edges (low camera = prints foreshortened to near-round, which is right — the hard uniform fill is what makes them coins).

Fixes:
- No kerb face (back-facing from the pavement); no kerb ridge where the snowbank already is.
- Boot prints: radial-gradient fill (darker at toe and heel, soft edge), lower contrast, a faint lighter lip; one in three older prints half filled by new snow.

## Round 5 · seed 631273 · scene 0278662ac7b8 · 2026-11-18 23:37
Moments (s): 0.23 · 2.53 · 4.43 · 5.70 · 9.37 — frames and 100% crops in `audit/round-05/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 0.23 | ✗ people are flat silhouettes at 100 % — no seams, quilting, scarf or straps; the bus side is one teal plane | ✓ | ✓ | ✓ | ✓ |
| 2.53 | ✗ people are flat silhouettes at 100 % — no seams, quilting, scarf or straps; the bus side is one teal plane | ✓ | ✓ | ✓ | ✓ |
| 4.43 | ✗ people are flat silhouettes at 100 % — no seams, quilting, scarf or straps; the bus side is one teal plane | ✓ | ✓ | ✓ | ✓ |
| 5.70 | ✗ people are flat silhouettes at 100 % — no seams, quilting, scarf or straps; the bus side is one teal plane | ✓ | ✓ | ✓ | ✓ |
| 9.37 | ✗ people are flat silhouettes at 100 % — no seams, quilting, scarf or straps; the bus side is one teal plane | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.23 | 0.5% | 0.05–0.77 | 2.9× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.8 |
| 2.53 | 0.6% | 0.06–0.77 | 3.0× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.6 |
| 4.43 | 0.4% | 0.06–0.79 | 3.1× | 0.36 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.3 |
| 5.70 | 0.6% | 0.05–0.82 | 3.1× | 0.37 | 0.05 | 0.0% | 4 | 7.4 | 0.00 | 1.2 |
| 9.37 | 0.5% | 0.05–0.84 | 3.2× | 0.39 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 0.3 |

Findings:
- The ground faults are fixed (no kerb sliver, soft prints). Looking harder at the people crop — the place the eye goes second — the four figures are clean flat shapes; at this size a stranger would see vector clip-art, not someone's drawing. The bus side is a plain plane.

Fixes:
- body.js: clothing details drawn on the visible side — quilted lines on padded coats (the long padded coat is the stop's uniform), a front zip / button line, pockets, a scarf with a hanging end, a bag strap across the chest.
- Cast: student and grandmother in padded coats, office worker a grey scarf, the woman a cream scarf.
- Bus side: panel seams, a framed side panel (abstract), the route number by the door, a rain gutter.

## Round 6 · seed 719754 · scene 3f473ada58a3 · 2026-11-18 23:38
Moments (s): 2.67 · 3.50 · 6.30 · 8.47 · 9.50 — frames and 100% crops in `audit/round-06/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 2.67 | ✓ quilting, scarf, strap, zip lines on the people; ground and bus hold at 100 % | ✓ | ✓ | ✓ | ✓ |
| 3.50 | ✓ quilting, scarf, strap, zip lines on the people; ground and bus hold at 100 % | ✓ | ✓ | ✓ | ✓ |
| 6.30 | ✓ quilting, scarf, strap, zip lines on the people; ground and bus hold at 100 % | ✓ | ✓ | ✓ | ✓ |
| 8.47 | ✓ quilting, scarf, strap, zip lines on the people; bus side seams | ✓ | ✓ | ✓ | ✗ the bus's side panel is the brightest, warmest thing beside the student and beats the door light |
| 9.50 | ✓ quilting, scarf, strap, zip lines on the people; bus side seams | ✓ | ✓ | ✓ | ✗ the bus's side panel is the brightest, warmest thing beside the student and beats the door light |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 2.67 | 0.4% | 0.06–0.77 | 2.9× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.9 |
| 3.50 | 0.3% | 0.06–0.78 | 2.9× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.9 |
| 6.30 | 0.6% | 0.05–0.82 | 3.3× | 0.38 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 3.4 |
| 8.47 | 0.4% | 0.05–0.84 | 3.2× | 0.38 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 3.5 |
| 9.50 | 0.6% | 0.05–0.84 | 3.2× | 0.39 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 0.2 |

Findings:
- The clothing details carry the people at 100 % now. One colour fault from the new bus panel: printed panels are not lit from inside at 5 a.m.; as drawn it out-shines the open door, which must be the warmest place in the frame (brief).

Fixes:
- Side panel unlit: darkened and cooled (it is paper under a streetlight), the sun disc greyed.

## Round 7 · seed 757745 · scene dcff316d4a06 · 2026-11-18 23:39
Moments (s): 1.00 · 2.27 · 7.07 · 8.40 · 9.27 — frames and 100% crops in `audit/round-07/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 1.00 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2.27 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7.07 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 8.40 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 9.27 | ✓ | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.00 | 0.6% | 0.05–0.77 | 3.0× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 2.9 |
| 2.27 | 0.5% | 0.05–0.77 | 3.0× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.3 |
| 7.07 | 0.4% | 0.05–0.82 | 3.3× | 0.38 | 0.05 | 0.0% | 4 | 7.4 | 0.00 | 1.1 |
| 8.40 | 0.5% | 0.05–0.84 | 3.2× | 0.39 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 3.5 |
| 9.27 | 0.4% | 0.05–0.84 | 3.2× | 0.39 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 0.8 |

Findings:
- All 25 cells pass: the side panel now sits back as paper under a streetlight and the open door is the warmest place again. Ground, people, bus and sky each hold at 100 %; light comes from places and falls on things; the bus brakes over 2.3 s and rocks on its springs; the people breathe, turn in steps and the student steps off a weight shift.

Fixes:
- check.mjs then failed weight on a moment the five random frames did not catch: the woman's look-up from her phone has no measurable anticipation (her head moved 0.5 px the wrong way first). Fixed: before she lifts her head she sinks a little — head further down, shoulders drop 3 cm, a slight lean — then lifts. The file changed, so the pass above no longer counts; round 8 audits the new file.

## Round 8 · seed 826968 · scene 4495128d53ce · 2026-11-18 23:40
Moments (s): 1.13 · 2.40 · 3.90 · 4.70 · 9.80 — frames and 100% crops in `audit/round-08/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 1.13 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2.40 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3.90 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4.70 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 9.80 | ✓ | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.13 | 0.6% | 0.05–0.77 | 3.0× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 3.1 |
| 2.40 | 0.5% | 0.06–0.77 | 3.0× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.4 |
| 3.90 | 0.4% | 0.06–0.78 | 2.9× | 0.36 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.8 |
| 4.70 | 0.7% | 0.06–0.79 | 3.1× | 0.36 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 0.8 |
| 9.80 | 0.5% | 0.05–0.84 | 3.2× | 0.39 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 0.6 |

Findings:
- All 25 pass on the file with the new look-up anticipation; nothing else changed.

Fixes:
- check.mjs: the look-up anticipation still measured 0.3 px — her breathing (chest up to 2.5 px) rose during the sink and cancelled it. She now holds her breath through the beat (people do) and sinks 4 cm before lifting her head. File changed → round 9.

## Round 9 · seed 934105 · scene d2f4a10d82a1 · 2026-11-18 23:42
Moments (s): 1.07 · 3.10 · 5.40 · 7.07 · 8.67 — frames and 100% crops in `audit/round-09/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 1.07 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3.10 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5.40 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7.07 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 8.67 | ✓ | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.07 | 0.6% | 0.05–0.77 | 3.0× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 3.2 |
| 3.10 | 0.5% | 0.06–0.77 | 2.9× | 0.35 | 0.04 | 0.0% | 4 | 7.3 | 0.00 | 1.7 |
| 5.40 | 0.4% | 0.05–0.81 | 3.2× | 0.37 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 1.8 |
| 7.07 | 0.4% | 0.05–0.82 | 3.3× | 0.38 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 1.1 |
| 8.67 | 0.5% | 0.05–0.84 | 3.2× | 0.38 | 0.05 | 0.0% | 4 | 7.3 | 0.00 | 3.3 |

Findings:
- All 25 pass on the current file; check.mjs passes too.

Fixes:
- none — passed.
