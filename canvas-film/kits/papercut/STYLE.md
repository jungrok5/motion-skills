# 붉은 전지 오림 (Red paper-cut, folk window-flower)

Kit: `kit.js` → vendored as `scenes/kit-papercut.js`, global `window.Papercut`. After Chinese/Korean folk paper-cuts
(剪纸 window flowers, 전지 공예). Worked example:
[잘라 낸 건 다리였다 ⑥](../../sermons/2026-10-11-1cor4/film/scenes/cross-papercut.html) (pilgrims with crosses; mine is gold; a chasm).
Template: `template.html` + `script.example.js` (the shared seed story: walk in, kneel, plant, wait, sprout, stand, end card).

## What it looks like
Everything is a piece of **red paper cut with scissors** and laid on a **dark indigo backing**. No outlines, no gradients
inside a piece: detail is what was **cut away** — an inset slit a few px inside every outline, sawtooth edges (grass,
ridges, hems), rows of crescents, diamond lace, rosettes, swirl slits in clouds — and the backing shows through. Every
piece has a tight two-step paper shadow and a faint light cut face on its upper-left edge, dark on the lower-right, and
soft-light paper grain locked to the world. The background is indigo-on-indigo sheets in parallax (clouds .15,
mountains .35, hills with bare plum trees .65, the road 1). People are **jointed cut-outs** (hooded head with a crescent
eye, tunic with diamond lace, sawtooth skirt, 2-bone arms and legs pinned at the joints) posed on **12 fps**.
The whole world is one red; the protagonist's thing is the one piece cut from **another paper — gold**.
**Light** is the backing lit from behind: warm cream→amber seen through cut holes (a lattice gate, a halo of strips), and
a soft 'lighter' spill.

## Meanings it carries
**Well:** folk tales and parables told simply, "one among many" (one gold piece in a red world), cutting / losing /
what was cut off (the medium IS cutting: scraps, flecks, a dashed scissor guide of what should be there), craft and
care, festivity and blessing (window flowers are hung for new year, weddings), light breaking through, seasons
(plants, birds); bold silhouettes that read at phone size.
**Badly:** faces and subtle emotion (eyes are a crescent), realism, darkness without hope (it is a decorative medium),
many overlapping depth layers in one lane, fast continuous camera motion (the 12-fps cut-outs strobe), text-heavy ideas.

## Palette (`Papercut.C`)
| role | hex |
|---|---|
| backing / curtain | `#10132a` / `#161b36` |
| sky / far sheets | cloud `#1b2142`, mountains `#1c2550` `#222d5f`, hills `#29366c` (trees `#212c5b`) |
| road / chasm | `#33427a` (`#2a3768`), cliffs `#212a57` `#171e40` |
| reds | me `#de2a22`, others `#c41b23`, crosses `#9b1220`, gate `#b8171f`, plain wood `#5a1916` |
| **accent gold** | `#ebc472` (`Papercut.ACCENT`) — only the protagonist's thing |
| light | `#fff1cc` → `#f6b866` |
| words | ink `#f7ecd8`, source `#e3d3b8`, card source `#ddcdb3`; plate `#0b0d1f` at 82 % |

## Fonts and words
Noto Serif KR 700 (captions, title), Noto Sans KR (source, passage) — `Papercut.FONTS`. Captions at portrait y 440 on a
**dark paper plate with notched ends** that drops in on 12 fps (`captions`). The end: a dark sheet with a sawtooth edge
drops over the frame with red border strips (diamond lace + teeth) above and below the card (`curtain` + `endCard`, card
at y 860). Captions hide when the curtain comes (pass `B.end`).

## API (world px unless noted; `pts` = `[[x,y]…]`)
- **Setup:** `init()` (grain tile, ~0.05 s). Prebuilt paper: `sheet(x0,y0,x1,y1, g => …, seed, K)` + `drawSheet(ctx, s)`
  (blits only the visible part); `sprite(x0,y0,x1,y1, g => …, seed, {K, edge, blur})` + `drawSprite(ctx, S, x, y, a, scale,
  alpha, shadow)`; `finish(canvas, seed, edge)`, `shadowOf(canvas, blur)`. Inside builders: `fillPts(g, pts, col)`,
  `cutPts(g, [pts…])` (holes), `cutSlit(g, polyline, w)`.
- **Live pieces:** `paper(ctx, path, col, {sh, inset, slit})`, `pathOf(pts)`, `capsule(a, b, wa, wb)`, `holes(ctx, [pts…])`,
  shapes `diamond(x,y,rx,ry)`, `crescentPts(cx,cy,r,a0,a1,t)`, `sawEdge(x0,x1,y,h,sp,seed,dir)`, `swirlPts`, `shade(hex,k)`.
- **World sheets:** `clouds(x0,y0,x1,y1,o)`, `mountains(…,{layers})`, `hills(…,{base,amp,trees})` (`.top` = skyline),
  `road(x0, x1, top, y1, {gap:[xa,xb]})` (lace rows; a ragged chasm when `gap`), `chasm(xa, xb, top, y1)`,
  `gate(x, by, top)` + `archPath`, `gateLight(ctx, x, by)` (before the gate) / `gateSpill(ctx, x, by)` (after).
- **Long piece:** `CROSS` dims, `crossSprite(col, lying, seed, dims)`, `drawCross(ctx, X, u0, u1, x, y, a, alpha)` (draw only
  material u0..u1 — a sawn cross is the same sprite), `crossOutline(x, y)`; held: `carry(F, dims, left, a0)` → X,
  `gripCarry(F, X)`, `cpt(X, u, v)`, `mixX`, `rotAbout`, `hangGrip`, `rIdx/lIdx`.
