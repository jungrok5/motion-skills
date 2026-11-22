# KIT — engraving subjects, building sets, cameras and acts

## Engraving a subject (`lib/engrave.js`)

```js
import { Plate } from 'ec/engrave.js';
function signboard(seed = 1) {
  const ppm = 90, W = 1.4 * ppm, H = 0.8 * ppm, P = new Plate(W, H, { seed, gap: 3.4 });   // px per metre sets the card size
  P.fill(P.rect(0, 0, W, H), { tone: { from: 0.15, to: 0.45, x0: 0, y0: 0, x1: W, y1: 0 }, angle: 0 });  // board, lit from the left
  P.white(P.rect(8, 8, W - 16, H - 16));                     // a paper-white panel
  P.stroke(P.rect(0, 0, W, H), 2.4);                          // outline (tone 1)
  const r = P.done({ margin: 4 }); r.m = [r.w / ppm, r.h / ppm]; r.base = r.pad; return r;   // a card: canvas, blur, shadow, m
}
```

- **Fill** paints a tone (0 paper … 1 ink) with a line **angle** (0 horizontal, 90 vertical), **gap** (px between line
  centres; 3–5 at 60–90 px/m, 2.4–3 for far or small things), **wave** (0–1, bent lines for water, cloth, clouds).
  Tone can be a linear gradient `{ from, to, x0, y0, x1, y1 }`, a radial one `{ cx, cy, r, from, to }`, or `stops`.
- Later fills cover earlier ones: paint back to front, outlines last (`stroke` = a fill at tone 1, so a later fill
  covers an outline the way an engraver cuts round a nearer form).
- `white(shape)` = paper inside the cut (ledges, highlights, window frames); `solid(blob, o, w)` = fill with only the
  outer outline (foliage, rocks made of overlapping circles); `strokes(points, o)` = short parallel flicks (bark, grass).
- `done({ margin, blur, light })` — margin = white paper left round the cut; it returns `{ canvas, blur, shadow, w, h,
  ink, cover }`. A kit subject also carries `m` (metres) and `base` (px under the ground line).
- Shapes: `rect`, `poly`, `ellipse`, `arch`, `blob(cx, cy, rx, ry, n, seed, rough)`, `path(p => …)` (any Path2D).

### The kit (`lib/kit.js`) — examples of the level of detail
`facade({ w, floors, bays, window: rect|arch|mix, roof: mansard|gable|flat, shop, lit, chimneys, side, ppm, seed })` ·
`tower({ w, h, time: [h, m], spire })` · `skyline({ w, h, spires, domes, tone })` · `tree({ h, w, kind: round|poplar|pine, dark })` ·
`cloud({ w, h, tone })` · `sky({ w, h, tone, clouds })` · `sea({ w, h, tone })` · `ship({ len, sails: set|furled })` ·
`lamp({ h })` · `figure({ kind: gent|lady|worker, facing })` · `balloon({ h })` ·
`ground({ w, d, kind: cobbles|paving|boards|grass|ice, tone })` · helpers `windowAt(P, x, y, w, h, o)`, `cornice(P, x, y, w, h)`.
A topic's own subjects (a pocket-watch sign, a parapet, icebergs, a mountain range, an open lead, an aurora sky — see
the two pieces) are written in its `world.js` with the same calls. Look at a new plate alone first.

## Building a set (`lib/world.js`)

```js
export const sets = {
  street: { haze: [18, 90, 0.6],            // [start m, full m, strength] of the fade toward paper
    build(S) {
      S.floor(ground({ w: 18, d: 70, kind: 'paving' }), { at: [0, 0, -24] });
      const h = S.card(facade({ w: 10, floors: 4, seed: 3 }), { at: [-6.2, 0, 1], rot: 64, layer: 'street' });
      S.rise(h, 1.5, 0.9);                   // hinge up from flat at film t = 1.5 s over 0.9 s
      S.ring([0, 1, 2, 3].map(i => sky({ seed: 20 + i, w: 300 })), { r: 175, y: -6, span: 165 });
      S.drift(S.card(cloud({ seed: 2 }), { at: [-30, 26, -110], layer: 'sky', shadow: false }), [0.5, 0, 0]);
    } },
};
```

- `card(plate, { at, rot, tilt, roll, h | w, layer, shadow, lift, opacity, haze, anchor, sway })` — `at` is the bottom
  centre; `rot` turns about the vertical (+ turns its face toward +x); `h` rescales to a height in metres.
- Collage angles: cards framing a street at 55–70° to it, staggered in depth; a subject facing the lens at 0–25°;
  backdrops square to the centre. Sink a façade below the floor (`at: [x, -15, z]`) to show only its roof.
- `floor` lays a plate flat (depth-written, drawn first). `ring` hangs plates in an arc facing the centre (skies).
- Animations run on film time: `rise`, `drift(v)`, `bob({ amp, rock, period })`, `sway({ amp, k, speed, axis })`
  (vertex waves: sea strips, flags), `animate(card, (t, c) => …)`.
- Layer names colour the breakdown (`far`, `sky`, `street` / `buildings`, `props`, `ground`, `cast`, `sea`, `near`, or
  any name — hashed to a colour).

## Shots, cameras and acts (`lib/film.js`)

```js
{ set: 'street', dur: 6.2, focus: 6, ease: 'dolly',
  cam: [{ pos: [-1.6, 1.15, 6.2], look: [-0.6, 1.4, -4], fov: 44 }, { pos: [0.6, 1.5, -1.4], look: [2, 2.6, -24], fov: 40, focus: 9 }],
  rig: { pos, look, fov },                       // optional: the breakdown camera (auto: above and to the side of the move)
  acts: { oto: [ { at: [-4.2, 0, -1.2], face: 1, view: 'side', expr: 'smile', hold: 'key' },
                 { t: 0.3, run: [3.4, -6.4] },     // or walk; [x, z] or [x, y, z]; dur optional (natural speed × 1.18)
                 { t: 4.2, turn: 'front' },        // a stepped turn (view switches at the step)
                 { t: 4.8, do: 'wave' },           // wave | point | lookUp | jump (do: 'jump', to: [x, z] to leap across)
                 { t: 5.0, expr: 'surprise' }, { t: 5.2, look: -0.5 }, { t: 5.4, hold: null } ] } }
```

- Camera keys are Catmull-Rom with one ease over the shot (`dolly` default). Keep ≤ 0.3 m and ≤ 1.4° per frame.
  `focus` (m) sets the depth of field; default = distance to `look`.
- Moves (walk / run / turn / do) run one after another. A walk / run without `dur` takes its natural time (≈ distance ×
  1.4 s walking, × 0.5 s running for a 1.3 m child) and is cut short to end when the next move starts — hurried past 1.5×
  fails check.mjs; any other overlap is queued (and fails). Air travel in a jump is at constant speed; keep leaps ≈ 2 m.
- Characters are billboard cards that turn to the shot camera; their stride is drawn across the card, so walks and runs
  must travel **across** the screen (check.mjs: ≥ 60 %). Facing is set from the screen direction of each move.
- Props: `cast.oto.props = { key: { on: 'foreN', draw: (ctx, v) => … } }`, then `hold: 'key'`.
- New actions: `ACTIONS.climb = { dur, antic: [t0, t1], keys: [[t, poseDelta, ease] …] }` (deltas over the stand pose,
  `rise` = jump height in rig heights). Wind up the opposite way in `antic`; settle legs with `out`, overshoot arms with `back`.
