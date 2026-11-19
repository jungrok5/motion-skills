# AUDIT — 「파도 응원」

The loop: render → five random moments at 100% → mark each against the five criteria → fix → render again, until one
round passes all 25 cells. Each round is appended by `audit.mjs`; the cells, findings and fixes are written by hand.

## Round 1 · seed 230853 · scene 65919b1f8397 · 2026-11-19 00:20
Moments (s): 0.77 · 3.83 · 6.10 · 8.03 · 8.90 — frames and 100% crops in `audit/round-01/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 0.77 | ✗ roof underside is flat brown planes; LED boards are crude stripes; the steward is bare capsules | ✗ the steward is lit flat from the front with no edge; the roof is unlit | ✗ steward reads as a mannequin — jagged waist where torso meets legs, elbows flared out 'hands behind back' | ✓ the wave arrives person by person (reaction spread visible in the near rows) | ✗ the LED strip is a rainbow and the brightest thing in frame — the brief allows one accent |
| 3.83 | ✗ roof underside is flat brown planes; LED boards are crude stripes; the steward is bare capsules | ✗ the steward is lit flat from the front with no edge; the roof is unlit | ✗ steward reads as a mannequin — jagged waist where torso meets legs, elbows flared out 'hands behind back' | ✓ the wave arrives person by person (reaction spread visible in the near rows) | ✗ the LED strip is a rainbow and the brightest thing in frame — the brief allows one accent |
| 6.10 | ✗ roof underside is flat brown planes; LED boards are crude stripes; the steward is bare capsules | ✗ the steward is lit flat from the front with no edge; the roof is unlit | ✗ steward reads as a mannequin — jagged waist where torso meets legs, elbows flared out 'hands behind back' | ✓ the wave arrives person by person (reaction spread visible in the near rows) | ✗ the LED strip is a rainbow and the brightest thing in frame — the brief allows one accent |
| 8.03 | ✗ roof underside is flat brown planes; LED boards are crude stripes; the steward is bare capsules | ✗ the steward is lit flat from the front with no edge; the roof is unlit | ✗ steward reads as a mannequin — jagged waist where torso meets legs, elbows flared out 'hands behind back' | ✓ the wave arrives person by person (reaction spread visible in the near rows) | ✗ the LED strip is a rainbow and the brightest thing in frame — the brief allows one accent |
| 8.90 | ✗ roof underside is flat brown planes; LED boards are crude stripes; the steward is bare capsules | ✗ the steward is lit flat from the front with no edge; the roof is unlit | ✗ steward reads as a mannequin — jagged waist where torso meets legs, elbows flared out 'hands behind back' | ✓ the wave arrives person by person (reaction spread visible in the near rows) | ✗ the LED strip is a rainbow and the brightest thing in frame — the brief allows one accent |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.77 | 15.0% | 0.02–0.77 | 4.5× | 0.60 | 0.37 | 0.0% | 155 | 5.5 | 0.00 | 0.1 |
| 3.83 | 14.7% | 0.01–0.77 | 4.6× | 0.61 | 0.39 | 0.0% | 155 | 5.5 | 0.00 | 0.2 |
| 6.10 | 15.3% | 0.01–0.77 | 4.5× | 0.62 | 0.40 | 0.0% | 155 | 5.5 | 0.00 | 0.2 |
| 8.03 | 15.8% | 0.01–0.77 | 4.5× | 0.63 | 0.49 | 0.0% | 155 | 5.5 | 0.00 | 0.2 |
| 8.90 | 15.9% | 0.01–0.77 | 4.2× | 0.63 | 0.45 | 0.0% | 155 | 5.5 | 0.00 | 0.1 |

Findings:
- The crowd itself holds: ~2,600 people, readable seats, the wave ragged in the near rows. Everything around it is unfinished: roof, LED boards, the steward.
- The tools were wrong for seated people: the probe measured current height (seated = short → '5.5 heads') and the idle floor (0.6 px) cannot be met by a 60 px fan 60 m away. Both fixed in the skill (body length at depth; idle floor 0.4 % of height up to 0.6 px). Kids now get 6.2-head proportions in the rig.

Fixes:
- LED: dark panels with a slow abstract teal wave and orange chevrons, dimmer — one accent strip.
- Roof underside: corrugated panels drawn in code, lit warm around each floodlight, trusses with a lit edge.
- Steward: hi-vis vest over a navy jacket (navy sleeves), two silver reflective bands, a clean hip band; hands clasped behind the back (elbows in); warm rim light from the stand side; standard material for a little sheen.
- Everyone: a hip band (thigh tops) so torsos meet legs cleanly; kids flagged as children.

## Round 2 · seed 358396 · scene acb9653ee532 · 2026-11-19 00:23
Moments (s): 0.97 · 3.70 · 6.17 · 8.03 · 9.23 — frames and 100% crops in `audit/round-02/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 0.97 | ✗ the roof underside fills the top third as dark flat planes; the stand's end wall is a plain box | ✗ the roof carries the floodlights but is itself unlit | ✗ the steward's vest ends in a pointed capsule tail under the hip band | ✓ near rows rise in a ragged order; arms lag the body and overshoot | ✓ dark LED with one teal line, team teal / white / red patches, night navy |
| 3.70 | ✗ the roof underside fills the top third as dark flat planes; the stand's end wall is a plain box | ✗ the roof carries the floodlights but is itself unlit | ✗ the steward's vest ends in a pointed capsule tail under the hip band | ✓ near rows rise in a ragged order; arms lag the body and overshoot | ✓ dark LED with one teal line, team teal / white / red patches, night navy |
| 6.17 | ✗ the roof underside fills the top third as dark flat planes; the stand's end wall is a plain box | ✗ the roof carries the floodlights but is itself unlit | ✗ the steward's vest ends in a pointed capsule tail under the hip band | ✓ near rows rise in a ragged order; arms lag the body and overshoot | ✓ dark LED with one teal line, team teal / white / red patches, night navy |
| 8.03 | ✗ the roof underside fills the top third as dark flat planes; the stand's end wall is a plain box | ✗ the roof carries the floodlights but is itself unlit | ✗ the steward's vest ends in a pointed capsule tail under the hip band | ✓ near rows rise in a ragged order; arms lag the body and overshoot | ✓ dark LED with one teal line, team teal / white / red patches, night navy |
| 9.23 | ✗ the roof underside fills the top third as dark flat planes; the stand's end wall is a plain box | ✗ the roof carries the floodlights but is itself unlit | ✗ the steward's vest ends in a pointed capsule tail under the hip band | ✓ near rows rise in a ragged order; arms lag the body and overshoot | ✓ dark LED with one teal line, team teal / white / red patches, night navy |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.97 | 19.5% | 0.00–0.74 | 4.9× | 0.55 | 0.13 | 0.0% | 155 | 7.5 | 0.00 | 0.2 |
| 3.70 | 18.6% | 0.00–0.74 | 5.1× | 0.56 | 0.14 | 0.0% | 155 | 7.5 | 0.00 | 0.2 |
| 6.17 | 20.0% | 0.00–0.73 | 4.9× | 0.57 | 0.14 | 0.0% | 155 | 7.5 | 0.00 | 0.2 |
| 8.03 | 20.2% | 0.00–0.74 | 4.9× | 0.57 | 0.15 | 0.0% | 155 | 7.5 | 0.00 | 0.2 |
| 9.23 | 20.4% | 0.00–0.74 | 4.7× | 0.58 | 0.15 | 0.0% | 155 | 7.5 | 0.00 | 0.2 |

