# 게임 광고 카툰 — Mobile-game-ad cartoon (굵은 잉크 외곽선, 셀 그림자, 광택)

House style `gamecartoon` · kit `kit.js` → `scenes/kit-gamecartoon.js` · global `window.GameCartoon` · worked example:
[잘라 낸 건 다리였다 · 17](../../sermons/2026-10-24-cross-styles/film/scenes/cs-gamecartoon.html) (origin: style lab `lab-gamecartoon.html`).

## What it looks like
A mobile-game advert / casual-platformer look, all code. Every near shape has a **thick dark-plum ink outline** stroked
under a flat base colour, **one hard cel shadow** and a **glossy highlight**. A banded storm sky with puffy cel clouds and
lightning, a far city and two hill layers in parallax, then a side-on platformer world: grass bank, a dirt road (top band +
front face with pebbles), a meadow of bushes, tufts and flowers; a ravine cut through the land with dirt cliffs, roots and
mist; a stone arch whose door leaks **golden light**. The hero is a chibi orange cat with blue goggles and a red scarf; the
others are quieter grey/cream/brown/slate cats. The ONE golden thing (`WOOD.gold`) is what the film is about. The genre's
motion: squash on every footfall, anticipation and overshoot, speed lines and speed rings, dust puffs, chips, a crash-zoom +
shake + white flash on the hit; chunky game-title captions that pop in.

**Carries well:** energy and humour; a "level" with an obstacle (a gap, a wall, a door), effort and reward, a choice that
costs later; things a young / non-church audience reads instantly; contrast of storm-cool vs golden-warm; a comic hero
who overdoes it (runs, skids, gets shocked); a big visual "pop" moment.
**Carries badly:** grief, quiet reverence, silence, intimate sorrow (the style is loud and cheerful); realistic people,
scripture read slowly over long holds; subtle light; anything that must not look like an advert.

## Palette, type, captions
| role | hex | key |
|---|---|---|
| ink outline | `#24152e` (dark plum) | `INK` |
| hero cat | fur `#ffad2e`/`#e07a1c`, cream `#fff3dc`, scarf `#ef3b36`, goggles `#9aa6bd` + lens `#5ec8ff` | `PME`, `C.*` |
| the others | 4 muted palettes (grey, cream, brown, slate) | `PPI[0..3]` |
| world | grass `#46c24a`/`#2e9a3c`, road top `#d8b48a`, road `#a98a6c`, dirt `#8a5f43`, hills `#5d8f86`/`#3f6f6a`, stone `#c7c1d6` | `C.*` |
| storm sky | `#2c3556 → #9aa4b8` (warm: `#3d5fa8 → #fff0b8`) | `sky(…, warm)` |
| **accent** | gold wood `#ffc436` (shadow `#e2891a`, end grain `#ffe9a6`) + gold light `#ffd75e` / `#fff4c8` / `#ffc65a` | `WOOD.gold`, `C.gold/light/light2` |
| others' wood | `#a8957f` | `WOOD.grey` |

Font: **Jua** (captions and end card). `<link>` = `GameCartoon.FONT_LINK`, `Pilot.run({ fonts: GameCartoon.FONTS })`.
Captions: cream `#fff6dc` with a 12-direction 8 px ink ring and a plum drop shadow, sized to fit 790 px (≤ 84 px), centred
at **y 410**, a damped-spring pop on entry. End card: a dark plum plate (90 %) fades over the frame, Jua with an ink ring.

## Kit API (`window.GameCartoon`; world px, camera `{ x, y, z, sx, sy }`)
- **Setup** `init()` (sky gradients, 12 cloud sprites, vignette — ~80 ms).
- **Ink + cel** `inked(ctx, path, fill, ow)`, `cel(ctx, path, col, dx, dy)`, `shine(ctx, x, y, rx, ry, rot, col)`, `P2(fn)`,
  `ell(x, y, rx, ry, rot)`, `rr(x, y, w, h, r)`, `star(ctx, x, y, s, col)`. Every prop = `inked` + one `cel` + one `shine`.
- **The cat** `drawCat(ctx, t, F)`; `F = { x, gy, s, f, sx, sy, lean, bob, hop, crouch, ph, amp, stride, lift, pal, eye:
  calm|tired|happy|focus|shock|sad|big, mouth: w|oh|frown|grin, tilt (− looks up), blink, sweat, seed, alpha, far, near (world
  grip points), farKind / nearKind: fist|flat, farFront, farPawFront, farReach, mid(ctx), sawFn(ctx) | prop(ctx) }`.
  `catMatrix(F)`, `toLocal(F, M, p)`, `toWorld(M, p)` (hang props on a cat: shoulders `SH_NEAR` / `SH_FAR` in cat units),
  parts `leg / arm / paw / catBody / catScarf / catHead`. Palettes `PME`, `PPI`.
- **Holding** `objPt(X, u, v)`, `rotAbout(X, pivot, th)`, `carryGeom(F, 'shoulder'|'front', at, u0)`,
  `carryX(F, mode, at, u0)` → `{ x, y, a, gf, gn }`, `gripCarry(F, X)` (paws onto it).
- **Poses** `walkSpec(x, gy, s, f, phase, { amp, stride, lift, lean, tilt, eye, mouth })` (squash on footfalls),
  `standSpec(x, gy, s, f, { lean, crouch, tilt, eye, mouth })`, `kneelSpec(…)`, `mixSpec(A, B, k)`; `t12`, `lerpP`, `frac`.
