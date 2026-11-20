# 등대 고양이 — brief

## Topic
"등대 고양이" — a stray cat at a lighthouse after a storm. Verb: **climb** (from the shore to the lamp at the top).

## Kind
platform — the story is going up a cliff to a light; height is the progress bar.

## Cast
| key | role | name | Tessera prompt | seed · pick | faces | mass | gait | move / notes |
|---|---|---|---|---|---|---|---|---|
| cat | player | 고양이 | orange cat walking | 21 · 1 | right | 1.0 | hop | idle: breathes, shifts weight; quick, light |
| fish | item | 생선 | silver fish | 7 · 0 | left | 0.5 | still | floats with a shadow, sparkles pale blue when taken |
| crab | enemy | 게 | red crab | 7 · 0 | front | 1.4 | hop | patrol, speed 0.55; low and wide, heavier than the cat: longer squat, deeper landing |
| gull | enemy | 갈매기 | white seagull flying | 7 · 0 | left | 0.7 | glide | patrol 5 tiles over the sea gap; stompable |
| lamp | goal | 등불 | lighthouse lantern | 7 · 1 | front | 2.0 | still | the end of the climb |

Stance: crabs wander loose along their stretch (they turn at every ledge — they do not hunt); the gull sweeps back
and forth over the one gap where a jump is forced, so it reads as a threat you time, not one that chases.

## Place
- palette: night navy `#0c1024` · ink `#f4ecdc` · moon `#f6eec8` · rock `#3b3a4e` · accent warm lamp `#ffcf5a`
- backdrop (back → front): dithered night gradient, stars, moon, slow clouds, dark mountains, a moving sea line
- tiles: rock cliff (`#`), a driftwood plank (`=`, one-way), sea urchins (`^`, hazard), sea water (`~`, pit)
- time / weather: night after a storm, calm sea, clear moon

## Level
72 × 12. Route in beats:
1. Start on flat rock; a fish one jump up — teaches the jump.
2. A 2-tile water gap — the first pit, on its own.
3. A crab under a driftwood plank with a fish on it — stomp or hop over, then up to the plank.
4. A 2-tile step up, one urchin on top — the first hazard, alone.
5. The gap with the gull over it and a fish above — timing, combined.
6. Low ground with two urchins and a crab — combined.
7. Three 2-tile stairs up to the cliff top; a fish high above the last step.
8. The cliff top: a crab, then the lamp at the end.
Win: reach the lamp with all 5 fish (the lamp says "FISH 5" until then) · 3 lives · no timer.

## Tune
96 bpm, D minor, a slow triangle lead (sea shanty shape) over a triangle bass walking D–A–Bb–C.

## Text
title 등대 고양이 · intro: 폭풍에 등대 불이 꺼졌습니다. 절벽 아래로 떠밀려 온 생선 다섯 마리를 모아 등불의 기름을
채우세요. 게는 밟고, 성게는 피하고. · win 등대에 다시 불이 켜졌습니다 · lose 파도에 휩쓸렸습니다

## Tessera
`node scripts/paint.mjs examples/lighthouse-cat` (CPU in headless Chromium, ~85 s per prompt for four). The PNGs stay in
`ref/` (git-ignored).
- cat: "orange tabby cat" · 7 → four front-facing, sitting cats; wrong for a side-view climber whose turns should show.
  "orange cat walking" · 21 → four side views facing right, tail up, close to the hand grid; pick 1 (cleanest outline).
- fish: "silver fish" · 7 → 0 and 3 face left; pick 0. The hand grid was mirrored to face left as well.
- crab: "red crab" · 7 → four front views, claws up, like the hand grid; pick 0.
- gull: "white seagull flying" · 7 → wings up, beak left in 0; pick 0. The hand grid was mirrored to face left.
- lamp: "lighthouse lantern" · 7 → 0 has stray blue shapes in the top corners; pick 1.

## Cat painter
The hero can also be painted by the cat painter trained in this repo (`models/cat/`, 3.56 MB): `painter.for: ["cat"]`,
`painterPrompt: "front-view ginger cat"`, seed 7, pick 0, `painterFaces: "front"` — a front view, because the painter cannot
be told which way a side view faces. The other members keep their hand grids (the painter knows only cats).

## Review
- check: the first plank (3 tiles up) was out of reach (apex 46 px) → plank moved to 2 tiles up, its fish with it.
- sheet: every walker's top rocked ±3 px on each hop → lean now follows the lagged mean velocity (LESSONS).
- sheet: crab idle cells identical (0.4 px breath) → breath is at least 0.9 px of the sprite's height.
- sheet: the gull stood still at rest → flyers bob 0–3 px.
- sheet: cat landing at 52 % height looked like a pancake → landing kick by impact, mass-dependent squash spring (73 %).
- still: the falling-into-water case cost two lives → water is a pit: one life, back to the last safe footing.
- play: the autopilot (nearest fish, jump at walls, gaps, hazards and enemies) clears it in 13 s, losing one life.
