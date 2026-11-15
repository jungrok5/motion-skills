# Forms — building shapes that read as points

`F.form(name, (b, film) => { … }, opts)` describes a form with the builder `b` (`lib/forms.js`). At `F.start()` every form
is sampled into exactly `count` points (seeded, so the same every load), ordered along a Morton curve, and uploaded.

## How the points are shared out
Each call adds a **part** with a natural measure: lines by length, faces by area, volumes by volume. Points go to parts in
proportion to `measure × density`, where face and volume measures are divided by the form's own scale `L` (bbox diagonal
/ 40) — so densities mean the same at any size. Defaults per kind:

| kind | made by | `w` (brightness) | density | jitter (× L) | spray |
|---|---|---|---|---|---|
| line | `line path circle grid arc helix`, kit edges, `terrain` rows | 1 | 1 | 0.1 | 4% |
| face | `tri quad disk sphere surface lathe geometry text-fill` | 0.55 | 0.1 | 0.05 | 2% |
| volume | `blob dust nebula` | 0.3–0.9 | 0.02 | — | — |

`n: 2000` reserves an exact count for a part (hot spots, eyes, small details) before the rest is shared.
Every part takes `o = { w, density, jitter, spray, tint (0 ink … 1 accent), size, tag, n }`.

**Rules of thumb.** Lines are the drawing: give a form 60–80% of its points on lines. If faces glow as much as edges, drop
their density (0.03–0.08) or `w`. If edges look like fur, lower `jitter` (0.02–0.05). Fine detail that matters (an eye, a
mouth line, a tubercle) gets `n` so it is not starved. A floor (`dust` of 3–10k points, or a terrain strip) grounds an object.

## Spare points
`opts.use = 0.8` gives the form 80% of the points and spreads the rest as faint ambient specks around it — use it for
small forms (an animal, a part) that would otherwise be over-dense and blow out. `opts.spare` scales that halo.

## Calls
```js
// transforms: everything inside is moved, turned (yaw°, about +y) and scaled
b.at([x, y, z], yaw, scale, () => { … });

// lines
b.line(a, c, o); b.path(pts, o, closed); b.circle(c, r, o, { axis: 'y', seg: 72, from: 0, to: 360 });
b.grid(p0, u, v, nu, nv, o);               // lines on a parallelogram (o.only: 'u' | 'v')
b.arc(a, c, lift, o);  b.helix(c, r, h, turns, o);

// faces
b.tri(a, c, d, o); b.quad(p0, p1, p2, p3, o); b.disk(c, r, o, { axis, r1 }); b.sphere(c, r, o);
b.latlon(c, r, { lat: 9, lon: 18 }, o);
b.surface((u, v) => [x, y, z], o, { nu: 48, nv: 48 });          // any parametric surface; o.lines = [nu, nv] adds iso-lines
b.lathe([[r, y], …], o, { c, seg: 64, rings: true, meridians: 0 }); // surface of revolution + a ring at every profile point

// volumes
b.blob(c, r, { tint: 1, n: 2000 }, [sx, sy, sz]);               // a hot spot (gaussian cluster)
b.dust({ c, size: [w, h, d] }, { n: 6000 });                    // floor specks
b.nebula({ c, r, lobes, seed }, o);                             // a form that is a cloud on purpose

// meshes and rasters
b.geometry(new THREE.TorusKnotGeometry(…), o, { matrix, edges: 30, surface: true }); // feature edges above 30°
b.object(gltf.scene, o, { edges: 40 });                         // every mesh in a loaded model, world matrices applied
b.text('NAME', { at, size: capHeight, depth, font, align, yaw }, { edges: 1 });
b.image(imgOrCanvas, { at, width, depth, invert, threshold }, o);

// kit (lines + faint faces; pass o to tint or brighten)
b.box(baseCentre, [w, h, d], { edges: 1, faces: 1 });
b.building({ at, w, d, floors, fh: 3.6, bays: [nx, nz], yaw, roof: 'flat' | 'gable' | 'truss' | 'sawtooth' | 'none', roofH, windows: 2, core, parapet, faces });
b.truss(a, c, h, panels, o, 'pratt' | 'tri');
b.stair(a, dir, run, rise, steps, width, o);
b.terrain({ at, size: [w, d], res: [nx, nz], height: (x, z) => y, rows: 'x' | 'z' | 'both', fill: 0.35 }, o);
b.globe({ c, r, lat, lon, land: (latDeg, lonDeg) => bool }, o);
```
Y is up; units are free (metres are natural). `box` and `building` take the **base** centre (y = bottom).

