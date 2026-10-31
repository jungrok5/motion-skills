# 그림자 극장 — paper cut-out shadow theatre (shadowstage)

Slug `shadowstage` · kit `kit.js` → vendored as `scenes/kit-shadowstage.js` · global `window.ShadowStage` · portrait-native
(landscape pillarboxes). First film: 쭈꾸미 한 접시 · 3 「초대」 (`canvas-film/examples/jjukkumi/scenes/door-shadowstage.html`).
New scene: `template.html` + `script.example.js` (the house demo story: walk in, kneel, plant, wait, sprout with the accent
at 14 s, stand at 18 s, end card at 26 s).

**Provenance:** prompt-motion.com/x4b47x-9cc84f — "Shadow theatre home story" by **@x4b47x** (velvet proscenium, dusk →
night painted sky, black cut-out house / hills / lamp post / figures, windows that light up warm, a door that throws a
light wedge, a hanging dark caption plaque in italic serif). **Borrowed craft, own renderer:** every shape, rig and
texture here is our own Canvas-2D code; no shot, character or text of the reference is reused.

## What it looks like
A toy theatre on a tabletop. A **dark-red velvet proscenium** frames everything: two side curtains with pleat shading that
part (or close) with a belly on the leading edge, a **scalloped valance** with a gold braid and tassels. Inside, a
**painted sky** whose palette is a time-of-day track — peach dusk → rose → violet → indigo night — with a soft low sun or a
pale moon and their halos, **stars that come out one by one**, a flat paper cloud. In front of it, 2–3 layers of **flat
cut-out silhouettes**: a hazy far town on a hill (pitched roofs, a tower, round trees), rolling hills with lollipop trees
and a picket fence, the near ground — every edge **hand-cut** (`jag`) and every layer lifted off the sky by a small
**paper shadow**. A **cut-out house** with a chimney that puffs **paper curls of smoke**, windows that **light up warm**
(amber, mullions, tied-back curtains, warm-brown silhouettes inside), a wall lantern, and a **door that swings open**
throwing a **wedge of warm light** on the ground — shadows of the people in front cut out of it. **Lamp posts** light
with a stutter. **Jointed silhouette figures** (2-bone IK legs and arms, profile heads with nose and chin, cap / hat /
bob / bun / short hair, coat / jacket / skirt / apron) walk with planted feet and move **on twos** like cut-outs; light
from a door or lamp puts a thin **amber rim** on the side facing it. Words hang on a **dark plaque on two strings** that
drops in from behind the valance and swings gently. Paper grain and a vignette over all.

**Not the `puppet` kit:** that one is backlit leather on glowing cloth (light comes *through* the pieces, rods and rivets,
one lamp). Here the light is *in front of* an opaque paper diorama: a painted sky behind, black cut-outs, light only from
windows, doors and lamps inside the picture.

**Carries well:** home and belonging, arriving / welcoming, evening and the passing of time (the sky track), "a light left
on for you", windows lighting one by one (a list, a countdown, people coming home), a small story told as a show (curtain
opens / closes), threshold moments (a door, a gate), quiet wonder at night.
**Carries badly:** faces and expressions (profiles only — attitude is pose and head tilt), crowds and busy interiors, fast
action and many cuts, daylight scenes (the look lives in dusk → night), anything that needs many colours, close-ups
(everything is a small cut-out on a stage).

