# Windy Walk — storybook-short brief (the starter)

## Topic
- Given: "a windy day out on the hills" (the starter's own topic, chosen to be far from the source film)
- In one line: Rowan stands on a windy hilltop watching the gulls, then walks home along the ridge path with his dog
  trotting behind.
- Not this: the source film's shots (a girl with a puffin on her hat by a sea cliff, a Roman square, an autumn park walk,
  a tram bench); no sea, no city.

## Cast
- **Rowan**, about eight, cheerful, a little wind-blown. Head: `short` hair with a full fringe, dark brown with ochre
  streaks, freckles, a red-and-yellow striped beanie with a pompom (`wear.beanie`). Body: a teal quilted coat with a
  yellow collar and yellow buttons, navy legs, brown shoes, yellow mittens, a yellow-and-red scarf blowing back.
  Mass light. Idle: quick breath (3.4 s), eyes up at the sky. Sizes: close-up a = 230, wide a = 74.
- **The dog** (critters.dog, a = 72): tan, trots after him; its lifted front paws fold back, hind paws forward.

## Shots
| # | name | s | framing | place | who and what | camera | in |
|---|---|---|---|---|---|---|---|
| 1 | hilltop | 7 | close-up | sky with clouds, far hill with trees, near hill | Rowan looks up at the gulls, follows one, then looks at us and smiles; leaves blow past | slow pull back 1.04 → 1.0 | paper |
| 2 | ridge path | 9.4 | wide | sky, far hills with poplars, a fence along a sandy path, grass in front | Rowan walks home left → right; the dog trots after him and barks | slow pan right | dissolve |

## Motion
- Keys set by hand from observed timing; no generated video.
- Walk: x 360 → 1560 in 0.6–8.6 s (≈ 2.2 steps/s, stride 2.1 a, snapped so both feet end planted).
- Glances: hilltop — gaze up at 0.8, follow the gull with the head at 2.2 (yaw 0.12), back to us at 4.4; ridge — looks
  back at the dog at 3.2 (yaw −0.1), forward again at 4.6.
- No big keyed move in the starter (the example has one).

## Sound
- Score: F major, 92 bpm, I–V–vi–IV; hilltop `soft`, ridge path `full`.
- Ambience: wind + birds in both shots. Events: woof ×2 at 3.1 s of the ridge path. Footsteps on grass.

## Review
- Round 1: the close-up actor stood at the wrong height (head below the frame); trees cut off at the plate's top edge;
  clouds were flat domes. Fix: `actor.groundFor(headY)`; plate boxes include the tree tops; clouds from overlapping lobes.
- Round 2: `check.mjs` — feet missed their targets by 4 px and a planted foot drifted 1.5 px: the pelvis bob was upside
  down (highest at the heel strike), so the leg could not reach. Fix: lowest at the heel strike; stride 2.1 a.
- Round 3: story 8 · style 8 · characters 8 · places 7 (a simple ridge, by design) · alive 9 · bodies 9 · big move — ·
  sound 8 · own film 9 · child 8. `check.mjs` passes.
