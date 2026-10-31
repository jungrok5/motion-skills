# Styles that worked

Nine looks, all made with the same contract (`window.render(t)`, DOM + CSS transforms, sometimes a `<canvas>`), each
30 fps in 16:9 and 9:16. Pick by **audience and channel**, not by taste: the style is part of the message. Propose one
with a reason, plus 3–4 alternatives with a one-line "who it suits". Live versions of all nine are on the samples page.

| # | style | length | suits | channel | sample |
|---|---|---|---|---|---|
| 1 | Premium kinetic (navy + gold) | 30 s | professional services (tax, law, clinics) — trust, seniority | YouTube, homepage | tax · promo |
| 2 | Paper collage / stop-motion | 20 s | shop owners, restaurants, local business — warm, friendly | Reels, local ads | tax · paper |
| 3 | Chat UI demo | 24 s | freelancers, 2030 side-hustlers — "you can just ask" | Shorts, Reels, marketplaces | tax · chat |
| 4 | Swiss editorial (big numbers, grid) | 21 s | company owners, high-value clients — firm expertise | YouTube, site header | tax · editorial |
| 5 | Whiteboard explainer | 37 s | blog readers, beginners — teacher-like, turns blog posts into a series | blog → 1-min series | tax · whiteboard |
| 6 | Minimal mono + one accent | 30 s | apps, services with a process — "this is easy" | everywhere (the safe main) | `examples/minimal` |
| 7 | Globe journey | 25 s | anything cross-border, logistics, travel — scale, reach | YouTube, site | fortimove · globe |
| 8 | Pop kinetic short (beat-synced) | 18.75 s | young audience, impulse — hook in 1 s | Shorts, Reels, TikTok | `examples/pop` |
| 9 | Unboxing story (desk, polaroids, box) | 25 s | e-commerce, delivery, handmade — the moment of receiving | Reels, product pages | fortimove · unbox |

Rule of thumb: **one channel only → chat UI or pop short**; **brand film + steady content → editorial/premium once +
whiteboard series weekly**; when unsure, minimal mono + accent.

## How each is built

**1 Premium kinetic (navy/gold).** Dark navy radial background, gold hairlines and a gold wipe between scenes (a
diagonal band crossing the frame in 0.84 s). Headlines split into words that rise from a mask; one key word gets a
gold highlight sweep. Props drawn in CSS: a calendar that pops, receipts with zig-zag edges that shake and get stamped
"누락", a tax meter that fills, a profile card with credential chips, a search bar typing the brand name. Music:
minor tension → major at the first answer (9.5 s), 120 bpm.

**2 Paper collage.** Kraft-paper background with grain; every element is a "sheet" with torn edges (CSS clip-path
polygons, seeded jitter) and tape strips. Motion is **stepped** — time quantised to 12 fps (`tq = Math.floor(t * FPS_STOP) / FPS_STOP`)
with a tiny seeded jitter per step — so it reads as stop-motion; elements "slap" down with a 2-frame overshoot and a
camera shake of a few px. Red rubber stamp ("경비 처리 완료") lands with a grunge mask. Hand font for labels (NanumPen),
serif for the business card (Gowun Batang). Keep stamps clear of the words they stamp.

