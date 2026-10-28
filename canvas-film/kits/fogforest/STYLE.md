# 안개 숲 실루엣 — Misty silhouette forest (청록 안개, 이끼 낀 나무, 따뜻한 빛 하나)

House style `fogforest` · kit `kit.js` → `scenes/kit-fogforest.js` · global `window.FogForest` (scenes alias it `FF`) ·
worked example: [잘라 낸 건 다리였다 · 01](../../sermons/2026-10-24-cross-styles/film/scenes/cs-fogforest.html)
(origin: the 6-s lab card `sermons/2026-10-24-style-lab/` → lab-fogforest, after kvacm-style misty forest illustration).

## What it looks like
Flat silhouettes stacked in five depth planes that fade toward ONE teal fog colour — the farther, the paler. Gnarled trees
with hanging moss, brambles and grass along ridges; fog banks drift between the planes at different speeds; a huge dark
trunk frames each side of the portrait frame with a mossy limb arching over the top (the moss sways), a dark bank of earth
fills the bottom (the platform-UI band). Everything has a dry-brush streak mottling and grain. Figures are near-black
hooded silhouettes with **a rim of fog light** on their upper-left edges. **One warm accent** — amber wood / a lantern / an
arch of light — and its glow; a second warm rim appears on the figures once that light is in view.

**Carries well:** being lost or small, a journey or procession, waiting, searching, one light found in the fog (hope,
grace, a calling), the unseen (a shape half-seen in the fog), quiet awe, slow revelation. Silhouette poses read
instantly — gesture is the acting.
**Carries badly:** faces and facial emotion (there are none), text or detailed props (they turn into blobs), many colours,
crowded interiors, cities/modern objects, bright cheerful moods, anything needing small detail at phone size.

## Palette, type, captions
| role | hex | note |
|---|---|---|
| sky | `#2f5a60` → `#7cb0b2` → `#a9d0cf` → `#8ab7b7`, pale fog glow at (620, 1000) | `FF.TX.sky` |
| fog | `#9fcaca` light, `#6f9ea1` shade; banks `#b6dcda` `#a8d2d0` `#9ec9c8` | `C.fog`, `C.fogD` |
| planes far → near | `#86b5b6` `#6f9fa2` `#5b8b8f` `#3e6b70` `#2b5257` (`#16343a`) `#0b1c20` frame | `C.p1…p7` |
| figures | hero `#0a171a` (near arm `#26413f`), others `#163238` | `C.me`, `C.pil` |
| **accent** | amber `#e4a35c`, light `#ffdca6`, shade `#9c5b26`; glow rgba(255,214,150) | `FF.ACCENT`, `C.gold*` — the ONE warm thing |
| rims | fog `rgba(196,232,230,.75)` (−2.6, 2.8)·z; warm `rgba(255,196,128,.9)` (−3.6, .8)·z | `FF.RIM_FOG`, `FF.RIM_WARM` |
| text | ink `#eef6f4`, source `#cfe6e3`, card source `#bcd8d5`, shadow `rgba(6,22,24,.95)` | |

Fonts: **Gowun Batang 700** (captions, titles) + Noto Sans KR (source lines); `Pilot.run({ fonts: FF.FONTS })`, load both
from Google Fonts in `<head>`. Captions centred at **y 430**, 60 px (the dark canopy `TX.top` keeps them readable); end
card at **y 860** on the teal end plate with fog drifting across it.

## Kit API (`window.FogForest`; world px at zoom 1, near lane y ≈ 1300, the path's far edge y 1212)
- **Setup** `init({ cam, dur })` (cam(t) → {x, y, z}: planes are sized to everything it sees) → `forest({ dy, stag:{x,y,s} })`
  (the 5 standard planes) → `buildFrame()` (side trunks, limb, bottom bank). `C`, `TX`, `PL`, `ACCENT`, `FONT(S)`.
- **Builders** (for your own planes) `plane(p, K, col, streak, veil, build)`, `trees(g, r, x0, x1, y0, yb, gap, o)`,
  `trunk`, `branch`, `twigs`, `gnarled`, `moss`, `ridge`, `grass`, `bramble`, `quadSeg`, `stag(g, r, x, yb, s)`, `fogTex`.
