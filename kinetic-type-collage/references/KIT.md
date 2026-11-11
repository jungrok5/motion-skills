# KIT — designing props and pictures

The library ships parts, not props. A film's objects are designed for its topic and registered once:

```js
F.prop('pot', (K) => {
  const steel = K.mat('steel', { rough: 0.3, metal: 0.55 });
  const body = K.lathe([[0, 0], [1.16, 0], [1.27, 0.09], [1.32, 1.22], [1.4, 1.27], [1.4, 1.33], [1.25, 1.33], [1.2, 0.16], [0, 0.16]], steel);
  const ear = (s) => K.at(K.torus(0.24, 0.055, K.mat('ink'), { arc: 180 }), [s * 1.4, 1.12, 0], [90, 0, s > 0 ? -90 : 90]);
  return K.group(body, ear(1), ear(-1));
});
```

Conventions: one unit ≈ 10 cm for hand-sized things; the prop **rests on y = 0 and is centred on x / z** (it sits on the
shot's `ground` and turns in place); 5–15 parts is plenty. Render `--props` and score the sheet (references/BRIEF.md)
before using it in a shot.

## Parts
| | |
|---|---|
| `K.mat(color, { rough, metal, clear, emissive, glow, map, side })` | lit material. Colour = a palette or tint name. Ceramic / plastic: `rough 0.2, clear 0.6`; steel: `rough 0.3, metal 0.55`; matte food, paper: `rough 0.6–0.9`; liquid seen from above: `rough ≥ 0.35` |
| `K.basic(color)` | unlit, flat colour |
| `K.box(w, h, d, mat)` · `K.rbox(w, h, d, r, mat)` | box; box with rounded edges |
| `K.cyl(r, h, mat, { r2, seg, open })` | cylinder / cone (`r` bottom, `r2` top) |
| `K.sphere(r, mat, { s: [x, y, z] })` | sphere, squashed with `s` (eggs, beans, drops, blobs) |
| `K.lathe([[r, y], …], mat)` | a profile turned round y: cups, pots, bowls, bottles. Walk the profile up the outside, over the rim, down the inside for a wall with thickness |
| `K.torus(R, r, mat, { arc })` | rings, handles (`arc: 180`), rims |
| `K.extrude([[x, y], …] \| Shape, depth, mat, { bevel })` | any outline pushed to a depth: a key, a leaf, a letter-shaped block |
| `K.tube([[x, y, z], …], r, mat, { closed })` | a smooth tube through points: noodles, cables, straws, steam |
| `K.slab(w, h, d, { face, back, side, r })` | a rounded plate with a painted front: tile, card, packet, phone, sign board |
| `K.disc(r, d, { face, back, side })` | a round plate facing +z with a painted front: dial, coin, lid, badge |
| `K.group(...parts)` · `K.at(obj, [x, y, z], [rx, ry, rz], scale)` | assemble and place (degrees) |
| `K.paint(w, h, (g, w, h) => …)` | a canvas texture; `K.font(key, px)` gives the film's fonts for `g.font`; `K.css(name)` a palette colour |
| `K.rng(seed)` | seeded random for scatter |

Painted faces (`face: (g, w, h) => …`) are how words get **printed on the object** — a dial, a label, a ticket.
Fonts asked for with `K.font` are loaded before the face is painted.

## Pictures
`S.img(painter, { w, h, cut })` is a flat picture in the world or a flat layer. Draw it like a road sign or a sticker:
one shape, one mark, two colours; `cut: 0.07` gives it the die-cut border. Painters for fills:
`K.tex.fill · stripes · checker · dots · halftone · grid · waves · speckle` and
`K.tex.bands(g, w, h, [painter, …])` (vertical bands, each its own fill — the "layers" swatch that slams into diagonal
strips). The user's own photographs go in `assets/` and load by URL: `S.img('assets/photo.jpg', { w: 3 })`.

## A ready-made model (GLB)
The style allows outside models (the source used them). Read `references/3D-MODELS.md` at the repo root first: free
Polyfork models, commercial use fine, never commit their `.mjs` source, a committed GLB needs its CC BY credit line.
Tried here on 2026-11-11 (`fox-base`, no console errors):

```js
import { GLTFLoader } from 'https://unpkg.com/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';   // same r170 as lib/, found through the import map
const fox = (await new GLTFLoader().loadAsync('https://polyfork.dev/cdn/fox-base.glb')).scene;     // before F.start()
F.prop('fox', () => fox.clone());                                                                    // metres, on y = 0: scale in the shot
```
Vertex-coloured low-poly models take the studio light as they are. Use them as still or turning props (no walk
cycles — this style has no acting characters), credit them on the end card, and keep the GLB out of `docs/`.

## Recipes
- **A vessel with liquid**: `K.lathe` wall + a thin `K.cyl` disc just under the rim in a liquid tint.
- **Something printed**: `K.slab` with a `face` painter; put the word in `han` or `cond`, a caption in `text`.
- **Many small things**: build one in a prop, then place it in a loop in the shot with `S.K.rng(seed)` positions.
- **A soft blob** (egg white, dough, a cloud): two or three squashed `K.sphere`s overlapping.
- **Glow** (a flame, a lamp): `K.mat(color, { emissive: color, glow: 1.4 })`; it does not light other things.
