# SOURCE — Blendi's "colored pencil" game slice and the Coloured pencil project

- The post: https://x.com/BlendiByl/status/2121130385723789637?a=s7WiEBvN2S0iOCmb8w4&s=19 — Blendi (@BlendiByl),
  13 Nov 2026: "i used fable 5.2 to make this beautiful 'colored pencil' game slice ✏️ every surface shading, and the
  whole town, is pure code. Open source!" with a 14 s 2560×1440 capture.
- The project: https://patch.gg/blendi/coloured-pencil ("Coloured pencil", `git clone https://git.patch.gg/blendi/coloured-pencil.git`).
  Code MIT © 2026 Patch, art CC0. three.js 0.186, Vite. A harbour town on a bright morning with a young sailor to walk
  about in (Patch's starter-man skeleton and CC0 clips, Rapier physics). Read on 14 Nov 2026 at commit `0400f90`.

## The clip, second by second
0–3 s the sailor (red beret, striped jersey) stands at the end of a wooden pier looking at the quay: a lighthouse in red
and white bands, a row of tall houses in coral, butter, sky blue, pink, mint, apricot and lilac, a clock tower, bunting,
boats, green hills and blue mountains, all hatched. 3–7 s he walks in along the quay; the sea mirrors the fronts. 7–10 s
the square: flagstones, a tree, a bench, a fruit stall, café parasols, pigeons. 10–14 s past the lighthouse toward the
hill: a windmill, sheep, cypresses. The caption "the harbour, morning" sits in the lower right throughout; the edges of
the frame fade to torn white paper. What it teaches is in LOOK.md.

## What was taken (adapted, with the licence in `lib/LICENSE-coloured-pencil`)
| Coloured pencil | here | changed |
|---|---|---|
| `src/pencil.js` — `PENCIL` (`pcTooth`, `pcStroke`, `pcStrokes`, `pcDraw`), `field`, `fieldBy`, `hue`, `createPencil`, `createBatch` | `lib/pencil.js` | the sunlight pencil, the shadow pencil and the four pressures are uniforms a world sets (`pencil: { warm, shadow, press }`); the batch merges without three's addons and drops stray attributes |
| `src/page.js` — contour from depth, tooth, flecks, the unfinished edge | `lib/page.js` | paper colour, margin, line and flecks are options; a handwritten caption is drawn on the sheet in graphite (Caveat, bundled); `raw` for the checker |
| `src/shape.js` — `ball`, `turned`, `block`, `roll`, `knead`, `ring`, `put` | `lib/shape.js` | its own vertex welding (no addons); `arched` and `prism` added |
| the sky and sea shaders in `src/harbour/world.js` | `kit.sky`, `kit.water` | colours and amounts are options; the sea's mirror of eight fixed housefronts became a general mirror of up to 40 `fronts` any thing can declare (houses, walls, boats), and the water is a Lambert material so the sun's shadows fall on it |
| the tile rows and window pieces in `src/harbour/houses.js` | `kit.house` | rebuilt as one parametric house (roof kinds, storeys, windows, shutters, shop, sign, balcony, vine, pipe, pots, clock, chimney smoke) |

## What is this skill's
The seekable engine (`World`: a frame is a pure function of t, shots, the live walk, the checks), the rest of the kit
(ranges, ground, paving, row, trees, props, fence, wall, deck, bunting, boats, birds, flecks, smoke, make), the walker
(`figure.js`: a code-made body walked by rule, the rig this repo's oil-paint-world uses, dressed in pencil pieces — no
skeleton file, no clips, no physics), the scripts, the template and the example.

## Not taken
The harbour itself (its houses, quay, pier, lighthouse, tower, hills, windmill, the sailor), Patch's starter man and
clips, Rapier, the Patch block helper. Do not recreate the harbour scene.
