# LESSONS — problems met while building the skill and the Eiffel example

Problem → cause → fix, one or two lines each.

- **Overpass refused the connection** from the sandbox → some networks block it → `fetch-place.mjs` falls back to the
  OSM editing API (`/api/0.6/map`), splitting the box into quarters when a call is too big. The raw .osm is cached in
  `data/`, so the second run (and every tweak of the converter) needs no network.
- **Every building vanished after conversion** → Douglas–Peucker on a closed ring (first point = last) measured
  distances to a zero-length segment → measure to the point when the segment length is ~0.
- **The Seine was missing / filled the map** → a multipolygon river is cut by the download box, its rings are open →
  join member ways into chains, clip to the box, close each chain along the box edge on the side with the smaller area.
- **The page froze for minutes while painting the ground** → 3,000 separately blurred `ctx.filter = blur()` fills on a
  4K canvas → put every footprint in one `Path2D`, blur once on a half-size layer, scale it on.
- **"Unknown color golden"** → the time-of-day key `sky: 'golden'` collided with a preset colour field named `sky` →
  the hemisphere colour is `hemiSky`; preset names and fields never share a name.
- **`F.camera` was not a function** → the Film instance's `camera` property (the PerspectiveCamera) shadowed the
  method → the three.js camera is `F.cam`.
- **The tower swallowed the frame** → camera distances chosen like a building film (500–700 m) for a 330 m tower →
  open at ~2 km, never closer than ~3× the landmark's height; check "the whole landmark in frame".
- **Washed-out, pastel-grey frames** → strong exponential fog, a highlight shoulder starting at 0.78 (pale walls are
  ~0.85 linear) and too much hemisphere fill → haze relative to the camera distance (linear, clean around the target),
  shoulder from 0.9, sun 3.1 / hemi 0.95.
- **A hard pink band at the top of oblique shots** → the sky's horizon colour differed from the haze and the data ended
  → the sky dome's horizon takes the haze colour; the frame-on-map rule allows the edge only under ≥ 30 % haze.
- **A giant upside-down tower in the river** → the planar reflection was physically right but too strong by day →
  daytime `waterRefl` 0.22, night 0.75 (city lights in the water are the point at night).
- **A white blob in the water at night** → additive glows (lamp sprites, beacon cones, light pools) were mirrored at the
  wrong size → light effects live on layer 1, which the reflection camera does not render; emissive materials still
  reflect.
- **Dark smudges on the quays** → the stairs' dash hatching blurred into dark bars at 0.6 m per pixel → paint steps as
  a slightly darker path, no pattern. Buildings standing in the water (moored barges) also cast contact shadows on the
  quay → buildings whose centre is in water float at water level and get no ground shadow.
- **Black cars everywhere** → a car palette with three dark entries reads as black at map scale → light, cheerful car
  colours (white, cream, red, yellow, sky blue, mint).
- **Night was navy-black** → low ambient with a blue hemisphere → purple-lavender hemisphere at 1.05 and exposure 1.2,
  so blocks still read, with warm lamp pools on top.
- **Pins ran off the frame** → text always to the right of the badge → flip to the left near the right edge (and the
  reverse), fade a pin whose box leaves the frame.
- **Rendering crawled on CPU** → 11,000 trees × 2,200 triangles drawn three times a frame (shadow, reflection, main)
  with no culling → canopies of ~560 triangles, trees and buildings in 240 m tiles so off-screen tiles are culled.
- **Black blocks on the samples page (on real GPUs, never in the CPU renders)** → 672 vertices of degenerate triangles
  (zero-area roof / wall / road pieces) had zero-length normals; on a GPU `normalize(0)` is NaN, and every NaN pixel was
  spread into a square by the bloom and tilt-shift downsampling. SwiftShader returns 0 there, so the stills looked fine
  → `Geo.tri` drops triangles with no area, the post chain replaces NaN / Inf with 0 at every downsample, and
  `check.mjs` fails on any zero normal or NaN position.
- **Z-fighting in the day shots (roads, curbs, roofs flickering)** → three causes: a fixed 2 m near plane left ~10 cm
  of depth precision at 2 km while the road / curb / marking layers were 1–6 cm apart; OSM footprints nested inside
  others (courtyard blocks, wings, duplicates) got the same height and shared a roof plane; the tower's four deck boxes
  overlapped at the corners with equal tops → the near plane follows the camera (`dist × 0.06`), ground layers sit
  ≥ 2.5 cm apart, a building hidden inside a bigger one is dropped and one poking out keeps its roof ≥ 60 cm off, and
  hand-built parts never overlap with coplanar faces (split boxes, inset bands).
