# Snow-pass postman — brief

## One line
A mountain-pass postman in a crimson cloak, navy uniform and a mustard knit cap, a leather satchel at his hip: he
waits, walks, breaks into a run with the cloak streaming, and turns to look back down the pass.

## Topic → design
- Topic / occasion: "a postman who carries letters over a snowy pass" — the proof that a new topic gets a new hero
  (new garments, a custom part, a run, a different orbit)
- Silhouette in one shape: a round cap over a long triangle (the cloak flies back on the run)
- Proportions: height 1.78 m, heads 7.0, build 1.05
- Mass / weight: sturdy and practised — walk cycle .96 s, run .66 s, turn 150° in 1.2 s
- Palette: cloak #9c2f2a (tones #5e1a1c / #9c2f2a / #cf5a3c / #e88a5a), uniform #33405e with brass buttons #c9a44a,
  collar #d9cfb8, trousers #2f3546, boots #2a1f19, cap #d9a33c, satchel #7a4a26
- Face: small dark eyes, brows #5a3a22

## Concept
Rendered with `hero.py concept`; the back view (the cloak's painted back) is pinned in the review.

## Parts, in layering order
1. hair: short bob #6b4428
2. trousers #2f3546
3. uniform top #33405e to the hips, long sleeves, cuffs, collar, four brass buttons
4. **satchel** (custom, `parts.py`): strap across the chest, the bag at the right hip on its own 2-bone chain (lag 2)
5. boots #2a1f19, high, with cuffs
6. cloak #9c2f2a, length .42, opening 96° (the uniform and the satchel show), flare .28, lag 5, clasp + cord
7. hat: beanie (knit cap), short vertical strokes

## Paint
| material | tones | strokes | edge |
|---|---|---|---|
| cloak | #5e1a1c #9c2f2a #cf5a3c #e88a5a, weights .3/.38/.22/.1, light toward the top | cloak default | frayed .045 |
| cap | #a8741f #d9a33c #f0c96a | .02–.05 × .006–.012 m, along v | — |
| the rest | auto | style .06–.15 × .016–.034, jitter 18° | |

## Cloak
9 × 4 chains, lag 5, stiff .07 — a light cloak for running: it streams back and keeps swinging after a turn.

## Clips
| clip | dur | stance / gaze | anticipation | action | recovery |
|---|---|---|---|---|---|
| idle (loop) | 3.5 s | weight on one leg, head turned −6° down the pass | — | breath every 1.75 s, blinks at .9, 2.6 | — |
| walk (loop) | .96 s | upright | — | stride .44 | — |
| run (loop) | .66 s | lean 9°, arms bent | — | stride .8, flight phase | — |
| turn | 2.4 s | turns −150° to look back | wind-up against the turn | steps round | hips settle; the cloak swings wide and settles |

## Review scene
Backdrop #76788f, floor #6d6f86; orbit 20° → −85° (front-right round to the right profile, the satchel side).

## Review log
- run: the loop needed 21 cm of cloth correction (REVIEW.md: "not periodic") → soft limits in the engine → 0.1 cm
- run: lag 0.6 frames — glued to the body → `lag` 3.5 → 5 → run 2.1, walk 4.8 frames
- cap read as a headband, hair through its top → beanie a size up, `sit` .18 → .4