Findings:
- The crowd, the LED strip and the steward's vest now hold. The top third (roof) is the largest weak area left, and the steward's torso shape still shows its capsule.

Fixes:
- Roof: a second, lower layer of lit structure — main trusses along the stand with a warm lit underside edge, rows of small fixtures glowing between them, the panels brighter where the floodlights are; the end wall gets a lit stair entrance (a vomitory) with a steward's silhouette-free glow and a handrail.
- Torso capsules start a fifth of the way up from the pelvis so the hip band, not a capsule end, makes the waist (all people).

## Round 3 · seed 463527 · scene e1726a114790 · 2026-11-19 00:24
Moments (s): 3.17 · 4.67 · 6.27 · 7.17 · 9.97 — frames and 100% crops in `audit/round-03/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 3.17 | ✗ the stand's end wall (upper left, ~10 % of the frame) is still one dark flat face | ✓ roof lit by its own fixtures, floodlight glare, upper rows darker under the roof | ✓ | ✓ near-row strip 6.2–8.4 s: ragged rise, arms lag and overshoot, people drop back with a bounce | ✓ |
| 4.67 | ✗ the stand's end wall (upper left, ~10 % of the frame) is still one dark flat face | ✓ roof lit by its own fixtures, floodlight glare, upper rows darker under the roof | ✓ | ✓ near-row strip 6.2–8.4 s: ragged rise, arms lag and overshoot, people drop back with a bounce | ✓ |
| 6.27 | ✗ the stand's end wall (upper left, ~10 % of the frame) is still one dark flat face | ✓ roof lit by its own fixtures, floodlight glare, upper rows darker under the roof | ✓ | ✓ near-row strip 6.2–8.4 s: ragged rise, arms lag and overshoot, people drop back with a bounce | ✓ |
| 7.17 | ✗ the stand's end wall (upper left, ~10 % of the frame) is still one dark flat face | ✓ roof lit by its own fixtures, floodlight glare, upper rows darker under the roof | ✓ | ✓ near-row strip 6.2–8.4 s: ragged rise, arms lag and overshoot, people drop back with a bounce | ✓ |
| 9.97 | ✗ the stand's end wall (upper left, ~10 % of the frame) is still one dark flat face | ✓ roof lit by its own fixtures, floodlight glare, upper rows darker under the roof | ✓ | ✓ near-row strip 6.2–8.4 s: ragged rise, arms lag and overshoot, people drop back with a bounce | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 3.17 | 13.5% | 0.00–0.75 | 4.9× | 0.59 | 0.32 | 0.0% | 155 | 7.5 | 0.00 | 0.1 |
| 4.67 | 14.1% | 0.00–0.75 | 4.7× | 0.59 | 0.32 | 0.0% | 155 | 7.5 | 0.00 | 0.1 |
| 6.27 | 14.8% | 0.00–0.74 | 4.8× | 0.60 | 0.34 | 0.0% | 155 | 7.5 | 0.00 | 0.1 |
| 7.17 | 14.6% | 0.00–0.75 | 4.9× | 0.60 | 0.36 | 0.0% | 155 | 7.5 | 0.00 | 0.1 |
| 9.97 | 14.9% | 0.00–0.75 | 4.7× | 0.61 | 0.37 | 0.0% | 155 | 7.5 | 0.00 | 0.1 |

Findings:
- Roof and steward pass. One flat area left: the end wall.

Fixes:
- A dot-matrix scoreboard on the end wall (score and a match clock that runs with t, no names or brands), a lit band under it, and the stair entrance glow moved into view.

## Round 4 · seed 637535 · scene 188455a2e315 · 2026-11-19 00:27
Moments (s): 1.43 · 5.10 · 7.57 · 8.37 · 9.87 — frames and 100% crops in `audit/round-04/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 1.43 | ✗ the upper-left dark area is not the end wall (that is off frame right — the scoreboard landed out of shot) but empty night sky over the pitch: one flat navy | ✓ | ✓ | ✓ | ✓ |
| 5.10 | ✗ the upper-left dark area is not the end wall (that is off frame right — the scoreboard landed out of shot) but empty night sky over the pitch: one flat navy | ✓ | ✓ | ✓ | ✓ |
| 7.57 | ✗ the upper-left dark area is not the end wall (that is off frame right — the scoreboard landed out of shot) but empty night sky over the pitch: one flat navy | ✓ | ✓ | ✓ | ✓ |
| 8.37 | ✗ the upper-left dark area is not the end wall (that is off frame right — the scoreboard landed out of shot) but empty night sky over the pitch: one flat navy | ✓ | ✓ | ✓ | ✓ |
| 9.87 | ✗ the upper-left dark area is not the end wall (that is off frame right — the scoreboard landed out of shot) but empty night sky over the pitch: one flat navy | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.43 | 14.3% | 0.00–0.75 | 4.7× | 0.58 | 0.31 | 0.0% | 155 | 7.5 | 0.00 | 0.2 |
| 5.10 | 14.2% | 0.00–0.75 | 4.9× | 0.60 | 0.32 | 0.0% | 155 | 7.5 | 0.00 | 0.1 |
| 7.57 | 14.6% | 0.00–0.75 | 4.9× | 0.60 | 0.36 | 0.0% | 155 | 7.5 | 0.00 | 0.1 |
| 8.37 | 14.8% | 0.00–0.75 | 4.6× | 0.60 | 0.36 | 0.0% | 155 | 7.5 | 0.00 | 0.0 |
| 9.87 | 14.8% | 0.00–0.75 | 4.7× | 0.61 | 0.37 | 0.0% | 155 | 7.5 | 0.00 | 0.1 |

