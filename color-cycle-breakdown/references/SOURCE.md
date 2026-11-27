# Source

Made from the post by **@JungleSilicon** (Silicon Jungle) —
https://x.com/JungleSilicon/status/2126107723460907414?a=yo9l1g21bGwO0nwzfCw&s=19 — "it's an old graphics trick called
color cycling. i pull the scene apart so you can see how it works!!" with a 16-second 1152 × 648 clip.

Read through `api.fxtwitter.com/2/thread/2126107723460907414` (text, media URLs) and the MP4 from `video.twimg.com`,
looked at as a contact sheet; nothing from it is kept in the repo.

## What the clip shows
1. A pixel-art waterfall in a purple-and-teal forest gorge (mountains, moss, ferns, orange flowers), alive: water falls
   and runs, spray splashes, fronds sway.
2. The scene pulls apart into four tilted planes in space — "Cliff & sky", "Flowing water", "Spray & ripples",
   "Wind-rigged plants" — with coloured names underneath.
3. `01 / PALETTE CYCLING` — "Five colors change. The pixels stay put." — "Fixed indices" (the water's five cycling
   slots in purple over a dimmed scene) beside "Same pixels with rotating colors", with five swatches and slot numbers.
   "Purple marks the five cycling slots."
4. `02 / FLOW FIELD` — "Give the water a direction." — "Flow vectors" (arrows down the fall, across the pool) beside
   "Flow field + palette cycling". "Vectors measured from the actual warp."
5. "Wind bends each frond" — "Plant cutout" beside "Individual frond pivots" (each frond a coloured polyline with
   joints). "Shared gust, with a different bend at each tip."
6. The planes come back together and the living scene holds.

## What this skill takes (the style)
- An indexed pixel picture alive by colour cycling, plus drawn particles and wind-rigged plants.
- The breakdown: the layers as labelled planes in space, then one panel per technique — fixed indices vs rotating
  colours with slot swatches; flow vectors vs the flow; plant cutout vs frond pivots — then back together.
- The dark slate panel design: mono kicker, one-line title, two views with labels, a caption.

## What it does not take
- The waterfall, the gorge, the ferns, the palette, the words. A topic gets its own place, palette, layers, cycles and
  lines; `check.mjs` fails lines borrowed from the bundled films.
- The clip's "warp" (it bends a texture along a measured field). Here a flow is indices laid along `along(x, y)`, and
  the arrows are that function's measured gradient — the same idea in pure colour cycling.
- Any image, video or model: the picture is painted from code, the motion keyed in code.

Colour cycling itself is decades old (8-bit palette hardware, famously the scenes Mark Ferrari painted for LucasArts and
others); this skill makes new scenes in that technique and explains them the way the post does.
