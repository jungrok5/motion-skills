# 플랫 벡터 밤숲 (flatnight)

Flat vector night forest: every surface one flat fill of blue/indigo, depth by value steps between parallax layers, near-black
hooded travellers with pink faces, and light as a *palette swap* — soft discs through which the same world shows in a brighter
"lit" blue. One warm accent (honey wood / lantern gold). Kit: `kit.js` → `window.Flatnight`. Worked example: 잘라 낸 건
다리였다 · 04 (`sermons/2026-10-24-cross-styles/film/scenes/cs-flatnight.html`). New scene: `template.html` + `script.example.js`.

## What it looks like
A children's-book night: a sky of `#131c81`, bare trunks, two rows of teardrop-crowned trees, bushes with blinking white eyes,
a crescent moon, a road, and a very dark foreground of swaying plants at the bottom of the frame. No outlines, no gradients,
no texture. Figures are the darkest things on screen (near-black ink cloaks — blue-on-blue figures did not read), with a pink
(hero) or lilac (crowd) face and mitten hands. Light never "glows" — it opens a disc in which the forest is redrawn in its lit
palette (`LT`); the only additive warmth is small halos and the accent itself.

**Carries well:** fables and parables at night; one small light against a big dark (a lantern, a seed, a doorway); a light
that grows or shrinks with a choice (the film: every cut makes my light smaller); a crowd walking somewhere; gentle fear
(eyes in the bushes) that never turns horror; hope arriving as a widening circle. Reads instantly on a phone, any age.
**Carries badly:** daylight, many colours, realism or adult grit, faces with nuanced expression (the face is a pink shape with
a dot eye), fast action with many overlapping figures (flat dark shapes merge), anything that needs texture (stone vs wood).

## Palette
| role | hex |
|---|---|
| sky night / lit | `#131C81` / `#2939FF` |
| tree row B crown night / lit (the brightest layer) | `#152EC3` / `#3249FF` |
| road night / near band | `#14115F` / `#110D55` |
| chasm deep | `#020114` |
| foreground ground / plants (never lit) | `#18146B` / `#0E0848` |
| hero cloak / face / hood rim | `#0C0936` / `#EC99D4` / `#3A4CFF` |
| crowd face | `#C4B4EE` |
| **accent** — honey wood body / shade / highlight / grain | `#E0A052` / `#A8642A` / `#F8D394` / `#C07C3A` |
| quiet purple wood (everyone else) | `#5A24A8` |
| doorway core / dashed outline | `#FFE6F2` / `#FFD1E3` |
| warm halo / slot glow | `rgb(255,170,80)` / `rgb(255,200,124)` |
| caption / source / shadow | `#E4E7FF` / `#C3C9FF` / `rgba(8,4,52,.8)` |
| end plate | `rgba(12,8,62,.84)` + the moon |

Full night (`DK`) and lit (`LT`) tables with identical keys are in `kit.js`; recolour a scene by editing both.

## Type and placement
Noto Sans KR 700 for captions (pale periwinkle on a soft indigo shadow, y = 420), 500/400 for source lines and the end card
(title at y = 860 on the closing night plate). `FN.FONTS` for `Pilot.run`. Words sit in the sky above the trees; keep the
figures' heads below y ≈ 700 on screen.