## Palette (`ShadowStage.C`, `.SKY`, `.ACCENT`)
| role | hex | note |
|---|---|---|
| velvet | body `#5a0e16` · crest `#a0303a` · valley `#1e0408` | curtains and valance |
| gold | `#c9a15a` · deep `#6e4f22` | braid, tassels, end-card rule and kicker |
| silhouettes | figures `ink #0e0a0b` · house `#1c1315` · ground `#120c0d` | the house a shade warmer so a figure in front of it still reads |
| stage | boards `#1d1311` / lip `#3a2720` | `apron()` under the scenery |
| plaque | board `#1f1619` → `#2e2226` · dots `#a68c6c` · words `#f4e7cb` · source `#cdb99a` | |
| **light (the kit's warm)** | `amber #ffc773` · hi `#fff0c6` · lo `#e48a3a` · spill rgb `255,196,112` | windows, door, lamps — only ever from a source |
| inside a lit window | `prop #5e3517` | warm-brown silhouettes, never black |
| sky track `SKY[k]` | dusk `#e09b78/#efb889/#f8d9a4` · rose `#a6668a/#d4878a/#efa98d` · violet `#544a8e/#7f6cab/#a891c4` · night `#1c2150/#333777/#534e90` | top/mid/low; each key also carries `far`, `mid2` haze tints and the orb `halo` |
| **ACCENT** | `#d8533a` (default) | one extra colour per film (`init({ accent })`); the template's flower, the film's red dish |

## Fonts and words
Noto Serif KR 600 for the plaque (an 11° synthesised italic via `italic()` — the face has no italic), 700 for the end-card
title; Noto Sans KR 400/500 for source lines and the end card's small lines (`ShadowStage.FONTS`). All installed in the
film's `film.json`; no other font needed.
- **The plaque** (`captions`) hangs at y 236 (top edge), centred on x 540; it is sized once for the widest line of the
  film (520–820 px; one line 132 px tall, two lines 190 px) so it never resizes. Lines fade in/out (.4 s) on the board;
  the board itself stays all film and nudges into a small swing when new words arrive. Keep lines short (≤ ~14
  syllables a line); the board's right edge stays clear of the 140 px right safe zone at that width.
- **End card** (`endCard`) on the closed curtains at y 760: title cream serif, a gold rule that grows, passage + by in
  small sans. Close the curtains first (`curtainOpen(t, …, closeAt = end − 1, 1)`) and pull the plaque up (`captions(…, { to })`).

## Kit API (`const K = ShadowStage`; design space 1080 × 1920 px)
- setup: `init({ accent, seed, vignette })` · `W` `H` `C` `GLOW` `ACCENT` `SERIF` `SANS` `FONTS` `SKY` · `skyAt(k)` · `skyTrack(t, [[t, k]…])`
- timing: `on2(t)` (figures on twos) · `lightOn(t, at, dur)` (lamp stutter → 1) · `spring(dt, w)` · `curtainOpen(t, at, dur, closeAt, closeDur)`
- cut paper: `jag(pts, amp, seed, step)` · `addPoly(path, pts)` · `circlePts(cx, cy, r, n, ry)` · `layer(ctx, path, col, { lift, liftA, edge })`
- land (Path2D, build once in init): `townPath({ y, seed, scale, hill })` · `hillPath({ y, amp, freq, seed })` ·
  `flatGround({ y, bottom })` · `treesPath([[x, gy, h, r]…])` · `bareTree(x, gy, h, seed)` · `fencePath(x0, x1, gy, h)` · `tuftsPath({ y, x0, x1 })`
- sky: `begin(ctx)` · `sky(ctx, k, { y1, below })` → palette · `sun(ctx, x, y, r, pal, a)` · `moon(…)` · `halo(ctx, x, y, r, rgb, a)` · `stars(ctx, n, t, { y1 })` · `cloud(ctx, x, y, w, col, seed)`
- house & lights: `houseGeo(H)` · `house(ctx, H, { win: [], door, doorLight, lantern, doorWin }, { window(ctx, i, rect, k), door(ctx, rect, k) })` → geo ·
  `openingPath(rect, pad)` · `smoke(ctx, x, y, t, { every, life, rise, drift, col })` · `lamp(ctx, x, gy, h, on)` · `groundPool(ctx, x, gy, rx, ry, a)`
- light layer: `lightBegin()` → lc · `doorLight(lc, door, open, { len, spread, pool, ly })` → light point L · `castShadow(lc, F, L, { len, a })` · `lightEnd(ctx, y0)`
- figures: `BODY` · `ik(a, t, l1, l2, pick)` · `frame(F)` · `shoulder(F, i)` · `body(c, F, col, colFar)` · `person(ctx, F, { col, rim: { x, y, a, reach } })` · `giftBox(c, box, col)`
- poses: `walk(x, gy, s, f, ph, stride)` · `walkAlong(t, t0, t1, x0, x1, stride, ease)` → { x, ph } · `stopStride(dist, nominal)` ·
  `fromWalk(W)` · `closeStep(W, k)` · `stand(x, gy, s, f, { spread, lean })` · `kneel(x, gy, s, f, lean)` · `mix(A, B, k)` ·
  `reach(F, i, p)` · `armTo(F, i, th, r)` · `wave(F, i, t, k)` · `beckon(F, i, k)` · `holdBox(F, w, h, fwd, k)` · `lookAt(F, p, max)`
- stage & words: `curtains(ctx, open, { gather })` · `apron(ctx, y)` · `captions(ctx, t, lines, { from, to, y, size })` ·
  `plaque(ctx, x, y, w, h, ang, drop, { words })` · `plaqueSize(ctx, lines, size)` · `italic(ctx, s, x, y, o)` · `endCard(ctx, t, card, at, { y })`
- post: `post(ctx, { grain })` · `fade(ctx, t, dur, fi, fo)` (0 = no fade at that end)

```js
const S = window.SCRIPT, B = S.beat, K = ShadowStage, G = 1420;
const HOUSE = { x: 380, gy: G, w: 520, wallH: 330, roofH: 250, chimney: { x: 370, top: 560 }, door: { x: 34, w: 124, h: 262 },
  windows: [{ x: 200, y: 262, w: 152, h: 132 }, { x: 236, y: 448, w: 68, h: 68, shape: 'round' }] };
let LAND;
const STRIDE = K.stopStride(330 - -40, 120 * 1.1);                     // stop with both feet down
function guest(t) { const tp = K.on2(t), w = K.walkAlong(tp, 5, 9.5, -40, 330, STRIDE);
  const F = tp < 9.5 ? K.walk(w.x, G, 1.1, 1, w.ph, STRIDE) : K.closeStep(K.walk(330, G, 1.1, 1, 370 / STRIDE, STRIDE), (tp - 9.5) / .45);
  return Object.assign(F, { head: 'cap', dress: 'jacket' }); }
function draw(ctx, t) {
  K.begin(ctx);
  const pal = K.sky(ctx, K.skyTrack(t, [[1, 0], [6, 1], [9, 2], [12, 3]]), { y1: G });
  K.stars(ctx, Pilot.ss(8, 12, t), t); K.moon(ctx, 850, 600, 44, pal, Pilot.ss(7, 9, t));
  K.layer(ctx, LAND.town, pal.far); K.layer(ctx, LAND.hills, pal.mid2);
  const op = Pilot.eio((t - 10.5) / 1), geo = K.house(ctx, HOUSE, { win: [K.lightOn(t, 3), K.lightOn(t, 4)], door: op });
  K.smoke(ctx, ...geo.chimney.mouth, t);
  K.layer(ctx, LAND.ground, K.C.ground, { liftA: 0 });
  const F = guest(t), lc = K.lightBegin(), L = K.doorLight(lc, geo.door, op);
  if (op > 0) { K.castShadow(lc, F, L); K.lightEnd(ctx, G); }
  K.person(ctx, F, { rim: { x: L.x, y: G - 130, a: op } });
  K.apron(ctx, 1790);
  K.captions(ctx, t, S.lines);
  K.curtains(ctx, K.curtainOpen(t, .2, 2.2));
  K.post(ctx); K.fade(ctx, t, S.DUR, .5, .5);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: K.FONTS, draw, init: async () => { K.init();
  LAND = { town: K.townPath({ y: G - 78 }), hills: K.hillPath({ y: G - 30, amp: 22 }), ground: K.flatGround({ y: G, bottom: 1796 }) }; } });
```

## Draw order (keep it)
`begin` → `sky` → stars / sun / moon / cloud → far `layer`s (town `pal.far`, hills + trees `pal.mid2`, fence) → lamps →
`house` (window hooks inside it, the doorway hook inside it) → `smoke` → ground `layer` → ground details (stones, pools) →
light layer (`lightBegin` → `doorLight` → `castShadow`… → `lightEnd(ctx, G)`) → figures (`person`, back to front) →
`apron` → `captions` (the plaque; it must be under the valance) → `curtains` → `post` → `endCard` → `fade`.

## Motion grammar
- **Open on the curtains** parting (≈ 2 s, eased, the leading edges belly); **close them** for the end card. The proscenium
  never moves — no camera moves inside the theatre; the picture changes, not the frame.
- **Time passes in the sky.** One `skyTrack` across the scene (dusk → night over 8–12 s); the sun sinks behind the far
  town, the moon rises opposite (east = right of a west sunset), stars come out after violet.
- **Lights come on one by one**, each with `lightOn`'s stutter (a lamp being lit), 0.6–1 s apart: lamp post, windows, the
  wall lantern. Light always comes from a source; halos only around sources.
- **Cut-outs move on twos** (`on2(t)` for every pose); sky, light, smoke, curtains and the plaque on ones.
- **Walks plant their feet:** `walkAlong` + `walk` with the stride from `stopStride` — the phase is distance / stride, so a
  foot in stance never slides (checked numerically: 0.0 px over 300 planted frame pairs). Stop with `closeStep` (the back
  foot steps up beside the front one), never by blending to `stand` (that slides).
- **Gestures travel an arc** (`armTo` / `wave` / `beckon`): blend the arc angle, not the hand position — the hand sweeps
  forward and up in front of the body instead of through the face.
- **The door is the turn:** the leaf swings inward (≈ 1 s), the wedge and pool of light grow with it, shadows of the
  people in front appear in it, the people get an amber rim, whoever is inside stands dark against the warm doorway.
- **The plaque drops in once** (critically damped, a small swing) and stays; new words fade in on it with a nudge.

## Performance (1080 × 1920, headless Chromium software canvas, 4 shared CPUs; 120 frames × 3, `seek` + 1-px read-back)
- `init` ≈ 150 ms (grain at half res scaled into one full-res overlay sheet with the vignette baked in, curtain + valance
  sprites, the gathered-curtain sprite, stars).
- door-shadowstage: **mean 31–40 ms, median 25–33 ms** per frame (door-open frames with 5 cast shadows ~45–60 ms).
  Template: **mean 23–24 ms, median 21 ms**.
- Where the time goes: the sky gradient (~6 ms, filled only to the horizon + 80), the grain overlay (~4–5 ms), curtains
  (~1 ms open, ~5 ms while parting: 40 bands), light layer + each `castShadow` (~1–2 ms each, region-limited).
- First version cost 60 ms: a scaled soft-light grain pass alone was 30 ms. Never scale a full-frame texture per frame —
  pre-scale it in `init`; `overlay`/`multiply` unscaled ≈ 4 ms, scaled ≈ 17–22 ms.

## Pitfalls
- **Ink on ink vanishes.** Figures must stand on the ground line `G` with their bodies against the sky/far town, not in
  front of the house wall or below the ground line; in front of the house they only read once a window, the door light or
  a rim separates them. Keep a figure's lower legs above the hills' dark (`mid2`) where possible.
- **Door height:** a figure is ~205·s px tall; make the door ≥ 1.1 × the figure (the template: 242 px for s 1.1; the film: 262 px for s 1.06–1.14).
- **Shadows toward the camera look like reflections** when long: a figure standing right under the door light gets
  `castShadow(…, { len: .4 })`; people off to the side can have ~1.
- **Two silhouettes overlapping merge.** Separate them by ~1/3 of a body width and give them different heads (bun vs
  short hair) so both read; a hand on the other's shoulder reads better than two raised arms.
- **`fade(…, 0, fo)`** for scenes that must open on a picture (the shared seed story); `Story.fadeBlack` with `fi = 0`
  divides by zero.
- **Plaque under the valance:** call `captions` before `curtains`, or the board slides down in front of the velvet.
- **Grain on words:** plaque words get the grain (they are painted on the board); end-card words are drawn after `post`.
- **Window hooks** draw in window space clipped to the opening; use `C.prop` (warm brown) for things inside — black
  reads as a hole. Keep the accent to one small thing (a dish, a flower).
- **The sky is filled only to `y1 + below`.** Anything below must be covered by a ground layer (the template and scene
  fill the ground to 1796, the apron below).
- **`K.house` caches the body path** by its geometry key — a house that moves or scales each frame rebuilds it every frame.

## What a scene author still draws
The story's world in this medium: which town/hills/trees and where (`LAND` in `init`), the house spec (door and window
positions), what is inside each lit window (the window hook), who stands in the doorway (the door hook), the people's
poses and timings (walk spans, gestures, held things), the sky track and light cues, small set details (stepping stones,
a sprout, a signpost), the one accent thing, and the words (`script.js`).
