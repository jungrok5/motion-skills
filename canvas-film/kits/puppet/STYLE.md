# 그림자극 — Shadow puppetry (빛나는 막, 뚫린 가죽 인형)

House style `puppet` · kit `kit.js` → `scenes/kit-puppet.js` · global `window.Puppet` · first film: [문틈 D](../../sermons/2026-10-18-1cor5/film/scenes/door-d.html)
Origin brief: lemo-opuscar `styles/shadow-puppet/STYLE.md` (Chinese shadow theatre, Reiniger). This kit is the Canvas-2D,
single-lamp, portrait version that the 문틈 film proved.

## What it looks like
A cotton screen lit from behind by one oil lamp. Everything is **lamp light × what the leather lets through**: dark-dyed
hide pieces pressed on the cloth, carved like lace, so the punched holes glow brightest and overlaps go darker. A warm
hot-spot where the lamp is, falling off to brown corners; the light breathes (flicker), flares on a hit, gutters to black,
relights. Pieces hang on soft grey **rods**, pivot on **rivets** (dark ring + pale knot), tremble in the hand. A puppet held
**off** the cloth reads only as a big soft shadow; pressed **on** it snaps sharp. The ending pulls back: the whole tale was a
little lacquered stage in a dark room with heads of an audience.

**Carries well:** parables and fables told as a show; an unseen presence that comes closer (the shadow grows, then the
hand presses on sharp); light as God's presence (lamp out = judgement/silence, relit warm = grace); "who pulls the
strings"; a story-within-a-story ending ("this is a told story — now it's yours"). Patience, one slow change.
**Carries badly:** modern props (phones, screens, cars look like clip-art), crowds or wide cities, fast montage and many
cuts, facial emotion (faces never change — attitude is head angle), data/abstract ideas, anything that needs many colours.

## Palette, type, captions
| role | hex | note |
|---|---|---|
| ink (carved outline) | `#160c06` | 1.5–3.2 px on every region; `#090402` on small rigs |
| set dyes | wall `#3e2412` · floor `#301c0d` · deep wood `#2b170a` · brace `#4f2a11` · hide `#734420` · claw `#22120a` | `Puppet.DYE` |
| lamp | pale `warm(0)` = (1, .89, .72) → amber `warm(1)` = (1, .72, .40) | colour is a story dial (cold → comforted) |
| **accent** | `#a21814` (rgb 162,24,20) | `Puppet.ACCENT` — the ONE saturated colour (blood, a seed). Never a second one. |
| stage | lacquer `#3d170b`/`#1c0a05`, gold line `rgba(196,146,74,.55)`, room `#080503` | |
| text | cream `#f8ead0`, source `#e6d2ae`, card source `#dcc59f`, CTA `#f1c27a`, shadow `rgba(10,4,0,.95)` | `Puppet.TEXT` |

Fonts: **Gowun Batang** (captions/titles, 600–700) + Noto Sans KR (source lines). `window.FILM_FONTS = Puppet.FILM_FONTS`,
`Pilot.run({ fonts: Puppet.FONTS })`. Captions centred at **y 400** (upper third, above the subject band 700–1400);
end card high at **y 262** so the pulled-back stage sits below it. Captions stay readable on black (lamp out).

