# Kit — API and drawing your own pop-up

## The film (`lib/foldmap.js`)
```js
const F = await Film.create({ duration: 38, W: 1080, H: 1920, seed: 51 });
const P = projector({ center: [lon, lat], km: 6.6 });        // (lon, lat) → [x, z]; P.all(list); P.inv([x, z])
const S = F.sheet({ cols: 4, panel: [.85, 2], color, residual: 2.2, crossResidual: 1.2, res: 1400 });
S.front(paint(m => { … }));                                   // the map side, once
S.backs(paintBack((m, { c, r, cover, guide, pw, ph }) => { … }));   // each back panel, the right way up
F.desk({ wood, props: ['cup', { kind: 'pencil', at: [x, z], rot: 70 }, 'glasses', 'coin'] });
F.unfold({ at: 1.5, half: 1.3, fan: 1.7, stagger: .3, order: 'out' });
const T = F.trip({ stops, route, start, hold, travel, color: '#b0302a', width: .011, lead: .55, lift: 1.35 });
F.light([[0, 'day'], [18.5, 'day'], [22.5, 'golden'], [26.2, 'dusk'], [28.4, 'night']]);   // or { base: 'night', points: .8, … }
F.track([{ t, at: [x, y, z], dist, yaw, elev, fov }, …]);     // opening / closing keys; trip() adds the stops' keys
F.title(text, { from, to, pos: 'bottom', sub });
F.check(name, t => bool); F.onFrame((t, light) => …);
F.start();
```
- A stop: `{ name, latin, note, at: [x, z], art, w, yaw, elev, dist, fov, face, hold, travel, aimBack, aimY,
  label: { side, ahead, tilt, w } }`. `art` is a card or `[{ card, dz, dx, k, lean }]` (layers; `dz` < 0 behind).
- `T.visits[i] = { arrive, leave }`, `T.end` (the last leave): build closing keys from them.
- Camera yaw: 0 = the camera south of the target looking north; 90 = east of it looking west. The pop-up faces the
  camera that visits it, so the yaw is also how the card is turned on the map.

## The map painter (`lib/mapart.js`)
`m.paper()` · `m.sea(poly, { coast, islands, bands, spacing })` · `m.land(poly)` · `m.river(pts, { w0, w1 })` ·
`m.park(poly)` · `m.hills(peaks, { clip, levels })` (peaks `[x, z, h 0–1, r]`; then `m.height(x, z)`) ·
`m.streets({ districts: [{ at, r, angle, spacing, warp }], mask })` · `m.road(pts, { w })` · `m.rail(pts)` ·
`m.text(str, x, z, { size, weight, italic, color, align, spacing, rotate, halo, upper })` · `m.border(inset)` ·
`m.compass(x, z, r)` · `m.scalebar(x, z, km, kmPerUnit)` · `m.fill/stroke/rect/dot/clip/unclip` ·
`maskOf({ land: [polys], not: [fn(x, z)] })`. Every size is in map units.

## A new pop-up (`lib/cardart.js`)
```js
const tower = card({ aspect: .8, seed: 4, res: 900, border: 2.2, draw: p => {
  const H = p.H;                                   // drawing space: 0..100 wide, 0..H tall, ground near y = H
  p.ground(0, 100, H - 6, { color: '#8fae6a', bump: 4 });
  p.block(30, H - 8, 40, 70, { wall: '#e6d3b3', side: 3, roof: 'gable', windows: { rows: 8, cols: 4, lit: .6 } });
  p.tree(16, H - 6, 14, 'round'); p.tree(86, H - 6, 12, 'pine');
}});
```
Draw what the place has with the painter's parts — `ground block windows gable hanok hall tree rock waves sand
lighthouse pagoda lanterns cable umbrella people houses` — and plain shapes (`poly rect line circle vgrad`). Rules:
- **Colours through the painter** (`p.c(col)` is applied by every part): the same function draws the night lights, where
  everything is black except `p.lit(dayColour, nightColour)`, `windows({ lit })`, `lanterns`, `cable({ lights })`,
  `lighthouse`, `hall`. A window that should glow at night must be drawn with one of those.
- **Light from the upper left**: lighter left faces, a darker narrow right side (`p.shade(col, k)`), shadows to the right.
- **A foot**: every card stands on something drawn across its bottom (ground, rock, sand, water) — the hinge is there.
- **Silhouette**: the die-cut border follows the paint; thin things sticking out (masts, lamp posts, antennae) get big
  white halos — draw them thicker, or lower the border (`border: 1`).
- People and animals are printed figures on the card (`p.people`), never animated bodies.
- Look at the card flat: `document.body.appendChild(tower.canvas)` in the page, or a still with the camera close.