Findings:
- Wrong diagnosis in round 3: projecting the scoreboard showed the end wall lies outside the frame on the right. The flat area is sky. A late-autumn night match has weather: the fix belongs in the air, not on a wall.

Fixes:
- Drizzle: ~3,000 fine rain streaks falling through the floodlight (pale where they cross the light, invisible against the bright crowd), each with its own speed; wind drift.
- Haze: large soft glows around the roof floodlights and a lit mist band over the pitch corner, so the sky has light in it.
- (The scoreboard stays — it is in the stand, seen if the camera is moved — but nothing relies on it.)

## Round 5 · seed 729460 · scene 2b39a0bd503e · 2026-11-19 00:29
Moments (s): 3.87 · 5.53 · 7.07 · 8.57 · 9.63 — frames and 100% crops in `audit/round-05/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 3.87 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5.53 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7.07 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 8.57 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 9.63 | ✓ | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 3.87 | 9.7% | 0.00–0.81 | 4.6× | 0.57 | 0.26 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 5.53 | 10.5% | 0.00–0.80 | 4.7× | 0.58 | 0.26 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 7.07 | 10.9% | 0.00–0.79 | 4.7× | 0.59 | 0.28 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 8.57 | 10.9% | 0.00–0.78 | 4.6× | 0.59 | 0.29 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 9.63 | 11.3% | 0.00–0.78 | 4.6× | 0.59 | 0.29 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |

Findings:
- All 25 pass: drizzle shows against the dark and in the lamp glare, haze puts light in the sky, the flattest crop is now the mown pitch.

Fixes:
- The cast sheet showed one fan twice (the long-haired pick and the heavy pick were the same person) → picks made distinct. Frames are unchanged, but the file changed, so round 6 audits it again.

## Round 6 · seed 262516 · scene 69ab4db71863 · 2026-11-19 00:38
Moments (s): 0.53 · 2.90 · 4.87 · 7.70 · 9.93 — frames and 100% crops in `audit/round-06/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 0.53 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2.90 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4.87 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7.70 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 9.93 | ✓ | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.53 | 10.3% | 0.00–0.83 | 4.6× | 0.56 | 0.24 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 2.90 | 9.6% | 0.00–0.82 | 4.6× | 0.57 | 0.26 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 4.87 | 10.2% | 0.00–0.80 | 4.6× | 0.58 | 0.25 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 7.70 | 10.9% | 0.00–0.78 | 4.6× | 0.59 | 0.28 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 9.93 | 11.1% | 0.00–0.78 | 4.6× | 0.59 | 0.30 | 0.0% | 156 | 7.5 | 0.00 | 0.1 |

