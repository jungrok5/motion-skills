# Kits — the machinery of a look, not a topic to copy

Each kit packages one approach's engine that the worked-example pages (github.com/jungrok5/mmo-server-explained) had
copy-pasted inside ~100 KB topic pages. A kit holds materials and machinery only — renderer setup, shaders, builders,
rigs, generic painters, camera maths, label systems. **Palette, labels, which objects exist and where, camera paths,
chapters and sims stay in each topic page.** No kit ships a default scene or a topic's colours; each STYLE.md has a
"새 주제마다 직접 설계할 것 / What every topic must design itself" section and the knobs that make variety.
Check before you ship: if a new page's stills could be mistaken for an older topic, redesign the composition.

| kit | approach (references/STYLES.md) | engine | from | template (a different topic) |
|---|---|---|---|---|
| `whiteboard` | 그려 가며 | Canvas 2D | nagle-nodelay-board-wide (+3 copies) | DNS lookup, one growing drawing |
| `zoom-levels` | 분해해 들어가기 | three.js | server-tick-inside-wide, ue-client-threads-inside-wide | SSD read stall on a light bench |
| `profiler-lanes` | (with zoom, or alone) timer blocks on lanes | three.js | the same two pages | browser long-task frames |
| `artifacts-desk` | 실물을 공간에 늘어놓기 | three.js | proto-bot-pipeline-artifacts-wide (+3 copies) | zero-downtime column rename, artifacts on an arc |
| `game-scene` | 게임 화면 재현 | three.js + 2D HUD | rubber-banding-ingame-wide (+ UE grey test map) | hit registration / lag compensation, shooter HUD |

Use: copy `kits/<slug>/<slug>.js` into the project's `assets/kits/`; pages load `../assets/kits/<slug>.js` (three.js kits
are ES modules resolved through the page's importmap). Start from `kits/<slug>/template/index.html` copied to
`<slug-of-topic>/index.html`. Each kit was verified by re-pointing a copy of its source page and diffing stills (identical).
Not packaged (bespoke per topic or used once): flow/glow worlds, glass, stack, explore — see STYLES.md and the example pages.
