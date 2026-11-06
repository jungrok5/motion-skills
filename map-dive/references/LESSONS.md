# Lessons (problem → cause → fix)

From building the engine, the template and `examples/jeju`.

- **The first pass of the source video looked like one continuous zoom from 600 km to the street.** → It is several
  scenes: a stylised toy map, then close-ups at other scales, joined by dissolves during fast zooms. → One stage per
  scale; a dive = both cameras zooming the same way across a 0.6 s crossfade with a radial blur. Matching yaw and ground
  size on both sides of the overlap is what sells it; the content does not need to match pixel for pixel.
- **Map names were painted in the fallback font.** → The painter draws text at build time, before `fonts.css` faces had
  loaded (they load lazily on first use). → `await Film.create()` loads every "Map Sans" face first. Subsets from Google
  Fonts need a `unicode-range` per file or only the last file of a weight is used — `fonts.mjs` adds one if missing.
- **No pin labels showed and no error was thrown.** → A trailing `// comment` added on the same line swallowed
  `this.labels.push(L)`. → Re-read edited lines; `check.mjs`'s label rule only checks labels that exist, so look at a still
  with a label in it after every engine edit.
- **The sea slab looked like a navy frame and the island had no sides.** → Land and sea tops were 4 cm apart and the sea
  was flat dark blue. → Land 0.13 above the sea; the sea top uses the map texture (deep blue, blurred shallows, foam) so the
  coast reads; sea sides a blue gradient.
- **Close-ups showed a square on a bare plane right after the dive.** → The detailed square (100 units) is small next to
  the dive's starting height (200 units). → An apron ring (700–900 units) painted with the continuation, and for cities the
  same street grid with flat roofs and lit windows painted on it; the square's edge disappears.
- **The close-up was a white haze for the first second.** → Fixed fog [70, 260] with the camera at 190. → Haze scales with
  the camera's distance: fog [2.4, 7] × dist, every frame.
- **The sea around the crater flickered in spots.** → The cone's height term floored every point at 0, so the sea floor sat
  exactly on the water plane (z-fighting); the water plane also overlapped the apron at y = 0. → The cone sinks into the
  sea floor (`min(h, 0)` blended in); the water plane covers only the detailed square. A `check` on heights caught it.
- **Night roads were orange bands wider than the roads.** → Glow strokes 1.6× road width with a wide blur and emissive 1.2.
  → 1.1× width, small blur, emissive .6; windows and lamps carry the night.
- **The waterfall's grass top sat on the open side.** → `RingGeometry` angles start at +x and turn toward −z after the
  rotation; `CylinderGeometry` angles start at +z. → Centre both on −z (`π/2` for the ring, `π` for the cylinder) and
  document that the cliff is on the prop's −z side.
- **Overlapping names on the map** (성산 / 성산일출봉, 한라산 hidden behind the cone). → Placed by coordinates without
  looking. → Painted names go beside, not under, a prop and on the camera side (south) of tall ones; check the opening
  still at 1080p.
- **The score had faint broadband ticks during the night ramp.** → The night value was sampled every 0.25 s, so the pad's
  day/night mix stepped. → Interpolate it. Whooshes were white hiss through one one-pole filter → three in a row.
- **Rendering on a CPU box**: SwiftShader at 1080p with MSAA ×4 and soft shadows took ~1.7–2 s a frame with 4 workers
  (30 s film ≈ 30 min). Preview with `--scale .5` stills (~0.3–2 s each) and sheets; render the MP4 once, in the background.
