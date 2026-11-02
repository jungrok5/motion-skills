# The look: cozy pixel diorama, warm against cold

What makes these covers read as "pixel art you could stare at for ten hours", and the numbers the examples use.

## Reading a reference (image, video or prompt)
Write down, before drawing anything:
- **The stage**: one compact mass in the middle third (a floating island, a rooftop, a shop front), ~50–55 % of the frame
  width, with empty sky above and a dark void / sea / hills below. The stage's top sits a little under the middle (y ≈ 0.63 H).
- **The props** on it, left to right, and which ones glow. The reference behind `halloween-rain` (a 13 s clip posted with the
  prompt) had: pond + waterfall on the left edge, a lamp post, a two-storey half-timbered house with lit windows and a smoking
  chimney, a campfire, a skeleton under a red umbrella, a bare tree with three hanging lanterns, cyan wisps, glowing crystals
  and a fossil in the rock, roots under the island, moon behind clouds, rain, distant hills.
- **The palette** split into the cold field (sky, rock, rain, moon, crystals) and the warm pockets (glass, flame, lanterns).
- **What moves and how fast**: rain fast; sparks fast but sparse; smoke, wisps, lanterns slow; clouds almost still; the
  character on a long cycle; lightning rare.
Then compose your own scene from those ingredients — the kit's props are this repo's own drawings; do not trace a picture.

## Canvas and pixel size
- 480×270, scaled ×4 → 1920×1080 (×8 → 4K). One art pixel = 4 screen pixels: fine enough for a detailed house, coarse enough
  to read as pixel art. For chunkier art use 384×216 ×5 or 320×180 ×6 (props are sized in pixels, so scale coordinates).
- Keep shapes on whole pixels; one-pixel lines are the finest detail (rain, bones, twigs, strings).

## Palette (K.PAL)
- Sky ramp, dark → horizon: `#06071a #0b0d25 #121433 #1a1a41 #24224f #2f2a5b #3b3366` (blue-violet; winter: navy-teal).
- Rock/dirt: purple-brown `#0e0a12 … #463141` — warm enough to catch firelight, dark enough to stay in the night.
- Warm: `#8c2412 #d9471b #ff7b25 #ffae42 #ffd27a #fff1c1` (flame from the outside in). Glass: `#7a2a10 … #ffe08f`.
- Cold accents: cyan `#0d4c5c … #d6fbff` (wisps, crystals, root tips), moon `#6f739c … #eef0fa`.
- One saturated accent object (the red umbrella, a scarf) next to the main warm pocket.
Every surface is a ramp of 4–6 colours; `PD.ramp(cols, v, x, y)` picks between neighbours with a Bayer dither.

## Light
The base scene is painted cold and dark. The post pass adds, per light:
- **surface** — multiplies what is under it (`base · (1 + gain · L)`), in `levels` steps spaced evenly in √f: tiny steps at
  the faint edge (no hard ring), bigger ones near the source. This is what makes the grass and the wall orange near the fire.
- **halo** — glow added in the air, in fine dithered steps (soft).
Typical values (power, radius px): campfire 1.05 / 74 + a small hot core; window 0.85 / 30; lamp 0.95 / 58 with a downward
cone; lantern 0.75 / 18; jack-o'-lantern 0.7 / 16; wisp 0.8 / 11; crystal 0.75 / 22; moon 0.8 / 4 r. Flicker with
`D.flicker(seed, t, amt, hz)`: fire 0.18 @ 5 Hz, windows 0.12 @ 3 Hz (candle-like, never dark), lamps 0.04.
Check `?pass=light`: the pools overlap a little; most of the frame stays black.

## Motion budget (a cover is watched for hours)
| thing | speed / period | note |
|---|---|---|
| near rain | 290–350 px/s, 6–9 px streaks | 60–70 drops |
| far rain | 170–220 px/s, 3–5 px | 110–120 drops, darker |
| snow | 10–30 px/s, sway 2–4 px | near layer 2×2 flakes |
| sparks | rise 16–32 px/s, life 0.6–1.5 s | ~24, fade by dither |
| smoke | rise ~7 px/s, wind 2–4 px/s, life 5.5 s | grows to r ≈ 5 |
| clouds, mist | sway 10–12 px over the whole loop | never travel across |
| lanterns | swing ±0.18 rad, 5–8 s | the light follows |
| character | breath 4 s (1 px), action every 12 s | stepped at 8 fps |
| fire tongues | stepped at 12 fps | hand-drawn feel |
| lightning | ≤ 2 per loop, strength ≤ 0.5 | flash + bolt behind hills |
| aurora | folds roll once per loop | vertical rays |

## Loop length
30–60 s. Longer loops hide repetition of rain/sparks; shorter ones render faster and are smaller files. All periods are snapped
to divide the loop, so a 5.3 s pulse in a 60 s loop becomes 60/11 ≈ 5.45 s — pick the loop first.
