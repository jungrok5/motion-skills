# Lessons

Problems met while building this skill and the example, as *problem → cause → fix*.

- **Morphs looked like static noise crossing the screen** → points of form A were matched to random points of form B, so
  every point flew a random distance → sort every form along a Morton (Z-order) curve over its own bounding box; index i
  is then "the same place" in every form and the morph flows. `match: 'random'` is still there for a deliberate scatter.
- **The cloud jumped at a cut** → the idle shimmer's amplitude was scaled by the *target* form's radius, so it switched
  from 170 m to 14 m in one frame; and the twinkle stepped 8× a second → blend the shimmer radius across the morph and
  interpolate the twinkle between steps. check.mjs now diffs ±1/60 s around every cut with the HUD off.
- **Forms were cut by the frame while the check passed** → "share of points outside" stayed under 4% when a blade tip or a
  terrain corner left the frame → also test the 0.4% / 99.6% quantiles of the projected points against the frame edge.
- **A form carried the previous shot's screen shift** → `frame` was inherited like yaw / dist → `frame` / `frameY` default
  to 0 in every shot; set them where copy needs room.
- **Wordmarks vanish into a stick** → text has depth 1–2 against a width of 60 → the form sheet shows it at 90°; keep text
  forms near yaw 0 with slow drift (a rule in SKILL.md).
- **The whale read as a blimp / an aeroplane** → a sqrt radius profile made a round head, and the pectorals stuck out
  sideways → a sharper head profile (`sin^0.72`), pectorals hanging down and back, the small dorsal fin, tubercles and
  ventral grooves as lines. Organic forms need their two or three signature features drawn as lines and blobs.
- **A swinging tail tip tore away from the body** → motions rotate about fixed pivots (no hierarchy) → give the tip a `bob`
  that follows the first segment's swing (`-armLength · sin(amp1)`, same hz / phase).
- **Small forms blew out to a white mass** → 160k points on a 14 m whale is far denser than on a 170 m trench → `use: 0.8`
  spreads the spare points as faint ambient specks; check.mjs warns when > 6% of the frame is pure white.
- **The MP4 was 110 MB for 28 s** → 160k twinkling specks are near-noise to x264 and `-tune grain` at CRF 16 spent bits
  keeping it → CRF 20 without grain tuning (≈ half, no visible loss at 1:1), `--crf 23` for the web.
- **Low-poly GLBs became a tangle of bright facets** → every flat-shading crease is a "feature edge" at 30° → raise
  `edges` to 40–60° or lower `edgeW` for models (Polyfork `fox-base`).
- **SwiftShader speed** is fine: points are cheap; ~0.1 s at 960 px and ~0.18 s/frame at 1080p with 4 workers. The vertex
  shader branches around the noise when a point is not moving, so holds cost almost nothing.