- **Frame layers** `backdrop(ctx, cm, t)` (sky + planes + banks), `putPlane(ctx, cm, i)`, `bank(ctx, cm, p, tex, Yw, h, speed, t, a)`,
  `midFog(ctx, cm, t)`, `foreground(ctx, cm, t, { cx })` (low fog, bank, frame trunks, swaying moss, top canopy).
- **Ground** `road({ x0, x1, top, gaps })` + `drawRoad(ctx, R)` (`R.yAt(x)`); `gap({ x, w, top, seed })` → ravine
  `{ path, edge, tex }` + `drawGap`, `gapMist(ctx, t, gp, hitAt)` (rising mist + the hit's gust), `gapEdges`; `gust(ctx, t, at, x, y, w)`;
  `arch(ctx, t, { x, cy, base })` (lit stone arch, halo, spill, shafts), `archPath(A, r)`, `shafts(ctx, x, y)`.
- **Light** `warm(ctx, x, y, R, a, mode)`, `glowAt(ctx, x, y, R, a)`, `flecks(ctx, t, list)` (sawdust/sparks).
- **Action + rim** `action(ctx, z1, ex1, ey1, wy0, wy1, a => …)`, `rim(ctx, dx, dy, col, a)` (after action), `withAlpha(ctx, a, fn)`.
- **Figure rig** `figure(ctx, F, mid, back)`; poses `walk(x, gy, s, f, ph, stride, lean, lift)`, `stand`, `crouch(x, gy, s, f, bend)`,
  `kneel(x, gy, s, f, bend)`, `mix(A, B, k)`, `turn(A, B, k)` (squash), `look(F, a)`, `reach(F, far, near, shapes)`,
  `hangHands(F, swing)`, `knee(F, i)`, `shoulderOf(F)`, `basis(F)`, `ik`, `capsule`, `poly`.
- **Held things** `onShoulder(F, a0, contact, thick)`, `upright(F, foot, dx)`, `inFront(F, len, lift)`, `pt(X, u, v)`, `mixX`, `rotAbout`;
  the cross prop `cross(ctx, 'warm'|colour, u0, u1, x, y, a, lying, K)`, `crossOutline(x, y, K)`, `CROSS` geometry.
- **Camera** `layerM(cm, p)`, `layer(ctx, cm, p, fn)`, `mixCam(a, b, k)`, `shake(c, t, at, dur, ax, ay)`.
- **Words** `captions(ctx, t, lines, o)`, `endCard(ctx, t, card, at, o)`, `endPlate(ctx, t, at)`.

```js
const FF = FogForest, S = SCRIPT; let ROAD;
const camAt = t => ({ x: 400 + 120 * t, y: 1060, z: 1.1 });
async function init() { FF.init({ cam: camAt, dur: S.DUR }); FF.forest(); FF.buildFrame(); ROAD = FF.road({ x0: -1200, x1: 4400 }); }
function draw(ctx, t) {
  const cm = camAt(t), [z, ex, ey] = FF.layerM(cm, 1), x = 400 + 120 * t, F = FF.walk(x, 1300, 1.04, 1, x / 156, 150, .1);
  FF.backdrop(ctx, cm, t); FF.layer(ctx, cm, 1, () => FF.drawRoad(ctx, ROAD)); FF.midFog(ctx, cm, t);
  FF.action(ctx, z, ex, ey, 540, 1520, a => FF.figure(a, { ...F, col: FF.C.me, armCol: '#26413f' }));
  FF.rim(ctx, ...FF.RIM_FOG(z), 1); FF.layer(ctx, cm, 1, () => FF.glowAt(ctx, x + 60, 1180, 120, .4));
  FF.foreground(ctx, cm, t); FF.captions(ctx, t, S.lines); FF.endPlate(ctx, t, S.beat.end); FF.endCard(ctx, t, S.endCard, S.beat.end);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: FF.FONTS, init, draw });
```

## The figure rig (body-checked twice on the cross film — keep these rules)
- Bones ×s: thigh 96, shin 90, upper arm 78, forearm 74; s = 1.04 hero / .95 others (≈ 350 px tall). 2-bone IK with
  **fixed lengths**; elbows pick the down/back solution, knees forward. **Shoulder at body (6, 140)** — top of the back,
  behind the neck (the first version grew arms from the throat / mid-back). Far arm hangs from (−2, 138) in the far colour
  (body mixed 16 % toward fog), drawn behind the body unless `farFront` (both hands busy in front, e.g. sawing).
- Near arm in `armCol` (a shade lighter than the body) so the whole shoulder–elbow–hand chain reads over the silhouette.
- **Hands are drawn AT the grip point**: `fist` (with a thumb over the grip), `flat` (pressing down), `open` (reaching/letting go).
  One hand, one object; a carried pole is gripped at `contact + 64` / `contact + 106` (chest height — never at the mouth).
- A long thing on the shoulder is ONE layer behind the whole body+head (`back` callback), resting ~30 px below the chin line.
- Stand ↔ crouch/kneel, pick-up and set-down get **≥ .3–.4 s** in-betweens (`mix` + eased k) with the hands on the object.
- Walk phase tied to distance (`ph = x / (stride·s)`) — feet never slide. A turn is `turn()` over ≥ .35 s, not a one-frame flip.
- `crouch` (hip 84·s, bend 1.1) reaches the ground ≈ x + 170·s; `kneel` (far knee down, near foot planted) is the waiting /
  praying pose — rest the hands on `knee(F, 1)`.

## Motion grammar (what worked)
- Slow parallax: the camera tracks the walker; planes move at p .12–.82, banks at their own drift speeds — the fog is
  always alive, so a still figure never reads as a frozen frame.
- **The warm light is the story**: the accent is the only warm object; when the scene turns toward the light (the arch in
  view), ramp the warm rim (`RIM_WARM`, ~1 s). A reveal = the accent brightening (`glowAt` + `warm(…,'screen')`), never a flash.
- **The hit** (something falls into the gap): camera push-in in .09 s (`eo`), `shake(c, t, at)` (15/11 px decaying over .55 s),
  a gust of mist billowing up out of the ravine (`gapMist(…, hitAt)`), the warm thing's glow fading as it sinks into mist.
- Push in (z 1.3–1.6) for close moments, pull back (z .74–1.1) for "the whole picture". Captions over the dark canopy.
- End: the fog closes in (`endPlate`), title in Gowun Batang; the loop seam (SCRIPT.loop .6 s) brings back frame 0.

## Performance (1080×1920, headless Chromium software canvas, 4 shared CPUs)
- Cross film (worked example): **~94–99 ms/frame** median, init 1.2–2.1 s — before and after the refactor the same
  (93.9/93.4 → 97.8/99.1 ms, within run-to-run noise). Template: **~111 ms/frame** (pushes in to z 1.55 → bigger plane blits), init ~1.7 s.
- Cost is the full-frame blits: sky, 5 planes, ~8 fog-bank tiles, frame, top. Planes are built at K = .45–.7 resolution
  (they are soft anyway); the action buffer and its rims only touch the figure band (`wy0…wy1`) — keep that band tight.

## Pitfalls
- The giant stag (`forest({ stag })`, opt-in, off by default) puzzled 3/4 viewers in the cross film (v2 removed it) — use only when the story needs it.
- `init({ cam })` must be able to run the camera for every t before `forest()` (planes are sized from it): build your
  timeline first. A camera that later goes outside what it saw at init shows plane edges — rebuild or add margin.
- Rims are made from the action layer itself: anything on it gets rimmed. A thin shape (< ~10 px: a stem, a rope) is rim on
  both sides and reads pale/lit, not black — good for a glowing sprout, bad for a dark rope (draw it on the world layer).
- The fog rim comes from the upper left; a figure facing left gets the rim on its back — fine, but put the warm source on the
  right (`RIM_WARM`) or flip the dx signs.
- Things sinking into a gap: draw them clipped to `gp.path` before `gapMist`, so the mist covers them.
- Refactor lessons: the kit reproduces the scene **bit-identically** (max diff 0 on 10 stills) because every canvas op
  kept its order; offsets like `dy` default to 0 (adding 0 is exact). Keep that if you edit the kit: render the cross film's
  stills before/after.

## What a scene author still draws
The story: the subject and its props (the template draws a seed, a mound and a sprout; the film a cross and a saw), the
poses per beat (with the rig rules above), the camera path, where the accent is and how its glow changes, which world
pieces appear (road, gap, arch, the stag), and `script.js`. Not in the kit: water/reflections, rain/snow, animals other
than the static stag, interiors, crowds beyond a handful of figures.
