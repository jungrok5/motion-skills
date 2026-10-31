# 쭈꾸미 한 접시 — storyboard brief (every scene agent reads this)

A ~84 s **portrait** (1080×1920) motion film, all drawn in code with the canvas-film harness: 4 scenes, each in a
**new style kit** built from a look in the prompt-motion.com gallery (owner's choice: styles come from that site, are
made into new kits and added to `canvas-film/kits/`). **No sound** in this film — no `.sound.json`, no audio.

> 쭈꾸미 낚시 → 손질하고 요리 → 친구 부부 초대 → 넷이 함께 식사

## The four new kits (one agent each)
| scene id | new kit | prompt-motion.com source (study the frames in `REF/<kit>/`) | why it fits |
|---|---|---|---|
| `sea-pixelsea` (22 s) | `pixelsea` — pixel-art sunset sea | prompt-motion.com/pluginplay-3d4006 "Pixel art LLM history" (@pluginplay: pixel cliff, sunset sea with sun stripes, pixel caption box + year tag, KRAKOOM impact word, close-up pixel portrait) + prompt-motion.com/hoyoyoda-3a5c08 "Chuseok pixel night scene" (@hoyoyoda: Korean pixel night, full moon, lanterns) | fishing reads like a fishing mini-game: casting, the "HIT!", a catch counter |
| `cook-recipecard` (24 s) | `recipecard` — recipe explainer card | prompt-motion.com/ror-fly-9950f1 "Negroni recipe animation" (@ror_fly: cream paper, one vessel in the middle with measurement ticks, "STEP n OF N" card with the big amount + ingredient name, a progress rail of dots, bottles pour in) + prompt-motion.com/sarut0bisasuke-cefa43 "White Russian recipe animation" (@sarut0bisasuke: script title, checklist ticking off) | the site's own lesson: "show the full recipe start to finish, ingredients + measurements as they go in" |
| `door-shadowstage` (16 s) | `shadowstage` — paper cut-out shadow theatre, 9:16 | prompt-motion.com/x4b47x-9cc84f "Shadow theatre home story" (@x4b47x: velvet curtain proscenium, gradient dusk→night sky, black cut-out house/hills/lamp post/figures, windows that light up warm, a door that opens a light wedge, a hanging dark caption plaque in italic serif) | "what makes a place home" = inviting friends in; the lit door is the turn |
| `table-diorama` (22 s) | `diorama` — symmetrical pastel diorama (Grand-Budapest-like) | prompt-motion.com/itsolelehmann-e47532 "Four seasons train window" (@itsolelehmann: dead-centre symmetry, purple swag curtains with gold tie-backs, pink walls, two pink table lamps, a white tablecloth with lace edge, flat pastel illustration, soft vignette) | a warm dinner table framed like a stage, everyone facing us |

