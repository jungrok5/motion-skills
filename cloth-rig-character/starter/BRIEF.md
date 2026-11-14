# Rainy-day kid — brief

## One line
A small kid in a yellow raincoat and a long red-and-white striped scarf stands waiting, blinks, turns and sets off.

## Topic → design
- Topic / occasion: starter — a rainy-day walk (the skill's default example, not the source's girl)
- Silhouette in one shape: an A-line raincoat (a short cone from the waist) + two scarf tails in front
- Proportions: height 1.05 m, heads 3.8 (a younger, rounder kid), build 1.05
- Palette: raincoat #f4c430 (cuffs, collar #e0ac1c), boots + buttons #2f6fb0, scarf #d8402f / #f6efe2, trousers #3b4a6b
- Face: dark brown eyes, warm blush, small smile; short brown bob with bangs

## Parts, in layering order
1. hair_bob — #4a2f1f, length 0.1 (short), bangs 0.14
2. coat — long sleeves with cuffs, three blue buttons, hood lump behind the neck, collar; hem chains
3. scarf — striped ribbon round the neck, two tails in front (chains)
4. boots — blue rain boots, height .45
Custom parts: none (the starter uses library parts only)

## Cloth that moves
| part | chains × segments | stiff | why |
|---|---|---|---|
| coat hem | 8 × 3 | .14 | stiffer than a skirt (rubberised cloth), still swings on the walk |
| scarf tails | 2 × 5 | .07 | the light part: lags on the turn, flaps on the walk |

## Clips
1. idle 2.0 s — blink at 0.8 s
2. turn 1.3 s — from -20° to 62° (three-quarter toward the camera, screen right)
3. walk 2.8 s — stride .44, cycle .72 s (short legs, quicker steps)

## Review scene
Default: grey-violet backdrop #8c8ea0, floor #77798a, fixed camera, back view from the turnaround in the corner.

## Review log
- (found while building the library on a test dress) torso skin showed as a "V" above the neckline → torso section made elliptical per height and inset → clean on the coat too
