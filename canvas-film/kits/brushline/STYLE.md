# 미니멀 붓선 — Minimal brush line (붓펜 몇 획, 곰, 한 줄의 땅, 따뜻한 색 한 점)

House style `brushline` · kit `kit.js` → `scenes/kit-brushline.js` · global `window.BrushLine` · worked example:
[잘라 낸 건 다리였다 · 미니멀 붓선](../../sermons/2026-10-24-cross-styles/film/scenes/cs-brushline.html) (cross-styles film,
`cs-brushline`; 6-s origin `sermons/2026-10-24-style-lab/` lab-brushline, ref 15).

## What it looks like
A few confident strokes of a black brush pen on near-white paper, and a lot of white. Every stroke is a pressure ribbon
with long tapered ends and a dry, split tail; the whole drawing **boils** (3 drawings at 8 fps). Characters are round
**bears** made of a handful of strokes: a big head circle with two ears and a snout, an open body outline (back stroke +
front stroke, never a closed blob), outlined tube arms on a 2-bone rig, stubby U-shaped legs. "Me" is drawn in full black
brush; everyone else is the same bear in a thin grey brush. The world is reduced to **one long brush line** — the ground —
lifted and restarted like a real hand, with a few grass tufts and pebbles; a gap is simply where the line breaks off and
both ends fall away in dry strokes. The one colour is a **warm spot-colour dab** (three loose apricot passes) laid under
what matters. Words are hand-lettered (Hi Melody), inked twice.

**Carries well:** quiet, gentle, intimate moments; a single choice or a single object (the dab says "this"); humour that
is soft rather than loud; loneliness / company (one black bear among grey ones); "less is more", letting go, rest,
emptiness and gaps (white space is the material — the gap in the line IS the message); children and families.
**Carries badly:** darkness, dread, night, weather, crowds and busy places (no tones — only lines), detailed settings,
anything that needs texture or depth, more than one colour.

## Palette, type, captions
| role | value | note |
|---|---|---|
| paper | `#fcfbf8` (252,251,248) | barely mottled, fine tooth — `K.PAPER_RGB` |
| brush | `#1c1a19` | `K.INK` — "me", the ground, props |
| quiet brush | `rgba(28,26,25,.5)` | `K.GREY` — other characters (drawn at .62× width) |
| paper fill | `#ffffff` | `K.whiteS` / `K.paperRibbon`: hides what's behind AND clears the dab |
| **accent** | dab `rgba(252,222,164,.55)` + `rgba(250,206,140,.28)` + `rgba(253,232,190,.35)` | `K.DAB` — 3 offset passes, multiplied; the only colour |
| words | `#22201e`, quote `#3a3633`, ref `#5a5550` | `K.WORD*` |

Font: **Hi Melody** (Google Fonts) — captions 86 px at y 410, inked twice (offset 1.2, .4 px) and jittered with the boil;
quote 48 px, reference 36 px; end card ×1.3 round y 900, inked twice. `Pilot.run({ fonts: K.FONTS })`.
The ground line sits low: `cam.y = K.camY(gy, z)` puts it at screen y ≈ 1430, leaving the upper third for words.

## Kit API (`window.BrushLine`, screen px unless "world")
- **Frame** `init(opts)` (tooth/paper, layers; ≈0.5 s) · `begin(ctx, t, cam)` · `end(ctx, fade)` · state `g` (ink ctx),
  `hl` (dab ctx), `fd`, `cam`, `M`, `pz` (= z^.55), `TX` (`paper drop`).
- **Camera** `setCam`, `toS`, `mixCam`, `camY(gy, z)`, `shake(t, t0, d, ax, ay)` → `[sx, sy]`.
- **Brush** `brS(screenPts, seed, o)` / `brW(worldPts, seed, o)` (o: `w` 11, `fix`, `raw`, `wob`, `boil`, `ts/te/mn`, `dry`,
  `dryN`, `col`), `whiteS(pts)`, `paperRibbon(pts, o)`, `pathS(g, pts)`, `dashed(pts, t, seed)` (crawling brushed dashes),
  `ticks(c, rx, ry, n, a0, da, r1, r1y, seed)`, `hit(t, t0, worldPt)`, `specks(list, t)`, `wisps(t, x, y0, {n, spread, h})`
  (rising steam / warmth / light), `HD.*` geometry (`spline seg poly arc wob boil xf mat mul pt ribbon ink …`), `t12 bf frac`.
