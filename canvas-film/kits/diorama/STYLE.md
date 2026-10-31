# 파스텔 디오라마 (symmetrical pastel diorama)

Slug `diorama` · kit `kit.js` → vendored as `scenes/kit-diorama.js` · global `window.Diorama` · first film: 쭈꾸미 한 접시,
scene 4 「식탁」 (`canvas-film/examples/jjukkumi/scenes/table-diorama.html` + `table-diorama-food.js`).

**Provenance:** prompt-motion.com/itsolelehmann-e47532 — "Four seasons train window" by **@itsolelehmann** (the prompt
asked for a cozy carriage "Grand Budapest Hotel style"). Borrowed craft, own renderer: dead-centre symmetry, purple swag
curtains with gold tie-backs and a scalloped pelmet with a medallion, dusty-pink walls, pink table lamps with gold stems,
a white lace-edged tablecloth, a window whose view changes. No shot, character or text is copied; everything is drawn
in code.

## What it looks like
A miniature stage set seen **dead-centre**. A plum velvet **pelmet** with scallops, gold braid, fringe, tassels and a
gold medallion runs across the top; two **velvet curtains** (folds as flat bands of plum) part symmetrically and gather
at gold **tie-backs**. Inside: a **dusty-pink room** with faint wallpaper stripes, soft vertical shading toward both
sides, a darker **dado** with panel mouldings and a rail, a pastel **checker floor** in one-point perspective. In the
middle a framed **window** whose view is a swappable layer (a banded night harbour with a moon, or a pastel day with
drifting clouds). **Pink pleated lamps** on gold stems glow — the only glows are around light sources. A **table under a
white cloth** with an embroidered band and a **lace** hem. Everything is a **flat pastel shape with a thin darker
outline** and a gentle top light; a fine paper grain and a soft plum vignette sit over it. People are **flat, frontal,
chibi-proportioned figures** (big round heads, dot eyes that blink, rosy cheeks) seated behind the table or standing in
the room. Words hang on little **cream title cards** with a thin plum line and a gold inner line, in a centred serif,
on two gold cords from the pelmet. **One saturated accent** (`Diorama.ACCENT`) belongs to the subject only.

**Carries well:** a gathering (a dinner, a party, a ceremony), hospitality, a place that feels like a stage; ritual and
order (toasts, bows, place cards, symmetry); gentle comedy and warmth; time passing outside one window (seasons,
day → night); "everyone faces us" moments; endings with a title card.
**Carries badly:** speed, chaos, action across space (the camera only pushes straight in); darkness and dread (it is
cosy by construction); landscapes without a room; close-up emotion (faces are simple dots); crowds over ~5 figures in a
row; anything needing a second strong colour.

## Palette (`Diorama.C`, `Diorama.ACCENT`)
| token | hex | use |
|---|---|---|
| `wall` / `wallLt` / `wallDk` | `#d29aa3` / `#e0aeb5` / `#a8717f` | the pink wall, its lit top, its shaded sides |
| `stripe` | `#d9a6ae` | faint wallpaper stripes |
| `dado` / `dadoDk` / `panel` | `#a4687b` / `#8a5268` / `#b47a8b` | lower wall, panel mouldings |
| `rail` / `skirt` | `#6f3a52` / `#6a3550` | chair rail, skirting (with a thin gold line) |
| `floorA` / `floorB` | `#ecd9cf` / `#bf8f9f` | checker floor |
| `plum` / `plumDk` / `plumLt` | `#53296f` / `#371a52` / `#7a4ea5` | curtains, pelmet |
| `gold` / `goldDk` / `goldLt` | `#d9b264` / `#9b7636` / `#f4dea0` | fringe, tassels, tie-backs, stems, frames, cords |
| `shade` / `shadeLit` / `bulb` | `#e7a0b2` / `#fbd2d6` / `#fff1cf` | lamp shade, lit shade, the light |
| `cloth` / `clothDk` / `lace` | `#f7f2ec` / `#e1d4d8` / `#fffaf3` | tablecloth top, its drop, the lace |
| `frame` / `sill` | `#5b3270` / `#8d5068` | window frame, sill |
| `mint` / `mintDk` | `#a8cdb8` / `#7fa894` | upholstery (chairs), pots — the cool counterweight to the pink |
| `cream` / `ink` / `inkSoft` | `#f8f0e0` / `#4a2440` / `#7d5870` | title cards and their type |
| `night[5]`, `sea`, `hill`, `moon`, `lamp` | `#121f45`…`#34528f`, … | the night view's bands and lights |
| `day[5]`, `hillA/B/C`, `tree`, `cloud` | pastel blues → cream, lilac/greens | the day view |
| `ACCENT` | `#d9432b` | THE subject (`init({ accent })`); nothing else in the set may be that hue |
Shading: `tone(color, k)` lightens toward warm white (k > 0) or darkens toward deep plum (k < 0) — never toward grey;
`line(color)` is the outline (`tone(c, −.42)`).

