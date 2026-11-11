# SOURCE — Blendi's "hand-painted" game and the Oil paint project

- The post: https://x.com/BlendiByl/status/2120341251178594532?a=KltytYZPeeW0-pPdgsw&s=19 — Blendi (@BlendiByl),
  11 Nov 2026: "i used fable 5.2 to make this 'hand-painted' game in less than an hour. Every frame is about 1.5 million
  brush strokes, running at 200 fps in a browser tab. Open source too!" with a 16 s capture; the reply links the project.
- The project: https://patch.gg/blendi/oil-paint ("Oil paint", `git clone https://git.patch.gg/blendi/oil-paint.git`).
  Code MIT © 2026 Patch, art CC0. three.js 0.186, WebGL2. Two walks with one wanderer (a rigged CC0 figure with
  animation clips, Rapier physics, a simulated cloak): an autumn wood, and a snow ridge under the aurora with a cabin.

## The clip, second by second
0–3 s the wanderer (straw hat, blue cloak) runs from the eye down a leaf-covered way between tall trunks toward a low
sun; long plum shadows cross the gold floor; leaves fall. 3–4 s the eye swings close behind the cloak. 4–9 s more of the
way: shafts of lit mist between trunks, ferns and grass tufts in the foreground. 9–13 s open ground with tufts, the
shadow of the figure sliding over the strokes. 13–15 s the eye looks up into a crown of red and gold dabs against a pale
sky, the cloak filling the lower frame. 15–16 s back behind them. What it teaches is in LOOK.md.

## What was taken (adapted into `lib/paint.js`, with the licence in `lib/LICENSE-oil-paint`)
| Oil paint (`src/oilpaint/`) | here |
|---|---|
| `dabs.js` — the `Dab`, the facing and lying cards, least / most size on the canvas, the raked relief | `dabMaterial`, `dabGeometry`, `dabMesh` |
| `brush.js` — the eight marks made in code | `createBrushSheet` |
| `common.js` — shared uniforms, `paint3`, `jitter`, mist, wind, lamp, the shade lookups | `createShared`, `COMMON` |
| `ground.js` — rings of squares, one dab in four standing for its neighbours | `RING`, `groundRings` |
| `pins.js` — dabs carried on a mesh | `pinDabs` (pins on rigid parts and on cloth) |
| `shade.js` — the still world's shade once, the wanderer's each frame | `createShade` |
| `finish.js` — sun in the mist, weave, roll-off, varnish | `createFrame` |
The leaf, bark, carpet and undergrowth `makeDab` bodies in `kit.js` follow the wood's (`src/world/floor.js`, `forest.js`)
with every colour, size and rule turned into an option.

## What was changed or added
- **Seekable.** Everything is driven by `uTime` and the wanderer's place on the way; no physics, no simulated cloth, no
  clips: a frame is a pure function of `t`, so it renders to MP4 frame by frame and the same page plays live.
- **Affordable on a CPU.** Ground rings are drawn as 8 × 8 tiles and still dabs in 20 m chunks, and what the eye can't
  see is not drawn; far chunks draw part of their dabs; `unseen()` in the vertex shader; height and normal in one map;
  brush relief from screen derivatives (one texture look instead of five); one look at the wanderer's shadow on the CPU.
- **A kit from palettes.** `sky`, `ranges`, `ground` with masked covers, `growth` with kinds and flower heads, `trees`
  with five crown shapes, `solid` (paint on any mesh) with `shape`, `water`, `flecks`; `underpaint`; additive strokes.
- **A wanderer made in code** (`figure.js`): planted feet, IK legs, joint ranges and an audit, cloth by rule, a cast sheet.
- **Shots, a checker, a renderer**, and the brief-first workflow.

## What was not taken
The two scenes (`src/world/`, `src/night/`), the made-things kit, the figure, its clips and physics, the Patch block
helper, any stills. None of that code or art is in this repo. Do not recreate those scenes with this skill.
