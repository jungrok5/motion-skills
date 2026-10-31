# 쭈꾸미 한 접시 (기존 키트판) — storyboard brief (every scene agent reads this)

This is the version built with the EXISTING kits (a sister film `../jjukkumi/` uses new kits from prompt-motion.com looks).
A ~82 s **portrait** (1080×1920) motion film, all drawn in code with the canvas-film harness, 4 scenes, each in a
different style kit chosen for what it carries:

> 쭈꾸미 낚시 → 손질하고 요리 → 친구 부부 초대 → 넷이 함께 식사

Request (owner, Korean): "prompt-motion.com 을 참고해서 다양한 기법과 적합한 스타일을 골라, 쭈꾸미 낚시를 해서 요리를 하고
친구 부부를 초대해서 같이 식사를 하는 과정을 영상으로 만들어줘."

## Direction borrowed from prompt-motion.com (apply in every scene)
- **Show a process from start to finish**, and label each step where it happens (e.g. ingredients + amounts *as they go in*).
- **Every scene grows out of the one before** — no crossfades inside a scene; between scenes a short fade to/from black
  (~0.5 s) only, and each scene opens on the image the last one closed on (see "hand-offs").
- **Springs with a tiny overshoot at most**; no bouncy/cartoon easing (except mograph's own chunky-type squash, kept small).
- **Banned:** decorative glows, particle bursts not tied to an object, lens flares, camera shake (except ukiyoe's one
  "hit" shake ≤ 0.3 s), RGB split, generic gradients, corner text/readouts, holds > 1 s that are not for reading,
  `Math.random` (seeded rng only), anything that looks like a template.
- One beat = one idea; something changes on every beat; the strongest moment sits near the end of the scene.

## Characters (keep consistent across styles)
- **나 (host, fisher, cook):** short dark hair, navy jacket/top, and the identity mark **mustard `#e2a93b`** — a mustard
  bucket hat when fishing (a straw kasa is fine in ukiyoe if its band/tie is mustard), a mustard apron when cooking/at home.
- **배우자 (my spouse):** appears from scene 3 on; green-grey top `#6f8a6a`.
- **친구 부부 (the guests):** two people; one in a cream/white top, one in a dusty-blue top `#5f7fa8`; they bring a small
  gift (a bottle or a fruit box) — not red.
- **The one accent everywhere = 쭈꾸미 red** (reddish-orange/beni). Only the octopus (and later its red sauce) carries it.
  Nothing else on screen is that red. In each kit, set the kit's accent to this red (ukiyoe already uses beni `#b8412f`).
- All-ages, warm, lightly humorous. No gore: cleaning the octopus = rubbing with flour in a bowl, no cutting of a live animal shown.

## Facts (keep them right)
- Autumn (Sept–Nov) is 쭈꾸미 낚시 season; it's done from a small boat with a short rod, a sinker + a lure (에기, bright
  ochre/green lure, NOT red), jigging the lure up and down on the seabed (고패질); the octopus grabs the lure and feels
  heavy ("묵직"). 쭈꾸미 is small (palm-sized), 8 arms, roundish head (mantle), reddish-brown, turns redder when cooked.
- 손질: 밀가루(+굵은소금) 넣고 바락바락 주물러 씻기 → 헹구기. 끓는 물에 살짝 데치기 (~30초).
- 양념 (쭈꾸미볶음): 고추장 2 · 고춧가루 1 · 간장 1 · 다진마늘 1 · 설탕 1 (큰술) + 양파·대파, 센 불에 볶고 참기름 마무리.

## Scenes, timings, hand-offs
| # | id | kit | dur | what happens | opens on | closes on |
|---|---|---|---|---|---|---|
| 1 | `sea-ukiyoe` | ukiyoe | 22 s | dawn sea, boat, cast, wait, **the hit**, red 쭈꾸미 lifted out, bucket fills, boat turns home | dawn sea | red 쭈꾸미 in the bucket |
| 2 | `cook-mograph` | mograph | 22 s | worlds swap on bars: 손질(밀가루) → 데치기 → 양념 (amounts drop in on beats) → 센 불 볶기 → phone chat invite → 완성 | the bucket of red 쭈꾸미 | sent chat bubble / plate done |
| 3 | `door-hopper` | hopper | 14 s | dusk at home: still hall, warm lamp, the red dish waiting on a side table; doorbell; the door opens; two guest silhouettes in the doorway, their shadows reach in | still hall at dusk | door wide, warm light |
| 4 | `table-risoline` | risoline | 24 s | top-down table: the red 쭈꾸미볶음 in the middle, four people's hands from four sides, chopsticks, "짠!", face inserts laughing, end card | warm light over the table | end card |

Captions are short Korean, ≤ 13 characters a line where the kit asks for it, ≥ ~2 s each (≥ 3.5 s for a sentence), ≤ 2 lines.
Suggested lines (adapt freely to the picture; keep them few):
1. 「시월의 새벽 바다」 → 「줄을 내리고, 기다린다」 → 「툭— 묵직하다!」 → 「한 마리, 또 한 마리」 → 「오늘 저녁은 정했다」
2. chunky type per world: 「손질 시작!」「밀가루로 박박」「끓는 물 30초」「고추장 2」「고춧가루 1」「간장 1」「마늘 1」「설탕 1」
   「센 불에 휘리릭」; chat: 「쭈꾸미 잡았어!」「저녁 먹으러 와」 ← reply 「콜! 7시에 갈게」; 「완성!」
3. 「저녁 일곱 시」 → (doorbell, no caption or a small 「딩동」) → 「어서 와!」
4. 「잘 먹겠습니다!」 → 「바다에서 온 한 접시」 → 「짠!」 → 「넷이 먹으니 더 맛있다」 → end card
   `{ title: '쭈꾸미 한 접시', passage: '낚시 · 요리 · 초대', by: '2026. 10. 31', compact: true }`

## Files (project root: `canvas-film/examples/jjukkumi-kits/`)
Each agent owns ONLY: `scenes/<id>.html`, `scenes/script-<kit>.js`, and any helper
`scenes/<id>-*.js` it adds. Do NOT edit `lib.js`, `story.js`, `kit-*.js` (if a kit primitive is missing, write your own
in your helper file), `film.json` or another scene's files. Set `SCRIPT.DUR` to the scene's duration above.
Fonts are installed (Noto Serif KR, Noto Sans KR, Do Hyeon). Render stills from the project root:
`node ../../scripts/render.mjs v --scene <id> --stills 1,3,5,…` → `out/still-<id>-v-<t>.png` (portrait only; this film is
portrait-only). LOOK at every still you render. Don't render videos.
**No sound** for this film (owner's decision): write no `.sound.json`, generate no audio.
