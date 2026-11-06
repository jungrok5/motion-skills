# The character contract and the kit

A character is one ES module, `character.js`, exporting a plain object. Model space: x 0..1000, y down, in "model px";
the stage fits `view` into a 4:5 canvas and sets the transform, so `draw()` works in model px.

## Fields
| field | what |
|---|---|
| `id`, `name`, `blurb` | identifiers and the line under the title |
| `anchors` | `head {cx, cy, rx, ry}` (the skull ellipse the bulge sits on), `extent [side, up, down]` (the bulge's reach in head radii; > 1 lets crown / cheeks / chin turn with the face), `headScale`, `neckY` (the roll pivot), `chinY`, `neckBaseY`, `bottomY` (the cut edge, or the ground for full-body animals), `faceW` |
| `rig` | `yaw`, `pitch`, `roll` (how far ±30 maps: ~0.36 / 0.27 / 0.5), `bulge` (~0.6), `drift [x, y]`, `breath`, `body {yaw, roll}` (the torso's share of the head turn / tilt), `limits {yaw, roll}` (torso degrees) |
| `temper` | `{ wander, bounce, blink, breath, moves: [min, max], look }`, 1 = default (`references/MOTION.md`) |
| `params` | extra params `{ name: [min, max, rest, 'max'?] }` (`'max'` combines by the larger value — faces; otherwise they add) |
| `pairs`, `mirror` | params that swap / flip sign when an idle move is mirrored (`[['earL', 'earR']]`) |
| `view`, `face` | the shown part of model space `{x, y, w, h}` (w / h = 0.8), the face centre and radii for pointer attention |
| `chains` | `{ id, preset, points: [[x, y] …] (root first), attach: 'head' \| 'body', depth, bodyBlend, swing, target(P, t) }` |
| `limbs` | `{ id, side: -1 \| 1, root, len: [upper, lower], rest: {sh, el, wr, pu, pl, hand}, lim: {sh: [a, b] …}, planted?: [x, y], bend, hang, drive, breathe, spring }` |
| `poses` | `{ name: { limbId: { sh, el, wr, pu, pl, hand, front?, lift? } } }` |
| `moves` | idle moves `{ id: { dur, tracks: { param: [[t, v] …] }, limbs?: { limbId: { pose, w: [[t, w] …] } } } }` — start from `HUMAN_MOVES` / `ANIMAL_MOVES` |
| `actions` | `{ id: { label, dur, peak?, blink?, curve(t, e, sim) → { param: v, limbs: { limbId: { pose, w, sh, el, wr } } } } }` — `e` is the fade; built-ins in `ACTIONS` |
| `expressions` | `{ id: { label, set: { param: v }, limbs?: { limbId: poseName } } }` — `none` first |
| `talk` | the default line |
| `demo` | `{ dur, pointer: [[t, x, y] \| [t, null] …], events: [[t, 'act' \| 'express' \| 'say', arg] …] }` |
| `draw(ctx, sim, opt)` | draws one frame |

## Angles
- Head params in degrees (±30); the rig maps them to a modest 2D turn. `+angleX` turns to screen right, `+angleY` up,
  `+angleZ` tilts the top of the head to screen right.
- Limb angles from straight down: `sh` + outward (away from the body's middle), `el` relative to the upper bone (+ further
  out / up, − in toward the body), `wr` the hand / paw, `pu` / `pl` pitch toward the viewer (foreshortens the bone).
- Chain `target` returns radians: a number spreads over the joints, an array sets each joint.

## Depth (`D.head(x, y, depth, out)`)
| part | depth |
|---|---|
| back hair, ears seen behind the skull | −0.05 … −0.35 |
| face, skull fur | 0 |
| cheeks / blush | 0.03 |
| eyes, brows | 0.04–0.1 |
| mouth | 0.06 (person), 0.42 (muzzle) |
| nose | 0.18 (person), 0.55 (animal) |
| muzzle / snout | 0.38 |
| side locks / bangs | 0.12 / 0.26 |

## Draw order (back to front)
ground shadow → tail / back hair → ears behind the head → torso, haunches, clothes → legs / arms at rest → collar, cords →
side locks behind the face → face → cheeks, nose, mouth, eyes, brows → side locks in front → crown and bangs → accessories
→ raised or lifted limbs (`limb.front > 0.5`).

## Transforms for `draw`
```js
const H = (d) => (x, y, o) => S.D.head(x, y, d, o)         // a head part at depth d
const B = (x, y, o) => S.D.body2(x, y, o)                  // the torso
const N = (x, y, o) => S.D.neck(x, y, o)                   // head at the chin, torso at the base
const K = (id) => (x, y, o) => S.chainById[id].map(S.D, x, y, o)   // a shape on a chain
const j = S.limbById.armR.solve(S.D)                       // { S, E, W, au, al, ah, fu, fl, hand, lift } canvas points
```

## The kit (`lib/parts.js`)
- `animeEye(ctx, f, cx, cy, side, P, open, t, pal, {size, droop, wing})` — pal: irisDark, iris, irisLight, irisGlow, pupil, lash, white, whiteShade
- `brow(ctx, f, cx, cy, side, P, color, alpha, {size, thick, angry})`, `mouth(ctx, f, P, cx, cy, pal, {size})`, `blush(ctx, f, x, y, P, color, {rx, ry, base})`
- `roundEye(ctx, f, cx, cy, r, P, open, t, pal, {tall})` — pal: eye, eyeGlow, shine, lid, line
- `nose(ctx, f, cx, cy, w, h, pal)`, `muzzleMouth(ctx, f, P, cx, cy, pal, t, {size})` (uses `P.pant` if present)
- `tube(ctx, points, widths, fill, line, lw, {openStart})` → Path2D — limbs, tails, sleeves
- `hand(ctx, p, angle, size, 'relaxed' | 'open' | 'fist' | 'point', side, pal)`, `paw(ctx, p, angle, size, pal, {wide, pads})`
- `groundShadow(ctx, x, y, rx, ry, color, alpha)`
Draw anything the kit lacks (a beak, whiskers, a hat, a cat's striped tail) with `lib/draw.js` in the same manner.
