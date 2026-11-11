# Ready-made 3D models (Polyfork)

A shared note for every skill in this repo that builds a three.js scene. Most skills here draw their world in code
on purpose; this is the place to look when a piece needs a 3D thing that code would make badly or slowly — a fox, a
tram, a street lamp, a whole farm — and the skill allows outside models.

Source: https://github.com/lucas-martinic/polyfork-catalog (an index of https://polyfork.dev), licence terms at
https://polyfork.dev/licensing (read 2026-11-08, "last updated November 2026").

## What it is

- **3,077 free low-poly models** and 28 themed kits (one palette, one scale, one grid per kit). Characters 198,
  animals 137, buildings 410, vehicles 191, props 1,985, terrain, attachments, small held items ("nano").
- Each model is a **GLB** (`https://polyfork.dev/cdn/{id}.glb`) and a parametric **ES module**
  (`https://polyfork.dev/cdn/{id}.mjs`, `createAsset({ colorway, season, … })`). No account, no key, CORS open.
- Y-up, **real-world metres**, the model rests on y = 0 and is centred on x/z (`origin_y` ≠ 0 only for wall fixtures
  and terrain tiles — still place at y = 0). Flat-shaded vertex colours on one material: no textures to wire.
- Characters share one Mixamo-named skeleton (22 body + 9 face bones), no clips inside; Idle / Walk / Run come from
  `https://polyfork.dev/cdn/clips.mjs`. Some animals and booms carry IK (`has_ik`, `ik_type: legs | arm`).
- HD editions (high poly, PBR) are paid (Pro). Do not use them in this repo's skills.

## Can it be used commercially? Yes — with two lines not to cross

The free models come under two licences; you pick per use, you never have to say which.

| Use | OK? | Licence that covers it |
|---|---|---|
| A rendered MP4 / still for anyone, client work, ads, sold products | yes, no credit needed | Polyfork licence |
| Recolour, restyle (toon / ink materials), decimate, combine, animate | yes | both |
| A live page that loads the model from `polyfork.dev/cdn/…` at run time | yes, no credit needed ("linking is not redistribution") | Polyfork licence |
| Committing a **GLB / FBX / OBJ** into a repo, a skill folder or `docs/` (it is then redistributed) | only **with the credit line** beside it | CC BY 4.0 |
| Copying a model's **`.mjs` source** into a repo, a skill script or a page | **no** | Polyfork licence only, no redistribution |
| Using models / their source / their text to build or train a **commercial** 3D asset generator | **no** | Polyfork licence |
| Using the Polyfork name or logo so it looks like they made or endorse the piece | no | — |

The credit line is in each asset's `credit` field, e.g.
`Fox by Polyfork (https://polyfork.dev/asset/fox-base), CC BY 4.0` — add "modified" if you changed the mesh.

What that means here:

- **Never vendor `.mjs` modules** (or paste their code) into a skill or `docs/`. Import them from the CDN at run time,
  or use the GLB.
- **Prefer hotlinking** the GLB from the CDN in live pages. Committing GLBs is allowed with the credit, but a single
  animal is already 1.4 MB (the fox) and `docs/` must stay free of large media.
- A skill that builds its own geometry procedurally is not "a generator built from Polyfork" — but do not lift their
  module code as the template for a skill's generators.
- Fetch one model when a piece uses it; never scrape the catalogue in bulk. Send a User-Agent that names the project
  (`motion-skills`) on server-side fetches, and back off on HTTP 429.

## When to reach for it — and when not

Respect the skill first. A skill's fixed style wins over this note:

- **Do not use** in skills that say code-only: `machine-sim` (no downloaded models), `swarm-world` (primitives, no
  assets), `aesthetics-film` (zero 3D assets). The same goes for any look built from its own pipeline (ink, knit,
  paper, painted) unless the model is fully restyled to match.
- **Good fits:** filler and props in toy / low-poly worlds, a vehicle or animal a piece needs once, and stand-ins while
  blocking a layout before the code-drawn version exists.
