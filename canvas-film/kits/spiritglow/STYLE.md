# 빛나는 영혼의 숲 — Dark forest, glowing spirits (밤숲, 청록 빛 사람들, 호박빛 하나)

House style `spiritglow` · kit `kit.js` → `scenes/kit-spiritglow.js` · global `window.SpiritGlow` (scenes alias it `SG`) ·
worked example: [잘라 낸 건 다리였다 · 02](../../sermons/2026-10-24-cross-styles/film/scenes/cs-spiritglow.html)
(origin: the 6-s lab card in `sermons/2026-10-24-style-lab/` → lab-spiritglow, a painterly "spirits in a dark wood" look).

## What it looks like
A dark painterly forest at night. Thin black trunks with broken cyan-lit edges stand in haze; the ground is near-black rock
cut into slabs with a palette knife; shallow pools glow cyan-white from the little water-lily lights in them; far off, a
crowd of tiny lights flickers like fireflies. Everything static is **painted once** — shapes, then a knife pass that
re-paints each plane in short flat strokes sampled from itself, then heavy grain. The people are hooded travellers in slate
cloaks with a warm face in profile (an eye that blinks), and **they glow**: a cyan bloom around each silhouette and a bright
cyan rim. **One warm accent** — amber (a lit wooden thing, a lamp, an arch of light) — glows against all that teal.

**Carries well:** the soul / inner life, belonging and being seen ("everyone here carries a light"), the presence of God
as warm light in the dark, pilgrimage, quiet night prayer, hope that is small but real, the communion of saints (the far
crowd), something precious given or lost (an amber thing sinking into black). Gentle wonder, a fairy-tale hush.
**Carries badly:** daylight, fear/horror (it reads tender, not scary), harsh judgement, busy action, text-heavy props,
many colours, crowded close-ups (glowing figures merge — keep a dark gap between them), anything that needs a bright world.

## Palette, type, captions
| role | hex | note |
|---|---|---|
| sky | `#03090c` → `#07181c` → `#0e3634` (teal haze band ≈ y 960) → `#061416` | `TX.sky` (grain .4) |
| trunks / rock | `#040d10`, far `rgb(8–22, 30–64, 34–66)`; path `#174043` → `#030b0d`, edge `rgba(120,230,210,.35)` | |
| cyan light | glow `rgba(160,255,232,.9)`, pools `#0d4442` + `rgba(225,255,248)`, rim `rgba(170,255,236,.95)`, bloom `rgb(110,235,210)` | `SG.RIM`, `SG.BLOOM` |
| figures | hero cloak `#2e4d59`, sleeve `#43697a`, face `#e3b48e`, legs `#142329`; others `#172a30`, `#22404a`, `#c79a7a` | `SG.hero(F)`, `SG.other(F)` |
| **accent** | amber `#ffbe62`, light `#fff1cc`, shade `#d9782a`; light rgba(255,236,190)→(255,190,110) | `SG.ACCENT`, `C.gold*`, `TX.warm` |
| others' wood | `#0d2526` with a cyan edge `rgba(150,250,228,.8)` | `C.wood`, `C.woodL` |
| text | ink `#e4fbf5`, source `#bfe9df`, card source `#b5e3d8`, shadow `rgba(0,8,10,.95)` | |

Fonts: **Nanum Myeongjo 700** (captions, titles) + Noto Sans KR (source lines); `Pilot.run({ fonts: SG.FONTS })` (lists both
family spellings), load both from Google Fonts. Captions at **y 430**, 60 px over the dark top vignette; end card at
**y 860** on the dark plate with motes rising.

## Kit API (`window.SpiritGlow`; world px at zoom 1, near lane y ≈ 1300, the path's far edge y 1212)
- **Setup (in this order)** `init({ cam, dur })` → `forest()` (3 painted planes p .18/.45/.75) → `gap({ x, w, top })` (each ravine,
  before the ground) → `ground({ top, gaps })` (the rock path plane, gaps cut out) → `life({ warmX, motes:{x, w, y} })`
  (far crowd + 40 motes) → `finish()` (sky, foreground trunks, vignette, plate, buffers). `C`, `TX`, `PL`, `TINY`, `MOTES`.
