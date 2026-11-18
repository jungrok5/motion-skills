# Brief — Lisbon Weekend

Topic: "a travel planner for a weekend in Lisbon"
One line: everything for three days in Lisbon on one ivory cube, the way a traveller would keep it on the desk before leaving.

## Faces (front, right, top, back, left, bottom)
| face | app | its one job | controls (tile r,c) | text that spans |
|---|---|---|---|---|
| front | Plan | write the three days | — | the plan (`#plan`, data-hic-edit), azulejo strips top and bottom; footer: days · words · weather |
| right | Map | pick a district, read one line about it | pins: LX r0c0, Alfama r0c2, Belém r1c0, Baixa r1c1 (data-hic-click on Alfama) | the info line (row 2) |
| top | Controls: "Tram 28" | turn the cube | sound r0c2 · Shuffle r1c0 · Back r1c1 · Sort out r1c2 · Tap & turn / Just tap / Just turn r2 | status r0c1 |
| back | Packing | tick what is packed | six item keys, one per tile, rows 0–1 | progress bar + "N of 6 packed" (row 2) |
| left | Money | euros → another currency | amount input r1c0–1 (data-span) · currency select r1c2 | the result (row 2), "sample rates, not live" |
| bottom | Phrases | learn six phrases | six cards, one per tile, rows 0–1 | the chosen phrase + how to say it (row 2) |

Six verbs: write, choose, toggle, convert, look up, turn.

## Words
- Control face: "Tram 28", "drag a tile to take a turn", keys Shuffle / Back / Sort out, modes Tap & turn / Just tap / Just turn,
  status "✓ In order" / "N turns · R′" — the tram ticket is the controls because the tram is how you move around Lisbon.
- HUD: "Six apps · one cube" / "Lisbon Weekend"; hints: tap a pin, a card or the plan · drag a tile to turn a layer · keep planning on the shuffled cube.

## Look
- body: ivory enamel `#e9dcc4`, gloss .75, roughness .16, groove .62 — like a luggage tag or an enamel tram sign, warm against the blue tiles.
- tiles: glass .14, emit .84, hot `#f2b234` (the tram's yellow).
- faces: sand + azulejo blue (plan), map beige with the Tagus in blue, tram yellow (controls), azulejo blue (packing),
  bottle green (money), terracotta (phrases) — no two neighbours alike at home.
- studio: warm key `#fff0da` 2.3, Atlantic strip `#8fbaff` 1.0 left, amber kicker `#ffb36b` 1.0 behind right, a thin front strip.
- backdrop: dusk terracotta `#4f2621` → `#120607`, glow A Atlantic blue low left, glow B amber high right; floor tint `#1c0c09`.
- home view: yaw −0.58, pitch 0.42.

## Sound
- snap 210 Hz with a 1.8 kHz click (a wooden tock, lighter than the template's plastic), tick 2.6 kHz, chime A minor 69 72 76 81 on a triangle (a little fado).
- app tones: a pin pings up (660→990 Hz), packing ticks high when packed and low when unpacked, a phrase card plays two notes.

## Review notes
- Grid check caught the Belém pin straddling the 480 px seam → moved up into r1c0.
- The map read as a blank beige face at a third of its size → darker ground, thicker streets, stronger contours.
- Typed still: first the reveal left the cube rolled onto a corner, then face-on; now the caret's face goes to where the front
  face sits at home and is rolled upright, so the scrambled cube keeps its three-quarter look with the typed line on the front.
