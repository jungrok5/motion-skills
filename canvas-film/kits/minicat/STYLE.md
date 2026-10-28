# 미니멀 고양이 — Minimal line + flat blue (잠옷 고양이, 얕은 물가)

House style `minicat` · kit `kit.js` → `scenes/kit-minicat.js` · global `window.MiniCat` · worked example:
[잘라 낸 건 다리였다 · 09](../../sermons/2026-10-24-cross-styles/film/scenes/cs-minicat.html) (origin: style lab `lab-minicat.html`).

## What it looks like
One flat cornflower-blue field with a faint paper tooth and grain. A thin, steady black hand line (a fixed tremor — it
does **not** boil) around flat pale fills. Small white cats in cream pyjamas with dot eyes and whiskers. A quiet sky of a
grey moon, lavender cloud blobs outlined only on their lower half, and star specks (parallax .4). The ground is a long
ledge of shallow water — a lighter band with a firm ink front edge — over open, darker water where each figure has a soft
lavender reflection and broken ripple arcs drift outward; every footfall rings. The only warm colour is **honey**: the one
thing the film is about (a wooden cross, a seed) and the light of a doorway. Deadpan, small, quiet; big empty blue.

**Carries well:** a gentle parable with one small creature ("me") among others like it; loneliness, waiting, a quiet
mistake noticed too late; comparison with others (a procession, "theirs vs mine"); one precious warm thing in a cool
world; a drop / gap / edge (the ledge breaks into a ravine); stillness that lets a caption land; child-like honesty.
**Carries badly:** violence, horror, spiritual darkness (it is too cute — a demon would be a costume); crowds and cities;
fast montage; detailed hands or faces (paws are ovals, faces are dots); anything needing many colours or real light.

## Palette, type, captions
| role | hex | `MiniCat.C` key |
|---|---|---|
| field (everything) | `#5680bd` | `field` (+ white/black mottling at 6 % in `BG`) |
| ink line | `#1a1c28` | `ink` — 3 px on screen at any zoom (`LW`) |
| clouds / door frame | `#7c91c8` / `#a9b2d4` | `lav`, `lavL` |
| moon | `#b3b9c9` | `moon` |
| me | body `#fbfcfd`, pyjamas `#f2e8c6` / `#e3d8b4` | `white`, `cream`, `cream2` (`MEPAL`) |
| the others | `#dfe2ec`, `#b9c1dc` / `#a6afd0` | `pBody`, `pCloth`, `pCloth2` (`PILPAL`) |
| reflections | `#8d9bcb`, `#a7afd0` | `refl`, `refl2` |
| **accent** | honey `#f1c35a` (side face `#cf9a3a`) | `honey` / `HONEY` — the ONE warm thing. `init({ accent })` to change |
| door light | `#fff3d2` + the GLOW sprite (warm radial) | `light`, `GLOW` |
| ravine | `#2b3f76 → #05070f` | inside `drawGap` |

Font: **Hi Melody** (captions, end card, 400) + Noto Sans KR 500 (source lines). `<link>` = `MiniCat.FONT_LINK`,
`Pilot.run({ fonts: MiniCat.FONTS })`. Captions: ink, size 74, centred at **y 410**, soft blue halo
(`rgba(86,128,189,.95)`, blur 16) so they read over clouds. End card: hand font, ink on a plain blue plate (moon + water
rings), scaled 1.18 around y 820 (`endPlate` + `endCard`).

