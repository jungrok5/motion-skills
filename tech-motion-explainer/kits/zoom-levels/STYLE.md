# zoom-levels — 분해해 들어가기 machinery (three.js)

Nested levels you dive into: each level is modelled in its own units and placed inside its parent at 1/10–1/1000 scale,
and every frame the scene is re-rooted on the camera's level. Camera keys carry a level; dives fly at a constant rate
in log(distance) through level changes. Plus the stage setup, builders and 3D-anchored 2D labels that go with it.

The kit holds **materials and machinery only**. It has no scene, no palette and no layout. `createStage` refuses to
run without a `bg` colour.

## When to use it
- **Use it for** topics with a real nesting, where the point is *inside* something: a device → a chip → a die → a block;
  a process → threads → one tick; a city → a building → a desk. See `references/STYLES.md` (분해해 들어가기) and `STYLE-ZOOM.md`.
- **Don't use it for** comparisons, rules or decisions with nothing to open, or for a single flat diagram. One level plus a
  camera move is just a 3D scene. If you have one level, use plain three.js.
- It pairs with `kits/profiler-lanes/` when one level is a timeline (threads, dies, queues over time). The two kits don't
  depend on each other.

## Load
Copy `zoom-levels.js` to `<project>/assets/kits/zoom-levels.js`. The page keeps the usual importmap
(`three` → `../assets/vendor/three/build/three.module.min.js`, `three/addons/` → `…/examples/jsm/`) and imports it:
```js
import * as THREE from 'three';
import * as Z from '../assets/kits/zoom-levels.js';
```

## API
| export | what |
|---|---|
| `createStage({ bg, fog, fov, hemi, sun, lightDir, bloom, toneMapping, exposure, width, height })` | offscreen WebGLRenderer → EffectComposer (RenderPass, UnrealBloomPass, OutputPass), camera, hemisphere + sun. `bg` is required. Returns `{ renderer, scene, camera, hemi, sun, lightDir, composer, bloom, aniso, canvasTex }` |
| `createMaterials({ groups, std })` | per-group material registry: `reg`, `dimLevel(g, k)`, `M` (vertex-colour AO), `MP`, `glowMat(g, k)` (instance colour glows), `basic`, `edges(parent, geo, color, op, g)`, `DIMK` |
| `canvasTex(w, h, draw, { rep, srgb, aniso })` | procedural texture (use `stage.canvasTex`, which fills in anisotropy) |
| `boxAO(w, h, d, lo)` · `box(...)` · `mesh(...)` | box geometry with a vertical vertex-colour gradient (cheap AO) · helpers that add meshes |
| `inst(parent, geo, mat, rows, colors)` | static InstancedMesh from `[x, y, z, sx, sy, sz, rx, ry, rz]` rows |
| `dynInst(parent, geo, mat, n)` · `setI(im, i, x, y, z, sx, sy, sz, col, ry)` · `done(im, n)` | per-frame instancing |
| `UNIT` · `UNITC` | unit box with origin at min-x / bottom (bars, blocks) · centred unit box |
| `glowMaterial(k, o)` | unregistered glow material |
| `compose(pos, s, rot?)` | Matrix4 for a level's placement in its parent |
| `createLevels(scene)` | `level(name, unit, parent, local(t))`, `chain`, `rel(a, b, t)`, `keyIn`, `blend` (roots on the deeper level by unit), `path(keys, chains, { chainEase, keyEase })` → `{ K, CHAINS, camAt(t) }`, `reroot(R, t, { keep: [outer, inner] })` → `REL` |
| `cameraKeys(rows)` | key rows → key objects (used by `path`) |
| `applyCamera(camera, c, { W, H, near, far })` · `aimSun(sun, c, dir, k)` · `fogByDistance(fog, d, near, far)` | per-frame camera, light and fog that follow the zoom (multiples of camera distance) |
| `createLabels({ ctx, camera, levels, W, H, sans, mono, text, dim, shadow, margin, mapPoint, tag, lab })` | `project(L, pt)`, `tag(L, pt, title, sub, col, a, o)` (tooltip box + leader + dot), `lab(L, pt, s, col, a, o)`, `txt`, `tw`. The tooltip look (sizes, paddings, fill, stroke, marker `'bar'` / `'square'` / a function) is a parameter |
| `clamp lerp prog eo eio ss rng hash V3 rgba` | the maths the kit uses; import them or keep your own |

