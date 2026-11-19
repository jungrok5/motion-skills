# 버섯 숲 바구니 — brief

## Topic
"버섯 숲 바구니" — an evening in a forest clearing. Verb: **gather** (fill the basket before the sun goes down).

## Kind
arena — gathering inside one place against a clock; the map is the clearing, the walls are hedges.

## Cast
| key | role | name | Tessera prompt | seed · pick | faces | mass | gait | move / notes |
|---|---|---|---|---|---|---|---|---|
| hog | player | 고슴도치 | hedgehog | 7 · 0 | right | 0.9 | hop | small, quick; pounce (Space) is its big move |
| shroom | item | 빨간 버섯 | red mushroom | 7 · 1 | front | 0.5 | still | floats, warm sparkle |
| beetle | enemy | 딱정벌레 | green beetle | 7 · 1 | front | 1.8 | hop | wander, speed 0.5; heavy: long squat, slow to settle; a pounce flattens it, it pulls itself back up |
| wasp | enemy | 말벌 | wasp | 7 · 3 | left | 0.5 | glide | chase within 80 px, speed 0.75; cannot be pounced — only dodged (it only hits a body on the ground) |

Stance: beetles bumble about without purpose (they decide only between hops); the wasp hangs loose until the hog
comes within sight, then locks on and follows — the one thing on the map that hunts.

## Place
- palette: evening forest `#1c2a1a` · ink `#fbf4e2` · grass `#4f8a3c` · hedge `#2e5a2a` · accent mushroom red `#d8383a`
- floor: grass; walls: hedges (`#`); stumps (`o`, solid, round tops); a pond (`~`, solid, seamless water); thorns (`^`, hazard)
- time / weather: late afternoon, 75 seconds of daylight left

## Level
30 × 20, four rooms made by hedges, a pond in the middle. Beats:
1. Start top-left, two mushrooms in the open — teaches moving and picking.
2. A beetle in the top middle room — the first enemy, where you can see it coming.
3. The wasp's room top-left of centre — the chaser, near the start but avoidable.
4. Thorn patches beside mushrooms (the clearing's edges, by the pond) — take carefully.
5. The far rooms (right side behind the long hedge, bottom right behind thorns) hold the last mushrooms.
Win: all 10 mushrooms · 3 lives · 75 s.

## Tune
124 bpm, A minor turning to C, a bouncy square lead, triangle bass, a quiet four-note arp.

## Text
title 버섯 숲 바구니 · intro: 해가 지기 전에 숲속 빈터의 빨간 버섯 열 송이를 바구니에 담으세요. 딱정벌레는 덮쳐서 잠깐
기절시킬 수 있지만, 말벌은 피하는 수밖에 없습니다. · win 바구니가 가득 찼습니다 · lose 해가 졌습니다

## Tessera
`node scripts/paint.mjs examples/mushroom-basket`. PNGs stay in `ref/` (git-ignored).
- hog: "hedgehog" · 7 → 0 and 2 face right, 1 and 3 left; pick 0 (matches the hand grid, which faces right).
- shroom: "red mushroom" · 7 → four red caps, each with a small face under the cap (the hand grid has none); pick 1.
- beetle: "green beetle" · 7 → seen from above, legs out, like the hand grid; pick 1.
- wasp: "wasp" · 7 → 0–2 face right, 3 faces left; pick 3, so the drawing faces left like the hand grid.

## Review
- still: the pond was drawn with the `ice` look and showed a seam on every tile → a `pond` look (seamless) was added.
- still: stumps drawn as planks read as crates → a `stump` look (round top with rings, the floor round it).
- sheet: the pounce APEX left the top of its cell → arena sheet cells are 42 px tall.
- sheet: the wasp row had no moving cells (it does not hop) → MOVE cells for flyers.
- play: the autopilot (nearest mushroom, straight line) stalls behind a hedge after 7 (it walks straight at the nearest one).