## Kit API (`window.MiniCat`; world px, the camera `{ x, y, z }` is the world point at the frame centre)
- **Setup** `init({ accent })` — BG field, GRAIN, GLOW (~120 ms). `background(ctx)`, `grain(ctx)` (last pass), `glow(ctx, x, y, w, h, a)`.
- **Hand line** `ink(ctx, pts, { fill, lw, col, closed, smooth, part, it, step, amp })` — THE drawing call (control points →
  smoothed, resampled, wobbled outline; `part` = line only on a stretch). `shape(pts, o)` + `drawShape(ctx, s)` (prebuilt),
  `stroke(ctx, path, { lw, col })`, `pathOf`, `inkPts`, `wob`, `chaikin`, `resample`, `ell(cx, cy, rx, ry, n)`,
  `tube(line, halfWidths)` (limb/stem outline), `blobPts(cx, cy, rx, ry, seed)`, `arc(ctx, cx, cy, rx, ry, a0, a1, lw)`.
  `LW` (getter) = 1/zoom; `setLW(v)`.
- **The cat rig** `drawCat(ctx, F)`; `F = { x, gy, f, lean, head (− looks up), bob, crouch, sq, feet: [far, near], hands: [far, near] | null,
  face: calm|strain|down|happy|shock|look, pal, alpha, strap: hold|wrap, grip, back(Fr), mid(Fr), front(Fr) }`.
  `frameOf(F)` → `{ hip, TF(u, v), HF(u, v), hc }` (hang props on the body), `armOf(Fr, F, near)` → `{ sh, el, hand }`,
  `ik(root, target, l1, l2, bend)`, `drawArm`, `face`, `drawCatRefl(ctx, F, waterY)`, `CS` (1.3), `ARM_REACH` (70 px),
  `MEPAL`, `PILPAL`.
- **Poses** `walkSpec(x, gy, f, phase, stride, { stance, lift, bob, lean, head, face })`, `standSpec(x, gy, f, o)`,
  `crouchSpec(x, gy, f, o)`, `kneelSpec(x, gy, f, o)`, `mixSpec(A, B, k)` (in-betweens; a change of facing squashes the body
  through a front view, min .58), `t12(t)` (poses on twos).
- **Held objects** `objPt(X, u, v)`, `rotAbout(X, pivot, th)`, `mixObj(A, B, k)`, `shoulderCarry(Fr, gy, u0, len)` (dragged on
  the shoulder, tie with `F.strap`), `holdFront(F, len, o)` / `holdUpright(F, len, o)` → `{ X, hands }`.
- **World** `buildSky(r, { moons, from, to, starsFrom, starsSpan })` + `drawSky(ctx, cm, sky, p = .4)`;
  `ledge(ctx, cm, { top, front, gaps })`; `buildArcs(r, { from, to, y, gaps })` + `ripples(ctx, t, arcs, steps)`;
  `footfalls(figsAt, { dur, until, onWater })` → steps; `buildGap({ x, w, top, front, base })` + `drawGap(ctx, t, gap)` +
  `gapClip(gap)`; `door(ctx, t, { x, gy, w, h, pool }, behind)` (call before and after the figures that walk into it).
- **Effects** `splash(ctx, t, t0, x, y)` (the hit: white diamonds + ray burst), `rays(ctx, t, x, y, a, o)` (a glint),
  `speedLines(ctx, t, F, a)`.
- **Camera** `setCam(ctx, cm, p)` (also sets `LW`), `mixCam(a, b, k)`, `shake(t, t0, ax, ay, dur)` → [sx, sy], `view(cm)`.
- **Words** `captions(ctx, t, lines, o)`, `endPlate(ctx, t, at)`, `endCard(ctx, t, card, at, o)`; `HAND`, `FONTS`, `FONT_LINK`.

