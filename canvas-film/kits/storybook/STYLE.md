# 그림책 과슈 (storybook)

A textured gouache picture book at night: a teal swamp forest, a pale moon, flat opaque shapes with rough edges and a chalky
dry-brush tooth, and animal characters in cloaks (an orange fox) — with one lantern-gold light. Kit: `kit.js` →
`window.Storybook`. Worked example: 잘라 낸 건 다리였다 · 06 (`sermons/2026-10-24-cross-styles/film/scenes/cs-storybook.html`,
body-checked twice). New scene: `template.html` + `script.example.js` (the house demo story: walk in, kneel, plant, wait,
a sprout rises with the gold light, stand).

## What it looks like
Every shape is a flat gouache fill whose edge is pushed off by low noise (`rough` → `smooth`), with a chalk tooth laid inside
(`paint`): white and dark dry-brush speckle, soft blotches. Depth is value, not detail: misty pale trunks far (.15) → mid
teal trunks with forking twigs and round hills with bushes (.42) → the far bank, dark trunks and a strip of still water
(.7) → the mossy embankment the characters walk on, with an earth face down to bright turquoise water. Diamond motes
float; two tall blue-leafed swamp plants sway over the bottom corners; a vignette and a fine paper grain (locked to the
world) sit over everything. Characters are jointed animals in heavy dark cloaks — big readable heads, thin dark legs, a
bushy tail — painted into one buffer that gets the same chalk tooth, so they belong to the page. **The only warm colour is
lantern gold** (`#ffd16a`) with its grainy dotted halo.

**Carries well:** parables and fables (an animal is "anyone"), gentle hope, waiting and growth, a lost-and-found walk, a
quiet night with one small light, children's and family themes, tenderness, anything a non-church viewer should feel safe
entering. The animal stand-in makes hard topics (shame, loss) approachable.
**Carries badly:** violence or horror (it turns cute), modern settings and props, fast action and many cuts, crowds,
documentary realism, abstract or data ideas, daylight brights (the palette is a night page).