Findings:
- Five new moments of the current file; all 25 pass.

Fixes:
- After the owner shared the source video: the source opens each film with a title card (spaced serif capitals, a rule, an italic line, a small credit at the foot) over the running scene. The kit now draws one (`card`, fades out by 2.3 s) and this scene has one. The file changed, so the next round audits it.

## Round 7 · seed 20261119 · scene 1c4574d24a0e · 2026-11-19 01:02
Moments (s): 1.30 · 3.50 · 5.70 · 7.77 · 9.00 — frames and 100% crops in `audit/round-07/`

| t (s) | density | light | proportion | weight | colour |
|---|---|---|---|---|---|
| 1.30 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3.50 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5.70 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7.77 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 9.00 | ✓ | ✓ | ✓ | ✓ | ✓ |

Measured (hints for where to look, not verdicts):

| measured t | flat | p1–p99 | lit place | hue spread | warm/cool | clip | figures | heads | slide px | idle px |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.30 | 8.4% | 0.00–0.87 | 4.7× | 0.56 | 0.25 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 3.50 | 9.5% | 0.00–0.81 | 4.7× | 0.57 | 0.26 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 5.70 | 10.4% | 0.00–0.80 | 4.7× | 0.58 | 0.26 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 7.77 | 10.9% | 0.00–0.78 | 4.6× | 0.59 | 0.28 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |
| 9.00 | 11.3% | 0.00–0.78 | 4.5× | 0.59 | 0.29 | 0.0% | 156 | 7.5 | 0.00 | 0.2 |

Findings:
- The title card at 1.30 s reads at 100 % (spaced serif capitals, rule, italic line, credit at the foot; a soft scrim where the background is bright) and leaves the scene's light and motion visible under it; it is gone by 2.3 s. The other four moments are the passed scene unchanged; all 25 pass.

Fixes:
- none — passed.
