# Last Cast

ONE LINE: an angler at the end of a jetty in lake fog, casting toward the far pines while gulls drift over.

## Scene (scene.js → scene(S))
- Setting: horizon 800 · ground water · fog #d9d9d6 — still morning water, no wind, everything far lost in grey
- Main subject: the angler, facing right (out over the water), stride .15, lean 6°, cap, short coat, backpack; both hands
  on the rod (`reach` near [700, 1040], far [682, 1004]); h 500 — a quarter of the page
- Props in hand: the rod from the near hand to [962, 560]; the fishing line drawn by the line only, to a float
- Middle ground: the jetty (deck and posts) with its mooring post as one silhouette; a rowing boat bow-left below it;
  a small sailing boat far out on the left
- Far: a low ridge (depth .92) and pines on the far shore (depth .72), teeth every 26 px
- Painted only: the mooring post's own reflection (`trace: false`)

## Route (line(L, S))
1. Start top left [130, 350]: the top rule in two steps with hooks (`sky`)
2. `sky`: a hook down to the first gull, across to the second, a step back up to the rule
3. `far shore`: a hook, down the right edge, over the pines leftwards, onto the ridge crest, along it to the left edge
4. `sail`: down the left edge to the sailing boat, round it with loops, its reflection
5. `jetty`: onto the deck at its left end, along the top to the angler's back foot
6. `angler`: round the back, the head, the cap brim, down the front to the near hand
7. `rod` (detour): up the rod, the fishing line down to the float, a loop, back up the line, down the rod to the hand
8. `angler`: the rest of the figure back to the foot; `jetty`: the rest of the deck, posts with loops, the post
9. `reflections`: down the jetty's end to the waterline, under the posts to the angler's reflection, down it
10. `boat`: round the boat, its reflection; `water`: long soft zigzags; the base rule to the right
- End: the base rule at y ≈ 1812; signature loops under its right end

## Film (piece.html)
- Draw 42 s · zoom 2.4 · breathers auto (two)
- Pauses: after the ridge (looking at the composition), after the angler
- Signature: null (loops only)
- Timings: 1.8 · 42 · 1.9 · 1.5 · .9 · 1.5 · 2.6

## Review log
- first route: bare diagonals from gulls to ridge, ridge to rod, rod to jetty → travels along the frame edge and horizon
- pines read as a comb at 2.4× → teeth every 26 px
- the jetty contour began with a line through the legs → jetty until the foot, figure, then the rest of the jetty
- left half empty → the sailing boat far out under the ridge
- `near hand cannot reach [726, 1040]` → grip pulled in to [700, 1040]
- check.mjs: all checks passed (line 18 257 px, 27 loops, nib in frame throughout)