## Palette
| role | hex |
|---|---|
| sky / far | `#1d4256` → `#3b7583` → `#5e9a9c` · far trunks `#4a8189` `#3c717d`, mist trunks `#d6f2ea` (10–17 %) · moon `#f1fbf4` |
| mid / near | trunks `#28525f` · near `#173444` `#10283a` · hills `#2a5a60` / top `#3a7471` / `#25525a` · bushes `#1b3f52` `#21506a` |
| ground | moss `#3d7a72` → `#2c6064` → `#22505a` · earth face `#214a55` `#1a3d48` lit lip `#2c5c66` |
| water | `#3f8f98` → `#6cc3c2` → `#8fded5`, glints `rgba(214,250,240,…)` |
| swamp plants | leaves `#2d6cb8` `#4a92d6`, stem `#0f2534` |
| the fox (lead) | fur `#c4612c` / `#9b4420`, white `#f2eee2`, cloak `#1f2633` / fold `#2b3444`, sleeve `#323d50`, legs `#2a1a16`, paws `#e6dccb` |
| the others (grey fox) | fur `#8c8579` `#6b655c`, white `#d6d2c6`, cloak `#2e3b45` `#3a4a54`, sleeve `#3b4955` |
| **accent — lantern gold** | `#ffd16a` · warm `#ffb14a` · lit wood `#eab55c` / `#ffdc8e` / `#b07832` · gate light `#fff6d8` |
| quiet wood (everyone else's) | `#6b5a48` / `#8a7760` / `#4e4134` |
| caption / source / shadow | `#f4f0e2` / `#cfe6e0` / `rgba(6,26,36,.85)` |

## Type and placement
**Gowun Batang 700** for captions (60 px) and the end-card title — a soft brush serif that sits on a painted page; Noto Sans
KR for source lines (`Storybook.FONTS`; Gowun Batang must be installed locally for rendering). Captions at **y 430** in the
sky between the trunks, with `captionShade()` (soft dark oval, no box). End card at **y 880** on `endPlate()` — a painted
teal page with chalk tooth and a hand-drawn frame, a small gold halo low on it. Subject band: screen y 900–1500.

## Kit API (`const K = Storybook`) — world px; every function has a comment in `kit.js`
- **setup** `init()` (chalk tooth, halo, glows, vignette, grain, end plate, figure buffer, swamp plants) then
  `buildWorld({x0, x1, gap: {x, w}, gate: {x}, clearOK: x => bool, moon: [x, y], FY BY RT LIP WATER})` once. Constants `C`,
  `ACCENT`, `FOX` / `GREY` (character palettes), `FONT`, `FONTS`, `Y` = {FY 1300, BY 1252, RT 1212, LIP 1372, WATER 1880}, `TX`.
- **painting** `paint(g, path, col, tex)` (fill + tooth), `rough(pts, amp, seed, step, closed)`, `smooth(pts, closed)`,
  `ell(cx, cy, rx, ry, n)`, `capsule`, `sheet(x0, y0, x1, y1, draw, K)` + `drawSheet(ctx, s)` (a static painted plate),
  `trunk`, `branch`, `fern`, `bushClump`, `sprite`.
- **frame** `backdrop(ctx, t, cm)` · `layer(ctx, cm, p, fn)` · `ground(ctx, t, cm, lk, inGate)` · `figures(ctx, cm, g => …)`
  (your figures and objects, chalked as one layer) · *(glows on top)* · `fore(ctx, t, cm)` · `post(ctx, cm, lk)` ·
  `endPlate(ctx, t, at)` · `captions(ctx, t, lines, end)` · `endCard(ctx, t, card, at)`. Camera `cam(x, y, z)`, `mixCam`, `shake(c, t, at)`.
- **light & hits** `halo(ctx, x, y, R, a)` (the grainy gold halo), `soft(…)` (smooth warm glow), `lantern(ctx, x, y, poleX,
  gy, lit)` + `flicker(t)`, `archPath(r)`, `hitLight(t, at, depth)`, `dust(ctx, t, at, x, y)` (chalk-dust diamonds),
  `flecks(ctx, t, list)`, `splash(ctx, t, at, x)` (rings + drops on the water), `sprout(g, t, x, y, grow, {h, sway})` → tip,
  `sproutGlow(ctx, tip, k)`, `inGap(x, pad)`.
- **figure rig** `figure(ctx, F, mid, back, mid0)` — the cloaked fox; poses are data: `walk`, `walkFree`, `stand`, `kneel`
  (.25 upright … 1.25 bent to the ground), `crouch`, `mix`, `turn`, `reach(F, i, p, type)`, `lookAt(F, p, max)`,
  `lookUp(F, k)`, `hangHands`, `hangGrip`, `handR/handL`, `ik`, `frame`, `shoulderOf`, `handShape`, `BODY`. Pose fields:
  `F.me` (FOX vs GREY), `F.pal` (any palette like `K.FOX` — a rabbit-brown fox, a white fox…), `F.eye`, `F.tilt`, `F.toes`,
  `F.alpha`, `F.sq`, `F.farFront` / `F.farOver`.
- **held objects** `beamSprite({len, w, bar: {at, w}, hb, lit, seed})` + `drawBeam(ctx, X, u0, u1, x, y, a, alpha)`,
  `beamHalo(ctx, X, u0, u1, k)` (gold halo along a lit beam), `carry(F, a0, w, contact)`, `inFront`, `upright`, `grip`, `pt`, `mixX`, `rotAbout`.

```js
const K = Storybook, S = window.SCRIPT, { FY } = K.Y;
async function init() { K.init(); K.buildWorld({ x0: -1600, x1: 2600, WATER: 1590, moon: [250, 330] }); }
function draw(ctx, t) {
  const cm = K.mixCam(K.cam(330, 1060, 1.36), K.cam(560, 1100, 1.72), Pilot.ss(4, 13, t)), g = Pilot.ss(14, 17.6, t);
  const F = K.lookAt(K.kneel(456, FY, 1.04, 1, .28), [628, FY - 300 * g]); F.me = true;
  K.backdrop(ctx, t, cm);
  K.layer(ctx, cm, 1, () => { K.ground(ctx, t, cm, 1);
    let tip; K.figures(ctx, cm, fc => { K.figure(fc, F); tip = K.sprout(fc, t, 628, FY, g); }); K.sproutGlow(ctx, tip, g); });
  K.fore(ctx, t, cm); K.post(ctx, cm, 1); K.endPlate(ctx, t, S.beat.end);
  K.captions(ctx, t, S.lines, S.beat.end); K.endCard(ctx, t, S.endCard, S.beat.end);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: K.FONTS, init, draw });
```

## Motion grammar (what worked)
- **Poses on twos** (`K.t12`) like a hand-animated book; the world (water glints, motes, swaying plants, lantern flicker)
  moves on ones so the page breathes during a wait.
- **Paint once, move little**: the forest is four painted sheets sliding at parallax; nothing in them animates. Life comes
  from the figures, the water glints, the two foreground plants and the motes.
- **Glow goes on top, unchalked** (`halo`, `soft`, `beamHalo`, `sproutGlow`): light reads as light only because the tooth
  is under it, not on it. The gold halo is grainy dots, never a smooth gradient alone.
- **The hit**: crash zoom + `shake`, `hitLight` dips the page (.5), `dust` diamonds off the edge, then `splash` far below.
- **Camera**: close on the lead for the hook (z ≈ 1.6), then wide; push slowly through a wait; open up on the reveal.
- Body rules (two body checks): arms from the shoulders with fixed bone lengths, paws AT the grip point, one paw one object,
  the arm stays below the big head (never across the muzzle), the far arm behind the cloak, ≥ .3 s in-betweens for
  stand↔kneel/crouch, keep the object in the paws through a lowering. Stick legs bending either way read as style.

## Performance (1080×1920, headless Chromium software canvas, 4 shared CPUs)
- Worked example: **~60–63 ms/frame** mean (~110 max at the busiest gap shots), init ~0.7–0.9 s (the frame-sized chalk
  texture and the painted sheets) — the same before and after the refactor (60.3/63.5 → 63.3/61.8 ms). Refactor output:
  **bit-identical** (max diff 0 on 10 stills).
- Template: **~52 ms/frame**, init ~0.7 s. Costs: the figure buffer + chalk `source-atop` pass on its band, the vignette
  blit, the world-locked grain, sheet blits. `drawSheet` blits only the visible part of each plate.

## Pitfalls
- `init()` must run before `beamSprite`/`buildWorld` (both paint with the chalk pattern). `buildWorld` is call-once.
- Anything painted outside `figures()` gets no tooth and looks pasted on; anything glowing inside it gets chalked and looks dull.
- `figures()` clears and composites only the band world y FY−700 … WATER — a figure higher than that (a jump, a bird) is cut;
  draw it directly with `paint` or widen the band.
- Blue leaves on teal vanish at small sizes; make plants big or light (`#7fb4e6`), and keep the gold for the one light.
- Moving the moon (`moon`) or changing x0/x1 reshuffles the seeded forest (a `continue` skips random draws): fine for a new
  film, never for an old one (each film vendors its own kit copy).
- Gowun Batang 700 at 60 px is wide: keep a caption line ≤ ~13 Korean characters.
- The fox head is ×1.39 of the old figure head: with `kneel(…, 1.25)` the muzzle nearly touches the ground — good for
  planting/sniffing, but a held object at the face will hide behind it.

## What a scene author still draws
The story's objects (the worked example's crosses, saw and cut pieces are its own code on top of `beamSprite`), the
choreography per beat, where the gap/gate/lantern go, the camera path, where the gold appears, and `script.js`. Not in the
kit: other species' heads (only the fox head; recolour with `pal`), indoor scenes, daylight, rain/snow.
