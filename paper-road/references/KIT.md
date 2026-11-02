# Engine and kit API

Classic scripts: `lib/paper.js` defines `window.PR`, `lib/kit.js` defines `window.PK`. World units: y up, the floor is
y = 0, +z goes away from the camera; a car is ~180 long, the ribbon 120 wide.

## The film
```js
const R = PR.create({ duration: 30, fps: 24, steps: 12, seed: 7, W: 1920, H: 1080, dof: 9, wallZ: 1600, grain: 1,
                      palette: { wall, wallTop, wallGlow, floor, floorFar, ink, paper, paperBack, road, dash, shadow } });
…
R.start();
```
Every layer receives the **held** time `T` (`R.held(t)`); `R.pose` is the pose index; `R.boil(id, amp)` → `[dx, dy, dz]`
changes once per pose.

## Road
```js
const road = PR.path({ x, y, z, step: 5, style: 'paper' })
  .go(len, { dz, dy })          // straight
  .pitch(deg, r, { dz })        // bend up (+) / down (−); 360 = a loop (give it dz so it misses itself)
  .yaw(deg, r)                  // turn on the floor; + = away from the camera
  .style('ink')                 // what follows is drawn by a pen on the floor
  .mark('name')                 // a place to time against: road.m('name') → arc length
  .done();
road.length; road.at(s) → { P, T, W, N, s, style, pitch }   // N = the road's top side (inward in a loop)
R.road(road, { reveal: t => s, width: 120, inkWidth: 58, band: 0.5, dash: [16, 14], edge: 1, from: 0,
               roll: { t, r: 46, from, drop: true } });
```
`PR.track([[t, v], [t, v, 'stop'], [t, v, 'hold' | 'linear' | 'inOut' …]])` — a monotone cubic through keys, zero speed
at `'stop'` keys. `PR.runMax(fn, duration)` — fn made non-decreasing (use it for `reveal`).

## Cards
```js
R.card({ name, at: [x, y, z] | t => …, face: 'front' | 'camera' | (t, view) => ({ U, V }), scale,
         pop: { t, dur: 0.5, mode: 'fold' | 'scale' | 'drop' | 'rise', h, k }, out: { t, dur, mode },
         shape(g, t),            // silhouette path only (no fill) — used for the shadow and the grain clip
         paint(g, t, { k, view }),  // normal Canvas 2D drawing; local x right, y DOWN, base at y = 0
         box: [x0, y0, x1, y1],  // local bounds (grain fill, blur region) — keep it tight
         shadow: 1, texture: 1, boil: 0.8, blur: 0, clipFloor: false, mirror: t => bool, zBias: 0, from, to });
```
A card is drawn under the affine transform of its anchor (exact at the anchor, a good approximation over a card's size).
`clipFloor` cuts everything below y = 0 (a sun rising from behind the floor, a mountain folding up). Items are sorted far →
near by camera depth each frame; `zBias` nudges one (the car uses −6 so it sits on its own road chunk).

## Pen, confetti, camera, checks
```js
R.pen({ at: t => road.at(reveal(t)).P, in: t0, out: t1, size: 1, lean: 30, lift: t => 0..1, paint(g, t, o) });
R.confetti({ at: [x, y, z], t, n: 70, speed: 520, dir: 0, life: 4, colors, seed });
R.camera([{ t, target: [x, y, z] | t => …, dist, yaw, elev, fov, roll, ease: 'inOut' }, …]);   // missing values carry over
R.follow(fn, lag = 0.5, offset = [0, 0, 0]);   // a trailing target, e.g. R.follow(car.pos, 0.5, [200, 60, 0])
R.check(name, t => bool);                      // run at every frame by scripts/check.mjs
R.soft(g, M, box, blurPx, draw, alpha, dx, dy);  // draw small + scale up: a cheap blur (M = device-px affine)
R.add((T, view, items) => items.push({ z: view.depth(P), draw(g) { … } }), name);   // a raw layer
```
`view`: `proj(P) → {x, y, k, z}` (k = px per world unit there), `depth(P)`, `poly(points3D)` (near-clipped), `right`, `up`,
`fwd`, `eye`, `dist`.

## Kit (`PK`)
| prop | options |
|---|---|
| `car(R, o)` → `{pos(t), s}` | `path, s: t => arcLength, color, scale, driver: {skin, shirt, hat, hatColor, glasses} \| false, wave: t => 0..1, card: {…}` |
| `mountain(R, o)` | `x, z, w, h, peak (−0.5…0.5), crease, snow (0…0.5), lit, dark, pop, out, blur, seed` |
| `range(R, o)` | `x0, x1, z, n, h: [min, max], seed, snow, lit, pop: {t: x => time \| t0, step, dur, mode}` |
| `cloud(R, o)` | `x, y, z, w, drift (units/s), color, pop` |
| `sun(R, o)` | `x, y: number \| t => y, z, r, color, pop` |
| `pine(R, o)`, `hill(R, o)` | `x, z, h \| w+h, color, tiers, pop` |
| `sign(R, o)` | `x, z, h, symbol: 'end' \| 'curve' \| 'loop', color, pop` |

## Writing a prop
```js
function balloon(R, o) {
  const r = o.r || 50;
  const shape = g => { g.moveTo(r, -3 * r); g.arc(0, -3 * r, r, 0, Math.PI * 2); };
  R.card({ name: 'balloon', at: t => [o.x, 200 + 20 * Math.sin(R.pose * 0.4), o.z], box: [-r - 4, -4 * r - 4, r + 4, 4], pop: o.pop,
    shape, paint: g => {
      g.strokeStyle = PK.INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, -2 * r); g.lineTo(0, 0); g.stroke();   // string
      g.beginPath(); shape(g); g.fillStyle = o.color || '#e8513a'; g.fill(); PK.outline(g, 2.2);
    } });
}
```
Draw in the card's local units, base at y = 0, up is −y; put the silhouette in `shape` (path only) so shadow and grain fit;
animate only from `t` / `R.pose`; keep the `box` tight (it sizes the blur and grain passes).
