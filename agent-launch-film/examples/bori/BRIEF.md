# BRIEF — 보리 (Bori)

## The product and the one line
- Product / agent name: 보리 — a meal-planning agent.
- What it does: from one photo of the fridge it plans a week of dinners around what runs out first and orders the rest.
- The one line: "냉장고 사진 한 장으로 일주일 저녁" — end card "오늘 저녁은 된장찌개."
- User: 지민 (shown in the greeting and on their bubble, avatar "지").
- Korean · 1920 × 1080 · ≈ 49 s, 9 scenes.

## Brand
- Accent: kitchen green `#1E9E5A` (the name, the numbers that matter, the order button, "after" bars).
- Glows: mint `#9ADBB4`, honey `#F6C978`, peach `#F5B49A`, sky `#B9D4F2`.
- Ground: warm off-white `#EEEDE8`.

## Mascot
- A white rice cooker with a brushed lid and a dark front panel — the object at the centre of a Korean kitchen.
- Screen: the panel, 34 × 12 dots, amber `#FFB23E` (Hangul needs ≥ 11 rows).
- Screen words: 보리 → 준비 (hello) · 완료 (blinking) → 보리 (end).
- Idle: bob and tilt; **steam** (soft white puffs) rises from the lid vent instead of sparks.
- Nods: when the user hands over the photo (2.95 s) and when it is done.

## Beats
| # | scene | the viewer learns | device | readable lines | out |
|---|---|---|---|---|---|
| 1 | hello | it greets 지민, wakes, takes the fridge photo | greeting + mascot + input + cursor | 저녁 고민 끝, 지민 님 · 우리집 냉장고.jpg | push |
| 2 | learn | it already knows their taste and budget | stack of 2 cards | 지민 님 입맛을 배웠어요 · 맵고 간단한 한식 · 50,000원 | recede |
| 3 | scan | what is in the fridge, what runs out first | carousel of ingredient cards + counter + chip | 냉장고 속 재료 14가지 · 두부 · 애호박은 내일까지 | push |
| 4 | ask | it proposes, 지민 adds one wish | chat + recipe poster + chip | 4 bubbles · 된장찌개 · + 청양고추 2 | recede |
| 5 | search | it weighed many recipes | swarm of dish posters + counter | 레시피 48,000개 중에서 | recede |
| 6 | week | seven dinners | spotlight row of 7 posters walking 월 → 일 | 일주일 저녁, 정했어요 | whip |
| 7 | order | the shopping list and one button | card with rows + ready bar + cursor + chip | 12개 · 46,800원 · 내일 아침 7시 도착 | recede |
| 8 | result | what the week changed | before / after bars | 이번 주, 35,200원 아꼈어요 | recede |
| 9 | end | done; the line that stays | mascot + end line | 오늘 저녁은 된장찌개. | — |

## Cards and drawings (art.js, designed for this topic)
- Ingredient tiles (120 × 120): 두부, 애호박, 달걀, 양파, 김치, 돼지고기, 대파, 버섯, 감자 … each a soft tile and a simple object;
  a D-day tag, red when it is D-1.
- Dishes from above: a bowl (뚝배기, white bowl or plate), the broth, the pieces in it (tofu cubes, zucchini half-moons,
  pepper rings, egg …) placed from a seed. Seven of them make the week (월 된장찌개 … 일 달걀국).
- Texture (not read): sliders, the "땅콩 빼기 · 오이 빼기" chips, meta lines, the list's quantities.

## Numbers (illustrative, not claims)
- 14 ingredients · 48,000 recipes · budget 50,000원 · order 12 items 46,800원.
- Bars: 식비 82,000 → 46,800원, 버린 재료 6 → 0개, 장보는 시간 50 → 3분.

## Sound
- score.mjs: 96 bpm, root C3, chords I – IV – ii – V with sixths, plucked arpeggio, UI sounds from the cues.

## Generated references
- None. Everything is drawn and keyed in code.