- **Skills with a recipe in their `SKILL.md`** or references (each tried in the skill's own template, no console errors; 2026-11-08 unless the row says otherwise):

  | Skill | Load | Material | Notes |
  |---|---|---|---|
  | `parallax-facade` | r170 loader, `await` before `F.start()` | `F.mat.lit` (the town's vertex-coloured toon) | no ink hull or haze tint |
  | `map-dive` | r170 loader, top-level `await` | `K.mat('#ffffff', { vertexColors: true })` | place with `K.group(stage, { at, s })`, `s` ≈ 0.06–0.12 on the region map |
  | `cartoon-3d-short` | r170 loader, `await` before `F.set` | `S.lam("pf", () => ({ vertexColors: true }))` | the world ink outlines it; people stay the drawn cast |
  | `cinecode` (Film mode) | `three/addons/loaders/GLTFLoader.js`, before `READY` | `makeMaterial(look, '#ffffff', { vertexColors: true })` | one `LICENSES.csv` row per model |
  | `kinetic-type-collage` | r170 loader, `await` before `F.start()` | as loaded (vertex colours under the studio light) | `F.prop('fox', () => gltf.scene.clone())`; a still or turning prop, credited on the end card (tried 2026-11-11) |

  Skills that vendor `lib/three.module.min.js` (r170) have no addons, so they import the loader for that same version:
  `https://unpkg.com/three@0.170.0/examples/jsm/loaders/GLTFLoader.js`. It finds `three` through the page's import map.
  Serve the page over HTTP (as the render scripts do); a `file://` page cannot import the local module.
- If the user asks for a 3D object in a skill that allows models, check Polyfork before modelling it from primitives.
- **Characters** still go through the repo's body check (cast sheet front / back / left / right, joint limits) —
  a downloaded rig is not exempt.

## How

Find:

```sh
# search (JSON, no key). Filters: q, class (prop|building|vehicle|character|animal|ultra|attachment|terrain|hand),
# kit, max_triangles, ik (1|legs|arm), per_page (≤100)
curl -s -A "motion-skills" "https://polyfork.dev/api/assets?q=fox&class=animal&per_page=5"
curl -s -A "motion-skills" "https://polyfork.dev/api/assets/fox-base"            # size_m, palette, credit, licence
curl -s -A "motion-skills" "https://polyfork.dev/api/assets/fox-base/matching"   # what belongs with it (same kit/palette/scale)
```

Or browse https://polyfork.dev/assets, the kit lists in the index repo (`kits/*.md`, `models/*.md`), or its
`catalog.json`. Polyfork also documents a CLI (`npx polyfork search <words>`, `npx polyfork add <id>`) and keeps
agent instructions at https://polyfork.dev/prompt.txt and https://polyfork.dev/llms.txt.

Load a GLB (verified 2026-11-08: three r180, headless Chromium, `fox-base` → 1 mesh, 0.38 × 0.95 × 1.47 m, no errors):

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const gltf = await new GLTFLoader().loadAsync('https://polyfork.dev/cdn/fox-base.glb');
scene.add(gltf.scene);              // already metres, already on y = 0
```

Use the parametric module (run time only, never copied into the repo):

```js
import { createAsset } from 'https://polyfork.dev/cdn/pop-top-camper-van-62a322.mjs';
scene.add(createAsset({ colorway: 'tomato', roof: 0, season: 'winter' }));
// the knobs and their options: https://polyfork.dev/cdn/{id}-params.json
```

Fitting it into a skill's look:

- Swap materials for the skill's own (toon ramp, ink outline pass, painted two-tone): traverse the meshes and replace
  `material`, keeping vertex colours if they help (`vertexColors: true`). Modifying is allowed.
- Sizes are real — pick a right-sized asset rather than rescaling one to fake a fit; then scale the whole set to the
  scene's units once.
- Many static models share one material, so they merge to one draw call (`https://polyfork.dev/cdn/merge.mjs`) —
  or merge with `BufferGeometryUtils` yourself.

Rendering to MP4:

- Await every `loadAsync` before the frame clock starts; a frame captured mid-load renders an empty set.
- For a render that must be repeatable or run offline, download the GLB into the piece's own work folder (not the
  skill folder, not `docs/`) and load it from there. Keep it out of git unless you keep its credit beside it.
- Note every model a piece uses (id, page URL, credit line) in the piece's brief or credits. It costs nothing and
  makes the CC BY route available later if the files ever need to be shared.