## Fonts and words
Noto Serif KR 600 on the title cards (54 px, plum ink on cream), Serif 700 for the end-card title, Noto Sans KR 500/400
for the end card's small lines (`Diorama.FONTS` for `Pilot.run`). Cards hang in the window area, centred, y ≈ 455–470,
on cords from the pelmet (y 262); ≤ 2 lines. Draw them **under the same camera as the world** (re-apply `cam`) so the
cords stay attached to the pelmet during a push-in. End card: `Diorama.endCard` dims the room and hangs a framed plaque
(740–1000 px wide, fits the longest line; room for a kicker and a two-line title) with the shared `Story.endCard` set on
it; the figures stay visible, dimmed, under it. Place cards (`placeCard`) put names on the table — very much in style.
Portrait safe zones: no words below y 1540 or in the right 140 px; the top 160 px is plain pelmet.

## Kit API (`window.Diorama`, design space 1080 × 1920, px)
- setup: `init({ accent, grainSeed })`, `W`, `H`, `C`, `ACCENT`, `SERIF`, `SANS`, `FONTS`
- colour: `tone(c, k)` · `line(c)` · `rgba(c, a)`
- timing: `slide(t, at, dur=.8)` (eased on-axis move) · `spring(x)` (≤ 2.5 % overshoot) · `blink(t, seed)` · `laugh(t, at, dur=2.5, amp=7, hz=4.2)`
- shapes: `flat(ctx, build, fill, { y0, y1, light, dark, line, lw })` · `rr` · `ell` · `poly` · `mirror(ctx, fn)` · `glow(ctx, x, y, r, a, col)` (light sources only)
- set: `room(ctx, { dado, floor, horizon, panels, stripes })` (cached) · `floor(ctx, y0, y1, o)` ·
  `window(ctx, r, view, t, { bars, sill })` · `views.night(ctx, r, t, { horizon, moon, moonY, harbour, boat, seed })` ·
  `views.day(ctx, r, t, { horizon, dusk, drift, seed })` · `curtains(ctx, k, { top, tieY, openTop, openTie, openBot, folds })` ·
  `pelmet(ctx, { y, swags, dip, medY })` (cached) · `tassel(ctx, x, y, s)`