**3 Chat UI.** A phone in the centre (portrait: full-height), generic messenger (no real app's logo/colours): customer
bubble → typing dots → advisor reply quoting the source (blog) verbatim, three Q&As, then a notification card
("새 답변이 도착했어요 · 평균 응답 30분 이내" only if true). Bubbles pop with a back-ease; the list scrolls by `t`.
Lo-fi e-piano 84 bpm, typing and pop SFX. Change the questions → a series.

**4 Swiss editorial.** Off-white paper (#F2F0EB), black type, one blue (#1F3FD1). A grid of hairlines draws itself; a giant number
("16" years) rolls in on digit strips with overshoot; credentials slide up row by row from masks; a blue panel wipes up
and the services list ticks through like a table of contents; ends on name + phone only. Cuts on the beat of a minimal
house loop (120 bpm), fast and clean.

**5 Whiteboard.** White board, marker strokes drawn by animating SVG `strokeDasharray`/`strokeDashoffset` (length from `getTotalLength()`) from `t`, hand font; formula boxes
(매출 − 경비 = 소득), a red circle on the key term, arrows, highlighter sweep; boards erase with a wipe. Calm narration
carries it (longest style, 30–60 s) — pick a voice that reads at normal speed (see SOUND.md). Ukulele-like plucks at
100 bpm, marker/eraser SFX.

**6 Minimal mono + accent** (`examples/minimal`). Site-like greys (#F4F5F7 / white / #111114), one accent (#059669) for
checks and highlights, KakaoTalk yellow only on the CTA chip. Scenes: social post with comment bubbles ("이거 어디서
팔아요?") → search with "no results" shake → chat sending a photo (dark scene) → quote card whose numbers count up +
round stamp "숨은 비용 없음" → pay/inspect/ship cards (button press, camera viewfinder flash, parcel on a dashed arc) →
trust chips → logo, tap on the CTA button with a ripple. Iris transition: the next scene opens as a circle from the
centre (`clip-path: circle()` 0.5 s). Product shown as an SVG illustration (a mushroom lamp) — no stock photos.

**7 Globe journey.** Canvas 2D orthographic globe (sphere gradient, graticule, atmosphere glow, land as dots),
radar rings searching, pins popping on countries, "찾았어요!" card, a great-circle flight arc with a parcel to Korea,
then the four steps as chips and an end card. Cinematic: drone + sonar pings → lift at the flight.

**8 Pop kinetic short** (`examples/pop`). 128 bpm, `BEAT = 60/128`; every cut, word and sticker lands on a beat
(`B(n)`). One word per beat to open ("이거." "어디서." "팔아요?"), colour-block backgrounds that change per section,
stickers with thick outlines, a stamp on the downbeat, "끝." on the drop at beat 10. Build the music on the same grid
(`sound.py`) so the visual and audio hits coincide. Under 20 s.

**9 Unboxing story.** Top-down desk (wood texture, props), a phone sending a photo, a quote slip sliding in, polaroids of
the "inspection photos" dropping with a bounce, a parcel arriving, tape pulled off, flaps opening in 3D
(`perspective` + `rotateY` up to 165°, the inside face showing past 90°), the product glowing, a handwritten honest note, end card. Warm acoustic lo-fi
(90 bpm).

## Borrowed looks from canvas-film
Some canvas-film kits suit a promo too. They are drawn with canvas-film's harness (`Pilot`), not with this skill's
`render(t)` pages, so build that video as a canvas-film scene and mux this skill's sound onto it (or vendor
`canvas-film/harness/lib.js` + the kit into the promo page and call the kit from `render(t)` on a full-frame canvas).

| look | kit | suits | how it reads |
|---|---|---|---|
| **Recipe / step card** | `canvas-film/kits/recipecard` (STYLE.md there) | food & drink, cafés, cooking classes, any service with a short process ("3 steps to …"), how-to promos | cream paper, one hand-inked vessel in the middle that fills as things go in, a "STEP n OF N" card with the big amount, a progress rail, a checklist that ticks, a phone chat card for "book / order now" as the last step. Worked example: `canvas-film/examples/jjukkumi/scenes/cook-recipecard.html` (24 s, a recipe start to finish ending on an invitation chat). After prompt-motion.com looks by @ror_fly and @sarut0bisasuke. |

## Making a new style
Start from `examples/minimal/index.html`: keep the scaffolding (stage W×H by `?f`, `prog/clamp/ease` helpers, `up()`
word reveal, the preview loop) and replace the scenes. Write scene times as constants at the top and use them in both the
page and `sound.py`/`mix.json`. Render stills at every scene's busiest moment in both orientations before the first full render.
