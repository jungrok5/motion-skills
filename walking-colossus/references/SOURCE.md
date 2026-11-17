# SOURCE — what this skill was made from

**Source:** <https://github.com/Leonxlnx/walking-block> — "Walking Block" by Leonxlnx (MIT): a colossal Soviet panel
apartment block on eight mechanical legs crossing a wet field in blue dusk fog. Everything in the picture is code
(three.js r170: procedural geometry, procedural textures and shaders, no 3D assets, no image textures); a 45 s
1080p30 film (nine shots) is rendered offline from the same scene. Built by its author with Claude agents iterating
on stills against reference images that are not in the repo.

## What came from it (adapted, MIT — `engine/LICENSE`)

| source | here |
|---|---|
| `src/main.js` (bootstrap, lights, module loader, deterministic `renderAt`, motion-blur accumulation) | `engine/main.js` — reads `colossus.js`; modules from `MODS` paths; halos from `ANCHORS` |
| `src/post.js` (AO, height fog + sky, DOF, bloom, grade, grain) | `engine/post.js` (unchanged) |
| `src/gait.js` (stateless walk cycle, IK, shake) | `engine/gait.js` — leg layout, foot homes and body amplitudes from `colossus.js` |
| `src/look.js`, `src/shots.js`, `src/config.js` | `engine/look.js` (defaults + overrides), `engine/shots.js` (runtime + inspection views), `engine/config.js` (defaults) |
| `src/materials.js`, `src/textures.js` (mesh-local weathering) | unchanged |
| `src/mods/legs.js` (IK rig, hydraulics, hoses, claws) | `engine/mods/legs.js` — `LEG_SCALE`, `LEG_PAINT`, any leg count |
| `src/mods/env.js` (ground, vegetation, puddles, footprints, mirror) | `engine/mods/ground.js` — every topic number in `GROUND` |
| `src/mods/fx.js`, `src/mods/atmo.js` | engine modules; anchors from `ANCHORS`, foot radii from the leg scale |
| `src/mods/building.js`, `src/mods/chassis.js` | `examples/walking-block/mods/` (the block's own body, unchanged) |
| the film's cameras and timeline | `examples/walking-block/colossus.js` |
| `src/mods/README.md` (the module contract the agents worked from) | `references/MODULES.md`, `LOOK.md`, `LESSONS.md` |
| `tools/shot.mjs`, `render.mjs`, `mux.sh` (Chrome + puppeteer on Windows) | `scripts/shot.mjs`, `render.mjs`, `encode.mjs` (Playwright, any OS, GPU or SwiftShader) |
| `tools/audio.mjs` (downloaded recordings placed from the gait) | `scripts/audio.mjs` — the same placement, synthesised voices; recordings optional |

## What did not come

- The audio files (`audio/`: freesound CC0 effects, "The Long Dark" by Scott Buckley, CC-BY 4.0) — not
  redistributed; the skill synthesises its sound, and `SOUND.samples` takes recordings a user downloads.
- The reference images (never in the source repo) and the rendered film (in the source's releases).
- `server.mjs` (referenced by the source but not in it) — replaced by `scripts/serve.mjs`.

## What is new here

`engine/kit.js` (batches, lofts, catenaries, window radiance, closed-form follow-through), `colossus.js` as the one
place a topic lives, `new-colossus.mjs`, `check.mjs` (legs, gait, support, cameras, determinism, every shot), and
the proof on a topic the source does not have: `examples/low-tide` 「Low Tide」.