- light: `lamp(ctx, x, y, s=1, on=1)` → shade centre · `lampGlow(ctx, x, y, s, on)` · `night(ctx, a=.5)` (cool multiply; glows after it)
- furniture: `table(ctx, { x, y, w, d, h }, { flare, folds, lace, band })` → `{ top, front }` · `chair(ctx, x, y, s, { fill, frame })` · `placeCard(ctx, name, x, y, { size })`
- figures: `BODY`, `LOOK` · `pose(F)` → G · `body(ctx, G)` · `arms(ctx, G, { only, held: [fn, fn] })` · `figure(ctx, F)` ·
  `ik3(a, target, l1, l2, hint)` · `hand(ctx, p, ang, side, s, skin)` · `tube(ctx, pts, w, fill)` · `face` · `hairBack` / `hairFront` ·
  `standY(floor, s)` · `kneelY(floor, s)` · `walkFeet(x0, x, step, lift)`
  F = { x, y (pelvis), s, look: { top, apron, skin, hair, hairStyle 'short'|'bun'|'tied'|'bob'|'wave', legs, shoe, collar 'round'|'v'|'shirt', glasses },
  lean, bow, bob, tilt, turn, eyes 'open'|'closed'|'smile'|'wide', blink, brows, mouth 'smile'|'open'|'o'|'chew'|'flat', open,
  hands: [screenLeft, screenRight] (null = hang, or [x, y, z?] — z toward the camera, omit for an auto relaxed bend), elbows, legs: null | { floor, feet, lift, kneel, dir } }
- marks: `steam(ctx, x, y, w, h, t, a)` (a hot dish) · `clink(ctx, x, y, k, s, spread=64)` (a meeting point; no particles)
- camera/post: `begin(ctx)` · `cam(ctx, s, x, y)` · `push(t, a, b, from, to)` · `finish(ctx, a=1)` (grain × vignette, one multiply) · `dim(ctx, a)` · `fade(ctx, t, dur, fi=.5, fo=.5)`
- words: `card(ctx, s, y, a, { size, hang, minW, x })` · `captions(ctx, t, lines, { y, size, hang })` · `endCard(ctx, t, card, at, { y=640, dim, hang })`

```js
const S = window.SCRIPT, B = S.beat, D = Diorama, WIN = { x: 250, y: 330, w: 580, h: 600 };
const seat = (x, look, t) => D.pose({ x, y: 1332, look, blink: D.blink(t, x), hands: [[x - 54, 1272], [x + 54, 1272]] });
function draw(ctx, t) {
  D.begin(ctx); const cm = [D.push(t, 3, 16, 1, 1.07), 540, 1230];
  ctx.save(); D.cam(ctx, ...cm);
  D.room(ctx, { dado: 1196, floor: 1640, horizon: 980 });
  D.window(ctx, WIN, (c, r, tt) => D.views.night(c, r, tt), t);
  const G = [seat(380, { top: '#6f8a6a' }, t), seat(700, { top: '#5f7fa8', hairStyle: 'bob' }, t)];
  G.forEach(g => { D.chair(ctx, g.F.x, 1324); D.body(ctx, g); });
  D.table(ctx, { x: 150, y: 1240, w: 780, d: 190, h: 172 });
  D.lamp(ctx, 196, 1300); D.lamp(ctx, 884, 1300);
  /* … the film's subject on the table, in D.ACCENT … */
  G.forEach(g => D.arms(ctx, g));
  D.night(ctx, .55); D.lampGlow(ctx, 196, 1300); D.lampGlow(ctx, 884, 1300);
  D.curtains(ctx, D.slide(t, .5, 2.4)); D.pelmet(ctx);
  ctx.restore(); D.finish(ctx);
  ctx.save(); D.cam(ctx, ...cm); D.captions(ctx, t, S.lines, { y: 470, hang: 262 }); ctx.restore();
  D.endCard(ctx, t, S.endCard, B.end); D.fade(ctx, t, S.DUR);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: D.FONTS, init: async () => D.init(), draw });
```

## Draw order (keep it)
`begin` → `cam` → `room` → `window(view)` → things on the back wall/sill → chairs → `body` of every figure → `table` →
things on the table (far to near) → the subject → `arms` (inner figures first, outer over them; held things via
`held`) → `night` → `lampGlow` → `steam` / `clink` → `curtains` → `pelmet` → `restore` → `finish` → captions (under the
camera again) → `endCard` → `fade`.