```js
const MC = MiniCat, S = window.SCRIPT; let SKY, ARCS, STEPS;
function init() { MC.init(); const r = Pilot.rng(31); SKY = MC.buildSky(r, {}); ARCS = MC.buildArcs(r, { to: 2200, y: 1310 });
  STEPS = MC.footfalls(t => [pose(t)], { dur: S.DUR }); }
const pose = t => MC.walkSpec(200 + 90 * t, 1300, 1, (200 + 90 * t) / 92, 92, { lean: .16 });
function draw(ctx, t) {
  const cm = { x: 200 + 90 * t + 100, y: 1000, z: 1.4 }, F = pose(MC.t12(t));
  ctx.setTransform(1, 0, 0, 1, 0, 0); MC.background(ctx); MC.drawSky(ctx, cm, SKY);
  ctx.save(); MC.setCam(ctx, cm); MC.ledge(ctx, cm, { top: 1254, front: 1310 }); MC.ripples(ctx, t, ARCS, STEPS);
  MC.drawCatRefl(ctx, F, 1310); MC.drawCat(ctx, F); ctx.restore(); MC.setLW(1);
  MC.captions(ctx, t, S.lines); MC.endPlate(ctx, t, S.beat.end); MC.endCard(ctx, t, S.endCard, S.beat.end); MC.grain(ctx);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: MC.FONTS, init, draw });
```

## Motion grammar (what worked)
- **Figures on twos** (`t12`), camera and water on ones. Walk = `walkSpec` with phase = distance / stride (feet never slide);
  heavy = slow stride 70, lean .34, strain face, bob 3; light = stride 150, stance .38, big lift 26–30, bob 18–22, happy face.
- **Put-down / pick-up** = `mixSpec` over ≥ .3–.4 s with both paws on the object (hands at `objPt` grip points), the object
  lerped with `mixObj` in step. A turn while handling squashes the body (`sq`); keep the paw that holds the object on the
  near side (drawn over the body) during the squash so the object never moves by itself.
- **Hook**: frame 0 close (z 1.75) on the hero with the telling prop, widening by ~2.6 s.
- **The hit**: a fast zoom (`eo` over .09 s) + `shake` 16/12 px decaying in .55 s + `splash` at the lip.
- **Looking back**: one continuous camera travel back along the ledge to the thing that matters, then out again.
- Glow is the only "light": a honey glow under a precious thing, the door's GLOW + flickering white rays on twos.
- Footfall rings are sampled once in `init` (`footfalls`) — cheap and seek-safe.

## Performance (1080×1920, headless Chromium, 4 shared CPUs)
- cs-minicat: **~14 ms/frame** mean (13.0–15.2 over four interleaved runs, before and after the refactor alike), peaks
  ~90 ms on frames with the loop seam/end card. init ~0.3 s (GRAIN is a full-frame ImageData loop, ~100 ms).
- Template: **~8 ms/frame** mean. Everything is vector paths; the costs are the full-frame BG/GRAIN blits and many `ink` calls
  (each resamples + noise-wobbles its outline every frame — prebuild static things with `shape`).

## Pitfalls
- `ink` wobbles by **world position** (a noise field), so a moving shape's tremor slides along its outline — that is the
  steady line of the style; don't try to boil it.
- `LW` must follow the zoom (`setCam` sets it); reset with `setLW(1)` before screen-space drawing.
- The kneel and crouch read as a deep bow — the big head goes forward over the hands. Put what the paw touches ≥ 70 px
  ahead of the hip (and `head: -.1`) or the head hides it; check the arm reach (`ARM_REACH` 70 px from the shoulder) —
  IK clamps a target out of reach and the paw stops short.
- A standing cat's head covers ~±75 px around its x: step it back (a tiny backing walk, still facing) to look at something.
- The sky builder and ripple builder share one rng in the worked example — pass the same `r` in the same order to reproduce it.
- Body checks (round 1–2) fixed: a carried load must touch the cat (shoulder + strap + paw); the saw stays in the fist for
  the whole stroke; a mid-turn object is held by the near paw drawn over the body; cross mirror-flips need 2–3 drawings.
- Refactor: the kit is the scene's code moved verbatim; cs-minicat renders **bit-identical** (max diff 0 on 10 stills).

## What a scene author still draws
The story's props (a cross with `crossLocal`/`drawCross`, a saw with its stroke, a seed, a sprout), the choreography
(paths integrated once, beats, where paws grip), the camera keys, which world pieces appear (gap, door, ledge breaks), and
`script.js`. Not in the kit: other species, indoor sets, rain/snow, crowds.
