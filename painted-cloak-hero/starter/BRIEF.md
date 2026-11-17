# Rain ferryman — brief

## One line
A river ferryman in a wide sedge hat and a moss-green rain cloak: waiting at the landing, then walking up the bank,
then turning back to look at the river.

## Topic → design
- Topic / occasion: the skill's starter — a hero the source does not have (no straw sun hat, no blue cloak)
- Silhouette in one shape: a shallow cone over a long column; the cloak is the shape that swings
- Proportions: height 1.72 m, heads 6.8, build 1.0
- Mass / weight: average, unhurried — walk cycle 1.0 s, turn 180° in 1.3 s
- Palette: cloak #3d6b4f (tones #24432f / #3d6b4f / #6f9a6c), shirt #e6dfcb, trousers #46503f, boots #4a3426,
  hat #c9a35a with #5a3b22 band and ties, clasp #b08d3c
- Face: small dark eyes in the hat's shade, calm

## Concept
Rendered with `hero.py concept` (front + back); the back view is pinned in the review.

## Parts, in layering order
1. hair: short bob #2a1d16
2. trousers #46503f, fit 1.25
3. shirt #e6dfcb to the hips, short sleeves, collar
4. boots #4a3426, mid-calf
5. cloak #3d6b4f, length .3, lag 4, a brass clasp and cord
6. hat: cone (sedge), ties under the chin, frayed rim

## Paint
| material | tones | strokes | edge |
|---|---|---|---|
| cloak | #24432f #3d6b4f #6f9a6c | cloak default (long, down) | frayed hem .06 |
| hat | #8f6c34 #c9a35a #e8cf8a | short, radial | frayed rim .02 |
| the rest | auto | style .06–.16 × .018–.036 m | |

## Cloak
9 × 4 chains, lag 4, stiff .08, damp .1 — a wet wool cloak: heavy, a beat behind.

## Clips
| clip | dur | stance / gaze | anticipation | action | recovery |
|---|---|---|---|---|---|
| idle (loop) | 4.0 s | weight shifting, looking out | — | breath twice a loop, blinks at 1.2, 3.1 | — |
| walk (loop) | 1.0 s | upright | — | stride .42 | — |
| turn | 2.2 s | turns 180° back to the river | wind-up against the turn | two steps | hips settle; the cloak swings on |

## Review scene
Default backdrop #7d7a97, floor #76738f, grid #8c89a3; orbit −25° → 80°.

## Review log
- walk: lag measured 1.0 frame (the bob counted) → measure the horizontal swing → 2.1 frames
- walk: 2.1 frames reads a little stiff for wet wool → `lag` 3 → 4 → 3.4 frames