Camera key row: `[t, level, [tx, ty, tz], distance, yaw, pitch, fovDeg, ox?, oy?]`, with distance in that level's units.
yaw 0 puts the camera on +z looking toward −z. pitch π/2 looks straight down. ox / oy are view-offset px: ox < 0 moves the
scene right, which makes room for text on the left.

### Usage
```js
const ST = Z.createStage({ bg: C.bg, hemi: ['#fff', '#cfc7b8', 1.6], sun: ['#fff4e4', 2.2], lightDir: [.45, 1, .55], bloom: [.16, .4, .93] });
const MT = Z.createMaterials({ groups: 3, std: { roughness: .7, metalness: .05 } });
const LVS = Z.createLevels(ST.scene);
const L0 = LVS.level('device', .001, -1, () => new THREE.Matrix4());              // 1 unit = 1 mm
const L1 = LVS.level('chip', .00001, 0, t => Z.compose([10, .8, 0], .01));         // 1 unit = 0.01 mm, sits on the device
// … build each level's meshes into L0.g / L1.g in that level's own units, with MT.M(0, …), MT.glowMat(1, …) …
const PATH = LVS.path([
  [0, 0, [0, 0, 0], 160, -.3, .8, 30, -300, 0],
  [4.6, 0, [12, .8, 12], 70, -.15, .95, 30],
  [6.4, 1, [1300, -70, 2200], 5000, -.05, 1.0, 30],                                // a dive: keys on both levels…
], [[4.6, 6.4]]);                                                                  // …flown as one log-distance chain
const LB = Z.createLabels({ ctx, camera: ST.camera, levels: LVS, sans: SANS, mono: MONO, text: C.ink, dim: C.dim, tag: { fill: '#fffffff2', stroke: '#1b212829' } });
function renderAt(t) {
  const c = PATH.camAt(t), R = c.R;
  LVS.reroot(R, t, { keep: [1, 1] });                     // hide levels far from the camera's level
  Z.applyCamera(ST.camera, c, { near: .02, far: 40 });
  animate(t, R);                                          // your scene, a pure function of t
  Z.fogByDistance(ST.scene.fog, c.d, 2, 7); Z.aimSun(ST.sun, c, ST.lightDir);
  ST.composer.render(); ctx.drawImage(ST.renderer.domElement, 0, 0, W, H);
  LB.tag(1, [400, 12, 2200], 'Die 2', 'the one that erases', C.erase, 1, { dy: -110 });
}
```
Full example: `template/index.html`, "SSD Read Stall" (M.2 SSD → NAND dies dealt out with their timelines → two blocks on
die 2 → back out). It uses this kit and `profiler-lanes`.

## 새 주제마다 직접 설계할 것 / What every topic must design itself
The kit only moves the camera and keeps the numbers stable. Everything a viewer recognises has to come from the topic:
- **The nesting itself.** Which levels exist, each level's real unit, and where each child sits in its parent. Check the
  physical facts at every level (what is really inside what, at what scale), and round scales and mark layouts as examples.
- **The objects at each level.** Models, procedural textures (`canvasTex`), instanced repeats. The source pages' racks, 1U
  server, process slab and player crowd stay in those pages.
- **The palette and light.** Background, fog, hemisphere and sun colours, bloom amount and threshold, the role colours.
  A light bench look (the template) and a dark tracing look (the source) both work with the same kit.
- **The camera path.** Key times, targets, yaw/pitch, fov, view offsets, which stretches are chains. Frame each shot for
  its own overlay (text left or right, a table at the bottom).
