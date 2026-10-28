# 펜 낙서 — Ballpoint pen doodle (볼펜 낙서 새, 비, 노란 형광펜 하나)

House style `pendoodle` · kit `kit.js` → `scenes/kit-pendoodle.js` · global `window.PenDoodle` · worked example:
[잘라 낸 건 다리였다 · 펜 낙서](../../sermons/2026-10-24-cross-styles/film/scenes/cs-pendoodle.html) (cross-styles film, `cs-pendoodle`;
6-s origin `sermons/2026-10-24-style-lab/` lab-pendoodle, ref 14).

## What it looks like
A margin doodle that came alive: a blue-black ballpoint on warm off-white paper. Every line is a thin, slightly
see-through pen ribbon with tapered ends and a little pressure wobble, and the whole drawing **boils** — 3 redrawn
versions cycled at 8 fps. Characters are round **scribble birds** (head circle, egg body, stick legs, wing "arms" with
three feather fingers): "me" is scribbled almost solid black, everyone else is the same bird lightly hatched in grey.
It **rains on twos** (pen dashes), the ground is a field of **puddle scribbles** — (‿), ~, dashes — that ripple. Holes are
dense cross-hatching; white-out fills hide what is behind. The one colour is a **yellow highlighter** run over what
matters (my thing, the light, the sprout), multiplied under the ink. Words are hand-lettered (Nanum Pen Script) and
jitter with the boil. Emphasis is doodle grammar: worry ticks, sweat drops, a "!", speed lines, a white-haloed burst.

**Carries well:** the small, honest, self-deprecating "me" (the viewer sees themself in the scribble bird); everyday
temptations and excuses; comedy that turns (a gag that lands as a sermon point); one thing singled out (highlighter =
"this one"); waiting, rain, small hope; parables with a crowd of same-looking others vs one dark "me".
**Carries badly:** awe, majesty, deep darkness and fear (paper stays light — a hole is the darkest thing it has),
realistic faces or hands, violence (it reads as a joke), lush colour, many lit things at once (one highlighter only).

## Palette, type, captions
| role | value | note |
|---|---|---|
| paper | `#eee7e2` (238,231,226) | mottled ±5, embossed tooth, fibres, soft vignette — `K.PAPER` |
| pen | `rgba(34,31,40,.9)` | `K.INK`; solid `#221f28` (`K.INKS`) for pupils / dots |
| quiet pen | `rgba(58,54,64,.72)` | `K.INKP` — other characters |
| white-out | `#fff` on the ink layer | hides the ink behind AND erases highlighter under it |
| **accent** | highlighter `rgb(255,222,70)` at .14–.62 | `K.HL`; multiplied, so ink stays black over it. Never a second colour. |
| words | `#25222b`, quote `#3a3540`, ref `#55505a`, card source `#3e3944` | `K.WORD*` |

Font: **Nanum Pen Script** (Google Fonts; captions 92 px at y 410, quote 52 px, ref 40 px; end card ×1.32 around y 900).
`Pilot.run({ fonts: K.FONTS })`. The rain leaves a dry rectangle round the words (`K.rain({ hole: K.capRect(t, lines) })`).

## Kit API (`window.PenDoodle`, screen px unless "world")
- **Frame** `init(opts)` (paper/tooth, 3+3 hatch tiles, dense/light tiles, rain drops, layers; ≈0.8–1.7 s) ·
  `begin(ctx, t, cam)` · `end(ctx, fade)` · state: `g` (ink layer ctx), `hl` (highlighter ctx), `fd` (drawing 0..2),
  `cam`, `M` (camera matrix), `pz` (pen thickening on a push), `TX` (`paper hMe[3] hPil[3] hDense hLight`).
- **Camera** `setCam({x,y,z,sx,sy})`, `toS(worldPt)`, `mixCam(a,b,k)`, `shake(t, t0, d, ax, ay)` → `[sx, sy]`.
- **Pen** `penS(screenPts, seed, o)` / `penW(worldPts, seed, o)` (o: `w`, `fix`, `raw`, `wob`, `boil`, `col`, `ts/te/mn/press`),
  `whiteS(pts)`, `hatchS(pts, tile, ax, ay)`, `hiS(pts, a, rgb)`, `hiLine(pts, w, a, rgb)`, `pathS(g, pts)`,
  `dashed(pts, t, seed)` (crawling white-out dashes: a guide / missing piece), `ticks(c, rx, ry, n, a0, da, r1, seed)`,
  `hit(t, t0, worldPt)` (THE hit burst, .45 s), `specks(list, t)` (dirt/sawdust physics), `hatchTile(...)`, `rotAboutM`.
- **Geometry** `HD.*`: `spline seg poly arc wob boil xf mat mul pt ribbon ink tooth paper toothMask layer walker`, `t12 bf frac`.
- **Weather/ground** `rain(t, {a, keep, hole, top, deep})`, `keepBox(F)`, `puddles({x0,x1,top,deep,per,seed,skip})` →
  marks, `drawPuddles(marks, t)`.
- **World** `gap({cx, top, bottom, half, seed})` + `drawGap(hole, anchorWorldPt)` (a hole/chasm in the road),
  `doorway(t, {x, gy, ay, r, rr, light})` (lit arch, highlighter rays), `lamp(x, base, seed)` (unlit street lamp).