## Kit API (`const FN = Flatnight`)
World units = px at zoom 1 (road far edge y 1212, figures' lane y ≈ 1300). Every function has a comment in `kit.js`.
- **setup** — `init()` (offscreen canvases for the lit pass); `forest(seed=5, {from, to, maxEyes})` → `{layers, eyes}` once.
- **palette/type** — `DK LT FG WOOD WOOD_COLD FIG.me FIG.other figPal(o) RED PINK FLAME GLASS WARM FONT FONTS BODY`.
- **flat shapes** — `leaf drop tree trunk bush sprout clump hill hillY`.
- **backdrop** — `backdrop(g, cm, C, forest, {moon})` (sky + parallax layers + moon), `drawLayer`, `moon(ctx, x, y)`,
  `eyes(ctx, t, cm, forest.eyes)` (night pass only), `foreground(ctx, cm, t, {y, p})`, `fireflies(ctx, t, cm, {...})`.
- **camera** — `{x, y, z, sx, sy}`; `layerT layer(ctx, cm, p, fn) toScreen mixCam shake(t, at, dur, ax, ay)`.
- **light** — `discs(cm, D)` world → screen; `lit(ctx, D, g => pass(g, 'l'))` lit world through soft discs (+ warm screen on
  discs with `warm`); `halo(ctx, x, y, r, a)`; `warmBar(ctx, x0, x1, y, h, k, flash)`.
- **world pieces** — `road(ctx, C, x0, x1, {top, near, gap:[x, w], inGap})` (road, chasm walls, lips, tufts);
  `gate(ctx, C, x, gy, inner)` (glowing doorway then the arch); `dashed(ctx, pts, t, al, clip)`; `outline(g, x, y)`;
  `hitRing(ctx, t, at, x, y)`; `endPlate(ctx, t, at)`; `captions(ctx, t, lines, o)`; `endCard(ctx, t, card, at, o)`.
- **long things** — `crossGeo(o)` (CBW 0 = plank/pole); `cross(ctx, K, g, u0, u1, x, y, a, lying, alpha)`; `cpt mixX rotAbout`;
  `carry(F, g, left, a0)` + `gripCarry(F, X, g)` (on the shoulder); `holdUpright(F, g, left)`; `holdFront(F, g, left, lift)`.
- **rig** — pose spec `F`; `walk stand kneel crouch lookUp hangHands hangGrip reach handR handL mix turn`;
  `figure(ctx, F, C, mid, back, over)`; low level `ik frame shoulderOf hood`.

```js
const FN = Flatnight, forest = FN.forest(5); FN.init();                      // in init()
function draw(ctx, t) {
  const cm = { x: 0, y: 1060, z: 1.3 }, F = FN.walk(-200 + 90 * t, 1300, 1.04, 1, (90 * t) / 146, 140, .12);
  const pass = (g, k) => { const C = k === 'd' ? FN.DK : FN.LT;
    FN.backdrop(g, cm, C, forest); if (k === 'd') FN.eyes(g, t, cm, forest.eyes);
    FN.layer(g, cm, 1, () => { FN.road(g, C, -800, 900); FN.figure(g, F, FN.FIG.me[k]); }); };
  pass(ctx, 'd'); FN.lit(ctx, FN.discs(cm, [{ x: 120, y: 1200, r: 300, warm: 1 }]), g => pass(g, 'l'));
  FN.foreground(ctx, cm, t); FN.captions(ctx, t, SCRIPT.lines);
}
```

## Motion grammar
- Smooth eased camera (push-ins to 1.3–1.6 on hands-on moments, pull-backs to 0.8–1.0 for the "whole picture"); a short
  decaying shake on the hit (`shake`), plus the hard `hitRing`.
- Light carries the story: a disc that walks with the hero, shrinks with each loss, falls with it, and comes back as many
  small discs lighting up one after another. Discs ease in with `eo`, never pop.
- Ambient: eyes blink and glance in the bushes (1.7–2.6 s cycle), foreground plants sway, the moon holds still; optional
  fireflies for a wait.
- Figures: 2-bone IK walk cycle with planted feet (phase ∝ distance / stride), cloak hem sway, head tilt, mitten hands at
  their grip points. In-betweens on every hand-off (put down, pick up, hoist, turn).

## Performance
1080×1920, Chromium, 4 shared CPUs: worked example **≈ 27–28 ms/frame** median (p90 ≈ 35 ms; the lit pass redraws the
whole world a second time — it is the main cost); template ≈ 26 ms. Init ≈ 1 s. Refactor to the kit: max channel diff 0 on
10 stills, timing unchanged (27.1–28.5 → 27.7–28.0 ms median).

## Pitfalls
- The film's discs are passed to `lit` WITHOUT `warm` (its map dropped the field), so the approved look has **no** warm screen
  over the lit pools; pass `warm` only when you want the extra amber (the template uses it for the sprout).
- Blue-on-blue figures disappear: keep figures near-black (`FIG`), accent things warm, the crowd's props purple.
- Everything is drawn twice (night + lit). Anything that must not change in the light (eyes, the foreground) goes in the
  night pass only or after `lit`.
- `mixCam` returns the input object at k ≤ 0 — set `sx/sy` after the last mix (as `shake` does), never mutate shared cams.
- Body check (rig reports): hands must stay ON the thing they move through every in-between (laying a long object down:
  lower it with the hand on the shaft, palms on the beam until the let-go); separate hands for tool and load; a far-bank
  180° turn needs a hoist frame or `turn()`. A cantilevered one-handed hold reads as impossible — use two hands.
- A tilted short cross on the shoulder reads as an X — carry short things flatter.

## What a scene author still draws
The one image (seed, door, tool, gift…), the story's poses and timing, the light pools (where, how big, when), the camera
moves, the props' palettes. Script text and end card come from `script.js` / `source.json`.
