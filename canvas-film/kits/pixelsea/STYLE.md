# 픽셀 새벽 바다 (pixelsea)

Slug `pixelsea` · kit `kit.js` → vendored as `scenes/kit-pixelsea.js` · global `window.Pixelsea` · first film:
「쭈꾸미 한 접시」 scene 1 `sea-pixelsea` (`canvas-film/examples/jjukkumi/scenes/sea-pixelsea.html`, 22 s).

**Provenance.** Borrowed craft, own renderer. Sources: prompt-motion.com/pluginplay-3d4006 "Pixel art LLM history" by
**@pluginplay** (a pixel cliff over a sunset sea, a big banded sun cut by stripes, the broken reflection column, a pixel
caption box with a year tag, a chunky impact word, a close-up pixel portrait insert) and prompt-motion.com/hoyoyoda-3a5c08
"Chuseok pixel night scene" by **@hoyoyoda** (a dithered night sky, plus-shaped twinkling stars, Korean pixel type). No
shot, character or text was copied; every piece is drawn by `kit.js`.

## What it looks like
A pixel game at sea, in true pixels: the world is drawn into a small buffer (4× = 270×480, 5×, 6× = 180×320, 8× = 135×240)
with whole-pixel rects and scanline polygons only, then blown up nearest-neighbour. The sky is a stack of flat colour
**bands with ordered Bayer dithering between them** (purple → pink → orange at sunrise, deep indigo at blue hour, pale
blue → gold in the morning), plus-shaped stars that twinkle and go out as it brightens, flat pink pills of cloud. A **big
banded sun** sits on the horizon, its lower half **cut by horizontal stripes**, inside a two-ring dithered halo. Low
stepped islands line the horizon. The sea is darker bands with **rows of short glint dashes** (wider apart with depth) and
the sun's **broken reflection column**. Figures are 15–30 px sprites with a plum ink outline. Words are UI: a **dark caption
box with a 1-UI-px light border**, a hard shadow and a **teal tag** on its top-left edge (a clock time, a day), the Korean
typed in, cut to pixels from Do Hyeon; a **chunky two-tone impact word** slams in letter by letter. One accent colour (red
by default) for the one thing that matters.

**Carries well:** anything that can be told like a mini-game — trying, waiting, the bite, the catch, a score going up;
dawn/sunset/night-sky moods (time passing as the palette steps); journeys by boat, a lone figure on a cliff; nostalgia,
light humour, all ages; one red thing everyone tracks at phone size; a close-up face as a beat.
**Carries badly:** subtle acting (faces are a few pixels except in the portrait insert), crowds, interiors and fine
props, long text in the picture, gentle continuous motion (everything is stepped), grief that needs weight (the UI makes
it a game), several accent colours.

## Palette (`Pixelsea.tod(k)`, k 0 → 2, stepped in 1/16)
| role | blue hour (0) | sunrise (1) | morning (2) |
|---|---|---|---|
| sky top → horizon (10 bands) | `#0B0A24` … `#A04C70` | `#1E1342` `#5C1F6A` `#A63A74` `#E8756A` `#FBC25F` | `#4A6CB4` … `#FBE3A8` |
| sun bands (top → bottom) / halo | `#FFE6A8`…`#E0566C` / `#B0567A` | `#FFF4B8` `#FFD86B` `#FFAF57` `#FF8A5C` `#F8686A` / `#F7A06E` | `#FFFBE0`…`#FFC462` |
| sea (horizon → deep) | `#4A3270`…`#100C2C` | `#8A3A74` `#5A2A6A` `#43205A` `#31184A` `#22103A` | `#7A96C8`…`#2A4282` |
| glints / reflection | `#4A3C7A` `#7A5A96` | `#7A3E86` `#D0708A` / `#FFF0A8` `#FFC66A` `#FF8F6A` `#E0607A` | `#8AA6D8` `#D8E6F8` |
| islands far / near | `#2A1F4E` `#1A1436` | `#6A2C6C` `#3A1A52` | `#7A86B8` `#55609A` |
| clouds hi / body / shade | `#6E5490` … | `#F6A8A0` `#C96B8C` `#8D3F78` | `#FFFFFF` `#E8E2EE` `#B8B4D4` |
| underwater bands, sand, weed, rock, grass, deck | full tables in `kit.js` (`KEYS`) | | |

Fixed: ink/outline `#1A0F24` · caption fill `#1C1430`, border/text `#FFF1D6`, shadow `#0D0818` · tag `#5CC8B8` ·
impact gold `#FFF4A8` / `#FFCF3A` + shadow `#4A1F5C` · foam `#FBEAF0` · boat `#ECE6DC` hull, `#3E6FB0` stripe, `#2F3A5A`
bottom · **accent `#D9432B`** (`init({ accent })`). Nothing but the subject may use the accent.

