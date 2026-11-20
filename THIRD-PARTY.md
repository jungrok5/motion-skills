# Parts by others

These parts of the repository were written or made by others and **keep their own licences**. `LICENSE.md` (PolyForm
Noncommercial 1.0.0) and `MEDIA-LICENSE.md` do not cover them and do not restrict them: anyone may use them on their original
terms. Each skill's `references/SOURCE.md` says in more detail what came from where.

## Code absorbed or adapted from other repositories

| where here | from | licence | notice |
|---|---|---|---|
| `walking-colossus/engine/` (except `kit.js`, `config.js`, `vendor/`) and `walking-colossus/examples/walking-block/mods/` | Walking Block by Leonxlnx — https://github.com/Leonxlnx/walking-block | MIT | `walking-colossus/engine/LICENSE` |
| `swarm-world/lib/` (the build shader, scheduler and glyphs) | swarm-build by Harnoor Singh — https://github.com/harnoorDev/swarm-build | MIT | `swarm-world/lib/LICENSE-swarm-build` |
| `heritage-blueprint/` | heritage-blueprint-skill by @木渡川 (tanglele) — https://github.com/tanglele110-hash/heritage-blueprint-skill | MIT | `heritage-blueprint/LICENSE` |
| `cinecode/` | cinecode by Sarp Yıldız (@sarpstar) — https://github.com/sarpstar/cinecode | MIT | `cinecode/LICENSE` |
| `cinecode/styles/` (a style) | LemoLab | MIT | `cinecode/styles/LICENSE-lemo-opuscar` |
| `cartoon-3d-short/` (its look, drawing and shaders, ported) | claude-animated-shorts by mromidev — https://github.com/mromidev/claude-animated-shorts | MIT | see `cartoon-3d-short/SKILL.md` |
| `oil-paint-world/lib/paint.js` (the painter) | Oil paint by Patch — https://patch.gg/blendi/oil-paint | MIT | `oil-paint-world/lib/LICENSE-oil-paint` |
| `colored-pencil-world/lib/pencil.js`, `page.js`, `shape.js` | Coloured pencil by Patch — https://patch.gg/blendi/coloured-pencil | MIT | `colored-pencil-world/lib/LICENSE-coloured-pencil` |

Skills built *after* someone's work without taking its code (its methods studied, or a post, a video, a clip) are the
owner's own and are covered by `LICENSE.md`; their sources are credited in their `SKILL.md`, README and samples page.
Examples: `machine-build-reel` and `machine-wilds` (after AnyMachine, MIT — nothing copied), `live-character` (after LivLiv
Player, Apache-2.0 — its motion recipe studied and re-implemented; LivLiv's own characters are never used), `doodle-styles`
(after anidoodle, Apache-2.0 — re-implemented, no code copied), `pixel-world-compiler` (after Frostwind, MIT — its method,
its own code), `shred-poster` (after a GPL-3.0 kit — none of its code used), `perspective-illusion` and `dragon-realm`
(sources with no licence — nothing copied).

## Libraries bundled with skills

| what | licence | where |
|---|---|---|
| three.js | MIT | every `vendor/` and `vendor/three/` folder that holds it, with its `LICENSE` (and the copies in `docs/*/demo/`) |
| meshoptimizer (simplifier) | MIT | `scanned-realm/vendor/`, `machine-wilds/vendor/` (`LICENSE-meshoptimizer.md`) |
| libraries listed in a skill's licence table | as listed (MIT, Zlib, …) | e.g. `cinecode/templates/LICENSES.csv` |

## Fonts

Every font file in a `fonts/` folder keeps its own licence — most are under the SIL Open Font License 1.1 (Noto, Archivo
and others from Google Fonts), with the licence text beside them where the font came with one (for example
`shred-poster/**/fonts/*/LICENSE`, `map-dive/**/fonts/LICENSE.txt`, `aesthetics-film/**/fonts/LICENSE.txt`,
`landmark-map-3d/examples/eiffel/fonts/LICENSE.txt`). OFL fonts may be bundled and shared but not sold on their own.

## Scans, models, data

- **Poly Haven** scans (CC0) used by `scanned-realm`, `pencil-live-action` and `machine-wilds` are fetched when a piece is
  built and are never committed.
- **3D models** from Polyfork (CC BY) are fetched, not committed; any committed GLB carries its CC BY credit line
  (`references/3D-MODELS.md`).
- **Tessera-small** (CC BY-NC 4.0), used by `prompt-sprite-game`, is loaded from the Hugging Face Hub in the player's browser
  and is not in this repository.
- **`prompt-sprite-game/models/cat/`** was trained here on Pixel Art Atlas 1.4M by Angais (CC0), whose images were made with
  Krea 2: the Krea 2 Community License limits commercial use of its outputs by companies with US$1,000,000 or more in annual
  revenue, and whether a model trained on them is a derivative is not settled. See `prompt-sprite-game/models/cat/NOTICE`.