- **Effects:** `lightWindow(ctx, x, y, r, a, {rays, rayA, rot})` (accent light), `glow(ctx, x, y, R, a)`,
  `scissorGuide(ctx, t, pts, clipRect, al, glow)` (dashed "what should be there"), `burst(list, n, seed, {t0,x,y,…})` +
  `drawFlecks(ctx, t, list)` (THE HIT / a cut: paper scraps flying and settling).
- **Figure:** spec `F = { s, f, col, gy, hip, ang, feet:[far,near], hands:[far,near], hand:['fist'|'flat'|'open',…], tilt, eye:
  'calm'|'strain'|'shock'|'down', sway, farFront, alpha }`; `walkSpec(x,gy,s,f,ph,stride,lean,lift)`, `standSpec`,
  `crouchSpec`, `kneelSpec(x,gy,s,f,lean)`, `mixSpec(A,B,k)` (in-betweens), `hangHands(F, swing)`, `turn(t, at, from, to)`,
  `drawFig(ctx, F, mid, back)`, `frame(F)`, `shoulderOf(F)`, `ik`, `t12`.
- **Camera & frame:** `layer(ctx, cm, p, fn)` (parallax p), `mixCam(a, b, k)`, `shake(t, at)` → `{sx, sy}`, `grain(ctx, cm)`.
- **Words:** `captions(ctx, t, lines, end)`, `captionPlates`, `curtain(ctx, t, at)`, `endCard(ctx, t, card, at)`, `CAP`.

```js
const PC = Papercut, C = PC.C, B = SCRIPT.beat; let ROAD, HILL;
async function init() { PC.init(); ROAD = PC.road(-1500, 2000, 1212, 2300); HILL = PC.hills(-1100, 900, 2500, 1290); }
function draw(ctx, t) {
  const cm = { x: 200, y: 980, z: 1.2 };
  ctx.fillStyle = C.back; ctx.fillRect(0, 0, Pilot.W, Pilot.H);
  PC.layer(ctx, cm, .65, () => PC.drawSheet(ctx, HILL));
  PC.layer(ctx, cm, 1, () => { PC.drawSheet(ctx, ROAD);
    const F = PC.walkSpec(t * 120, 1300, 1, 1, t * 120 / 210, 120, .14); F.col = C.me; PC.drawFig(ctx, F); });
  PC.curtain(ctx, t, B.end); PC.grain(ctx, cm); PC.captions(ctx, t, SCRIPT.lines, B.end); PC.endCard(ctx, t, SCRIPT.endCard, B.end);
}
```

## Motion grammar (what worked)
- **Two clocks:** figures pose on 12 fps (`t12`; slide x continuously, step the pose), camera and light on ones.
- **Cutting is the action:** a cut snips a piece off with a white flash line and a burst of flecks; the piece lies where it
  fell as its own cut-out; scraps can come back (fly along an arc with a little flutter) into a dashed scissor guide.
- **A gap** is a cut-away of the ground sheet — the backing shows (dark), its walls step down in darker sheets.
- **Light** = the backing lit (gate lattice, `lightWindow`) + a soft `glow`; never paint light over a piece.
- **The hit:** a quick zoom (`mixCam` with `eo` over ~.1 s) + `shake` + flecks; the falling piece is clipped to the gap.
- Parallax pans across the long sheets; a slow cloud drift (translate the .15 layer) is a good "wait".
- The end: the dark curtain drops from the top in .4 s, captions vanish under it.

## Performance (4-core box, 1080×1920)
`init` (grain) ≈ 0.05 s; sheets + 4 cross sprites ≈ 0.5 s in the worked example, template build ≈ 0.4 s. Per frame:
worked example ≈ 58 ms (identical to the pre-kit scene), template ≈ 43 ms. The full-frame grain pass (soft-light) is
fixed cost; `drawSheet` crops to the view so big sheets are cheap.

## Pitfalls
- Holes in prebuilt sheets/sprites are real (destination-out) — the parallax behind shows through. Holes in live pieces
  (`holes`) are filled with the backing colour, so don't put a live piece with holes over something bright (or build it as
  a sprite instead).
- `paper` strokes its cut faces inside a clip: very thin pieces (< 4 px) look outlined — make them sprites or skip `inset`.
- `drawSprite`'s shadow is offset in screen-ish px (3, 4.5) regardless of rotation; keep `shadow` at 1 for pieces on the
  ground and 0 for pieces flying in the light.
- Bodies: hands are drawn AT `hands` targets (IK, upper arm 78, forearm 74 × s), so give targets on the thing held;
  a far hand in front of the body needs `farFront`; a thing held in front goes in `mid` (drawn before the near arm); a load
  on the shoulder goes in `back`. Kneel = `kneelSpec` (far knee down, near foot forward) — blend with `mixSpec` over ~.5 s.
  `mixSpec` returns its input unchanged at k ≤ 0, so a spec with `hands: [null, null]` stays null: use `hangHands(F)`
  when you need the hand position.
- `tilt` and `ang` are screen rotations: nodding forward is `+tilt` for a figure facing right and `−tilt` facing left.
- Keep only one gold piece on screen at a time (plus its glow); two golds and the accent stops meaning "mine".
- The figure is big (s 1 ≈ 400 px): at z ≥ 1.4 it fills a third of the frame — plan the camera for it.

## What a scene author still draws
The layout (where the road, the gap, the gate are), the props (a saw, a seed, a flower: `sprite` them), the timelines and
poses per beat (built from `walkSpec`/`standSpec`/`kneelSpec`/`crouchSpec` + `mixSpec`), the hand targets for every grip,
the depth order of figures in a lane, and the camera. The paper, the sheets, the figure rig, light, flecks, guide,
captions and curtain come from the kit.