- **How each level opens.** Lids lifting, things dealt out, slabs growing, a parent stand-in that hides while the child
  shows. This is page code driven by `level.local(t)` and your `animate(t)`.
- **The overlay.** Header, crumbs, progress bar, cards, the tooltip look passed to `createLabels`.

Variety knobs, in rough order of how much they change the look:
1. what opens, and how (lift, explode, deal out, slice, peel);
2. the composition per level (floor plan, wall, stack, ring), and the camera's relation to it (top-down, low 3/4, frontal);
3. the background and grade (light paper, dark lab, coloured), fog band, bloom on or off;
4. materials (vertex-AO matte, metal, emissive accents via `glowMat`), and procedural textures;
5. the tooltip look (`tag` style), the label font sizes, the shadow vs halo (`shadow` colour);
6. the number of levels and the depth ratio between them (×4 to ×1000 per step).

## Performance
- Software GL (headless Chromium): the source page renders at ~0.5–1.6 s per 1920×1080 frame. The light template renders at
  ~0.4–0.8 s. A GPU browser plays both at 60 fps.
- Re-rooting costs a few Matrix4 multiplies per level per frame. `reroot` computes each `rel` once.
- Keep repeats in `inst` / `dynInst` (one draw call each), and hide levels you are not near with `keep` and `visible`.
- `dimLevel` only touches materials when k changes. Calling it every frame with the same k is free.
- Bloom is the most expensive pass. Use a high threshold, keep it to emissive accents, and drop strength where it isn't needed.

## Pitfalls
- **Declare levels outer → inner.** `reroot`'s `keep` window works on indices. Sibling levels are fine (the ue page has two
  children of the timeline level): `blend` picks the root by `unit`, not by index.
- **`unit` must shrink with depth.** It decides which level becomes the root and the log-distance chains. Wrong units make a
  dive stall or jump.
- **Chains start and end on key times** (`path` throws otherwise). Inside a chain the intermediate keys only set
  targets / angles; the speed comes from log(distance). Outside chains each pair of keys eases to a stop (smootherstep), so put
  slow drifts between two keys and dives in chains.
- **`local(t)` must be a pure function of t.** If a level rides on something animated (a die being dealt out), compute its
  matrix from the same function that places that object (`dieM(k, t)` in the template).
- **`dimLevel` multiplies colours toward black.** That is right on a dark background. On a light one it turns things muddy:
  pre-mix colours toward the background or bed, or rely on fog, instead of dimming (the template does).
- **`edges()` defaults to group 0.** The source pages defaulted it to group 1. Pass the group.
- **`createLabels` reads `levels.REL` at call time.** Draw labels after `reroot` in the same frame. A level that isn't rerooted
  this frame (hidden by `keep`) still has a matrix, but it is stale: don't label it.
- **Additive sheets vanish on light backgrounds.** Use normal blending there (profiler-lanes `sheet.additive: false`).
- `tag` clamps its box into the safe area (`top`, `bottom`, `side`). If a box seems stuck at the top, that clamp is why.

## Where it came from
github.com/jungrok5/mmo-server-explained:
- `server-tick-inside-wide/index.html`: setup and builders (lines 236–320), levels (322–339), camera keys / chains /
  `chain` `rel` `keyIn` `blend` `camAt` (543–601), `project` / `tag` / `lab` (843–877), re-root step and per-frame camera,
  fog and light (1241–1256). Also bundled byte-identical in `starter/server-tick-inside-wide/`.
- `ue-client-threads-inside-wide/index.html`: the same engine (264–347, 504–562, 897–933, 1313–1328). Its `blend` roots on the
  level with the smaller `unit` instead of the larger index. That fix is the one kept here; for a linear chain of levels the two
  agree.

Refactor check (scratch copies, untouched originals): server-tick-inside-wide re-pointed at this kit and profiler-lanes
rendered pixel-identical at 12 times across all chapters (max channel diff 0). ue-client-threads-inside-wide re-pointed
(engine, builders, labels, lanes) differed by 2 antialiased edge pixels (max 8) at one of 8 times, from float rounding in a
lane length.