- **World** `sky(ctx, t, cm, warm, bolts)`, `farLayers(ctx, cm, warm)`, `layer(ctx, cm, p, fn)`, `view(cm, p)`,
  `ground(ctx, t, view, { gap: [x, w], from, to })` (+ `tuft`, `flower`, `hsh`), `gate({ x, base, w, h })` → `{ back, front, path }`.
- **Effects** `dustPuff(ctx, x, y, s, a)`, `speedRing(ctx, cx, cy, a, seed, r0)`, `speedLines(ctx, t, x, y, a)`,
  `drawChips(ctx, t, chips)`, `flash(ctx, t, t0)`, `grade(ctx, warm)`, `vignette(ctx)`.
- **Camera** `mixCam(a, b, k)`, `shake(t, t0, ax, ay, dur)` → [sx, sy].  **Words** `captions(ctx, t, lines)`, `endCard(ctx, t, card, at)`.

```js
const GC = GameCartoon, S = window.SCRIPT;
const pose = t => ({ ...GC.walkSpec(200 + 140 * t, 1340, .64, 1, (200 + 140 * t) / 150, { amp: 1, stride: 1.1 }), pal: GC.PME });
function draw(ctx, t) {
  const cm = { x: 200 + 140 * t + 120, y: 1170, z: 1.3, sx: 0, sy: 0 }, F = pose(GC.t12(t));
  ctx.setTransform(1, 0, 0, 1, 0, 0); GC.sky(ctx, t, cm, 0, [2.5]); GC.farLayers(ctx, cm, 0);
  GC.layer(ctx, cm, 1, () => { GC.ground(ctx, t, GC.view(cm), {}); GC.drawCat(ctx, t, F); });
  GC.grade(ctx, 0); GC.vignette(ctx);
  if (t < S.beat.end) GC.captions(ctx, t, S.lines); GC.endCard(ctx, t, S.endCard, S.beat.end);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: GC.FONTS, init: async () => GC.init(), draw });
```

## Motion grammar (what worked)
- Characters act on twos (`t12`), camera on ones. Walk = `walkSpec` with phase = distance / stride (squash `sx/sy` on each
  footfall); heavy: amp .8, stride .8, tired eyes, sweat, lean .2; light: stride 1.7, lift 1.9, happy + grin.
- **Anticipation → action → overshoot**: skid to a stop (lean back, squash .06/.07), turns squash `sx` to ~.7 through the
  middle (`F.sx *= 1 − .3·sin(πk)`), a pop scales past 1 and settles (the template's sprout).
- **Put-down / pick-up with both paws on the object** over ≥ .4 s, the body bending (`crouch`), paws as grip points on it
  (`objPt`), the object interpolated in step. A paw on a carried object always (`gripCarry`); the tool in the near paw is
  drawn just before the near arm (`sawFn` / `prop`) so the fist closes over it.
- **The hit**: crash zoom (`eo` .09 s to z 1.5) + `shake` 22/16 decaying .55 s + `speedRing` + `flash` .14 s + chips.
- Running: `speedLines` + `dustPuff` every ~.38 s; a stop: a speed ring + two dust puffs.
- Golden light is the reward: `gate` light, a glow around the golden thing, `sky(…, warm)` + `grade(warm)` warm the world.
- Hook: frame 0 close (z 2.0) on the hero with the telling prop, widening by ~2.6 s.

## Performance (1080×1920, headless Chromium, 4 shared CPUs)
- cs-gamecartoon: **~38–42 ms/frame** mean (orig 37.6/39.4, refactored 40.6/39.4/45.9 — same code, load noise); peaks
  ~100 ms on end-card/loop frames. The ground (many inked paths + clips, bushes, flowers) and the cel clips dominate.
- Template: **~35 ms/frame**. Sky clouds are prebuilt sprites; everything else is path drawing each frame.

## Pitfalls
- `inked` strokes the outline at 2× `ow` UNDER the fill — so a fill without its outline (e.g. a translucent overlay) must not
  use `inked`. `cel` clips to the shape; shadows always point the same way (light from the upper left).
- Cat arms are quadratic tubes from fixed shoulders clamped to `farReach` (205 cat units ≈ 131 px at s .64): grip points out
  of reach leave the paw short of the object — move the cat or the object, don't stretch.
- `mixSpec` interpolates paw points only when both poses have them (otherwise it picks one): set `F.near` / `F.far` on both ends.
- A kneeling cat's big head covers ~±130 px ahead: sit it back (or step back) before the thing it planted/holds must be seen.
- `F.near` is converted to cat-local space without the bob; on a strongly bobbing walk the paw drifts a few px from a fixed
  world point — grip moving objects, not the ground, while walking.
- `ground(..., { gap })` expects one gap; for none pass `{}`. The gate's light uses `lighter` — draw it before figures in it.
- Body checks (round 1–2) fixed: a paw on every carried cross, arms from the shoulders (never the cheek), put-downs and
  pick-ups with in-betweens (both paws on the beam), turns with squash, no two bridges at once.
- Refactor: kit = the scene's code lifted line by line (the gap and gate parametrised); cs-gamecartoon renders
  **bit-identical** (max diff 0 on 10 brief stills + 9 extra in-between times).

## What a scene author still draws
The story's props (the worked example's `drawCross` — inked wood with grain, end grain on a fresh cut and a glow — and
`drawSaw`; the template's seed, mound and golden sprout show how a new prop is made from `inked` + `cel` + `shine`), the
choreography, chips/debris lists, camera keys, bolt times, and `script.js`. Not in the kit: other species, interiors,
UI elements (score, buttons — keep them out: the film must not read as an actual ad).