## Moving parts
Tag parts (`{ tag: 'rotor' }`) and give the form up to 4 motions:
```js
F.form('turbine', fn, { motion: [
  { tag: 'rotor', pivot: [0, 63, 7], axis: [0, 0, 1], spin: 36 },                        // deg / s
  { tag: 'tail', pivot: [-1.4, 0.3, 0], axis: [0, 0, 1], sway: { amp: 7, hz: 0.4, phase: 0 } },
  { tag: 'ship', pivot: [0, 0, 0], axis: [1, 0, 0], sway: { amp: 1.6, hz: 0.16 }, bob: { amp: [0, 0.35, 0], hz: 0.16 } },
] });
```
Motions run on global time, on both sides of a morph, so they carry across shots without a jump. Rotations are not
nested: a second segment hanging off a swinging first (a tail tip) gets its own `sway` plus a `bob` that follows the first
segment's swing — `bob.amp = [0, -armLength * sin(amp1), 0]` with the first segment's `hz` and `phase` (the example's whale).
Callouts are pinned to rest positions — do not pin one to a moving part.

## GLB models
A ready-made model samples like any mesh. Read `references/3D-MODELS.md` (repo root) first: free Polyfork models, commercial
use OK; download the GLB into the project's `models/` (never into the skill or `docs/`), keep its credit line in the brief.
```html
<script type="importmap">{ "imports": { "three": "./lib/three.module.min.js",
  "three/addons/": "https://unpkg.com/three@0.170.0/examples/jsm/", "pcm/": "./lib/" } }</script>
<script type="module">
import { Cloud } from 'pcm/cloud.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const fox = (await new GLTFLoader().loadAsync('./models/fox-base.glb')).scene;   // before F.start()
F.form('fox', (b) => b.at([0, 0, 0], 0, 10, () => b.object(fox, { density: 0.5 }, { edges: 40 })));
```
Low-poly, flat-shaded models have feature edges everywhere; raise `edges` (40–60°) or lower `edgeW` so the silhouette, not
every facet, carries the shape (tried on `fox-base`, 2026-11-09). Serve the page over HTTP for the live view.

## Recipes from the example and template
- **Building**: `b.building({ … roof: 'truss' })` + `b.dust` floor + a `blob` on the system the copy talks about.
- **Hull / fuselage / bottle**: two `surface`s (one per side) from a half-breadth function, plus sheer / waterline / station
  `path`s sampled from the same function (`examples/deep-survey`, `vessel`).
- **Terrain**: `terrain` rows along the long axis, `fill` 0.3 for body, an accent `path` along the feature (a trench axis,
  a river, a fault), a `blob` on the peak.
- **Animal**: a body `surface` (radius profile × elliptical section), grooves / ridges as `path`s on the same function,
  fins / wings / legs as thin `surface`s with an edge `path`, eyes as tiny `blob`s with `n`, moving parts tagged.
- **Rotor / wheel**: tagged `surface` blades + hub `sphere`, `spin` about the shaft.
- **Network / planet**: `globe` + accent `path`s on the sphere (tracks, borders) + great-circle arcs + port `blob`s.
- **Wordmark**: `text` with `depth` 1–2 and `edges: 1`, a rule `line`, a mono `text` line under it.
