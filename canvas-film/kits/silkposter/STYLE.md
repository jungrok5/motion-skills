# 실크스크린 포스터 (silkscreen travel poster)

Kit: `kit.js` → vendored as `scenes/kit-silkposter.js`, global `window.Silk`. Source: one-scroll-bible
`motion/films/messiah/kit-silk.js` (「메시아 예언과 성탄」, round 1, 2026-11-02). The drawing code is the film's file unchanged;
only the header gained the kit line. It depends on nothing but `lib.js` (`Pilot`). It is our own renderer. The craft follows
the Lemo-Opuscar `silkscreen-poster` brief (and OPUSCAR no. 11, the WPA silkscreen poster) and the 1930s–40s national-park
screen prints.

In that film it replaced the rejected mosaic in part 3 (1:01–1:35) as three posters, "made to read on a phone".
- **「나사렛」**: a Galilee village at dusk with stepped sky bands, a gold sun with rings, ridges, and houses with gold windows. The name was printed big into the sky with `Silk.title`.
- **The empire**: a sea ink with a navy header band, and Rome as a red seal. The decree was stamped as red dashes along the roads (`Silk.dashes`), reaching Judea last, where a gold dot got a wet sheen.
- **The journey**: a night ink, land, glinting lakes, and a gold dashed route from Nazareth to Bethlehem. Mary on a donkey and Joseph were drawn as a pictogram, the towns as icons, and a km counter counted up to 150.

**Why it was dropped.** About 40 minutes later the maintainer compared the pilots with the first film and said: "너무
일러스트 느낌은 가벼워 보여 … 이 채널에서 만드는 영상은 전부 지금 방향으로" (commit `023981b`). The silkscreen posters (and the word-log cave
cartoon) were taken out as "illustration, it looks light". The channel rule `cinematic` came from that moment: counters,
labelled maps and numbered lists are out, and so are flat graphic, poster, cartoon and game looks. Part 3 was redrawn the
same night as cinema (`ab61813`, `world3d`: Nazareth at evening, Rome backlit, two figures on a sunset ridge). The film no
longer loads this file.

The poster did fix what the mosaic broke: it read in one second on a phone. That is still its strength.

Template: `template.html` is a different subject, a mountain lake at sunrise in the manner of a national-park print.
1. Six inks are each pulled once with the squeegee. The near ink comes first, because it is the ground the words stand on. The rest go from light to dark: sky bands, sun, rings, far peaks and their snow, hills, lake, reflection, and the near shore with its pines.
2. A small sail crosses the lake, its wake stamped dash by dash.
3. Three birds cross.
4. The sun's ink catches the light.
5. A last pull lays the end-card plate.

The layers drift a little by depth.

## What it looks like
- **Inks:** opaque, hard-edged flat inks, **≤ 6 per poster**, each laid by one squeegee pull. `k` reveals an ink from one side with a ragged front.
- **No gradients.** Skies are stepped bands, and the boundaries break into thinning stripes.
- **Each ink is a little off register** (a paper sliver shows). Each has a darker overprint ghost and a thin lit rim top-left, which is the thickness of fresh ink.
- **Values step:** far = light, near = dark. There is one bright accent (gold here; the film also used red once, for the decree).
- **One ink, one beat.** Information is printed in order, and it reads **big**. It was made for a phone first and a TV second.
- **Things that move:** routes stamped dash by dash, a sun's sheen, a small pictogram moving across. The print itself stays flat. A gentle parallax drift by depth is as much "camera" as it takes.

## Meanings it carries
**Well:**
- A place announced: a destination, a homeland, "this is where it happens". It is the travel poster's own job.
- A journey's stages: from here to there, with a stamped route.
- Order and clarity: a title card, a chapter plate, a map interlude with one route and two names, the end card.
- Warm nostalgia and invitation: an event, a pilgrimage, a camp, a church outing.
- Content for other channels or series where a graphic look is welcome: a kids' series, destination guides, event promos, social cards.

**Badly:**
- Holy awe, grief, inner life. Flat inks and big type feel light, which is exactly the maintainer's verdict.
- Light as the main character. No ink can glow; a sun is a disc.
- People with feeling. Figures are pictograms.
- Long scenes. After the inks are down little moves, so keep each poster to 5–10 s.

