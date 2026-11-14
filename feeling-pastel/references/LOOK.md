# LOOK — what makes it read as hand-drawn, and the colour

## Not digital, not an SVG

A computer drawing gives itself away with: perfectly even fields, smooth gradients, vector edges, repeated identical
marks, detail spread evenly like a texture, and nothing where the hand did not go. The engine and the rules answer each:

| tell | here |
|---|---|
| even fields | every area is built from strokes; `check.mjs` fails tiles whose luminance barely varies |
| smooth gradients | gradients are *broken colour*: each stroke picks its colour from a ramp at its position, with jitter (`vary`) |
| vector edges | regions are clipped soft and ragged by the paper grain (`feather`, `rag`); outlines are strokes, broken into pieces (`line` → `maxLen`) |
| identical marks | width, length, angle, pressure, curve vary per stroke; the pressure wavers along each stroke; the tip has striations |
| detail everywhere | small sharp marks only at the focus; big side strokes elsewhere |
| untouched paper | block-in on the side of the stick covers the sheet first; `check.mjs` fails bare tiles |
| mechanical order | hatching sweeps across a region the way a hand moves (`order: 'sweep'`), forms are worked from their shadow side to the light |

What the paper gives for free: where pressure is light, the grain speckles through in clumps (not per-pixel noise) — the
single strongest signal of dry media. Use it on purpose: lights and air speckle, darks and focal areas are pressed in.

## Every pixel

The source asked to "use every pixel of the canvas". That means: no blank paper, no "background" left as a flat wash,
corners and edges worked as carefully as the centre, and detail carried to the frame (reeds, roofs, waves, clouds run off
the edges). It does not mean noise everywhere: big quiet areas are fine if they are *worked* (several layers of strokes).

## Colour: the look of cel-era anime backgrounds, original

What people mean by "90s anime colours" in landscapes (OAV / film backgrounds painted in poster colour): saturated
mid-tones; coloured shadows (cobalt, ultramarine, violet — never grey); skies that move through salmon / peach → cyan →
cobalt; cumulus in cream with peach light and lavender shade; lit windows as warm yellow dabs in blue dusk; foliage
in deep teal-green. Take that **logic**, not any frame:

- choose a **light temperature** and a **shadow temperature** (warm gold / cool violet is the classic pair);
- ramps run *through* saturated hues, not through grey (salmon → peach → cream, not salmon → beige → white);
- no pure black (darkest ≈ `#1f2450`) and no pure white (lightest ≈ `#fff6e0`);
- one accent colour that appears only at the focus (window gold, firefly green).

Default ramps to start from (then make your own in the brief):

| role | ramp |
|---|---|
| dusk sky | `#fff3d6 #ffe2a0 #f8b487 #ea8f9c #a77fbf #6a64ad #434a8f #2c356f` |
| day sky (source-like) | `#f2a48c #f6c3a0 #9fd8d0 #5a7cc4 #2f4f9a` |
| cumulus, lit → shade | `#fff4dc #fbe3c4 #f2b49a #b98ab0 #6a6fb8` |
| night | `#0f1a3a #1b2d5c #2c4a7c #3e6f8f` + `#e9a07a` last light |
| snow | `#4e5aa0 #7f84c4 #b9a6d6 #f0c5c6 #fde8d6` |
| foliage | `#123a3a #1f5a52 #3f8a6a #9cc98a` |

## Composition at 16:9

- horizon on a third (or lower, to give the sky the feeling); the focus on a third;
- the darkest dark meets the lightest light only at the focus;
- something big and something small (a vast sky and a crowd of tiny lit windows);
- depth: far marks smaller, cooler, paler; near marks bigger, warmer, darker (atmospheric perspective);
- frame the edges with near things running off the sheet (reeds, roofs, branches) so the picture continues past it.
