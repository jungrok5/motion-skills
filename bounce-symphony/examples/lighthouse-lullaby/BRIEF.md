# BRIEF — 「Lighthouse Lullaby」 (worked example: a topic the template does not have)

Request: "이 스타일로 등대지기를 위한 자장가를 만들어줘" — a lullaby for a lighthouse keeper, in the bouncing-ball style.

## 1. One line
A lullaby circles down a lighthouse made of vibraphone bars while a kalimba sings along the shore, bowls hum the harmony
and a bell tolls the end of each phrase — at night, under one warm lamp.

## 2. Music
- Source: written for this film (original). 12 bars, 3/4, ♩ = 84, F major — 25.7 s of bars (+3.6 s intro; the film is 31.7 s).
- Harmony: F – Dm – B♭ – C | F – Am – B♭ C – F | Gm – C7 – F – F.
- Form and events: bar 1 the tide starts (3.6 s); bar 3 the tune enters (7.9 s); bar 4 first toll (10.0 s); bar 8 the
  half cadence and second toll (18.6 s); bar 9 the tune's last phrase (20.7 s); bar 12 the final toll and the high A
  (27.2 s).
- Writing for balls: the tide is unbroken eighths (two balls from 2.05 m with hard vibraphone bars, e = 0.9 — the whole
  lighthouse in two long descents); the kalimba's dotted rhythms make short chains (many little droppers on the shore, like
  harbour lights); bowls and the bell are single drops.

## 3. Lanes
| id | kind | plays | motion | ball | why |
|---|---|---|---|---|---|
| tide | vibraphone | eighth-note arpeggios, bars 1–12 | circles down a cone (spiral, `dir` −1, grow 0.17) | sea blue | the sea going round the tower |
| lamp | kalimba (brass tines) | the tune, bars 3–11 | short chains round an outer ring | lamp amber | a small voice at the shore |
| deep | singing bowl | F – B♭ – F – B♭ – G – F, every other bar | single drops on an inner arc | rust | the harmony, humming |
| toll | gong | C, F, F at bars 4, 8, 12 | single drops on a far arc | bone white | the lighthouse bell |

## 4. Machine plan
The lighthouse at the centre: a cone of vibraphone bars, top 2.05 m, r 0.42 → ~0.8 m, turning clockwise as it falls.
The bowls on an arc to the south-east (r ~1.6), the bell on an arc to the south-west, the kalimba on a ring at r 2.25
round everything — the shore. From above: a tower inside a ring of little lights. Footprint ~3.8 × 4.3 m, 2.2 m tall.

## 5. Instruments and room
Brushed aluminium vibraphone bars, brass kalimba tines (longer than default: `L0` 0.11), bronze bowls, a brass gong.
Room: night blue (`bg` #0a0f17, floor #18212d, rough), one warm lamp overhead (#ffd59a, narrower 34°), blue sky fill.
Glow palette: alternating lamp ambers and sea teals by pitch class (the tower's light and the sea), slower fade (0.7 s),
stronger bloom. Mix: kalimba forward, bowls and bell back, a larger reverb (0.3) — night air.

## 6. Shots
| at | event | kind | notes |
|---|---|---|---|
| 0 | before the tide | orbit 5.4 m round the tower | the plan: tower in a ring |
| 4.4 | the tide is running | follow tide, 0.7 m, turning | inside the lighthouse |
| 9.6 | the tune enters | follow lamp, 1.35 m, lag 0.6 | the shore lights |
| 16.0 | middle of the song | orbit 2.6 m round the tower, low | the cone against the dark |
| 20.4 | the half cadence | follow lamp, 1.1 m | |
| 25.6 | the last phrase | follow tide, 0.55 m, low | bars lighting amber and teal |
| 28.8 | final toll, the high A | orbit 6.2 m, high, slow | everything at rest in its cups |

## Review notes
- First sheet: the shore lane ran 5 m off as a straight-ish zigzag — wide shots were tiny and a follow shot swept over
  empty floor. → Turned it into a ring round the tower (spiral r0 2.25), then a cup stem clashed with the bell's last
  gong (clearance) → moved the bell's arc inward.
- A glide from the shore to the tower passed the lens through a bar → the camera now swings round its subject, and cuts
  between far subjects; check.mjs samples blends for lens clipping.
- The floor shone white at grazing angles → floor reflections turned down, rougher floor.