- **Accent** `dabS(cx, cy, rx, ry, k, seed, a)` (a round dab that grows with k), `dabPoly(pts, a)` (a dab following a shape).
- **World** `groundLine({from, to, gaps: [[x0, x1]…], seed})`, `tufts({x0, x1, skip, seed})`, `drawGround(line, tufts, gy)`
  (the line, each gap's falling ends, tufts), `clipGap(x0, x1, gy)` / `unclip()` (things falling into a gap),
  `doorway(t, {x, gy, ay, r, light})` (brushed arch, open leaf, dab inside, wisps above), `cloud(x, y, w, seed, {w, col})`.
- **Figure (bear rig)** `drawBear(F, back, mid)` · poses `walkSpec(x, gy, s, f, phase, stride, lean, lift)`,
  `standSpec(x, gy, s, f, lean)`, `crouchSpec(x, gy, s, f, k)` (kneel: paw reaches the ground ≈150·s ahead), `lookUp(F, k)`,
  `mixSpec(A, B, k)`, `turnSpec(A, B, k)` (squash + face-on drawing), `restHands(F)`, `bearM(F)`, `ik(a, t, l1, l2, pick)`,
  `BEAR` (rig constants). Spec fields: `kind ('me'|other) id seed s f gy hip ang feet hands hand(rest|grip|flat|open) tilt
  eye(dot|dash|squeeze|happy|shock|down|up) front farFront carry alpha ticks sweat bang run`.
- **Long objects** `cpt(X, u, v)`, `rotAbout`, `mixX`, `shoulder(F, a0, width, contact)` + `gripCarry(F, X, held)` (sets
  `F.carry`: far arm over the shoulder), `farU/nearU`, `holdFront(F, len, a)`, `holdUpright(F, len, lean)`,
  `attach(F, X, k, u, v)`, `hangGrip(F, swing)`.
- **Words** `captions(ctx, t, lines, {until, y, size})`, `endCard(ctx, t, card, at)`.

```js
const K = BrushLine, S = SCRIPT, FY = 1300;
let GL, TUFTS;
function draw(ctx, t) {
  K.begin(ctx, t, { x: 300, y: K.camY(FY, 1.1), z: 1.1 });
  K.drawGround(GL, TUFTS, FY);
  const F = K.walkSpec(40 + 60 * t, FY, 1, 1, t * .5, 120, .1); F.kind = 'me';
  K.drawBear(F);
  K.end(ctx, 1 - Pilot.ss(S.beat.end - .15, S.beat.end + .35, t));
  K.captions(ctx, t, S.lines, { until: S.beat.end }); K.endCard(ctx, t, S.endCard, S.beat.end);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: K.FONTS, draw,
  init: () => { K.init(); GL = K.groundLine({ from: -1200, to: 1800 }); TUFTS = K.tufts({ x0: -1100, x1: 1700 }); } });
```

## Motion grammar (what worked)
- Boil on 8 fps, poses on twos (`K.t12`); the camera glides smoothly underneath (strokes are redrawn in screen space, so
  a push doesn't fatten them beyond `pz`).
- Few marks, big gestures: a stop = lean back + `shock` eye + `ticks`; joy = `happy` eye + bounding steps (lift > 30) +
  `run` speed strokes; strain = `squeeze` eye + `sweat`.
- The dab arrives late and grows (`dabS(..., k)`) — it is the emotional beat; on recognition it pulses and gets ticks.
- The hit: `hit()` strokes + `shake()`; something falls into the gap, clipped (`clipGap`), with brushed fall lines.
- Waiting: almost nothing moves — the boil, a cloud drifting 6–9 px/s, the bear breathing (hip ±3 px), a blink (`dash`).
- End: drawing fades to plain paper, the card is lettered (twice) on it; the loop seam joins frame 0.

## Performance (1080×1920, headless Chromium, 4 shared CPUs)
- Worked example `cs-brushline`: **≈23 ms/frame** mean (13–42), before and after the refactor alike (29.1/22.6 orig vs
  24.6/22.8 kit, same session); init ≈0.45 s. Pixel-identical to the pre-kit scene (max channel diff 0 at 10 times).
- Template: **≈18 ms/frame** mean (11–60), init ≈0.5 s.
- The cheapest hand-drawn kit: no hatching tiles; cost is the ribbon fills (≈40 per bear) and two full-frame multiplies.

## Pitfalls
- The bear is tall (head ≈ 200·s above the hip) and its arms are short (2 × 62·s): to reach the ground it must
  `crouchSpec` (pitch .85) and the target must be ~150·s ahead — compute target points from the shoulder
  (`HD.pt(K.bearM(F), ...K.BEAR.SHOULDER[1])`) rather than guessing, or use `attach` to bring the object to the paw.
- Carrying on the shoulder needs `F.carry` (set by `gripCarry`) so the far arm is drawn OVER the back, onto the beam;
  without it the far paw floats behind the body.
- Grey (other) bears are drawn with `.62×` stroke width; a lone grey bear reads as "faded / not there" — that's the point,
  but don't make "me" grey.
- Paper fills erase the dab under them: lay the dab first, then the object's `whiteS`, then `dabPoly` on top for objects
  that ARE the accent (as `drawCross` / the sprout leaves do).
- `groundLine` seeds depend on the gap list: changing gaps re-rolls the line's lift points (fine for a new film, but a
  reviewed film's line will move).
- Hi Melody is thin — never below 36 px; it's inked twice to read on a phone.
- Template note: a wide shot (z < .9) makes the line and bears thin — keep z ≥ 1 for the main figure.

## What a scene author still draws
The film's one subject (the cross and saw in the example; seed, mound and sprout in the template), the pose timeline (which
spec at which beat, what each paw holds), the camera path, and where the ground breaks / the doorway stands. New props
follow the grammar: `whiteS` fill + one or two `brS` strokes (w 6–10, long taper, dry tail), optional dab, unique seeds.
