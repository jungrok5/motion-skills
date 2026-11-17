# LOOK — how a sprite-stack flight should look

## The pixel
- The canvas is 480×270. One voxel of the craft is one screen pixel in the overhead view (`over: 1`); the chase view draws the
  same stack larger (`chase: 2–2.5`). The world's cells are 1.5–3 px overhead (zoom follows altitude) and any size in
  perspective. Everything is scaled up ×4 nearest-neighbour; never smooth.
- Rotation is nearest-neighbour too: a turning craft and a rolled horizon get stair-stepped edges. That is the look — do not
  try to anti-alias it away.
- Transparency is ordered dither (`SS.bayer`, `P.dither`, `SS.toneAt`): the sky's bands, cloud shading, the title band, fog
  inside clouds. The only real alpha is the craft's ground shadow.

## Sprite stacking (the craft)
- A voxel model, cut into slices. The bake shades each voxel by its open faces: top +14 %, bottom −20 %, west and north a
  little lighter, east and south darker. Give the model 2–3 values per colour this way — do not paint shading in by hand.
- The `outline` slice (a dilated silhouette in a near-black of the palette) sits under the stack and shows as a dark rim at the
  bottom edge; it is what makes the craft pop off busy ground.
- Keep the palette small: 3–5 colours + outline + one emissive accent (lights, windows, flame). Emissive voxels (`M.light`,
  `M.glow`) are never shaded.
- Readability at 1×: the silhouette from above must say what it is (wings, envelope, floats). Fins and tails must rise high
  enough (3+ voxels) to read in the chase view, where slices are squashed to about a third.
- Animated parts are frames of the model (`frames: 3` → prop blades at three angles + a sparse dithered disc).

## Terraces (the world)
- Heights are integers: one level = one cell high (`unit: 1`). Flat terrace tops + vertical walls = the stacked look. The
  walls take the side colour (top × 0.68); terrace lips facing south / east catch light (×1.1).
- Colour by level, one colour per band — or for rock, **one colour per level** (strata), which turns cliffs into layered
  rock. Dither two close colours per cell (`[a, b]` in `SK.bands`) for texture; use smooth noise (`n.value`) for patches (snow,
  forest edges), never per-cell randomness for large features — it reads as salt and pepper.
- Water is height ≤ 0: a ramp by depth, sparse animated glints, optional foam on the shore cells.
- Decorations are stamps: a tree is a 5–9-cell crown raised 2–4 levels (`SK.tree`), a pine a tall cell with a shoulder ring,
  a house a block with a ridge. Scatter them by level and by a smooth noise mask so they form groves, not static.

## Light and time of day
- One time of day drives everything: the sky stops (horizon → zenith), the fog (≈ the horizon colour), the four cloud tones
  (their shadow tone is tinted by the sky), water glints (warm at sunset), windows and lamps (warm against a cold evening).
- Golden hour: peach / amber horizon, dusty violet zenith, warm fog, a low sun (`sun: { az, el }`). Blue hour: pink horizon,
  indigo zenith, stars, lilac fog, cold terrain, warm windows. Noon: pale cyan horizon, saturated blue, white clouds.
- Fog starts at about a third of the draw distance and reaches the fog colour at the far plane; distant ridges become flat
  silhouettes in the fog — that depth is most of the perspective view's beauty.

## Cameras
- **Overhead**: an oblique top-down (62°) that follows a point ahead of the craft (the craft sits a little behind centre and
  drifts in the frame as it turns); the craft is drawn above its shadow, separated by the altitude. Clouds below the craft are
  drawn before it, clouds above after it. Good for titles, maps of the place, turns.
- **Chase**: behind and above, looking at the craft, rolled partly with the bank, swinging after the heading. `chaseSide`
  moves it off to the right for a three-quarter view (round crafts — airships, balloons — need it). Good for terrain, rolls.
- **Cockpit**: the eye at the craft, rolled fully with the bank; a static frame drawn once, a live layer on top. Design the
  seat for the craft: an open cockpit under a wing, a bridge with windows, a bubble canopy with a green HUD, a balloon basket.

## Reading a reference
1. List what you see: the craft (type, palette, parts), the world (shapes, bands, water, props), the light (time of day,
   palette), the cameras and cuts, the HUD / cockpit, any text.
2. Separate the technique (stacking, terraces, three cameras, dithering) from the content (that jet, those islands, that HUD).
3. Keep the technique. Design new content from the topic: a different craft, place, time of day and cockpit.
