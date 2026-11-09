# Brief — Haldane Deep (worked example)

**Topic (as given):** "an ocean-mapping company: a survey ship that reads the seafloor with sound, the animals it
has to look out for, and how much ocean it has mapped."

**Story in one line:** the ship is scanned → its sonar's view of the seabed becomes the whole trench → the cloud
becomes a humpback the survey pauses for → it becomes the globe of every line run → the name.

**Why these forms read as points:** a hull and a trench are what multibeam sonar and LiDAR really produce as point
clouds, so the style is literal here. The whale is not scanned, it is *heard*: it arrives through a soft flow, not a
scan, and its grooves are lines like the terrain rows, so it shares the same marks.

| # | form | made of (forms.js) | how it arrives | camera | HUD |
|---|---|---|---|---|---|
| 1 | `vessel` — R/V Haldane, 64 m, with its sonar fan and a strip of seabed under it | two hull `surface`s, deck / sheer / waterline `path`s, bridge `box`es, funnel `lathe`, A-frame and mast `line`s, sonar fan `line`s (accent), seabed `terrain` strip, transducer `blob` | `scan` up, 2.6 s, from dust | 3/4 from the bow, pulled right for the copy, drift 2°/s | chrome on · copy (01) · callout on the transducer · stats |
| 2 | `seafloor` — a trench with a seamount | `terrain` rows (sonar strips) + a faint fill, the trench axis as an accent `path`, seamount peak `blob` | `nebula` sweeping right, 2.6 s | high 3/4, wide | immersive (chrome off) · two callouts · a ring with ticks |
| 3 | `whale` — a humpback, 14 m, tail beating | body `surface` (iso-lines as ventral grooves), long pectoral `surface`s, flukes, eye; motions: tail (2 segments, sway + matched bob), fins (slow sway) | `flow` from the front, 2.4 s | side-on, low, pushed right | chrome on · copy (03) · callout on the head |
| 4 | `globe` — every survey line | `globe` wire, lawn-mower survey tracks in five boxes (accent), great-circle routes, port `blob`s | `burst` radial, 2.4 s | slow orbit | chrome on · stats · dotted route |
| 5 | `wordmark` | `text` "HALDANE DEEP" + rule + mono line | `fold` (implode → re-form), 2.2 s | straight on | immersive · fig only |

**Palette:** ink `#ebe9e3` (warm white), one accent `#5fd2e6` (sonar aqua) — only on the sonar fan, the transducer,
the trench axis, survey tracks and hot spots.

**Copy:** brand HALDANE DEEP · nav SURVEY / FLEET / LIVE MAP / FIELD NOTES · tabs VESSEL / SEAFLOOR / SPECIES /
NETWORK. Headlines are two lines, the second grey: "Mapping the deep, / one swath at a time." · "Listening before /
we sound."

**Sound:** score.mjs default bed at root 49 Hz (G1, lower and darker than the template), whooshes on every morph,
scan ticks under the ship, a chime as each form settles.

**Rules for this film (F.check):** the sonar fan points down from the keel; the whale's tail swings less than 20°;
the globe's tracks sit on the sphere.

**Review (stills):** every form recognisable at the settled still without its callout; copy never over the form; the
whale reads as a humpback (long pectorals, knobbly head line, flukes) from the side and from above (form sheet).