**The channel rule (`cinematic`, `portrait-first`).** This is a **poster** look, and the `cinematic` rule
("일러스트·포스터·만화 캐릭터·게임 느낌은 쓰지 않는다") rules it out for this channel's **main scenes**.

Where it can still serve here:
- a title card;
- a chapter plate between parts ("2부 — 나사렛");
- a short map interlude that must read in one second (one route, two names, no counter);
- an end card printed as the last pull.

Each of these is a few seconds long, framed as a printed object, between cinematic scenes. For anything else, use it in other
channels or series. It is strongly portrait-friendly: big shapes, big type and high contrast read on a phone, which is the
part of `portrait-first` it passes easily.

## Palette
| role | template (lake) | film (Nazareth / empire / journey) |
|---|---|---|
| paper | `#efe4cc` (`Silk.paper`, fibre noise) | same |
| sky / light | cream `#F5E4BC`, peach `#F2BE7C` | dusk bands `#F6CD98 #F1B489 #EE9A73 #C98478` |
| far | dusty teal `#7FA3A0` (also lake, top sky band) | lilac `#9A7FA8`, sea `#7FB3C8` |
| mid | deep teal `#3F6E74` | `#3E7079`, ridge `#3D6072`, land `#2E4A5A` |
| near (and the word ground) | navy `#1E3446` | `#1E3B3F`, navy `#173247`, night `#1F2A3C` |
| accent | gold `#E2922F` (sun, reflection) | gold `#F2B134`, decree red `#E04F37` |

## API (`const Silk = window.Silk`)
- `Silk.paper(w, h, seed)` → canvas: the poster paper. Make it once and `drawImage` it each frame.
- `Silk.ink(ctx, path2d, colour, { k = 1, dir: 'down'|'up'|'left'|'right', reg: [dx, dy], rim = true, sheen = 0, W, H })` prints one opaque ink, revealed by a pull from `dir` up to `k`.
  - The pull clip is in the current transform, so you can translate the context for parallax.
  - Pass `rim: false` for a path made of overlapping sub-shapes (tiers, trunks), or the rim draws their inner edges.
- `Silk.bands(ctx, x, y, w, h, [colours], { k, dir })` draws a stepped sky, top to bottom. See the checks: its thinning stripes are hidden.
- `Silk.title(ctx, text, x, y, size, colour, { k, weight = 900, ls, align, shadow })` prints a heavy tracked header, pulled in from the left.
  - It calls `fillText` directly (`'Noto Sans KR'`), so pass **already translated** text (`Pilot.tr(s)` or the film's own text function). Otherwise the word never reaches the translation files.
  - It puts words into the picture. Keep that for title cards and plates, never for narration.
- `Silk.dashes(ctx, pts, k, { step, dash, w, color })` → `{ head, L }`: a route stamped dash by dash up to `k` of its length.
- `Silk.pullClip(ctx, k, dir, W, H)` is the raw squeegee clip.

## Checks (what went wrong on the way)
- **`Silk.bands` hides its own stripes.** Each band's thinning stripes lie below its lower edge, but the next band is printed after it and covers them, so the steps print hard. For the stepped look, print the bands bottom-up yourself (the template does it with `Silk.ink`, one path per band plus its stripes). Use `bands` when a hard step is what you want.
- **Pines printed with visible inner lines.** The ink's lit rim strokes every sub-path. Use `rim: false` for compound shapes.
- **A sliver at the frame edge.** Bands offset by `reg` leave a 1–2 px column at x = 0. Make full-width inks overhang the frame (−12 … W + 12).
- **Snow (or any second ink inside a shape)** is printed with `ctx.clip(shapePath)` around `Silk.ink`. Keep the cap small, or the peaks turn into cream blobs.
- **A long dashed wake read as a map route.** Keep a moving thing's trail short (~300 px behind it).
- **The words:** words printed into the sky (`Silk.title`) read well, but they are part of the art and must be translated before drawing. Narration belongs on the solid near ink at the bottom, above the bottom 25 % of a portrait frame (app buttons).
- **The film's verdict:** it read, but it felt light. Do not reach for this look to fix legibility in a main scene of this channel. Fix the cinematic look instead (bigger shapes, a plain band under the words).