## Fonts and words
Do Hyeon 400 (`Pixelsea.FONTS`; installed locally for renders). Korean always needs a real font, so `pixelText` renders
Do Hyeon at size/tpx px, **cuts the anti-aliasing** (alpha ≥ .45 → solid) and blows it up tpx× — hard pixel edges, still
readable (`tpx` 3 for captions at 60 px, 4 for a big title, 2 for small lines). Latin capitals and digits (tags, counters,
impact words) use the kit's own **5×7 bitmap font** (`bitText`). Captions: `[from, to, text, tag]` — the 4th field is the
tag label (digits / capitals), not a source line. Box top y 300, centred x 500 (clear of the right 140 px), ≤ 2 lines;
it opens in 3 steps, types the text at 22 chars/s, snaps shut — no fades. Counters and impact words live in the picture
(over the player, over the bucket), never in a corner.

## Kit API (`const PS = Pixelsea`) — world in BUFFER px, words in design px (1080×1920)
- **setup/timing** — `init({ accent })`; `W H UI ACCENT INK CREAM TAG GOLD FOAM FONT FONTS KEYS`; `tod(k)` → palette;
  `step(t, fps=10)`, `hold(t, at, dur, fps)`, `eo(x)`, `pop(x)` (≤ 6 % overshoot), `bayer(x, y)`.
- **frame** — `begin(ctx)` (landscape pillarboxes the portrait frame), `buf(K)` → `{ c, cv, w, h, K }`,
  `present(ctx, b, dx, dy)` (nearest-neighbour, whole-pixel offset), `shake(t, at, dur ≤ .25, amp)` → `[dx, dy]`,
  `fade(ctx, t, dur, fi=.5, fo=.5, steps=5)` (stepped fade from/to black).
- **pixel primitives** — `R px pxLine pxPath quadPts bend pxPoly pxEllipse pxCircle pxRR dither ditherCircle sprite`;
  `outline(canvas, col, …)`; `stamp(c, [x, y, w, h], fn, inkCol)` (draw → ink outline → lay on).