- **Painting** `plane(p, K, groundY, knifeN, seed, build, yTop)`, `knife(c, n, r, K, wy0, groundY)`, `grainOn(c, a)`,
  `trunkShape(g, r, x, yb, w, top, col, colL, spikes, litRight)`, `slabs(…)`, `pool(g, r, cx, cy, rw, rh, figs, SP)`,
  `spiritPath(x, y, h, kind, face)` (the lab's tiny glowing person), `glowSprite(N, stops)`, `pathOf(pts)`.
- **Frame layers** `backdrop(ctx, cm, t)` (sky, far plane, far crowd, pools breathing), `putPlane(ctx, cm, P)`, `drawGround(ctx)`,
  `foreground(ctx, cm, t, { cx })`.
- **Ground pieces** `drawGap(ctx, gp)`, `gapLife(ctx, t, gp, inside)` (motes in the gap + your sinking thing, clipped),
  `gapEdges(ctx, gp)`, `gate(ctx, t, { x, cy, base })` (amber arch), `archPath(A, r)`, `roadY(x, top)`.
- **Light** `groundGlow(ctx, x, y, w, a, warm)`, `warmLight(ctx, x, y, R, a)`, `sprite(ctx, S, x, y, rx, ry, a)`,
  `motes(ctx, t, top, fade, k, bottom)`, `breathe(t, ph, period)`, `flecks(ctx, t, list)`.
- **Figures** `figures(ctx, z1, ex1, ey1, wy0, wy1, [[slot 'act'|'me', fn, halo], …])` (bloom + rim per slot), `withAlpha`.
- **Figure rig** `figure(ctx, F, mid, back)`, `hero(F, t)`, `other(F)`; poses `walk`, `stand`, `crouch`, `kneel`, `mix`, `turn`,
  `look`, `reach`, `hangHands`, `knee`, `shoulderOf`, `basis`, `ik`, `capsule`, `poly` (same rig as `fogforest`).
- **Held things** `onShoulder`, `upright`, `inFront`, `pt`, `mixX`, `rotAbout`; `cross(ctx, 'warm'|'other', u0, u1, x, y, a, lying, K)`,
  `crossOutline`, `CROSS`.
- **Camera** `layerM`, `layer`, `mixCam`, `shake(c, t, at, dur, ax, ay)`. **Words** `captions`, `endCard`, `endPlate(ctx, t, at)`.

```js
const SG = SpiritGlow, S = SCRIPT, camAt = t => ({ x: 400 + 120 * t, y: 1060, z: 1.1 });
async function init() { SG.init({ cam: camAt, dur: S.DUR }); SG.forest(); SG.ground({ top: 1212 }); SG.life({ motes: { x: 600, w: 300, y: 1000 } }); SG.finish(); }
function draw(ctx, t) {
  const cm = camAt(t), [z, ex, ey] = SG.layerM(cm, 1), x = 400 + 120 * t, F = SG.hero(SG.walk(x, 1300, 1.04, 1, x / 156, 150, .1), t);
  SG.backdrop(ctx, cm, t);
  SG.layer(ctx, cm, 1, () => { SG.drawGround(ctx); SG.groundGlow(ctx, x, 1308, 230, .26); });
  SG.figures(ctx, z, ex, ey, 540, 1520, [['me', a => SG.figure(a, F), 1]]);
  SG.layer(ctx, cm, 1, () => SG.warmLight(ctx, x + 300, 1150, 200, .5));
  SG.foreground(ctx, cm, t); SG.captions(ctx, t, S.lines); SG.endPlate(ctx, t, S.beat.end); SG.endCard(ctx, t, S.endCard, S.beat.end);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: SG.FONTS, init, draw });
```

## The figure rig (body-checked twice on the cross film — keep these rules)
Same skeleton and rules as `fogforest` (see its STYLE.md): bones ×s thigh 96 / shin 90 / upper arm 78 / forearm 74; shoulder
at body (6, 140) behind the neck; hands drawn at the grip point (`fist`/`flat`/`open`); one hand one object; carried things
gripped at chest height; ≥ .3–.4 s in-betweens for every stand↔crouch/kneel and pick-up/set-down; walk phase tied to
distance; turns with `turn()`. Specific to this style (from the body checks):
- **White-on-white kills arms**: the glowing body would swallow the arm. The near sleeve is lighter (`armCol`), every arm gets
  a dark outline (`edge`), and the hand is skin-coloured — keep all three or the arm "grows out of the stomach".
- **Glowing figures merge**: a kneeling head sinking into a glowing walker behind reads headless; keep a dark gap between
  figures (space them, time them so none passes behind another), and put the crowd and the hero on different `figures` slots.
- Keep things held up near the face below the chin (the bloom makes any overlap with the face read as "pressed into it").

## Motion grammar (what worked)
- The world is still and painted; **life is light**: pools breathe (`breathe`, ~3 s), the far crowd flickers and drifts, motes
  rise, the hero blinks (`hero(F, t)`). A still figure in this world never looks frozen.
- The accent's light is the story: amber on the object (`warmLight`), an amber pool on the rock under it (`groundGlow(…, true)`),
  an amber arch (`gate`) as the goal. Brighten it for a reveal; let it **sink and go out** for a loss (the hit: push-in,
  `shake`, the glow fading inside `gapLife`, a last flare far below).
- Push in (z 1.3–1.6) for the intimate beats; pull back to show the crowd and the dark around the one light.

## Performance (1080×1920, headless Chromium software canvas, 4 CPUs shared with other renders)
- Cross film: **~125–150 ms/frame** median (orig 127/141/150 vs kit 113/126/136 ms over alternating runs — the same ops,
  differences are load noise), init ~2.1 s (the knife passes: 2.6k–9k strokes per plane).
- Template: **~137 ms/frame**, init ~1.6 s. Cost: the full-frame planes, the bloom (two small blurred buffers drawn full
  frame per slot) and the rim per slot. Each extra `figures` slot ≈ +15 ms; keep `wy0…wy1` tight.

## Pitfalls
- Build order matters: `gap()` before `ground()` (the ground is cut by the gaps), `life()` after `forest()`, `finish()` last.
  `init({ cam })` needs a camera that can run for every t (planes are sized from it).
- `withAlpha` uses the band set by the current `figures()` call — use it inside a figures layer fn only.
- Thin things in a figures layer get bloom + rim on both sides and read as glowing (good for a sprout, bad for a dark rope).
- The cyan bloom is generated from each slot's alpha — a big dark prop in a figures slot glows cyan too; draw dark scenery
  on the world layer instead.
- The far crowd's warm members are those within 90 px of `warmX · .3` in the p .3 layer (near an arch); omit `warmX` for none.
- Refactor lessons: the kit reproduces the film **bit-identically** (max diff 0 on 10 stills) because the canvas ops kept
  their order and the shared rng streams (crowd + motes from one `rng(505)`) stayed together in `life()`.

## What a scene author still draws
The story: the subject and its props (the template: a seed, a mound, a sprout; the film: crosses and a saw), the poses per
beat, the camera, where the accent is and how its light changes, which world pieces appear (gap, arch), the hero/others
split into `figures` slots, and `script.js`. Not in the kit: water you can walk in (pools are painted backdrop only), rain,
creatures, interiors, daylight.
