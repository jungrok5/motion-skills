# Last Bowl

ONE LINE: a walker under an umbrella heading for the last noodle stall at the end of a rainy alley, steam rising
under the lanterns.

## Scene (scene.js → scene(S))
- Setting: horizon 1000 · ground wet · fog #d4d5d6 — evening rain, the street a mirror, the city behind lost in it
- Main subject: the walker, facing away (toward the stall), stride .3, long coat, no hat; umbrella in the right hand held
  at chest height outside the shoulder (`reach` right [530, 1150]), left arm hanging; h 600 — a third of the page
- Props in hand: an umbrella (r 150, up 190, tilt −16°) — its canopy stays clear of the stall
- Middle ground — designed in the piece, not the kit: the stall's **awning** (sloping roof, scalloped valance, two
  posts), its **counter** (pot, menu board), two **lanterns** hanging under the valance (separate shapes: they are seen
  through the hole between the posts), two **stools**; a street **lamp**; the alley **block** on the left with a stepped
  parapet and a balcony unit
- Far: a skyline with one spire between the wall and the stall (depth .9)
- Painted only: a puddle in the foreground

## Route (line(L, S))
1. Start at the foot of the wall [40, 1338]: up its edge, along the stepped parapet, partway down the far side (`block`)
2. `wire`: an overhead wire across the alley to the awning in three steps with hooks
3. `awning`: round the roof and down the far post; detours to each lantern from the valance; back up the near post
4. `counter`: down the near post onto the counter, round it to the pot; `steam` (detour): three rising loops, back
   down; the rest of the counter
5. `umbrella`: across to the canopy's right tip, under it to the shaft and down to the hand; `walker`: round the
   figure; `umbrella`: back up the shaft and over the rest of the canopy
6. `city`: along the horizon to the skyline, over it leftwards; `lamp`: round it; `block`: the rest of the wall to the kerb
7. `street`: down the margin, wide zigzags; `reflections`: the walker's reflection from the bottom up; `stools`; the
   counter's light in the wet street
8. End: down the right edge and the base rule back under everything (y ≈ 1840)

## Film (piece.html)
- Draw 44 s · zoom 2.4 · breathers auto
- Pauses: after the awning, after the walker
- Signature: null
- Timings: 1.8 · 44 · 1.9 · 1.5 · .9 · 1.5 · 2.6

## Review log
- the stall as one shape: lanterns and pot were never traced (inside a hole) → separate shapes with detours
- the scallops ran off the page (span computed from x1 not from the left end) → span = right − left
- stools and city travels crossed the walker → stools moved to the reflections stage; the umbrella entered from its tip
- `right shoulder −39° outside out −10…165°` (umbrella hand low and inside) → hand at chest height outside the shoulder
- the umbrella's canopy overlapped the awning: its tip sat inside the stall and every travel to it crossed the
  awning → walker to x 395, umbrella r 150 tilted −16°, stall moved right to x 650
- the signature sat on the base rule → clamp 26 px above the page bottom
- check.mjs: all checks passed (line 20 793 px, 38 loops, nib in frame throughout)
