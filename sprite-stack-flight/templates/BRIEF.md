# BRIEF — <working title>

Write this before any code. Every line is designed for the topic; nothing is copied from an example or the reference.

## Topic
- **One line:** <what flies, where, when, why — e.g. "a mail biplane's last run over desert mesas at golden hour">
- **Title / subtitle:** <TITLE ≤ 24 characters> / <SUBTITLE ≤ 60 characters> (the pixel font has A–Z 0–9 . , : - + / ' ! ? % = # ( ))

## Craft
| field | design |
|---|---|
| what it is | <biplane / airship / glider / balloon / seaplane / rocket / …> |
| mass (1 nimble … 4 heavy) and why | <e.g. 1.5 — a light fabric biplane; 4 — a hydrogen airship> |
| speed (cells/s), turn, bank limit | <22, .85, 70° — or 11, .7, 22° for something heavy> |
| model size (voxels w × h × d) | <~30 × 30 × 13; one voxel = one screen pixel overhead> |
| palette (3–5 colours + outline) | <…> |
| parts | <fuselage / envelope / wings / fins / floats / gondola / pods …> |
| animated part (frames) | <prop 3 frames at 24 fps / flame 2 frames / none> |
| nav lights | <where: red port, green starboard, seen from above> |
| trail | <wingtip vapour when boosting / smoke in rolls / none> |
| can it roll? | <yes (light) / no (heavy) — the plan follows this> |

## World
| field | design |
|---|---|
| place | <…> |
| shape — how height is made | <fbm + mesa threshold + carved river / ridged peaks + fjord contours / blobs for islands …> |
| terrace bands (level → colour) | <0 water · 1 bank · 2–5 sand · 6+ strata …> |
| water | <ramp deep → shallow, glints, foam on the shore or not> |
| decorations | <trees / pines / rocks / houses / ice / … and where> |
| a landmark | <a town, a lighthouse, a dam — something the plan flies to> |
| time of day | <sky stops, fog colour, sun (az, el) or stars> |
| clouds | <count, base altitude relative to the flight (above / among / below), size, wind> |

## Cockpit
- **The seat:** <open cockpit / bridge with windows / bubble canopy / basket …>
- **In view:** <frame, dashboard, what of the craft itself shows (cowl, wing, envelope)>
- **Instruments:** <which, styled for the craft (brass, green CRT, wood …)>
- **One live part tied to the state:** <the wheel turns with the bank command / the telegraph shows the throttle / the prop blur>

## Plan
Start overhead with the title; use every camera at least once; no step under 1.5 s; end wide. Check it on `?map=1`.

| t | dur | cam | bank | climb | thr | roll | caption | the beat (why) |
|---|---|---|---|---|---|---|---|---|
| 0 | 4 | over | 0 | 0 | .5 | | | the world and the craft, title |
| … | | | | | | | | |

## Motion (weight)
- Mass <m>: the bank answers in about <0.6·√m> s and overshoots a little before it settles; the chase camera swings after.
- Rolls (light craft only) gather first: a small counter-roll, then the roll, then a settle.
- Idle never freezes: the prop / flame frames turn at any t, glints and clouds move, the camera breathes with the bank.

## Review (score every still 0–2; fix anything under 2)
1. The craft reads as a stack from above and from the chase: depth, side shading, the dark rim under it.
2. Pixels are crisp: one pixel size, no smoothing, nothing blurred.
3. The terraces read: layers with darker south faces; the colour bands tell height.
4. The craft fits the topic at 1×: silhouette, 3–5 colours, one warm or emissive accent.
5. One time of day: sky, fog, cloud tones, water glints and windows agree.
6. The cockpit belongs to this craft and one part of it moves with the flight.
7. Weight shows: the bank lags and overshoots; a heavy craft never rolls; the camera lags in turns.
8. Nothing is copied from the reference or an example — the craft, the world and the cockpit are this topic's own.
9. The title and captions are short and readable; nothing important sits under the title band.
