# 마지막 도넛 — a motion webtoon (brief every agent reads)

A ~74 s **portrait** (1080×1920) **motion webtoon** (무빙툰) drawn entirely in code with the canvas-film harness, in a new
style kit **`webtoon`** built from a survey of webtoon/manga craft collected on GitHub
(`/tmp/claude-0/-home-user-motion-skills/fd9eea32-8e0a-5b99-b5e8-2c64b44dab5a/scratchpad/webtoon-research.md` — read it
first; credit the sources you actually borrow from in the kit's STYLE.md). **No sound.** All-ages office comedy.

## The story (original)
Office, 3 PM. 박대리 finds **the last donut** in the pantry. 김과장 and 최주임 appear. A polite "you have it~" standoff
escalates into a ridiculous shōnen-style battle (가위바위보, slow-motion grab)… and the intern 하늘 calmly eats it — it was
hers. They turn to stone. 사장님 arrives with three full boxes — "but let's eat after the meeting. Meeting starts now!"

### Cast (keep identical across scenes — one shared cast file draws them)
| who | look | personality / gag |
|---|---|---|
| **박대리** (protagonist) | late 20s, messy dark hair with one ahoge (antenna strand), round glasses, rolled-up light-blue shirt sleeves, loose navy tie, dark eye bags | tired, food-driven, internal monologue in pen script |
| **김과장** | 40s, neat side-part, small moustache, grey vest over white shirt, mug in hand | smiles with closed eyes; eyes glint when serious |
| **최주임** | early 30s, short sporty hair, mint hoodie under the blazer, wristband | competitive, loud, fist pumps |
| **하늘** (intern) | early 20s, bob haircut with a yellow hair clip, beige cardigan, lanyard | sweet, oblivious, eats slowly |
| **사장님** (cameo) | 60s, bald with grey sides, big warm smile, burgundy cardigan | kind, terrible timing |
- **The one accent:** the donut's **strawberry pink glaze `#ff6fa3` with rainbow sprinkles** — only the donut (and the donut boxes' pink logo) carries it.
- Everyone else in a calm office palette (warm white walls, pale wood, soft blue-grey shadows).

## Format: a vertical-scroll webtoon that moves
Each scene is ONE long strip of panels the camera reads **downward** (scroll, never cut), as on a phone — gutters are time.
Inside panels, motion-toon micro-animation (blinks, hair sway, steam, parallax, lettering that pops, a small camera move
inside a panel). Switch drawing register by beat: normal cel-shaded → **SD/chibi** for gags → **dramatic manga** (screentone,
speed/focus lines, black backgrounds, heavy ink) for fake-epic beats. Use the research playbook: balloon types (round, shout
spiky, thought cloud, whisper dashed, narration box), SFX lettering (꼬르륵, 두근, 번쩍, 쿠구구구, 휙, 바삭, 우걱, 털썩, 끼익),
emotion symbols (땀방울, 핏줄, 홍조선, 반짝, 물음표·느낌표), panel breaks, a silent beat panel, a white freeze-flash.

## Scenes (each a separate page; together one episode)
| # | id | dur | strip, top → bottom (panel ideas; adapt) |
|---|---|---|---|
| 1 | `ep1-find` | 24 | title card 「마지막 도넛」 → narration box 「오후 3시. 당이 떨어지는 시간.」 over the office → 박대리 slumped at the desk, SFX 꼬르륵, monologue 「…단 거.」 → walks to the pantry (wide, borderless) → the open donut box: ONE pink donut left — over-dramatic close-up with light rays & sparkles, narration 「마지막, 하나.」 → his hand reaching… a shadow falls: 김과장 in the doorway 「어? 박대리도 출출했나 봐?」 (eyes glint) → 최주임 pops up from behind the fridge 「저도요!」 → three-eye strip panel (three horizontal eye close-ups stacked), sweat drop, SFX 두근 |
| 2 | `ep2-standoff` | 26 | polite ping-pong balloons with closed-eye smiles: 「과장님 드세요~」「아냐, 젊은 사람이 먹어야지」「주임님 드세요~」 while a dark aura & SFX 쿠구구구 rises behind each (thought balloons 「(절대 양보 못 해)」×3) → 최주임: 「그럼… 가위바위보!」 → shōnen battle register: black panels, speed lines, three hands in close-up, 「가위! 바위! 보!」 — all 보, again — all 보 (sweat), → 「하나, 둘, 셋 하면 동시에!」 → three hands lunge with focus lines in slow motion toward the donut (panel break: hands burst out of the panel border) |
| 3 | `ep3-twist` | 24 | white freeze flash, SFX 번쩍 → a fourth hand takes the donut; wide calm panel: 하늘 eating, 「아, 이거 제가 아까 사 온 건데… 드실래요?」 (half-bitten, SFX 바삭) → silent beat panel 「……」 → the three turn to grey stone SD and crumble (털썩) → door 끼익: 사장님 with three full pink boxes glowing 「다들 고생 많지? 도넛 사 왔어~」 → three SD faces with tears of joy, sparkles → 사장님: 「근데 회의 끝나고 먹자. 지금 회의 시작!」 → the three dragged off, looking back at the boxes, SD tears → last panel: empty pantry, 하늘 waving 「다녀오세요~」 with a donut → end card 「마지막 도넛 · 끝」 small 「다음 화: 회의는 길었다」 |

Timing: a reader needs ~1.2 s + 0.07 s per Korean character to read a balloon; keep ≤ 2 balloons visible at once
in the reading zone; the scroll eases (stop on a panel, glide through gutters); a gag's punchline panel holds ~1.5–2 s
after a short silent beat. Fade from/to black 0.4 s at each scene's ends. Safe zones: nothing important in the top 140 px
or the bottom 300 px of the frame (phone UI) — the scroll can carry panels through them, just don't stop with text there.

## Rules (canvas-film)
`../../references/SCENE-RULES.md` applies (pure `draw(ctx,t)`, seeded rng only — no `Math.random`, both orientations: this
film is portrait-only, landscape may pillarbox; every string through `Pilot.text`/`Pilot.tr`). Bodies: `../../references/BODY-CHECK.md`
(2-bone IK, hands at the grip, held things move with the hand). Fonts installed and in film.json: Noto Sans KR, Noto Serif KR,
Do Hyeon, Black Han Sans, Nanum Pen Script, Jua (+ Gaegu installed but not listed). Render stills from this project root:
`node ../../scripts/render.mjs v --scene <id> --stills 1,3,…` and LOOK at every PNG.

## Files
- Kit: `canvas-film/kits/webtoon/` (`kit.js` global `Webtoon`, `STYLE.md` with provenance from the research, `template.html` +
  `script.example.js` telling the shared seed story: walk in, kneel, plant, wait, sprout with the accent at 14, stand at 18,
  end card at 26, DUR 30). Vendored as `scenes/kit-webtoon.js`.
- Film: `scenes/donut-cast.js` (the five characters: rig, expressions, SD variants — shared by all scenes),
  `scenes/script-donut.js` (beats and words for all three scenes, keyed by scene id), `scenes/<id>.html`.