## Kit API (`window.Puppet`, all units world px on the 1080×1920 cloth unless noted)
- **Setup** `init({world, vignette})` — hide tile, cloth, buffers. Then `W H WW WH S0 BX BY`, `T` (transmission ctx).
- **Paths** `smooth(g, pts, closed)`, `poly(g, pts)`.
- **Carving** (inside a piece's draw) `cut(g, fn, rule)`, `cutLine(g, w, fn)`, `ink(g, w, fn, col)`, `dots(g, pts, r)`,
  `coin(g, x, y, r)`, `scroll(g, x, y, r, rot, flip, w)`, `crescents(g, x0, y0, x1, y1, r, w)`, `taper(g, x0, y0, x1, y1, w)`,
  `lattice(g, x0, y0, x1, y1, step, w)`, `punch(g, {kind: dots|crescents|scrolls|coins|lattice|slits|leaves, area, …}, box)`.
- **Pieces** `piece(box, res, draw, seed, {cutAlpha})` → sprite; `drawP(g, p)`;
  **`carve({shape, box, res, dye, punch, rim, detail, outline, seed, cutAlpha})`** — the general puppet piece: any silhouette
  (points or path fn, origin = its pivot) + dye + perforation clipped inside a solid rim + carved outline;
  `silhouette(box, k, draw)` (solid black, for a puppet that only ever casts a shadow); `shadowOf(p)`.
- **Distance** `dist(d)` → {scale, blur, den, shadow}; `press(t, t0, dur)` 1→0; `liftOff(t, t0, dur)` 0→1;
  **`place(g, p, {x, y, rot, scale, sx, sy, dist, alpha})`** — a piece *or a rig* `{box, draw}` at a pose and a distance
  (0 = pressed sharp, 1 = near the lamp: 2.6× bigger, 34 px blur, half density, a warm-black shadow; blur on a ½/¼-res buffer);
  `soft(g, M, {blur, den, quarter, clip}, draw)` — room-sized soft shadow on a ½/¼-res full-frame buffer;
  `lift(g, x, y, blur, alpha, draw, {size, origin})` — the door's claw path (rig blurred as one layer, fixed buffer).
- **Rigs** `rivet(g, x, y, r)`, `rod(g, x0, y0, x1, y1, a)`, `joint(g, p, x, y, ang, kids)`,
  `chain(g, base, a0, links, curl, {rest, tip, joints})`, `buildHand({segs, nails, tendons, armScales, dye, seed, rivets})`,
  `drawHand(g, hand, {curl: i => c, thumb, spread, bends, nailBend, arm})`, `tremor(t, seed, k)` → {x, y, r}.
- **Hinged / perspective** `hingePt(hg, u, v, th)`, `swing(g, p, hg, th, {strips, k, pad})` (hg = {x0, y0, w, h, vpx, vpy,
  depth, side}); `planks(g, {vpx, vpy, y0, …, joints})`, `rayPoly(src, pts, yEnd)`, `floorLight(g, poly, {y0, y1, stops, rect,
  planks}, inner)`, `castFloor(g, src, {x, px, py, base, y0, len, w, pow, foot, den, blur, box, k})`, `dimExcept(g, dim, holes)`.
- **Accent** `dyeStroke(len, wid, seed, rgb)` (build once) + `drawStroke(g, S, x, y, ang, p)` (reveal 0..1).
- **Lamp** `flicker(t, {amt, hz, seed, buzz, buzzHz})`, `flare(t, t0, w)`, `gutter(t, t0, t1, seed)`, `warm(k)`,
  `lamp(c, t, M, {I, color, x, y, R, lobe, hot, base, gain, wobble})`.
- **Frame passes** `beginT(M)` → T (white, transform M, multiply); `screen(ctx, t, M, lamp)`; `bloom(ctx, amt, tint)`;
  `stage(ctx, M, I)`; `audience(ctx, a)`; `post(ctx, t)`; **`frame(ctx, t, M, lamp, {audience, bloom, grain})`** = all four.
- **Camera** `cam()`, `zoom(m, s, ax, ay)`, `pullBack(t, t0, dur, to)`, `crash(t, t0)`, `step(t, fps)`.
- **Words** `captions(ctx, t, lines, o)`, `endCard(ctx, t, card, at, o)`, `fade(ctx, t, dur)`; `ACCENT INK DYE TEXT FONT FONTS FILM_FONTS`.

```js
const P = Puppet, S = window.SCRIPT; let BIRD;
async function init() { P.init(); BIRD = P.carve({ box: [-130, -72, 150, 84], dye: P.DYE.hide, shape: [[-96,-30], [-60,-52], [62,-30], [144,-64], [40,34], [-50,24]],
  punch: { kind: 'crescents', r: 8, w: 1.5 } }); }
function draw(ctx, t) {
  const M = P.zoom(P.cam(), P.pullBack(t, 24.6, 1), 540, 1690), g = P.beginT(M);
  P.place(g, BIRD, { x: 430, y: 790, dist: P.press(t, 6), rot: P.tremor(t, 5).r });      // far & soft → pressed sharp
  P.frame(ctx, t, M, { I: P.flicker(t), color: P.warm(0), x: 540, y: 880 }, { audience: Pilot.ss(24.5, 26, t) });
  P.captions(ctx, t, S.lines); P.endCard(ctx, t, S.endCard, S.beat.end); P.fade(ctx, t, S.DUR);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: P.FONTS, init, draw });
```

## Motion grammar (what worked)
- **Off the cloth = big & soft; on it = sharp.** The demon never touches the cloth: its shadow drifts, shrinks and sharpens as
  it nears the door, swells to 3.3× and 70 px blur at the slam (toward the lamp), withdraws at the recoil. Its hand presses
  ON (blur 9 → 0, scale 1.3 → 1 in .45 s) — the one crisp, jointed, detailed thing — and lifts off (blur 0 → 16, scale ×1.4,
  fade in .3 s). Use `place(dist)` / `press` / `liftOff` for this; `soft()` when the shadow fills the room.
- **The light is the world.** Lamp catches with a .22 flare; brightens a step with each opening; dips with "breathing";
  flares ×1.45 at the hit, **gutters to black** (1.2 s) and holds silence; relights faint (.14) in stuttering steps, then warm
  amber (`warm(1)`) for the resolution. Darkness is a pass of the lamp, never a black overlay.
- **One accent, brushed late.** The red dye appears only after the black, stroke by stroke on the beats (`dyeStroke`).
- **Hinged pieces swing on rods** (foreshortened strips about a vanishing point) and show their rods + rivets.
- **Light on the floor is leather slid away** along the lamp's rays (`floorLight` + `rayPoly`); shadows lie along it (`castFloor`).
- **Crash zoom** (6 %, ~.06 s rise, decays) on the percussion hit; a 3–7 % slow push otherwise; **pull back** (×.52 in .95 s)
  to the stage + audience for the end card. Tremor on every hand-held piece (≈2 px / .025 rad, ×1.8 under tension).
- Never move the cloth or the frame; nothing morphs — pieces rotate on rivets, slide on rods, press on, lift off, or swap.

## Performance (1080×1920, headless Chromium software canvas, 4 CPUs shared with 3 other renders)
- Door D: **~75–85 ms/frame** (same before and after the refactor: 74–79 → 79–83 ms min, inside run-to-run noise), init ~0.6 s.
- Template: **~55 ms/frame**, init ~0.4 s. The fixed passes (white T, lamp gradient, cloth multiply, T multiply, bloom from
  a 1/8 buffer, vignette, grain) are most of that; pieces are cheap. A 30 s portrait film ≈ 40–45 s of render per worker-pass.
- Speed rules the door used: blur only on small buffers (soft shadow ½ or ¼ res once blur·zoom > 15 px; floor shadow at
  .6×; claw rig in a 720×620 buffer; `place()` picks ½ res > 5 px blur, ¼ > 14 px), build all sprites in `init`, bloom at 1/8.

## Pitfalls
- `ctx.filter = blur()` on a drawImage into the full-res T costs full-res; draw into a small buffer and blur there.
- Big set pieces with full-strength cuts glow like a sieve — the room used `cutAlpha: .5` (half-lit, thinned leather).
- An opening in a set piece (a doorway) is `clearRect` on the piece: the bare cloth behind *is* "the light beyond".
- Thin pale things vanish on a bright cloth: rods, rails, legs must be dark. Keep most of the cloth empty.
- `rivet()` leaves the context in `multiply` (that is what the next piece wants); wrap in save/restore if you then draw `source-over`.
- `swing()`/`hingePt()` swing *away* from the viewer (z > 0) and stay inside the closed box only if the vanishing point is
  inside it; otherwise raise `pad`.
- `castFloor` wants a sprite with the feet at the bottom (`foot` = fraction above the feet line) and a light point (px, py)
  above the floor line.
- `audience()` is screen-fixed (bottom of the cloth's fit box), not on the camera — show it only once you've pulled back.
- When the lamp is out `lamp()` paints pure black and skips T entirely — anything you need visible in the dark (a glowing
  ember) must be drawn on `ctx` after `frame()`.
- Refactor lessons: keep the exact order of canvas ops (composite side effects, buffer sizes, `toFixed` on filter strings) and
  the output is bit-identical (it was: max diff 0 on 24 stills, both seek orders). Float re-association is invisible.
- `place()` caches buffers by size (rounded to 64 px); a piece that grows continuously allocates a handful — fine, but don't
  feed it unbounded scales.

## What a scene author still draws
Every piece of the story: the silhouettes (points or paths), which dye and punch each one gets, the set piece(s) and their
openings, the rig layout (pivots, joint angles over time), the choreography (positions, distances, curls per beat), the lamp
intensity curve for the story (`flicker`/`flare`/`gutter` are the ingredients), where the accent appears, the camera
anchors, and `script.js`. Not in the kit: multiple lamps, IK arms, pendulum-simulated loose parts, backstage/mirror view,
cut-letter title plaques (see the origin brief §10 if a film needs them).