- **sky + sea** — `backdrop(c, b, P, hz, o)` (dithered sky + sea bands, cached); `stars(c, t, P, o)`;
  `cloud(c, x, y, w, P, seed)` / `clouds(c, t, P, [[x, y, w, seed]], speed)`; `sun(c, x, y, r, P, hz, { stripes, halo })`;
  `islands(c, P, hz, [[x, w, h, near]])`; `glints(c, t, P, hz, o)`; `reflection(c, t, x, hz, r, P, { len, width })`;
  `seaFront(c, b, t, P, hz, x0, y0, x1, y1, { refl })` (re-lays the water over a hull's lower part);
  `splash(c, t, x, y, at, o)`; `wake(c, t, x, y, dir, len)`; `bubbles(c, t, x, y, o)`.
- **under the water / land** — `underwater(c, b, P, top, bed, t)`; `shafts(c, t, P, top, bot, list)`;
  `seabed(c, t, P, y, { weed, rocks })`; `puff(c, t, x, y, at, col)`; `cliff(c, P, x0, x1, top, { edge, drop })`.
- **boat** — `BOAT`, `boat(c, x, y, len, { f, depth, sheer, cabin: { u, w, h }, col })` → `{ stern, bow, deckY, at(u) }`.
- **figure rig** — `BODY(h)`, `ik(a, t, l1, l2, pick)` (2-bone, fixed lengths), `joints(F)`, poses `stand walk kneel sit
  brace mix hangHands`, `PERSON` palette (`hatStyle` bucket/cap/none, `hairStyle` short/tied — a low bun at the nape, `tie`),
  `figure(c, F, pal, { mid, front })` (hands drawn AT `F.hands`),
  `polePts(butt, ang, len, bend)` / `pole(…)` (a rod/oar; put the hands at `at(u)`).
- **portrait insert** — `portrait(c, cx, cy, u, { pal, f, mouth 'calm'|'o'|'grin'|'set', brows, look, blink, sweat, hatStyle,
  lashes, jaw })`; `pal.hairStyle: 'tied'` gives pulled-back hair with a low bun and a side-swept fringe.
- **words/UI** — `pixelText(ctx, s, x, y, { size, tpx, color, shadow, align })`, `measure`, `text` (via `Pilot.tr`),
  `bitText(ctx, s, x, y, { px, bold, color, lo, outline, shadow, align })`, `GLYPHS`, `box(ctx, x, y, w, h)`, `tag(ctx, s, x, y)`,
  `captions(ctx, t, lines, o)` / `caption(…)`, `impact(ctx, t, 'HIT!', cx, y, at, { until, px })`,
  `counter(ctx, t, n, x, y, changedAt, { icon, px })`, `endCard(ctx, t, card, at, o)`.

```js
const PS = Pixelsea, S = window.SCRIPT, B = S.beat;
function draw(ctx, t) {
  PS.begin(ctx);
  const b = PS.buf(6), c = b.c, P = PS.tod(.6 + t / 20), hz = 170;
  PS.backdrop(c, b, P, hz); PS.stars(c, t, P, { y1: hz - 24 }); PS.clouds(c, t, P, [[14, 58, 30, 1]], 1);
  PS.sun(c, 126, hz + 10 - 2 * t, 26, P, hz); PS.islands(c, P, hz, [[-6, 56, 6], [150, 40, 11, true]]);
  PS.glints(c, t, P, hz); PS.reflection(c, t, 126, hz, 26, P, { len: .8 });
  const F = PS.stand(40, 249, 26, 1), rod = PS.polePts([F.hip[0] + 3, F.hip[1] - 3], -.9, 36, 0);
  F.hands = [rod.at(.05), rod.at(.27)]; PS.pxPath(c, rod.pts, 1, '#2a2230'); PS.figure(c, F, { ...PS.PERSON, hat: '#e2a93b', hatStyle: 'bucket' });
  PS.boat(c, 6, 246, 122, { depth: 14, cabin: { u: .66, w: 17, h: 12 } }); PS.seaFront(c, b, t, P, hz, 0, 257, b.w, b.h);
  PS.present(ctx, b, ...PS.shake(t, B.hit));
  PS.captions(ctx, t, S.lines); PS.impact(ctx, t, 'HIT!', 540, 610, B.hit); PS.fade(ctx, t, S.DUR);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: PS.FONTS, init: async () => PS.init(), draw });
```

## Draw order (keep it)
`begin` → `buf(K)` → `backdrop` → `stars` → `clouds` → `sun` → `islands` → `glints` → `reflection` → land/props behind →
rod → `figure` → hull (`boat`) → `seaFront` → line, things in the air, `splash` → `present(shake)` → in-picture UI
(`impact`, `counter`, `bitText` '!') → `captions` → `endCard` → `fade`. Words always after `present`, at full resolution.

## Motion grammar
- **Shots, not moves.** Hard cuts between whole-pixel scales (4× wide, 5–6× medium, 8× close/insert); the camera never
  zooms smoothly and pans only in whole buffer pixels. No crossfades inside a scene.
- **Stepped time.** Figures and props on 10 fps (`step(t, 10)`), water glints/reflection on 6 fps, stars on 8, flying
  things and splashes on 12. The palette steps through `tod` in 1/16s — the sun comes up in visible steps.
- **The beat is a game beat.** A '!' over the creature that notices, a `HIT!` that slams in letter by letter with one
  ≤ .25 s whole-pixel `shake`, a hard cut to the `portrait` insert (~.8 s), a `counter` that pops one UI pixel and flashes
  white on each catch. Springs at most `pop` (≤ 6 % overshoot), never a cartoon bounce.
- **Light is the sun.** The halo, the reflection column and the underwater `shafts` all belong to the sun; nothing glows
  that is not a light source. Splashes, puffs and bubbles are always tied to an object.
- **UI pops, never fades:** caption boxes open in 3 steps and snap shut; only the scene's head/tail `fade` is a fade (stepped).

## Performance
1080×1920, Chromium headless, 4 shared CPUs, `seek()` time over every 2nd frame ×3: the film scene `sea-pixelsea`
**1.8 ms median / 3.1 ms p90 / 3.9 ms mean**; the template 3.0 / 4.5 / 5.0 ms. Landscape (pillarboxed) the same. The first
frame of each new palette step builds its dithered backdrop (~50–300 ms once, cached, LRU 40); text bitmaps are cached
per string. Stills ~1 s each.

## Pitfalls
- **Never draw anti-aliased paths into the buffer** (`arc`, `stroke`, smoothed `drawImage`) — use the px primitives; one
  soft edge breaks the look. `buf()` and `present()` turn smoothing off.
- **Korean at too small a tpx breaks strokes** (tpx 4 at 60 px is the limit; captions use 3). Measure with `measure()`.
- **Outline only reaches what is inside the `stamp` box** — a rod or line drawn inside `figure`'s `mid` is clipped to the
  figure's box; draw long things on the buffer before/after the figure.
- **Feet inside a boat**: stand the figure ~3 px below the gunwale row and draw the hull after it; then `seaFront` over the
  hull's lower rows — otherwise the boat floats on the water.
- **Hands on a rod**: put the butt at the belly (or between belly and shoulder for a backswing) so both grips are within
  `ua + fa`; `ik` clamps an unreachable target, which shows as a hand short of the grip. Check with `body-check.py`.
- `backdrop` caches by `hz`: a tilting camera (hz changing every frame) rebuilds every frame — pan in steps or keep hz.
- The 5×7 font has capitals, digits and `! ? . , : - + × / '` only; anything else draws as `?`.
- The tag is the 4th field of a caption line here (other kits read it as a source line) — don't pass scripture sources to it.
- Portrait-first: landscape renders pillarboxed, not recomposed.

## What a scene author still draws
The subject in pixels (here: the 쭈꾸미, the 에기 lure, the sinker, the bucket, the fisher 명현's palette — `scenes/sea-pixelsea-props.js`), each
set-up's numbers (scale, horizon row, sun, islands, where the boat and figure stand), the poses and the rod/line
choreography on 10 fps, which shot is on screen when, the captions and tags (`script.js`), and the one accent thing.
