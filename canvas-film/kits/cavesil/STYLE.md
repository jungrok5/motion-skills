# 동굴 실루엣과 빛줄기 (cavesil)

A hand-painted 2D platformer cave (Ori / Hollow Knight family): black masses frame flat blue planes at their own depth,
diagonal shafts of blue light with turning motes, glowing dot-flowers, and caped silhouette travellers with pale faces.
Kit: `kit.js` → `window.Cavesil`. Worked example: 잘라 낸 건 다리였다 · 03
(`sermons/2026-10-24-cross-styles/film/scenes/cs-cavesil.html`, body-checked twice). New scene: `template.html` +
`script.example.js` (the house demo story: walk in, kneel, plant, wait, a sprout rises with the warm light, stand).

## What it looks like
Pure black (`#010409`) for everything nearest and largest: the ceiling with hanging vines and loops, the ledge's thick front
slab, boulders and big leaf silhouettes at the very bottom. Between them, flat blue planes slide at their own parallax
(far wall with big soft blue glows .15 → blobby pillars and root curtains .42 → back shelf with dark plants .7 → a lit
cavern under the ledge .82). Light is a cool blue shaft from the ceiling to the ledge (blurred quad, screen-blended) with
square motes drifting down it; the walking surface twinkles with blue dot-flowers. Figures are one flat dark fill each
(cape, sleeves, legs) with a thin **rim of light offset up-right** — the only modelling. No outlines, no texture, no grain:
the look is crisp vector shapes plus soft glows. **Everything is cool blue so the one warm thing is the story** (pale-gold
lit wood, a gate's light, a seed-pod).

**Carries well:** a lonely journey, a path that ends (ledges, gaps, edges), "the one light in the dark", something
hidden that grows (a seed underground), searching, descending/ascending, quiet awe, a figure small against a vast world,
game-like clarity of action (carry, cut, lay across, fall). Reads instantly to non-church viewers (game language).
**Carries badly:** faces and close emotion (faces are tiny pale discs with a dot eye), daylight, crowds, homes and modern
interiors, warmth spread everywhere (kills the accent), text-heavy ideas, fast montage of places (the cave is one world).

## Palette
| role | hex |
|---|---|
| black masses (ceiling, slab, boulders, spikes) | `#010409` · vines `#06111d` |
| background gradient | `#081d33` → wallA `#0a2540` → wallB `#0c2a45` → wallC `#071a2c` |
| far / mid / near planes | far `#123a5e` `#0f3150` · pillars `#0d3352` `#0a2843` · shelf `#092036` |
| ledge walking surface | bandA `#173f63` → bandB `#0c253d` → bandC `#081a2c`, lip line `rgba(150,205,255,.55)` |
| leaves / dot-flowers | `#9fd2df` `#5fa3b8` · dots `#7fd8ff` |
| figures | lead cape `#0c1e33`, others `#17324f`, faces `#d6a283` / `#9c7c6a`, hair `#0a1a2c` (+ shine `#7fb6d8`), rim cool `rgb(150,205,255)` → warm `rgb(255,200,135)` |
| **accent (the one warm thing)** | gold `#f0c27a` · wood `#e9b46a` / `#ffe4ac` / `#a9682e` · light `#fff1d2` `#f6b766` · gate `#c98b4a` |
| caption / source / shadow | `#e4f3fb` / `#a9cbe0` / `rgba(0,8,20,.9)` |

## Type and placement
Noto Sans KR 400 for captions (54 px via Story), 700 for the end-card title; `Cavesil.FONTS` for `Pilot.run`. Captions at
**y 440** over the black ceiling, with `captionShade()` (a soft dark oval, no box) so they read over shafts; a 3-line
caption with a source line drops the shade to y 500. End card at **y 880** after `endPlate()` (a lumpy black mass comes
down over the picture, a blue glow and rising motes behind the title). Keep the subject band in screen y 900–1500.

## Kit API (`const K = Cavesil`) — world px; every function has a comment in `kit.js`
- **setup** `init()` (glow sprites, bg gradient, foreground boulders) then `buildCave({x0, x1, gap: {x, w}, gate: {x}, ceil:
  {y, drop, from, to}, shafts: [[footX, footW, dx, topW]…], spikesOK: x => bool, FY BY RT LIP SLAB})` once. Constants
  `C` (palette), `ACCENT`, `FONT`, `FONTS`, `Y` = {FY 1300 front lane, BY 1252 back lane, RT 1212 far edge, LIP 1372, SLAB 1505}.
- **frame** `backdrop(ctx, t, cm, lk)` · `layer(ctx, cm, p, fn)` · `ground(ctx, t, cm, lk, inGate)` · *(your things)* ·
  `ceiling(ctx, t, cm)` · `fore(ctx, cm)` · `dim(ctx, lk)` · `endPlate(ctx, t, at)` · `captions(ctx, t, lines, end)` ·
  `endCard(ctx, t, card, at)`. Camera `cam(x, y, z)` → {x, y, z, sx, sy}, `mixCam(a, b, k)`, `shake(c, t, at)`.
- **light & hits** `hitLight(t, at, depth)` (dip and recover; pass as `lk`), `dust(ctx, t, at, x, y)` (half-ring burst),
  `flecks(ctx, t, list)` (chips that fly and land), `glow(ctx, x, y, R, a)` warm, `blueGlow(…)`, `sprout(ctx, t, x, y,
  grow, {h, glow, sway})` (the glowing seed-pod plant), `archPath(r)` (the gate's opening), `ceilY(x)`, `inGap(x, pad)`.
  Figures' rim warms where `K.warmAt(x)` > 0 (set by `buildCave` from the gate; override for your own warm source).
- **figure rig** `figure(ctx, F, mid, back, mid0)` draws a pose; poses are plain data: `walk(x, gy, s, f, ph, stride,
  lean, lift)`, `walkFree(…)` (arms swinging), `stand(x, gy, s, f, lean)`, `kneel(x, gy, s, f, lean)` (.25 upright … 1.25
  bent to the ground), `crouch(x, gy, s, f, lean)`, `mix(A, B, k)`, `turn(A, B, k)` (squash through the flip),
  `reach(F, i, p, type)`, `lookAt(F, p, max)`, `lookUp(F, k)`, `hangHands(F, swing)`, `hangGrip(F, sw)`, `handR/handL(F)`,
  `ik`, `frame`, `shoulderOf`, `handShape`, `BODY`. Pose fields: `F.col`, `F.me` (hair & brighter rim vs hood),
  `F.head`, `F.skin`, `F.hairCol`, `F.eye` ('calm' 'strain' 'down' 'shock'), `F.tilt`, `F.toes`, `F.alpha`, `F.sq`,
  `F.farFront` / `F.farOver` (far-arm layering).
- **held objects** `beamSprite({len, w, bar: {at, w}, hb, lit, seed})` + `drawBeam(ctx, X, u0, u1, x, y, a, alpha, glow)`
  (a cross, plank, staff; `lit` = the warm accent wood); `carry(F, a0, w, contact)` (on the shoulder, behind the head),
  `inFront(F, len)`, `upright(F, len)`, `grip(F, X, uFar, uNear)`, `pt(X, u, v)`, `mixX`, `rotAbout`.

```js
const K = Cavesil, S = window.SCRIPT, { FY } = K.Y;
async function init() { K.init(); K.buildCave({ x0: -1600, x1: 2600, shafts: [[620, 300, 300, 150]] }); }
function draw(ctx, t) {
  const cm = K.mixCam(K.cam(300, 1040, 1.5), K.cam(560, 1080, 1.8), Pilot.ss(4, 13, t)), lk = 1;
  K.backdrop(ctx, t, cm, lk);
  K.layer(ctx, cm, 1, () => { K.ground(ctx, t, cm, lk);
    const F = K.kneel(456, FY, 1.04, 1, .28); F.col = K.C.me; F.me = true; K.figure(ctx, K.lookAt(F, [628, FY]));
    K.sprout(ctx, t, 628, FY, Pilot.ss(14, 17.6, t), { h: 300 }); K.ceiling(ctx, t, cm); });
  K.fore(ctx, cm); K.endPlate(ctx, t, S.beat.end); K.captions(ctx, t, S.lines, S.beat.end); K.endCard(ctx, t, S.endCard, S.beat.end);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: K.FONTS, init, draw });
```

## Motion grammar (what worked)
- **Poses on twos** (`K.t12(t)` for the pose time, real t for travel) — hand-keyed game animation; motes, vines and dots
  move on ones so the world stays alive.
- **Ambient = the cave breathing**: vines sway on a 3 s period, motes drift down the shafts, dots twinkle (2/3/6 s),
  cavern mist slides. That is enough for a 5-s "wait" beat; push the camera slowly (≈ +10 % zoom) through it.
- **The hit**: crash zoom (eo over .09 s to ~1.3×), `shake` 15/11 px decaying .55 s, `hitLight` dims everything to .4 and
  recovers over 1.7 s, `dust` off the edge, `flecks`. A falling object is clipped to the gap so it drops between the lips.
- **Camera**: a close hook on the lead (z ≈ 1.6), widening to the procession; parallax layers do the depth for free. Keep
  the gap out of frame until the figure reaches it (clamp the camera x). Pull back (z .86–1.0) for the big picture.
- **The warm accent arrives late and once**: lit wood glows (`drawBeam` glow), the gate's arch + spill, the sprout's pod;
  figures' rims warm as they near it (`warmAt`). Never add a second warm source in the same shot.
- Body rules (two body checks): arms from the shoulders with fixed bone lengths (IK), hands drawn AT the grip point, one
  hand one object, the far arm behind the torso (`farOver`/`farFront` only when it must cross), a carried beam rests ON the
  shoulder behind the head (`carry`), ≥ .3 s in-betweens for stand↔kneel/crouch (`mix`), keep the object in the hands
  through a lowering, then release.

## Performance (1080×1920, headless Chromium software canvas, 4 shared CPUs)
- Worked example: **~38 ms/frame** mean (≈35 median, ~100 max at the busiest gap shots), init ~0.2 s — identical before and
  after the refactor (38.2/38.5 → 40.2/37.9 ms, run-to-run noise). Refactor output: **bit-identical** (max diff 0 on 10 stills).
- Template: **~29 ms/frame**, init ~0.16 s. Costs: the shafts' screen blend, ~100 additive dot glows, the fore boulders.
  Everything static is a Path2D batched per colour (`bag`) and built once; blur only happens once, inside `shaftSprite`.

## Pitfalls
- `buildCave` is call-once (it appends to module lists) and consumes one seeded stream in a fixed order; adding or removing
  a section changes every later random (fine for a new film, never for an old one — the old film has its own vendored kit).
- The rim offset (+2.4, −2.4 px) is the figure's only edge — on black it disappears; keep figures over the blue planes.
- Black spikes in front of a kneeling figure eat its legs: pass `spikesOK` to keep the spot clear.
- A camera much below z 1 shows the ledge's ends and the cave's far layers' edges (far layer spans x −900…1700 at .15).
- Gate + no gap works (rim warms over 700 px before the gate); gap without gate works; neither = a plain ledge.
- `kneel` puts the far knee down with the toes tucked (`toes`); `mix` blends `toes` only when a pose has them.
- The sprout pod is the accent: keep its glow ≤ .6 so the caption above still reads.

## What a scene author still draws
The story's objects (the worked example's crosses, saw and cut pieces are its own code on top of `beamSprite`), the
choreography (positions and pose blends per beat), where the gap/gate/shafts go, the camera path, the warm source and
where it appears, and `script.js`. Not in the kit: animals or non-human characters, water, weather outside the cave,
interiors.