- **Figure (bird rig)** `drawBird(F, back, mid)` · poses `walkSpec(x, gy, s, f, phase, stride, lean, lift)`,
  `standSpec(x, gy, s, f, lean)`, `crouchSpec(x, gy, s, f, k)` (kneel/squat), `lookUp(F, k)`, `mixSpec(A, B, k)`,
  `turnSpec(A, B, k)` (turn with squash + face-on head), `restHands(F)`, `birdM(F)`, `BIRD` (rig constants).
  Spec fields: `kind ('me'|other) id seed s f gy hip ang feet hands hand(rest|grip|flat|open) tilt eye(calm|strain|happy|shock|down|up)
  look front farFront alpha ticks sweat bang run strap`.
- **Long objects** (plank, pole, cross, oar: X = `{x, y, a}` foot + angle, u along, v across) `cpt(X, u, v)`, `rotAbout`,
  `mixX`, `shoulder(F, a0, width, contact)` + `gripCarry(F, X, held)`, `farU/nearU`, `holdFront(F, len, a)`,
  `holdUpright(F, len, lean)`, `attach(F, X, k, u, v)` (object comes to the hand when out of reach), `hangGrip(F, swing)`.
- **Words** `captions(ctx, t, lines, {until, y, size})`, `endCard(ctx, t, card, at)`, `capRect(t, lines)`.

```js
const K = PenDoodle, S = SCRIPT;
let MARKS;
function draw(ctx, t) {
  K.begin(ctx, t, { x: 300, y: 1090, z: 1.12 });
  const F = K.walkSpec(40 + 60 * t, 1300, 1.6, 1, t * .55, 110, .12); F.kind = 'me';
  K.rain(t, { keep: [K.keepBox(F)], hole: K.capRect(t, S.lines) });
  K.drawPuddles(MARKS, t);
  K.drawBird(F);
  K.end(ctx, 1 - Pilot.ss(S.beat.end - .15, S.beat.end + .35, t));
  K.captions(ctx, t, S.lines, { until: S.beat.end }); K.endCard(ctx, t, S.endCard, S.beat.end);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: K.FONTS, draw, init: () => { K.init(); MARKS = K.puddles({ top: 1100 }); } });
```

## Motion grammar (what worked)
- **Boil, not tween**: lines redraw at 8 fps (3 drawings); poses and rain step on twos (`K.t12`). Camera moves stay smooth —
  the pen is drawn in screen space each frame, so a push never fattens lines (only `pz` = z^.45 thickens them a little).
- Gags in 3–4 drawings: set-down / pick-up in-betweens of ~.3 s; a stop = a little lean back + `shock` eye + worry `ticks`.
- **Highlighter = meaning**: the thing that matters is highlighted from frame 0; later it glows again (a pulse + ticks)
  when it is recognised. Light sources are highlighter fans (`doorway`, the template's sprout halo).
- **The hit**: `hit()` burst + `shake()` (.55 s) + the thing falling clipped into a hatched hole.
- Rain is the ambient "waiting" motion; thin it (`rain({a})`) when things resolve.
- End: the drawing fades to plain paper (`end(ctx, fade)`) and the card is lettered on it; the loop seam does the rest.

## Performance (1080×1920, headless Chromium, 4 shared CPUs)
- Worked example `cs-pendoodle`: **≈44 ms/frame** mean (27–80), before and after the refactor alike (44.4/44.3 orig vs
  39.2/45.0 kit, same session); init ≈0.8 s (tooth + paper + 8 hatch tiles). Pixel-identical to the pre-kit scene
  (max channel diff 0 at 10 times).
- Template: **≈23 ms/frame** mean (17–37), init ≈1.0 s.
- Cost drivers: hatch-clipped fills (`hatchS`, every bird body/head/wing), 140 rain dashes, ~200 puddle marks in view, two
  full-frame multiplies. A crowd of 5 birds ≈ +20 ms.

## Pitfalls
- **Rain through legs** reads as extra legs — always pass `keep: figures.map(K.keepBox)`.
- `whiteS` must come before the highlighter you want visible on top of a covered thing — it erases the highlighter
  under it (that is how a bird in front of a lit doorway stays white).
- Hatching tiles are positioned at an anchor (`hatchS(..., ax, ay)` / `drawGap(hole, anchor)`): anchor them to the object
  (hip, a world point), not the screen, or the hatching swims under a moving camera.
- Seeds are per stroke: reusing a seed for two different strokes makes them boil in lock-step (looks mechanical).
- The wing reach is 74·s (clamped at 1.2×): a target further away leaves the hand short. Use `attach` so the object comes to
  the hand, or move the body (hip) closer; never draw the held thing away from the wingtip.
- A long thing carried on the back goes in `back()` (behind body), a thing held in front in `mid()` (between body and near
  wing) — the far wing is drawn in front only with `F.farFront` (e.g. pressing a beam down).
- Text: Nanum Pen at < 40 px gets hard to read on a phone; keep source refs ≥ 40 px.
- The template's black fade-in is not used: frame 0 shows the figure (the hook). Keep it that way.
- Refactor note: the kit runs at `Pilot.W/H` — in landscape (o=h) the paper, rain and camera centre follow, but the
  example scene and template are composed for portrait only.

## What a scene author still draws
The film's one subject (the cross and saw in the example; the seed, mound and sprout in the template), the timeline of
poses (which spec at which beat, which hand holds what), the camera path, and where the kit pieces stand (puddle band,
gap, doorway, lamps). Keep new props in the same grammar: white-out fill + `penS` outline (w 3.2–4.2) + optional
hatching or highlighter, seeds unique per stroke.