Each reference folder has `SHEET-*.jpg` (12 frames), the single frames, and `PROMPT-*.txt` (the creator's prompt).
**Borrow the craft, write our own renderer; never copy a shot, character, or text from the reference.**

## Direction from prompt-motion.com (every scene)
- Show the process start to finish, label each step where it happens.
- Every scene grows out of the one before; inside a scene no crossfades. Between scenes only a short fade to/from black
  (`Story.fadeBlack(ctx, t, DUR, .5, .5)`).
- Springs with a tiny overshoot at most; no cartoon bounce. Something changes on every beat; strongest moment near the end.
- **Banned:** decorative glows not tied to a light source, particle bursts not tied to an object, lens flares, camera shake
  (pixelsea may shake ≤ 0.25 s on the HIT, pixel-snapped), RGB split, generic gradients (the shadow-theatre sky is a
  deliberate, banded painted gradient — fine), corner text/readouts, holds > 1 s that are not for reading,
  `Math.random` (seeded `Pilot.rng` only), anything that looks like a template.

## Characters (consistent across styles)
- **나 (host, fisher, cook):** short dark hair, navy top, identity mark **mustard `#e2a93b`** (bucket hat when fishing,
  apron at home).
- **배우자 (spouse):** from scene 3 on; green-grey top `#6f8a6a`, hair tied back.
- **친구 부부 (guests):** one in cream `#efe6d2`, one in dusty blue `#5f7fa8`; they bring a small gift box (not red).
- **The one accent = 쭈꾸미 red** (`#d9432b`-ish). Only the octopus and its red sauce carry it.
- All-ages, warm, lightly humorous. No gore (cleaning = rubbing with flour in a bowl).

## Facts
- Autumn (Sept–Nov) is 쭈꾸미 낚시 season: small boat, short rod, a sinker + lure (에기, ochre/green, NOT red), jigging on
  the seabed (고패질); a bite feels heavy ("묵직"). 쭈꾸미: palm-sized, 8 arms, round mantle, reddish-brown.
- 손질: 밀가루(+굵은소금) 넣고 바락바락 → 헹구기 → 끓는 물에 살짝 데치기(약 30초).
- 양념(쭈꾸미볶음): 고추장 2 · 고춧가루 1 · 간장 1 · 다진마늘 1 · 설탕 1 (큰술) + 양파·대파, 센 불에 볶고 참기름 마무리.

## Scenes, hand-offs, words
| # | id | dur | beats | opens on | closes on |
|---|---|---|---|---|---|
| 1 | `sea-pixelsea` | 22 | dawn pixel sea, boat, cast (line arcs out), wait (lure jigging under water, cut-away), **HIT!**, red 쭈꾸미 lifted, catch counter ×1 → ×2 → ×7, sun up, head home | pixel dawn | the bucket of red 쭈꾸미 |
| 2 | `cook-recipecard` | 24 | title card 「쭈꾸미볶음」 → STEP 1 손질 (밀가루 박박) → STEP 2 데치기 30초 → STEP 3 양념 (each spoon drops in with its amount) → STEP 4 센 불 볶기 → STEP 5 참기름 → STEP 6 초대 (a phone card: 「쭈꾸미 잡았어! 저녁 먹으러 와」 → reply 「콜! 7시에 갈게」) → 「완성!」 | the bucket of red 쭈꾸미 | the plate + sent message |
| 3 | `door-shadowstage` | 16 | curtain, dusk sky → night, our cut-out house, windows light up one by one, two guest silhouettes walk in from the left with a gift, door opens a warm wedge, 「어서 와!」 | the house at dusk | the warm open door |
| 4 | `table-diorama` | 22 | symmetric dining room, curtains open, the four seated behind the table facing us (hosts left, guests right), the red 쭈꾸미볶음 steaming in the centre, chopsticks reach, glasses meet 「짠!」, laughter, end card | warm light | end card |

Captions: short Korean, ≤ 2 lines, ≥ 2 s each (≥ 3.5 s for a sentence). Suggested (adapt to the picture, keep few):
1. 「시월, 새벽 바다」 → 「고패질… 톡, 톡」 → 「HIT!」/「묵직하다!」 → 「한 마리, 또 한 마리」 → 「오늘 저녁은 정했다」
2. card text per step as above; title 「쭈꾸미볶음」 small line 「바다에서 바로 온」
3. 「저녁 일곱 시」 → 「친구 부부가 왔다」 → 「어서 와!」
4. 「잘 먹겠습니다!」 → 「짠!」 → 「넷이 먹으니 더 맛있다」 → end card
   `{ title: '쭈꾸미 한 접시', passage: '낚시 · 요리 · 초대', by: '2026. 10. 31', compact: true }`
Portrait safe zones: no words in the bottom 380 px or the right 140 px; nothing important in the top 160 px.

## What each agent delivers
1. **The kit** in `canvas-film/kits/<kit>/`, same shape as the existing kits (read `canvas-film/kits/README.md` and one
   existing kit end to end, e.g. `kits/bass/` — `kit.js`, `STYLE.md`, `template.html`, `script.example.js`):
   - `kit.js`: one global (`Pixelsea`, `RecipeCard`, `ShadowStage`, `Diorama`), every export commented; the medium only
     (palette, textures, frame/stage pieces, figure rig, captions, end card, fades) — never this film's story.
   - `STYLE.md`: title line, **provenance** (the prompt-motion.com URL(s) + creator handle(s), "borrowed craft, own
     renderer"), What it looks like, Meanings it carries (well / badly), Palette, Fonts and words, API with a usage
     example, Motion grammar, Performance (measure ms per frame), Pitfalls, What a scene author still draws.
   - `template.html` + `script.example.js`: the shared seed story every 2026-10 kit template tells (walk in, kneel,
     plant, wait, sprout with the accent at 14 s, stand at 18 s, end card at 26 s, DUR 30) — so it compares with the
     other kits. Pages load `lib.js`, `story.js`, `script.js`, `kit-<kit>.js` from `scenes/` (see `scripts/from-kit.py`).
2. **The film scene** in this project: copy the kit to `scenes/kit-<kit>.js` (vendored, as from-kit.py does), write
   `scenes/<id>.html` and `scenes/script-<kit>.js` (the film's beats/lines; `DUR` as above). Film-specific drawing
   (the octopus, the boat, the four people, the dish) stays in the scene or a `scenes/<id>-*.js` helper, not the kit.
3. **Checks**: render stills of the scene AND the template (`node ../../scripts/render.mjs v --scene <id> --stills …`
   from this project root; for the template, make a scratch project with `python3 ../../scripts/from-kit.py <scratch> --kit <kit>`
   in the scratchpad) and LOOK at every PNG; iterate until it looks finished. Bodies: follow `references/BODY-CHECK.md`
   (2-bone IK, hands at the grip, run `scripts/body-check.py` where figures act). Fonts installed: Noto Serif KR,
   Noto Sans KR, Do Hyeon (in film.json). If the kit needs another Google font, tell the lead instead of adding it.

Own only: `kits/<your kit>/`, `scenes/kit-<your kit>.js`, `scenes/<your id>.html`, `scenes/script-<your kit>.js`,
`scenes/<your id>-*.js`. Do not edit `lib.js`, `story.js`, `film.json`, `kits/README.md`, STYLE-INDEX, other kits or
other scenes. Don't commit. Don't render videos.

## CAST — owner's correction (overrides "나 / 배우자 / 친구 부부" everywhere above)
This is a real story: **경찬 · 명현 부부** caught the 쭈꾸미 and invited **정록 · 세진 부부** to dinner.
- **명현 (host, wife of 경찬) caught the 쭈꾸미.** She is the fisher in scene 1. Woman, dark hair tied back (low
  ponytail/bun), navy top; her identity mark is the **mustard `#e2a93b`** (bucket hat when fishing, apron at home).
- **경찬 (host, husband):** man, short dark hair, green-grey `#6f8a6a` top (+ an apron at home if cooking).
- **Cooking: the two of them together** (경찬 and 명현 side by side; e.g. one rubs/stirs while the other adds the sauce, or
  they hand over the pan). Where a scene has no figures, say it in words (「경찬 · 명현 부부의 쭈꾸미볶음」).
- **정록 · 세진 (guests, a couple):** one in cream `#efe6d2`, one in dusty blue `#5f7fa8`; they bring a small gift box.
  (Keep them as already drawn; just give them their names where names appear.)
- **Names on screen (owner wants them):** use them naturally and sparingly, polite form with 님 in captions, plain in
  the chat UI. Suggestions:
  - scene 1: after the hit 「명현님이 낚았다!」 (or 「명현님, 한 마리 또 한 마리」)
  - scene 2: subtitle/caption 「경찬 · 명현 부부의」; the chat is sent by 명현 to a group 「정록 · 세진」:
    「쭈꾸미 잡았어!」 → 「저녁 먹으러 와」 → reply 「콜! 7시에 갈게」
  - scene 3: 「정록 · 세진 부부가 왔다」 → 「어서 와!」
  - scene 4: place cards / name tags or face-panel labels 경찬 · 명현 · 정록 · 세진; end card
    `{ title: '쭈꾸미 한 접시', passage: '명현님이 낚고, 경찬 · 명현 부부가 차린 저녁', by: '정록 · 세진 부부 초대 · 2026. 10. 31', compact: true }`
    (shorten if it doesn't fit; keep ≤ 2 lines per field).
- Seating at the table: hosts 경찬 · 명현 together on one side, guests 정록 · 세진 on the other.