## Motion grammar
- **Symmetry first.** Compose on x = 540. Pairs mirror each other (lamps, chairs, hosts/guests); `mirror(ctx, fn)` draws
  a symmetric set piece once. Choreography can mirror too (the two inner figures act together, then the outer two).
- **Moves are straight or symmetric.** Curtains part together (`curtains(ctx, slide(t, at, 2.4))`); the camera only
  pushes straight in and eases back (`push`, ~7 % over ~13 s); objects and cards slide in on axis (`slide`, eased).
  Springs only via `spring()` (≤ 2.5 % overshoot). No shake, no whip pans, no crossfades inside a scene.
- **Small life everywhere:** blinks (`blink`), steam, twinkling stars and harbour lights, drifting clouds, a bobbing
  boat, a breathing bob. Something changes on every beat; hold still only to read.
- **Bodies:** frontal figures; arms solved in 3-D (`ik3` via `pose`): the hand is ALWAYS at the target and the bone
  lengths never change; the elbow follows `elbows` hints (default down, a little out and back). Leave a table target's z
  out and the arm bends naturally toward the camera. Held things are drawn by `held[i]` at the hand, before the hand.
  Laughs are small bounces (`laugh`) + head tilts + `eyes: 'smile'`, `mouth: 'open'`.
- **Light:** lamps glow (halo + pool) and the moon has a halo; nothing else glows. `night(ctx, a)` cools the room and
  the lamps warm it back up.
- **End:** ease the push back to 1, the room dims under a hanging plaque (`endCard`), fade to black over 0.5 s.

## Performance (1080 × 1920, Chromium headless, 4 shared CPUs; 3 × 120 frames over the timeline)
- `init`: grain + vignette baked once (≈ 80 ms); `room`, `pelmet` and the open `curtains` are cached on first use.
- 쭈꾸미 table scene (4 figures, pan, steam, push-in): **mean 41.6 / median 41.5 ms** per frame (p95 57 ms). Before
  the caches it was 81.5 / 76 ms (the scaled grain multiply alone cost ~28 ms).
- Template (one standing figure): **mean 26.9 / median 28.5 ms** (p95 42 ms). Stills ~1 s each.
- The remaining cost is resampling the cached layers under the push-in and the curtains while they move.

## Pitfalls
- **Cords detach**: captions/end card drawn without the camera while the world is pushed in leave the cords floating
  below the pelmet — re-apply `cam` for captions (the end card expects the push to be back at 1).
- **Figures crowd**: at 150 px spacing shoulders overlap; that reads as a cosy family photo, but keep held things
  between the pairs and draw the inner pair's arms first.
- **Reach**: arm reach is (108 + 102) × s px. `pose` clamps a target out of reach (`arms[i].ok === false`) — the hand
  then stops short of the thing. Move the thing, lean the torso (`lean`), or bring the target nearer; never place a hand
  freely.
- **Accent creep**: blush, lamp pink, mouth wine and the ribbon pinks are pastel; keep anything near `ACCENT`'s hue off
  the set (no red props, clothes or text).
- **Night**: call `night()` before `lampGlow`, or the lamps go grey too. Things drawn after it (curtains, pelmet) keep
  their day colour — that is deliberate (the proscenium is "in front").
- **Hair caps** are drawn over the head; a new hairStyle must cover the crown (control points above −1.45 × headRy).
- **Cached layers + zoom**: the room/pelmet/open curtains are bitmaps; a push past ~1.15 softens them. For a big push,
  pass different options (a new cache) or draw at that scale.
- **Portrait only by design**: landscape (`?o=h`) pillarboxes the 1080 × 1920 frame in `begin`.

## What a scene author still draws
The subject in the accent (a dish, a flower, an object) and the props on the table (bowls, glasses, chopsticks — see
`table-diorama-food.js`), the window view if neither built-in one fits, the figures' looks and acting (`pose` inputs per
beat: hand targets, eyes, mouth, bows, laughs), what hands hold (`held`), where the camera pushes, the script and words.
